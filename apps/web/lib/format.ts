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
/** Human-readable price, never scientific notation. Tiny values use subscript-zero notation: 2.535e-8 -> "0.0\u20872535". */
export function fmtPrice(v: number, sig = 4): string {
  if (!Number.isFinite(v) || v === 0) return "0";
  const neg = v < 0 ? "-" : "";
  const a = Math.abs(v);
  if (a >= 1) return neg + a.toLocaleString("en-US", { maximumFractionDigits: a >= 1000 ? 2 : 4 });
  const zeros = Math.floor(-Math.log10(a)) - (Number.isInteger(Math.log10(a)) ? 1 : 0); // zeros after "0."
  const digits = Math.round(a * 10 ** (zeros + sig)).toString().slice(0, sig).replace(/0+$/, "") || "0";
  if (zeros < 4) return neg + "0." + "0".repeat(zeros) + digits;
  return neg + "0.0" + String(zeros).split("").map((d) => SUB[+d]).join("") + digits;
}
export const fmtUsdPrice = (v: number) => "$" + fmtPrice(v);