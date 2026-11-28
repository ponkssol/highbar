import { allowedQuote, QUOTES, WSOL, type QuoteAsset, type QuoteId } from "@hb/onchain";

/** Quote symbol of a stored token (SOL when the column is empty or unknown to this build). */
export function quoteIdOf(t: { quoteMint?: string }): QuoteId {
  const m = t.quoteMint ?? WSOL.toBase58();
  return (Object.values(QUOTES).find((q) => q.mint.toBase58() === m)?.id ?? "SOL") as QuoteId;
}

/** Market cap in USD from the stored mcapSol (which is in the quote's own units): USDC is already USD, SOL needs the SOL price. */
export function mcapUsdOf(t: { quoteMint?: string; mcapSol: number }, solUsd: number): number {
  return quoteIdOf(t) === "USDC" ? t.mcapSol : t.mcapSol * solUsd;
}

/** The reviewed quote asset of a stored token; throws for a quote this build does not know (fail closed). SOL when the column is empty. */
export function quoteAssetOf(t: { quoteMint?: string } | null | undefined): QuoteAsset {
  if (!t?.quoteMint) return QUOTES.SOL;
  const q = Object.values(QUOTES).find((x) => x.mint.toBase58() === t.quoteMint);
  if (!q) throw new Error(`unsupported quote mint ${t.quoteMint}`);
  return q;
}
export { allowedQuote };
