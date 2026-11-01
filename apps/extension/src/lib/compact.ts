/** Compact numbers for the narrow cards (300 px popup): 1.2K, 3.4M, 5.6B, 7.8T; SOL with decimals that fit its size. */
const SUB = "₀₁₂₃₄₅₆₇₈₉";
const sign = (n: number, signed: boolean) => (n < 0 ? "−" : signed && n > 0 ? "+" : "");
/** Token amounts and other counts: 410.17K, 3.4M, 999 (2 decimals under 1 000). */
export function compactNum(n: number | null, signed = false): string {
  if (n === null || !Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  const f = (v: number, u: string, d = v >= 100 ? 1 : 2) => `${sign(n, signed)}${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: d })}${u}`;
  return a >= 1e12 ? f(a / 1e12, "T") : a >= 1e9 ? f(a / 1e9, "B") : a >= 1e6 ? f(a / 1e6, "M") : a >= 1e3 ? f(a / 1e3, "K") : f(a, "", 2);
}
/** SOL amounts: 12.3K, 1,234 (no decimals from 1 000), 12.35, 0.018, 0.0042, 0.0₄12 for dust. No unit. */
export function compactSol(n: number | null, signed = false): string {
  if (n === null || !Number.isFinite(n)) return "—";
  const a = Math.abs(n), s = sign(n, signed);
  if (a >= 1e4) return compactNum(n, signed);
  const fx = (d: number) => `${s}${a.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
  if (a >= 1000) return fx(0);
  if (a >= 10) return fx(2);
  if (a >= 0.01 || a === 0) return fx(3);
  if (a >= 0.0001) return `${s}${Number(a.toPrecision(2))}`;
  const t = a.toFixed(20).slice(2), z = t.match(/^0*/)![0].length;
  return `${s}0.0${String(z).split("").map((d) => SUB[Number(d)]).join("")}${t.slice(z, z + 2).replace(/0+$/, "")}`;
}
/** Percent: −14.6%, +2.3K% for a moonshot. */
export function compactPct(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "";
  const a = Math.abs(n), s = sign(n, true);
  return a >= 10_000 ? `${s}${compactNum(a)}%` : `${s}${a.toFixed(a >= 1000 ? 0 : 1)}%`;
}
