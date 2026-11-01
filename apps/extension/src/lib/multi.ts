/** Multi create: one separate token per checked wallet, from the same draft. Pure orchestration (no chrome, no network) so it
 *  can be unit tested. The worker supplies the keypair lookup, the balance read and the single create. */
import type { Keypair } from "@solana/web3.js";
import type { LaunchDone, LaunchStep } from "./messages";

/** What one launch costs on top of the dev buy and its fee: rent for the mint, the pool and its vaults, the metadata
 *  account and the dev buy token account, plus network and priority fees. A conservative estimate, not a quote. */
export const LAUNCH_OVERHEAD_SOL = 0.025;
/** At most this many tokens per batch (the API allows 6 launch builds a minute and 20 an hour per IP). */
export const MULTI_MAX = 10;

/** SOL a wallet needs for one launch: the dev buy, its fee (from the quote, 0 when unknown) and the overhead. */
export function launchNeedSol(devBuySol: number, feeSol = 0): number {
  const d = Number.isFinite(devBuySol) && devBuySol > 0 ? devBuySol : 0, f = Number.isFinite(feeSol) && feeSol > 0 ? feeSol : 0;
  return Math.round((d + f + LAUNCH_OVERHEAD_SOL) * 1e9) / 1e9;
}
/** True only when the balance is known and below what the launch needs (an unknown balance is not flagged). */
export const isShort = (sol: number | null | undefined, need: number) => typeof sol === "number" && sol < need;

// ---- the checked wallet set (chrome.storage.local "hb.drawerWallets", replacing the single "hb.drawerWallet") ----
/** The checked ids that still exist, in wallet list order, never empty while there is a wallet. Accepts the old single id
 *  (a string) as well as the new array, falls back to the active wallet, then the first one. */
export function readChecked(stored: unknown, legacy: unknown, walletIds: string[], activeId: string | null): string[] {
  const want = new Set<string>(Array.isArray(stored) ? stored.filter((x): x is string => typeof x === "string") : typeof stored === "string" ? [stored] : []);
  if (!want.size && typeof legacy === "string") want.add(legacy);
  const out = walletIds.filter((id) => want.has(id));
  if (out.length) return out;
  const fb = activeId && walletIds.includes(activeId) ? activeId : walletIds[0];
  return fb ? [fb] : [];
}
/** Toggles one wallet, keeping at least one checked. */
export function toggleChecked(checked: string[], id: string, order: string[]): string[] {
  const has = checked.includes(id);
  if (has && checked.length <= 1) return checked;
  const next = new Set(checked); if (has) next.delete(id); else next.add(id);
  return order.filter((x) => next.has(x));
}

// ---- the run ----
export type MultiStatus = "queued" | "running" | "done" | "failed" | "skipped";
export interface MultiTarget { id: string; label: string; address: string }
export interface MultiRow extends MultiTarget { status: MultiStatus; step?: LaunchStep; result?: LaunchDone; error?: string }
export interface MultiDeps {
  /** The wallet's own keypair (worker only). Only this keypair signs that wallet's create. */
  keypair(id: string): Promise<Keypair>;
  /** Fresh SOL balance, null when it cannot be read (then the launch is tried and the RPC preflight decides). */
  balance(address: string): Promise<number | null>;
  /** One full create for one wallet (mint, sign-in and referral, sign, co-sign, send). */
  createOne(kp: Keypair, t: MultiTarget, step: (s: LaunchStep) => void): Promise<LaunchDone>;
  /** Every row change, for the progress view. */
  update(rows: MultiRow[]): void;
}

/** Runs one create per target with `concurrency` at a time (1 = one after the other). A failure or a skip never stops the
 *  others. Resolves with every row once all have finished. */
export async function runMulti(targets: MultiTarget[], needSol: number, deps: MultiDeps, concurrency = 1): Promise<MultiRow[]> {
  const rows: MultiRow[] = targets.map((t) => ({ ...t, status: "queued" }));
  const emit = () => deps.update(rows.map((r) => ({ ...r })));
  emit();
  let next = 0;
  const one = async (r: MultiRow) => {
    r.status = "running"; emit();
    try {
      const sol = await deps.balance(r.address).catch(() => null);
      if (isShort(sol, needSol)) { r.status = "skipped"; r.error = `Not enough SOL, has ${fmt(sol!)} and needs about ${fmt(needSol)}`; return; }
      const kp = await deps.keypair(r.id);
      if (kp.publicKey.toBase58() !== r.address) throw new Error("Wallet does not match its address");
      r.result = await deps.createOne(kp, r, (s) => { r.step = s; emit(); });
      r.status = "done";
    } catch (e) { r.status = "failed"; r.error = ((e as Error)?.message || "Something went wrong").slice(0, 240); }
    finally { emit(); }
  };
  const lane = async () => { while (next < rows.length) await one(rows[next++]); };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, rows.length)) }, lane));
  return rows.map((r) => ({ ...r }));
}
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 4 });
