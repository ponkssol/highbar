import { Transaction, type Connection } from "@solana/web3.js";
import type { TierId } from "@hb/shared";
import { post } from "./api";
import { sendAndConfirmRaw } from "./confirmTx";

export interface LaunchInput {
  name: string; ticker: string; description: string; image?: File | null;
  website?: string; twitter?: string; telegram?: string; tier: TierId; antiSniper: boolean;
  /** Optional creator buy, executed in the same transaction as pool creation (Block 0). */
  devBuySol?: number; slippageBps?: number;
}
export interface DevBuyQuote { devBuySol: number; estTokens: number; minTokens: number; supplyPct: number; feeSol: number; feePct: number; minFeeApplied: boolean; thresholdSol: number; maxDevBuySol: number }
/** Wallet half of the launch: sign only (the API co-signs with the vanity mint afterwards). The fully signed bytes are then
 *  broadcast and confirmed on `connection` (lib/confirmTx.ts: "confirmed" commitment, same-bytes rebroadcast). */
export interface LaunchWallet { sign: (tx: Transaction) => Promise<Transaction>; connection: Connection }
export type LaunchStep = "metadata" | "mint" | "sign" | "cosign" | "send" | "confirm";

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
 *  5. sendRawTransaction, wait for "confirmed", then POST /mint/confirm (fire and forget)
 * Random-mint path (server VANITY_MINTS=off, or fallback when the pool is empty): the response says vanity:false /
 * mintSource "random"|"random-fallback" and the tx is already signed by a fresh random mint; the wallet signs and it is
 * sent as-is (no co-sign, no /mint/confirm). With VANITY_MINTS=on an empty pool is an error instead.
 */
export type MintSource = "pool" | "random" | "random-fallback";
/** Resolves once the launch tx is confirmed ("confirmed" commitment), so the caller can open the token page right away.
 *  image is the hosted logo URL from POST /metadata (empty when none), for the token page's indexing state. */
export interface LaunchResult { mint: string; pool: string; signature: string; vanity: boolean; mintSource: MintSource; image: string }
export async function launchToken(input: LaunchInput, creator: string, wallet: LaunchWallet, onStep?: (s: LaunchStep) => void): Promise<LaunchResult> {
  onStep?.("metadata");
  const image = input.image ? await toDataUrl(input.image) : undefined;
  const meta = await post<{ uri: string; image?: string }>("/metadata", { name: input.name, symbol: input.ticker, description: input.description, website: input.website, twitter: input.twitter, telegram: input.telegram, image });
  onStep?.("mint");
  const r = await post<{ tx: string; mint: string; pool: string; vanity?: boolean; mintSource?: MintSource }>("/tx/launch", {
    creator, name: input.name, symbol: input.ticker, uri: meta.uri, tier: input.tier, antiSniper: input.antiSniper,
    devBuySol: input.devBuySol ?? 0, slippageBps: input.slippageBps ?? 100,
  });
  const vanity = r.vanity !== false && (r.mintSource ?? "pool") === "pool";
  if (!vanity) {
    // random mint (pre-signed by the server with a throwaway key): wallet signs, then send
    onStep?.("sign");
    const signedRandom = await wallet.sign(Transaction.from(unb64(r.tx)));
    onStep?.("send");
    const sig = await sendAndConfirmRaw(wallet.connection, signedRandom.serialize(), { onSent: () => onStep?.("confirm") });
    return { mint: r.mint, pool: r.pool, signature: sig, vanity: false, mintSource: r.mintSource ?? "random", image: meta.image ?? "" };
  }
  if (!r.mint.endsWith("high")) throw new Error("unexpected mint address from the server");
  onStep?.("sign");
  const signed = await wallet.sign(Transaction.from(unb64(r.tx)));
  onStep?.("cosign");
  const full = await post<{ tx: string; signature: string }>("/tx/launch/sign", { mint: r.mint, tx: b64(signed.serialize({ requireAllSignatures: false, verifySignatures: false })) });
  onStep?.("send");
  const signature = await sendAndConfirmRaw(wallet.connection, unb64(full.tx), { onSent: () => onStep?.("confirm") });
  void confirmLater(r.mint);
  return { mint: r.mint, pool: r.pool, signature, vanity: true, mintSource: "pool", image: meta.image ?? "" };
}

/** Best effort, off the critical path: mark the mint used. The tx is already confirmed, so the first call normally succeeds
 *  (retries cover an RPC node that lags behind, the server sweeper covers the rest). */
