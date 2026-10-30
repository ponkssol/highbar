export const shortAddr = (a: string, n = 4) => `${a.slice(0, n)}…${a.slice(-n)}`;
export const fmtSol = (v: number, d = 2) =>
  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(d);
export const fmtUsd = (v: number) =>
  v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(1)}k` : `$${v.toFixed(0)}`;
export function fmtAge(ts: number, now = Date.now()) {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
export const API_URL = "/hb-api"; // same-origin proxy -> server-only API_URL
const SUB = "\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089";
/** Human-readable price, never scientific notation. Tiny values use subscript-zero notation: 2.535e-8 -> "0.0\u20872535".
 *  HTML only, through <Price> (ui.tsx), which turns the subscript into a real <sub> number. The bundled fonts have no subscript-digit glyphs,
 *  so the raw string must not be drawn as plain text or on a canvas (a tiny fallback glyph after "0.0" reads as "0.0;2718"). Use fmtPricePlain there. */
export function fmtPrice(v: number, sig = 4): string {
  if (!Number.isFinite(v) || v === 0) return "0";
  const neg = v < 0 ? "-" : "";
  const a = Math.abs(v);
  if (a >= 1) return neg + a.toLocaleString("en-US", { maximumFractionDigits: a >= 1000 ? 2 : 4 });
  let zeros = Math.floor(-Math.log10(a)) - (Number.isInteger(Math.log10(a)) ? 1 : 0); // zeros after "0."
  let n = Math.round(a * 10 ** (zeros + sig));
  if (n >= 10 ** sig) { // rounding carried into the next digit (0.99999 -> 1, 0.099999 -> 0.1)
    if (zeros === 0) return neg + "1";
    zeros--; n = Math.round(n / 10);
  }
  const digits = String(n).padStart(sig, "0").replace(/0+$/, "") || "0";
  if (zeros < 4) return neg + "0." + "0".repeat(zeros) + digits;
  return neg + "0.0" + String(zeros).split("").map((d) => SUB[+d]).join("") + digits;
}
export const fmtUsdPrice = (v: number) => "$" + fmtPrice(v);
/** Plain decimal price for canvases and plain text (chart axis, crosshair, chart readout): ASCII digits only, no subscript glyphs,
 *  never scientific notation, always a leading zero. 2.718e-5 -> "0.00002718", 0.5 -> "0.5". */
export function fmtPricePlain(v: number, sig = 4): string {
  if (!Number.isFinite(v) || v === 0) return "0";
  const neg = v < 0 ? "-" : "";
  const a = Math.abs(v);
  if (a >= 1) return neg + a.toLocaleString("en-US", { maximumFractionDigits: a >= 1000 ? 2 : 4 });
  const zeros = Math.max(0, Math.floor(-Math.log10(a)) - (Number.isInteger(Math.log10(a)) ? 1 : 0)); // zeros after "0."
  const s = a.toFixed(Math.min(20, zeros + sig)).replace(/\.?0+$/, "");
  return s === "0" || s === "" ? "0" : neg + s;
}