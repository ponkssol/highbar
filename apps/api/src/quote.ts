import { QUOTES, WSOL, type QuoteId } from "@hb/onchain";

/** Quote symbol of a stored token (SOL when the column is empty or unknown to this build). */
export function quoteIdOf(t: { quoteMint?: string }): QuoteId {
  const m = t.quoteMint ?? WSOL.toBase58();
  return (Object.values(QUOTES).find((q) => q.mint.toBase58() === m)?.id ?? "SOL") as QuoteId;
}

/** Market cap in USD from the stored mcapSol (which is in the quote's own units): USDC is already USD, SOL needs the SOL price. */
export function mcapUsdOf(t: { quoteMint?: string; mcapSol: number }, solUsd: number): number {
  return quoteIdOf(t) === "USDC" ? t.mcapSol : t.mcapSol * solUsd;
}
