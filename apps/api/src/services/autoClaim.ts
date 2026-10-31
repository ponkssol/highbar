/** Hourly auto-claim of the platform's DBC partner trading fees (and, for migrated tokens, the DAMM v2 LP fees) into the signer.
 *  One batched read per run: every token's DBC pool + config account via getMultipleAccountsInfo in chunks of 100, decoded with
 *  the DBC program coder (no per-pool getPoolFeeMetrics). A pool is claimed only when partnerQuoteFee >= CLAIM_MIN_SOL or
 *  partnerBaseFee > 0. The claim txs themselves are FeeClaimer's builders (services/feeClaimer.ts): simulate first, sendOnce
 *  when live, one fee_claims row per landed tx (ON CONFLICT DO NOTHING), so Open Book and the epoch split pick them up.
 *  Receiver: always the signer (TREASURY_PUBKEY is ignored) unless CLAIM_RECEIVER is set. Gating: CLAIM_LIVE=true or --live,
 *  and on mainnet also ALLOW_MAINNET=true; anything else simulates and logs would-claim lines. DRY_RUN is NOT read. */
import { PublicKey, type Connection, type Keypair } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { Q } from "../db/pool.js";
import { FeeClaimer, meetsMin, type ClaimResult, type FeeClaimerOpts, type ForTokenOpts } from "./feeClaimer.js";

export const CHUNK = 100;
/** pg advisory lock key for the autoclaim job (any constant bigint unique to this job: ascii "hbac" + 1). */
export const AUTOCLAIM_LOCK_KEY = 0x68626163_01;

export interface AutoclaimSettings {
  /** true = send. Only when requested (CLAIM_LIVE=true / --live) AND (devnet OR ALLOW_MAINNET=true). */
  live: boolean;
  requestedLive: boolean;
  /** Why the run simulates only (null when live). */
  reason: string | null;
  minLamports: bigint;
  maxPerRun: number;
  /** null = the signer. */
  receiver: PublicKey | null;
}

const nonNeg = (env: NodeJS.ProcessEnv, k: string, d: number) => {
  const v = env[k]?.trim(), n = v ? Number(v) : d;
  if (!Number.isFinite(n) || n < 0) throw new Error(`${k} must be a non-negative number`);
  return n;
};

/** Env + argv -> autoclaim settings. DRY_RUN is deliberately ignored (it is label-only elsewhere); --dry-run always wins. */
export function autoclaimSettings(env: NodeJS.ProcessEnv, net: "devnet" | "mainnet", argv: string[] = []): AutoclaimSettings {
  const requestedLive = !argv.includes("--dry-run") && (argv.includes("--live") || env.CLAIM_LIVE === "true");
  let live = requestedLive, reason: string | null = null;
  if (!requestedLive) reason = "CLAIM_LIVE is not true (and no --live): simulate only";
  else if (net === "mainnet" && env.ALLOW_MAINNET !== "true") { live = false; reason = "mainnet without ALLOW_MAINNET=true: simulate only, nothing is sent"; }
  const minLamports = BigInt(Math.round(nonNeg(env, "CLAIM_MIN_SOL", 0.01) * 1e9));
  const maxPerRun = Math.floor(nonNeg(env, "CLAIM_MAX_PER_RUN", 20));
  const r = env.CLAIM_RECEIVER?.trim();
  let receiver: PublicKey | null = null;
  if (r) { try { receiver = new PublicKey(r); } catch { throw new Error("CLAIM_RECEIVER is not a valid public key"); } }
  return { live, requestedLive, reason, minLamports, maxPerRun, receiver };
}

/** AUTOCLAIM_ENABLED=true: the hourly autoclaim job owns the fee claims, so the daily epoch skips its own FeeClaimer step. */
export const epochSkipsFeeClaims = (env: NodeJS.ProcessEnv = process.env) => env.AUTOCLAIM_ENABLED === "true";
/** Does this jobs command run FeeClaimer.runAll? fees always; epoch unless AUTOCLAIM_ENABLED=true (jobs/run.ts). */
export const runsFeeClaims = (cmd: string, env: NodeJS.ProcessEnv = process.env) => cmd === "fees" || (cmd === "epoch" && !epochSkipsFeeClaims(env));

