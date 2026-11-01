/** The extra cost a trade or launch carries on top of its amount, shown before signing: the priority fee the user picked and the
 *  highbar fee (0.02%) when the API enables it. No tip is ever added (see STORE_COMPLIANCE.md). Pure, the content scripts use it. */
import { extFeeLamports, type FeeInfo } from "./feemath";
import { priorityLamports, solText } from "./priomath";

export interface ExtraCosts {
  priority: bigint;
  /** null when the fee is off; undefined when it is on but its basis is not known yet (a sell before its quote). */
  fee: bigint | null | undefined;
  /** priority + fee (lamports); a lower bound when the fee basis is unknown. */
  total: bigint;
  /** "Priority 0.0001 · highbar fee 0.02% 0.0002 · extra ≈ 0.0003 SOL" split into parts for the UI. */
  parts: { k: string; v: string }[];
}
export function extraCosts(prioritySol: number, fee: FeeInfo | null, basisLamports: bigint | null, unknown = "of SOL out"): ExtraCosts {
  const priority = priorityLamports(prioritySol);
  const on = !!fee?.enabled;
  const f = !on ? null : basisLamports === null ? undefined : extFeeLamports(basisLamports);
  const total = priority + (f ?? 0n);
  const num = (l: bigint) => solText(l).replace(/ SOL$/, "");
  const parts = [{ k: "Priority", v: num(priority) }];
  if (on) parts.push({ k: "highbar fee 0.02%", v: f === undefined ? unknown : num(f!) });
  parts.push({ k: f === undefined ? "Extra ≥" : "Extra", v: solText(total) });
  return { priority, fee: f, total, parts };
}
/** The same as one line of text. */
export const costsText = (c: ExtraCosts) => c.parts.map((p) => `${p.k} ${p.v}`).join(" · ");
