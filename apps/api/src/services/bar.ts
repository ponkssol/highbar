/** $HIGHER holder tiers (step 8): on-chain balance reads with caching, holder scans + snapshots, the Max tier launch gate and the cashback boost. */
import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getMint } from "@solana/spl-token";
import { MAX_TIER_MIN_BAR, type BarTier } from "@hb/shared";
import { getConnection, withRetry } from "@hb/onchain";
import { db } from "../db/pool.js";
import { bar } from "../jobs/barConfig.js";
import type { Period } from "../jobs/period.js";
import { cashbackBonus, feeShareMinRaw, rawToBar, tierForRaw } from "./barMath.js";

export interface BarMint { mint: PublicKey; decimals: number; program: PublicKey }
let mintP: { key: string; p: Promise<BarMint> } | null = null;
/** Official $HIGHER mint decimals + token program (legacy SPL or Token-2022), read once per resolved mint. */
export function barMint(): Promise<BarMint> {
  const key = bar.mint;
  if (!key) return Promise.reject(new Error("$HIGHER has not launched yet (BAR_MINT unset and no official launch detected)"));
  if (mintP?.key !== key) mintP = { key, p: (async () => {
    const conn = getConnection(), mint = new PublicKey(key);
    const info = await withRetry(() => conn.getAccountInfo(mint, "confirmed"));
    if (!info) throw new Error(`$HIGHER mint ${mint.toBase58()} not found on this cluster`);
    const m = await getMint(conn, mint, "confirmed", info.owner);
    return { mint, decimals: m.decimals, program: info.owner };
  })().catch((e) => { if (mintP?.key === key) mintP = null; throw e; }) };
  return mintP.p;
}

// SPL token account layout (same base layout in Token-2022): mint 0..32, owner 32..64, amount u64 LE 64..72.
const cache = new Map<string, { at: number; raw: bigint }>();
/** Raw $HIGHER balance of a wallet (sum over all its token accounts for BAR_MINT), cached BAR_BALANCE_CACHE_MS. */
let cacheMint: string | null = null;
export async function barBalanceRaw(wallet: string, fresh = false): Promise<bigint> {
  if (cacheMint !== bar.mint) { cache.clear(); cacheMint = bar.mint; } // official mint changed (detected / override)
  const hit = cache.get(wallet);
  if (!fresh && hit && Date.now() - hit.at < bar.cacheMs) return hit.raw;
  const m = await barMint();
  const r = await withRetry(() => getConnection().getTokenAccountsByOwner(new PublicKey(wallet), { mint: m.mint }, "confirmed"));
  const raw = r.value.reduce((a, x) => a + (x.account.data.length >= 72 ? x.account.data.readBigUInt64LE(64) : 0n), 0n);
  cache.delete(wallet); cache.set(wallet, { at: Date.now(), raw });
  if (cache.size > 20_000) cache.delete(cache.keys().next().value!);
  return raw;
}

export interface BarStatus { raw: bigint; decimals: number; balance: number; tier: BarTier }
export async function barStatus(wallet: string, fresh = false): Promise<BarStatus> {
  const [m, raw] = await Promise.all([barMint(), barBalanceRaw(wallet, fresh)]);
  return { raw, decimals: m.decimals, balance: rawToBar(raw, m.decimals), tier: tierForRaw(raw, m.decimals) };
}

/** Every $HIGHER holder: owner -> raw balance (one getProgramAccounts on the mint's token program, owner+amount slice only). */
export async function barHolders(): Promise<Map<string, bigint>> {
  const m = await barMint();
  const filters = [{ memcmp: { offset: 0, bytes: m.mint.toBase58() } }, ...(m.program.equals(TOKEN_PROGRAM_ID) ? [{ dataSize: 165 }] : [])];
  const accs = await withRetry(() => getConnection().getProgramAccounts(m.program, { commitment: "confirmed", filters, dataSlice: { offset: 32, length: 40 } }), 4, 800);
  const out = new Map<string, bigint>();
  for (const { account } of accs) {
    if (account.data.length < 40) continue;
    const owner = new PublicKey(account.data.subarray(0, 32)).toBase58(), raw = account.data.readBigUInt64LE(32);
    if (raw > 0n) out.set(owner, (out.get(owner) ?? 0n) + raw);
  }
  return out;
}

