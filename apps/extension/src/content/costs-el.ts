/** The extra-cost line ("Priority 0.001 · highbar fee 0.02% 0.0004   Extra 0.0014 SOL") as nodes. A separator always travels
 *  with the part after it (one no-wrap chunk), and the total has no separator at all (it sits at the right, in gold), so a
 *  narrow layout wraps between whole parts and never leaves a line ending in "·". */
import { h } from "./dom";
import type { ExtraCosts } from "../lib/costs";

export function costsNodes(c: ExtraCosts): Node[] {
  const items = c.parts.slice(0, -1), tot = c.parts[c.parts.length - 1];
  return [
    h("span", { class: "cparts" }, ...items.map((p, i) => h("span", { class: "cpart" }, ...(i ? [h("span", { class: "csep" }, "·")] : []), `${p.k} `, h("b", {}, p.v)))),
    h("span", { class: "tot" }, `${tot.k} `, h("b", {}, tot.v)),
  ];
}
