import { PublicKey, type Connection } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type { Q } from "../db/pool.js";
import { openbookTables } from "./write.js";
import { walletRoles, type PlatformWallets } from "./wallets.js";

/** Wallet balance snapshots for the Open Book wallet cards: ONE getMultipleAccountsInfo per run (wallets + referral WSOL ATA +
 *  $HIGHER ATAs of the treasury / platform), every OPENBOOK_SNAPSHOT_MS (default 10 min = 144 calls/day; 0 = off).
 *  History is pruned after 35 days. The api never reads balances live on a request. */
export const SNAPSHOT_KEEP_MS = 35 * 86_400_000;
const u64At = (d: Buffer, off: number) => (d.length >= off + 8 ? d.readBigUInt64LE(off) : null);

export interface SnapshotRow { address: string; roles: string; lamports: bigint | null; wsolLamports: bigint | null; barRaw: string | null; slot: number | null }

/** Accounts to read in one call, and how to fold the results back into one row per wallet. */
export function snapshotPlan(w: PlatformWallets, barMint: string | null) {
  const roles = walletRoles(w);
  const keys: string[] = [...roles.keys()];
  const extra: { key: string; owner: string; kind: "wsol" | "bar" }[] = [];
  if (w.referral && w.referralWsolAta) extra.push({ key: w.referralWsolAta, owner: w.referral, kind: "wsol" });
  if (barMint) for (const owner of [w.treasury, w.platform, w.feeReceiver]) {
    if (!owner || extra.some((e) => e.owner === owner && e.kind === "bar")) continue;
    for (const prog of [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID])
      extra.push({ key: getAssociatedTokenAddressSync(new PublicKey(barMint), new PublicKey(owner), true, prog).toBase58(), owner, kind: "bar" });
  }
  return { roles, keys: [...keys, ...extra.map((e) => e.key)], extra };
}

export function foldSnapshot(plan: ReturnType<typeof snapshotPlan>, infos: ({ lamports: number; data: Buffer } | null)[], slot: number | null): SnapshotRow[] {
  const rows = new Map<string, SnapshotRow>();
  [...plan.roles.entries()].forEach(([address, roles], i) =>
    rows.set(address, { address, roles: roles.join(","), lamports: infos[i] ? BigInt(infos[i]!.lamports) : null, wsolLamports: null, barRaw: null, slot }));
  plan.extra.forEach((e, j) => {
    const info = infos[plan.roles.size + j], r = rows.get(e.owner);
    if (!r) return;
    const amt = info ? u64At(info.data, 64) : null;
    if (e.kind === "wsol") r.wsolLamports = amt ?? 0n;
    else if (amt != null) r.barRaw = String(BigInt(r.barRaw ?? "0") + amt);
    else if (r.barRaw == null) r.barRaw = "0";
  });
  return [...rows.values()];
}

export async function snapshotOnce(q: Q, conn: Pick<Connection, "getMultipleAccountsInfoAndContext">, w: PlatformWallets, barMint: string | null, now = Date.now()) {
  if (!(await openbookTables(q, now))) return 0;
  const plan = snapshotPlan(w, barMint);
  if (!plan.keys.length) return 0;
  const res = await conn.getMultipleAccountsInfoAndContext(plan.keys.slice(0, 100).map((k) => new PublicKey(k)));
  const rows = foldSnapshot(plan, res.value as any, res.context.slot);
  for (const r of rows)
    await q.query(`INSERT INTO wallet_snapshots (address, taken_at, roles, lamports, wsol_lamports, bar_raw, slot) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (address, taken_at) DO NOTHING`,
      [r.address, now, r.roles, r.lamports == null ? null : String(r.lamports), r.wsolLamports == null ? null : String(r.wsolLamports), r.barRaw, r.slot]);
  await q.query("DELETE FROM wallet_snapshots WHERE taken_at < $1", [now - SNAPSHOT_KEEP_MS]);
  return rows.length;
}

export function startSnapshotLoop(q: Q, conn: () => Pick<Connection, "getMultipleAccountsInfoAndContext">, wallets: () => PlatformWallets, barMint: () => string | null,
  log: (m: string) => void = console.log, everyMs = Number(process.env.OPENBOOK_SNAPSHOT_MS ?? 600_000)) {
  if (!Number.isFinite(everyMs) || everyMs <= 0) return () => {};
  const ms = Math.max(60_000, everyMs);
  let busy = false;
  const tick = async () => {
    if (busy) return; busy = true;
    try { await snapshotOnce(q, conn(), wallets(), barMint()); } catch (e) { log(`[openbook] snapshot failed: ${(e as Error).message}`); } finally { busy = false; }
  };
  const t = setInterval(tick, ms); t.unref?.();
  setTimeout(tick, 15_000).unref?.();
  return () => clearInterval(t);
}
