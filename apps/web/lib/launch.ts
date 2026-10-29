import { Transaction } from "@solana/web3.js";
import type { TierId } from "@hb/shared";
import { post } from "./api";

export interface LaunchInput {
  name: string; ticker: string; description: string; image?: File | null;
  website?: string; twitter?: string; telegram?: string; tier: TierId; antiSniper: boolean;
}
type Sender = (tx: Transaction) => Promise<string>;

/** Builds createPool via the API (baseMint keypair pre-signs server-side), wallet signs + sends.
 *  TODO: image/metadata upload (Pinata) -> uri; for now uri is empty. */
export async function launchToken(input: LaunchInput, creator: string, send: Sender): Promise<{ mint: string; pool: string; signature: string }> {
  const r = await post<{ tx: string; mint: string; pool: string }>("/tx/launch", {
    creator, name: input.name, symbol: input.ticker, uri: "", tier: input.tier, antiSniper: input.antiSniper,
  });
  const tx = Transaction.from(Uint8Array.from(atob(r.tx), (c) => c.charCodeAt(0)));
  const signature = await send(tx);
  return { mint: r.mint, pool: r.pool, signature };
}