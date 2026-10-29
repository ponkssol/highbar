import { Transaction } from "@solana/web3.js";
import type { TierId } from "@hb/shared";
import { post } from "./api";

export interface LaunchInput {
  name: string; ticker: string; description: string; image?: File | null;
  website?: string; twitter?: string; telegram?: string; tier: TierId; antiSniper: boolean;
  /** Optional creator buy, executed in the same transaction as pool creation (Block 0). */
  devBuySol?: number; slippageBps?: number;
}
export interface DevBuyQuote { devBuySol: number; estTokens: number; minTokens: number; supplyPct: number; feeSol: number; feePct: number; minFeeApplied: boolean; thresholdSol: number; maxDevBuySol: number }
type Sender = (tx: Transaction) => Promise<string>;

export async function quoteDevBuy(tier: TierId, antiSniper: boolean, devBuySol: number, slippageBps = 100): Promise<DevBuyQuote> {
  const r = await fetch(`/hb-api/tx/launch/quote?tier=${tier}&antiSniper=${antiSniper}&devBuySol=${devBuySol}&slippageBps=${slippageBps}`);
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? `quote failed (${r.status})`);
  return j;
}

/** Builds createPool (+ optional dev buy in the same tx) via the API; the baseMint keypair pre-signs server-side, the wallet signs + sends.
 *  TODO: image/metadata upload (Pinata) -> uri; for now uri is empty. */
export async function launchToken(input: LaunchInput, creator: string, send: Sender): Promise<{ mint: string; pool: string; signature: string }> {
  const r = await post<{ tx: string; mint: string; pool: string }>("/tx/launch", {
    creator, name: input.name, symbol: input.ticker, uri: "", tier: input.tier, antiSniper: input.antiSniper,
    devBuySol: input.devBuySol ?? 0, slippageBps: input.slippageBps ?? 100,
  });
  const tx = Transaction.from(Uint8Array.from(atob(r.tx), (c) => c.charCodeAt(0)));
  const signature = await send(tx);
  return { mint: r.mint, pool: r.pool, signature };
}