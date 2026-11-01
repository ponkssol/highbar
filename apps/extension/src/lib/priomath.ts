/** Priority fee math and display, no Solana library (the content scripts import this). See ./priority.ts for the transactions.
 *  The user picks a total priority fee in SOL; a tx gets setComputeUnitLimit(limit) + setComputeUnitPrice(price) with
 *  price = floor(lamports * 1e6 / limit) micro-lamports per CU, so price x limit never exceeds what was picked. */
export const PRIORITY_PRESETS_SOL = [0.0001, 0.001, 0.005] as const;
export const PRIORITY_DEFAULT_SOL = 0.0001;
/** Hard sanity max: a priority fee above this is refused (UI and before signing). */
export const PRIORITY_MAX_SOL = 0.1;
export const PRIORITY_MAX_LAMPORTS = 100_000_000n;
/** Max compute units a tx may ask for (Solana's limit). */
export const CU_MAX = 1_400_000;
/** Compute unit limits per path, used when no simulation result is there yet. A DBC or DAMM trade is tightened after its safety
 *  simulation to unitsConsumed x 1.2; Jupiter brings its own simulated limit (dynamicComputeUnitLimit). */
export const CU_LIMIT = { dbc: 200_000, damm: 250_000, launch: 400_000, launchNoBuy: 250_000, jupiter: 1_400_000 } as const;
/** Floor for a tightened limit (a tx never gets fewer CUs than this). */
export const CU_MIN = 30_000;

/** A stored or typed priority fee in SOL: 0 to 0.1, 9 decimals at most; anything else is the default. */
export function readPrioritySol(v: unknown): number {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  return typeof v !== "boolean" && v !== null && v !== "" && Number.isFinite(n) && n >= 0 && n <= PRIORITY_MAX_SOL ? Math.round(n * 1e9) / 1e9 : PRIORITY_DEFAULT_SOL;
}
/** Error text for a typed value, or null when it is fine. */
export function priorityError(v: string): string | null {
  const n = Number(v.trim().replace(",", "."));
  if (!v.trim() || !Number.isFinite(n) || n < 0) return "Enter a SOL amount";
  if (n > PRIORITY_MAX_SOL) return `Max ${PRIORITY_MAX_SOL} SOL`;
  return null;
}
export const priorityLamports = (sol: number): bigint => BigInt(Math.round(readPrioritySol(sol) * 1e9));
/** micro-lamports per CU for a total of `lamports` over `limit` CUs (floor). */
export const cuPrice = (lamports: bigint, limit: number): bigint => (limit > 0 ? (lamports * 1_000_000n) / BigInt(limit) : 0n);
/** What price x limit actually costs (ceil, as the runtime charges it). */
export const priorityCost = (price: bigint, limit: number): bigint => (price * BigInt(limit) + 999_999n) / 1_000_000n;
/** A limit from a simulation: unitsConsumed x 1.2, between CU_MIN and the path's limit. */
export const tightLimit = (units: number | null | undefined, limit: number): number =>
  typeof units === "number" && units > 0 ? Math.min(limit, Math.max(CU_MIN, Math.ceil(units * 1.2))) : limit;

/** Display: "0.0001 SOL". */
export const solText = (lamports: bigint | number): string => {
  const n = Number(lamports) / 1e9;
  return `${n > 0 ? n.toFixed(9).replace(/0+$/, "").replace(/\.$/, "") : "0"} SOL`;
};
