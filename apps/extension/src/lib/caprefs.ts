/** CA popup slippage: presets 0.5, 1 and 5 %, or a custom value from 0.1 to 50 (one decimal). Default 1 %. */
export const CA_SLIPPAGE_PRESETS = [0.5, 1, 5] as const;
export const CA_SLIPPAGE_DEFAULT = 1;
export function cleanCaSlippage(v: unknown): number {
  const n = Math.round(Number(v) * 10) / 10;
  return Number.isFinite(n) && n >= 0.1 && n <= 50 ? n : CA_SLIPPAGE_DEFAULT;
}
