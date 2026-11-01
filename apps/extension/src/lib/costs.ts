/** The extra cost a trade or launch carries on top of its amount, shown before signing: the priority fee the user picked and the
 *  highbar fee (0.02%) when the API enables it. No tip is ever added (see STORE_COMPLIANCE.md). Pure, the content scripts use it. */
import { extFeeLamports, type FeeInfo } from "./feemath";
import { priorityLamports } from "./priomath";

export interface ExtraCosts {
  priority: bigint;
  /** null when the fee is off; undefined when it is on but its basis is not known yet (a sell before its quote). */
  fee: bigint | null | undefined;
  /** priority + fee (lamports); a lower bound when the fee basis is unknown. */
  total: bigint;
  /** "Priority 0.0001 · highbar fee 0.02% 0.0002 · extra ≈ 0.0003 SOL" split into parts for the UI. */
  parts: { k: string; v: string }[];
}
/** A cost in SOL that stays short: 3 significant digits under 1 SOL (0.000247), 3 decimals above (7.22). */
export function short(l: bigint): string {
  const n = Number(l) / 1e9;
  if (!(n > 0)) return "0";
  const r = n >= 1 ? n.toFixed(3) : Number(n.toPrecision(3)).toFixed(9);
  return r.replace(/0+$/, "").replace(/\.$/, "");
}
export function extraCosts(prioritySol: number, fee: FeeInfo | null, basisLamports: bigint | null, unknown = "of SOL out"): ExtraCosts {
  const priority = priorityLamports(prioritySol);
  const on = !!fee?.enabled;
  const f = !on ? null : basisLamports === null ? undefined : extFeeLamports(basisLamports);
  const total = priority + (f ?? 0n);
  const num = (l: bigint) => short(l);
  const parts = [{ k: "Priority", v: num(priority) }];
  if (on) parts.push({ k: "highbar fee 0.02%", v: f === undefined ? unknown : num(f!) });
  parts.push({ k: f === undefined ? "Extra ≥" : "Extra", v: `${short(total)} SOL` });
  return { priority, fee: f, total, parts };
}
/** The same as one line of text. */
export const costsText = (c: ExtraCosts) => c.parts.map((p) => `${p.k} ${p.v}`).join(" · ");

/** The wallets that cannot pay a buy of `sol` SOL: the amount, the priority fee and the highbar fee (when it is on).
 *  Network rent for a new token account is not counted here (the worker's own check still runs before signing).
 *  Wallets with an unknown balance are never flagged. */
export function shortOnSol<W extends { sol: number | null }>(wallets: W[], sol: number | null, prioritySol: number, fee: FeeInfo | null): W[] {
  if (!sol || !(sol > 0)) return [];
  const need = sol + (prioritySol > 0 ? prioritySol : 0) + (fee?.enabled && fee.bps > 0 ? (sol * fee.bps) / 10_000 : 0);
  return wallets.filter((w) => w.sol != null && w.sol + 1e-9 < need);
}
