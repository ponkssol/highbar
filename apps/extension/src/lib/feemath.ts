/** highbar fee math and display, no Solana library (the content scripts import this). See ./fee.ts for the transactions. */
/** @hb/shared EXT_FEE_BPS */
export const EXT_FEE_BPS = 2;
const BPS = 10_000;
/** Max serialized size of a Solana transaction (legacy or v0). */
export const TX_MAX_BYTES = 1232;
export const FEE_LABEL = "highbar fee 0.02%";

/** Copy of @hb/shared extFeeLamports: floor(amount * EXT_FEE_BPS / 10000) in bigint (0 below 5000 lamports). */
export function extFeeLamports(amountLamports: bigint | number): bigint {
  if (typeof amountLamports === "number" && !Number.isSafeInteger(amountLamports)) throw new RangeError("amountLamports must be an integer number of lamports (use bigint above 2^53)");
  const a = BigInt(amountLamports);
  if (a < 0n) throw new RangeError("amountLamports must be >= 0");
  return (a * BigInt(EXT_FEE_BPS)) / BigInt(BPS);
}

/** What the content scripts may show (no receiver needed there). */
export interface FeeInfo { enabled: boolean; bps: number }

/** Display: "0.0002 SOL" with up to 9 decimals, no trailing zeros. */
export function feeSol(lamports: bigint | number): string {
  const n = Number(lamports) / 1e9;
  if (!(n > 0)) return "0 SOL";
  return `${n.toFixed(9).replace(/0+$/, "").replace(/\.$/, "")} SOL`;
}
/** Display fee for an amount in SOL (float), same rounding as the tx. */
export const feeForSol = (sol: number): bigint => (Number.isFinite(sol) && sol > 0 ? extFeeLamports(BigInt(Math.round(sol * 1e9))) : 0n);

