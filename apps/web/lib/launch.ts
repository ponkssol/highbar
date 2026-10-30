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
/** Wallet half of the launch: sign only (the API co-signs with the vanity mint afterwards), then broadcast raw bytes. */
export interface LaunchWallet { sign: (tx: Transaction) => Promise<Transaction>; sendRaw: (bytes: Uint8Array) => Promise<string> }
export type LaunchStep = "metadata" | "mint" | "sign" | "cosign" | "send";

export async function quoteDevBuy(tier: TierId, antiSniper: boolean, devBuySol: number, slippageBps = 100): Promise<DevBuyQuote> {
  const r = await fetch(`/hb-api/tx/launch/quote?tier=${tier}&antiSniper=${antiSniper}&devBuySol=${devBuySol}&slippageBps=${slippageBps}`);
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? `quote failed (${r.status})`);
  return j;
}

const b64 = (b: Uint8Array) => { let s = ""; for (const x of b) s += String.fromCharCode(x); return btoa(s); };
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/**
 * Vanity-mint launch (every mint ends in "high"):
 *  1. POST /metadata                 hosted metadata, its uri goes on-chain
 *  2. POST /tx/launch                the API reserves a pre-ground "...high" mint (pubkey only) and builds the unsigned tx
 *  3. wallet signTransaction         the creator signs first (fee payer / pool creator)
 *  4. POST /tx/launch/sign           the API validates exactly these bytes and adds the mint signature
 *  5. sendRawTransaction + POST /mint/confirm
 * An empty pool is an error ("no ...high mint address is available right now"); there is no random-mint fallback.
 */
export async function launchToken(input: LaunchInput, creator: string, wallet: LaunchWallet, onStep?: (s: LaunchStep) => void): Promise<{ mint: string; pool: string; signature: string }> {
  onStep?.("metadata");
  const image = input.image ? await toDataUrl(input.image) : undefined;
  const meta = await post<{ uri: string }>("/metadata", { name: input.name, symbol: input.ticker, description: input.description, website: input.website, twitter: input.twitter, telegram: input.telegram, image });
  onStep?.("mint");
  const r = await post<{ tx: string; mint: string; pool: string }>("/tx/launch", {
    creator, name: input.name, symbol: input.ticker, uri: meta.uri, tier: input.tier, antiSniper: input.antiSniper,
    devBuySol: input.devBuySol ?? 0, slippageBps: input.slippageBps ?? 100,
  });
  if (!r.mint.endsWith("high")) throw new Error("unexpected mint address from the server");
  onStep?.("sign");
  const signed = await wallet.sign(Transaction.from(unb64(r.tx)));
  onStep?.("cosign");
  const full = await post<{ tx: string; signature: string }>("/tx/launch/sign", { mint: r.mint, tx: b64(signed.serialize({ requireAllSignatures: false, verifySignatures: false })) });
  onStep?.("send");
  const signature = await wallet.sendRaw(unb64(full.tx));
  void confirmLater(r.mint);
  return { mint: r.mint, pool: r.pool, signature };
}

/** Best effort: mark the mint used once its account is visible (the server sweeper covers it otherwise). */
async function confirmLater(mint: string) {
  for (let i = 0; i < 6; i++) {
    await new Promise((res) => setTimeout(res, 3000));
    const ok = await post<{ used: boolean }>("/mint/confirm", { mint }).then((x) => x.used).catch(() => false);
    if (ok) return;
  }
}
function toDataUrl(f: File): Promise<string> {
  if (f.size > 2 * 1024 * 1024) return Promise.reject(new Error("Image must be 2 MB or smaller"));
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error("Could not read image")); r.readAsDataURL(f); });
}