export function chunk<T>(xs: T[], n = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

type AccountsConn = Pick<Connection, "getMultipleAccountsInfo">;
/** Raw account data per address (null = account missing), fetched in getMultipleAccountsInfo chunks of `size` (RPC max 100). */
export async function readAccounts(conn: AccountsConn, keys: string[], size = CHUNK): Promise<Map<string, Buffer | null>> {
  const out = new Map<string, Buffer | null>();
  const uniq = [...new Set(keys)];
  for (const part of chunk(uniq, size)) {
    const infos = await conn.getMultipleAccountsInfo(part.map((k) => new PublicKey(k)), "confirmed");
    part.forEach((k, i) => out.set(k, infos[i] ? Buffer.from(infos[i]!.data) : null));
  }
  return out;
}

export type DecodeFn = (account: "virtualPool" | "poolConfig", data: Buffer) => any;
/** Decoder backed by the DBC Anchor program coder (getClient().program or createDbcProgram()). */
export const dbcDecoder = (program: { coder: { accounts: { decode(name: string, data: Buffer): any } } }): DecodeFn =>
  (account, data) => program.coder.accounts.decode(account, data);

export interface PartnerFees { quote: bigint; base: bigint; migrated: boolean; config: string; baseMint?: string }
const bi = (v: any) => BigInt(v?.toString() ?? "0");
/** Partner fee fields of a decoded virtualPool (some coder versions wrap the fields in poolState). */
export function partnerFeesOf(decoded: any): PartnerFees {
  const s = decoded?.poolState ?? decoded;
  const baseMint = s.baseMint ? (s.baseMint.toBase58?.() ?? String(s.baseMint)) : undefined;
  return { quote: bi(s.partnerQuoteFee), base: bi(s.partnerBaseFee), migrated: Number(s.isMigrated ?? 0) > 0, config: s.config?.toBase58?.() ?? String(s.config), ...(baseMint ? { baseMint } : {}) };
}

export interface TokenRow { mint: string; pool: string; config: string; is_migrated: boolean; damm_pool: string | null }
export interface Candidate { row: TokenRow; fees: PartnerFees; migrated: boolean; trading: boolean; /** config tokenType: 0 SPL Token, else Token-2022 */ tokenType?: number }
export interface Plan { candidates: Candidate[]; skipped: { mint: string; reason: string }[]; belowMin: number }

/** Which tokens to touch this run. Trading claim when the partner fee meets the threshold; migrated tokens always go through
 *  (migration fee / surplus / DAMM v2 LP, each with its own check). Tokens whose config feeClaimer is not the signer are skipped.
 *  Largest partner fee first, so the per-run cap takes the biggest claims. */
export function planAutoclaim(rows: TokenRow[], accounts: Map<string, Buffer | null>, decode: DecodeFn, signer: PublicKey, minLamports: bigint): Plan {
  const plan: Plan = { candidates: [], skipped: [], belowMin: 0 };
  const cfgOf = new Map<string, { fc: string | null; tokenType?: number }>();
  const cfg = (config: string) => {
    if (!cfgOf.has(config)) {
      const d = accounts.get(config);
      let v: { fc: string | null; tokenType?: number } = { fc: null };
      try { if (d) { const c = decode("poolConfig", d); v = { fc: c.feeClaimer?.toBase58() ?? null, tokenType: c.tokenType == null ? undefined : Number(c.tokenType) }; } } catch { v = { fc: null }; }
      cfgOf.set(config, v);
    }
    return cfgOf.get(config)!;
  };
  for (const row of rows) {
    const { fc, tokenType } = cfg(row.config);
    if (fc !== signer.toBase58()) { plan.skipped.push({ mint: row.mint, reason: `config ${row.config} feeClaimer is ${fc ?? "unknown"}, not the signer` }); continue; }
    const data = accounts.get(row.pool);
    if (!data) { plan.skipped.push({ mint: row.mint, reason: `pool ${row.pool} not found` }); continue; }
    let fees: PartnerFees;
    try { fees = partnerFeesOf(decode("virtualPool", data)); } catch (e) { plan.skipped.push({ mint: row.mint, reason: `pool ${row.pool} not decodable: ${(e as Error).message}` }); continue; }
    const migrated = row.is_migrated || fees.migrated;
    const trading = meetsMin(fees.quote, fees.base, minLamports);
    if (!trading && fees.quote > 0n) plan.belowMin++;
    if (trading || migrated) plan.candidates.push({ row, fees, migrated, trading, tokenType });
  }
  plan.candidates.sort((a, b) => (b.fees.quote > a.fees.quote ? 1 : b.fees.quote < a.fees.quote ? -1 : 0));
  return plan;
}

export interface AutoclaimSummary {
  mode: "live" | "simulate"; tokens: number; accounts: number; candidates: number; belowMin: number;
  claimed: number; wouldClaim: number; skipped: number; failed: number; capped: number; lamports: bigint; results: ClaimResult[];
}
type Claimer = Pick<FeeClaimer, "forToken">;
export interface AutoclaimDeps {
  q: Q;
  conn: AccountsConn;
  decode: DecodeFn;
  signer: Keypair;
  settings: AutoclaimSettings;
  log?: (m: string) => void;
  /** Test seam; default = new FeeClaimer(signer, settings.live, opts). */
  makeClaimer?: (opts: FeeClaimerOpts) => Claimer;
  claimerOpts?: Omit<FeeClaimerOpts, "receiver" | "minLamports" | "budget" | "q">;
}

const fmt = (r: ClaimResult) => `${r.status} ${r.source} ${r.pool} ${r.lamports} lamports${r.baseAmount ? ` + ${r.baseAmount} base` : ""}${r.sig ? ` ${r.sig}` : ""}${r.note ? ` (${r.note})` : ""}`;

/** One autoclaim pass (caller holds the advisory lock). A failing token is logged and counted; the others still run. */
export async function runAutoclaim(d: AutoclaimDeps): Promise<AutoclaimSummary> {
  const log = d.log ?? console.log, s = d.settings;
  const { rows } = await d.q.query("SELECT mint, pool, config, is_migrated, damm_pool FROM tokens ORDER BY created_at") as { rows: TokenRow[] };
  const accounts = await readAccounts(d.conn, [...rows.map((r) => r.pool), ...rows.map((r) => r.config)]);
  const plan = planAutoclaim(rows, accounts, d.decode, d.signer.publicKey, s.minLamports);
  for (const k of plan.skipped) log(`[autoclaim] skip ${k.mint}: ${k.reason}`);
  // second batched read: does the receiver's base ATA already exist? (base fee 0: a fresh one is created + closed in the claim tx)
  const owner = s.receiver ?? d.signer.publicKey;
  const ataOf = new Map<Candidate, string>();
  for (const c of plan.candidates) if (c.trading && c.fees.base === 0n && c.fees.baseMint && c.tokenType != null)
    ataOf.set(c, getAssociatedTokenAddressSync(new PublicKey(c.fees.baseMint), owner, true, c.tokenType === 0 ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID).toBase58());
  const atas = ataOf.size ? await readAccounts(d.conn, [...ataOf.values()]) : new Map<string, Buffer | null>();
  const budget = { left: s.maxPerRun };
  const opts: FeeClaimerOpts = { ...d.claimerOpts, receiver: s.receiver, minLamports: s.minLamports, budget, q: d.q };
  const claimer = d.makeClaimer ? d.makeClaimer(opts) : new FeeClaimer(d.signer, s.live, opts);
  const sum: AutoclaimSummary = { mode: s.live ? "live" : "simulate", tokens: rows.length, accounts: accounts.size, candidates: plan.candidates.length, belowMin: plan.belowMin,
    claimed: 0, wouldClaim: 0, skipped: 0, failed: 0, capped: 0, lamports: 0n, results: [] };
  for (const c of plan.candidates) {
    if (budget.left <= 0) { sum.capped++; continue; }
    const ata = ataOf.get(c);
    const fo: ForTokenOpts = { partner: { quote: c.fees.quote, base: c.fees.base }, baseMint: c.fees.baseMint, ...(ata ? { baseAtaExists: atas.get(ata) != null } : {}) };
    try {
      for (const r of await claimer.forToken(c.row.mint, c.row.pool, c.migrated, c.row.damm_pool, c.row.config, fo)) {
        sum.results.push(r);
        if (r.status === "claimed") { sum.claimed++; sum.lamports += r.lamports; }
        else if (r.status === "would-claim") { sum.wouldClaim++; sum.lamports += r.lamports; }
        else if (r.note?.startsWith("CLAIM_MAX_PER_RUN")) sum.capped++;
        else if (r.note) sum.skipped++;
        if (r.status !== "skipped" || r.note) log(`[autoclaim] ${fmt(r)}`);
      }
    } catch (e) { sum.failed++; log(`[autoclaim] ERROR ${c.row.mint} ${c.row.pool}: ${(e as Error).message}`); }
  }
  if (sum.capped) log(`[autoclaim] CLAIM_MAX_PER_RUN=${s.maxPerRun} reached: ${sum.capped} left for the next run`);
  log(`[autoclaim] summary mode=${sum.mode}${s.reason ? ` (${s.reason})` : ""} tokens=${sum.tokens} accounts=${sum.accounts} candidates=${sum.candidates} belowMin=${sum.belowMin} `
    + `${s.live ? `claimed=${sum.claimed}` : `wouldClaim=${sum.wouldClaim}`} lamports=${sum.lamports} (${Number(sum.lamports) / 1e9} SOL) skipped=${sum.skipped} failed=${sum.failed} capped=${sum.capped} `
    + `minSol=${Number(s.minLamports) / 1e9} receiver=${(s.receiver ?? d.signer.publicKey).toBase58()}`);
  return sum;
}

/** Run fn while holding a transaction-scoped pg advisory lock (PgBouncer transaction mode allows no session locks). The lock
 *  transaction stays open for the whole run on its own connection; fee_claims rows are written on other connections and commit
 *  immediately. Returns { ran: false } when another run holds the lock. */
export async function withAutoclaimLock<T>(txFn: <R>(fn: (c: Q) => Promise<R>) => Promise<R>, fn: () => Promise<T>, key = AUTOCLAIM_LOCK_KEY): Promise<{ ran: true; value: T } | { ran: false }> {
  return txFn(async (c) => {
    const r = await c.query("SELECT pg_try_advisory_xact_lock($1::bigint) AS ok", [String(key)]);
    if (!r.rows[0]?.ok) return { ran: false as const };
    return { ran: true as const, value: await fn() };
  });
}
