/** Reviewed quote assets for DBC configs (browser-safe: no fs, no dotenv). Allowlist only: an arbitrary quote mint is a trap for
 *  traders (freeze or mint authority, fake lookalikes), so every entry is reviewed. Non-SOL quotes are DEVNET ONLY until the
 *  indexer, API accounting (fees, cashback, referral, Open Book) and the UI all support them. */
import { PublicKey } from "@solana/web3.js";

export type QuoteId = "SOL" | "USDC";
export type QuoteNetwork = "devnet" | "mainnet";
export interface QuoteAsset { id: QuoteId; mint: PublicKey; decimals: number; networks: QuoteNetwork[] }

export const WSOL = new PublicKey("So11111111111111111111111111111111111111112");
export const QUOTES: Record<QuoteId, QuoteAsset> = {
  SOL: { id: "SOL", mint: WSOL, decimals: 9, networks: ["devnet", "mainnet"] },
  USDC: { id: "USDC", mint: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"), decimals: 6, networks: ["devnet"] }, // Circle devnet USDC
};

/** The allowlisted quote with this mint on this network, or null (unknown mint, or enabled on another network only). */
export function allowedQuote(mint: PublicKey, network: QuoteNetwork): QuoteAsset | null {
  return Object.values(QUOTES).find((q) => q.mint.equals(mint) && q.networks.includes(network)) ?? null;
}