const hasTable = async (t: string) => !!(await db.query("SELECT to_regclass($1) AS t", [`public.${t}`])).rows[0].t;

/** Store one holder snapshot (only balances >= the lowest fee-share tier; absent = below). Returns rows written. */
export async function writeSnapshot(holders: Map<string, bigint>, decimals: number, takenAt = Date.now()): Promise<number> {
  const min = feeShareMinRaw(decimals);
  const rows = [...holders].filter(([, r]) => r >= min);
  for (let i = 0; i < rows.length; i += 1000) {
    const b = rows.slice(i, i + 1000);
    await db.query("INSERT INTO bar_holder_snapshots (taken_at, wallet, balance_raw) SELECT $1, w, r::numeric FROM unnest($2::text[], $3::text[]) AS x(w, r) ON CONFLICT DO NOTHING",
      [takenAt, b.map(([w]) => w), b.map(([, r]) => r.toString())]);
  }
  return rows.length;
}

/** Per-wallet MINIMUM balance over all snapshots taken in the period (missing from a snapshot = 0, so dropped). */
export async function periodBalances(p: Period): Promise<{ snapshots: number; balances: Map<string, bigint> }> {
  if (!(await hasTable("bar_holder_snapshots"))) return { snapshots: 0, balances: new Map() };
  const n = Number((await db.query("SELECT count(DISTINCT taken_at)::int AS n FROM bar_holder_snapshots WHERE taken_at >= $1 AND taken_at < $2", [p.start, p.end])).rows[0].n);
  if (!n) return { snapshots: 0, balances: new Map() };
  const { rows } = await db.query<{ wallet: string; m: string }>(
    "SELECT wallet, min(balance_raw)::text AS m FROM bar_holder_snapshots WHERE taken_at >= $1 AND taken_at < $2 GROUP BY wallet HAVING count(*) = $3", [p.start, p.end, n]);
  return { snapshots: n, balances: new Map(rows.map((r) => [r.wallet, BigInt(r.m)])) };
}

/** Max tier launch gate (off-chain: DBC pool creation is permissionless, so this only covers launches built by our API/UI).
 *  Returns an error message when the creator may not launch on `tier`, null when allowed. Reads the balance fresh. */
export async function launchGate(tier: string, creator: string): Promise<string | null> {
  if (tier !== "max" || !bar.gateMaxTier) return null;
  if (!bar.mint) return "Max tier is gated on $HIGHER holdings, but $HIGHER has not launched yet";
  let s: BarStatus;
  try { s = await barStatus(new PublicKey(creator).toBase58(), true); } catch (e) { return `could not verify $HIGHER balance: ${(e as Error).message}`; }
  return s.tier.maxTierAccess ? null : `Max tier launches need at least ${MAX_TIER_MIN_BAR.toLocaleString("en-US")} $HIGHER in the creator wallet (it holds ${s.balance.toLocaleString("en-US")})`;
}

export type Boost = (wallet: string, volume: bigint) => Promise<{ bonus: bigint; tier: string; raw: bigint }>;
/** Cashback boost for a period: tier from the period's minimum snapshot balance, or the current (cached) balance when there are no snapshots.
 *  undefined (= plain step-7 cashback) when BAR_MINT is unset, BAR_CASHBACK_BOOST=false, or a live run needs snapshots and has none. */
export async function cashbackBoost(p: Period, live: boolean, log: (m: string) => void): Promise<Boost | undefined> {
  if (!bar.mint || !bar.cashbackBoost) return undefined;
  const m = await barMint();
  const snap = await periodBalances(p);
  if (!snap.snapshots && live && bar.requireSnapshots) { log(`[bar] no $HIGHER snapshots in ${p.id} and BAR_REQUIRE_SNAPSHOTS: cashback boost skipped`); return undefined; }
  log(snap.snapshots ? `[bar] cashback tiers = min balance over ${snap.snapshots} snapshot(s) in ${p.id}` : `[bar] no $HIGHER snapshots in ${p.id}: cashback tiers use current balances`);
  return async (wallet, volume) => {
    const raw = snap.snapshots ? (snap.balances.get(wallet) ?? 0n) : await barBalanceRaw(wallet);
    const tier = tierForRaw(raw, m.decimals);
    return { bonus: cashbackBonus(volume, tier), tier: tier.id, raw };
  };
}