async function confirmLater(mint: string) {
  for (let i = 0; i < 6; i++) {
    if (i) await new Promise((res) => setTimeout(res, 3000));
    const ok = await post<{ used: boolean }>("/mint/confirm", { mint }).then((x) => x.used).catch(() => false);
    if (ok) return;
  }
}
function toDataUrl(f: File): Promise<string> {
  if (f.size > 2 * 1024 * 1024) return Promise.reject(new Error("Image must be 2 MB or smaller"));
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error("Could not read image")); r.readAsDataURL(f); });
}
/** Limits the API enforces: POST /metadata (apps/api media.ts, 2 MB image, png jpeg webp gif checked by magic bytes)
 *  and POST /tx/launch (name 32 bytes, symbol 10 bytes, dev buy at most DEV_BUY_MAX_SOL and the tier threshold). */
export const NAME_MAX_BYTES = 32;
export const TICKER_MAX_BYTES = 10;
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const DEV_BUY_MAX_SOL = 20;
export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
const IMAGE_NAMES: Record<string, string> = { "image/png": "PNG", "image/jpeg": "JPG", "image/webp": "WEBP", "image/gif": "GIF" };

/** Name and ticker as the API stores them: control and zero width characters removed, then trimmed. */
export const cleanLabel = (s: string) => s.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff]/g, "").trim();
export const utf8Bytes = (s: string) => new TextEncoder().encode(s).length;

/** Real image type from the first bytes, the same signatures the API checks. */
export function sniffImage(b: Uint8Array): string | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((x, i) => b[i] === x)) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 6 && (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a")) return "image/gif";
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

/** Checks a logo before upload. Resolves to an error message, or null when the API will accept it. */
export async function checkImage(f: File): Promise<string | null> {
  if (!IMAGE_NAMES[f.type]) return "Use a PNG, JPG, WEBP or GIF image.";
  if (f.size === 0) return "This file is empty.";
  if (f.size > IMAGE_MAX_BYTES) return `This image is ${(f.size / 1024 / 1024).toFixed(1)} MB. The limit is 2 MB.`;
  const real = sniffImage(new Uint8Array(await f.slice(0, 16).arrayBuffer()));
  if (!real) return "This file is not a valid PNG, JPG, WEBP or GIF image.";
  if (real !== f.type) return `This file is really a ${IMAGE_NAMES[real]} but is named as a ${IMAGE_NAMES[f.type]}. Export it again or fix the file name.`;
  return null;
}

/** Plain copy for dev buy quote errors (the API passes through SDK messages). */
export function friendlyQuoteError(raw: string, maxSol: number): string {
  if (/insufficient|liquidity/i.test(raw)) return "This dev buy is bigger than the curve can fill. Try a smaller amount.";
  if (/must be <=|capped/i.test(raw)) return `Dev buy is capped at ${maxSol} SOL.`;
  if (/fetch|network|timeout|50\d/i.test(raw)) return "Could not reach highbar for a quote. Try again in a moment.";
  return "No quote right now. Try again in a moment.";
}

/** Plain copy for launch errors. Readable API messages pass through. */
export function friendlyLaunchError(raw: string): string {
  if (/user rejected|rejected the request|declined|cancel/i.test(raw)) return "You cancelled the request in your wallet.";
  if (/insufficient|liquidity in bonding curve/i.test(raw)) return "This dev buy is bigger than the curve can fill. Try a smaller amount.";
  if (/devBuySol must be <=\s*([\d.]+)/.test(raw)) return `Dev buy is capped at ${/<=\s*([\d.]+)/.exec(raw)![1]} SOL.`;
  if (/has not launched yet/i.test(raw)) return "Max tier opens to $HIGHER holders once $HIGHER launches. Pick Standard or Higher for now.";
  if (/launches are paused/i.test(raw)) return "Launches are paused for a moment. Try again soon.";
  if (/name max 32 bytes|symbol max 10 bytes/i.test(raw)) return "Name fits 32 bytes and ticker fits 10 bytes. Shorten them and try again.";
  if (/blockhash not found|block height exceeded|expired/i.test(raw) && !/^The /.test(raw)) return "The launch took too long to approve and expired. Launch again to get a fresh transaction.";
  if (/simulation failed/i.test(raw)) return "The network rejected the launch in simulation. Nothing was sent. Try again in a moment.";
  if (/fetch|network|timed? ?out|\b(429|502|503|504)\b/i.test(raw) && !/^The /.test(raw)) return "Could not reach highbar or the Solana RPC. Check your connection and try again.";
  return raw ? raw[0].toUpperCase() + raw.slice(1) : "Something went wrong. Try again.";
}