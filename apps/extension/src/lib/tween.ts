/** Number tweens for live stats (pure parts, tested). */
/** easeOutCubic, t in [0, 1]. */
export const ease = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;
/** The value `t` of the way from `from` to `to` (eased). */
export const tweenAt = (from: number, to: number, t: number) => from + (to - from) * ease(t);
/** Compact USD with a fixed number of decimals per unit, so a tween never changes the text width by dropping a digit:
 *  $9.87K, $12.3K, $123K, $1.23M, $12.3M. */
export const fmtUsdFixed = (n: number | null): string => {
  if (n === null || !Number.isFinite(n)) return "–";
  const a = Math.abs(n);
  const f = (v: number, u: string) => { const d = Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2; return `$${v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}${u}`; };
  return a >= 1e9 ? f(n / 1e9, "B") : a >= 1e6 ? f(n / 1e6, "M") : a >= 1e3 ? f(n / 1e3, "K") : f(n, "");
};
/** Short compact USD for the token pills: one decimal under 100 of a unit, none above ($8.0K, $12.3K, $123K, $1.2M). */
export const fmtUsdShort = (n: number | null): string => {
  if (n === null || !Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  const f = (v: number, u: string) => { const d = Math.abs(v) >= 100 ? 0 : 1; return `$${v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}${u}`; };
  return a >= 1e9 ? f(n / 1e9, "B") : a >= 1e6 ? f(n / 1e6, "M") : a >= 1e3 ? f(n / 1e3, "K") : `$${Math.round(n)}`;
};
