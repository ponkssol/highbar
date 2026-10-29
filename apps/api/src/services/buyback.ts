import { Connection, Keypair, PublicKey, VersionedTransaction, Transaction } from "@solana/web3.js";
import { createBurnInstruction, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { db } from "../db/pool.js";
import { env } from "../lib/env.js";

const SOL = "So11111111111111111111111111111111111111112";
const JUP = "https://lite-api.jup.ag/swap/v1";

/** Spend `budget` lamports on $BAR in capped chunks via Jupiter, then SPL-burn what was bought.
 *  Each order is recorded with swap_sig + burn_sig for the public /burns page (Solscan proofs). */
export async function runBuyback(epochId: number, budget: bigint, wallet: Keypair) {
  if (!env.BAR_MINT) throw new Error("BAR_MINT not set — accrue buyback budget only");
  const conn = new Connection(env.RPC_URL, "confirmed");
  const mint = new PublicKey(env.BAR_MINT);
  const tokenProgram = (await conn.getAccountInfo(mint))?.owner ?? TOKEN_PROGRAM_ID; // SPL or Token-2022
  let left = budget;
  while (left > 0n) {
    const amount = left < env.BUYBACK_MAX_ORDER_LAMPORTS ? left : env.BUYBACK_MAX_ORDER_LAMPORTS;
    const quote = await (await fetch(`${JUP}/quote?inputMint=${SOL}&outputMint=${mint}&amount=${amount}&slippageBps=${env.BUYBACK_MAX_SLIPPAGE_BPS}`)).json();
    if (Number(quote.priceImpactPct) * 10000 > env.BUYBACK_MAX_SLIPPAGE_BPS) { console.warn("impact too high, stop", quote.priceImpactPct); break; }
    const { rows: [o] } = await db.query("INSERT INTO buyback_orders (epoch_id, sol_in) VALUES ($1,$2) RETURNING id", [epochId, amount]);
    if (env.DRY_RUN) { console.log("[dry-run] buy", amount, "->", quote.outAmount); left -= amount; continue; }
    const { swapTransaction } = await (await fetch(`${JUP}/swap`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ quoteResponse: quote, userPublicKey: wallet.publicKey.toBase58(), wrapAndUnwrapSol: true }) })).json();
    const vtx = VersionedTransaction.deserialize(Buffer.from(swapTransaction, "base64")); vtx.sign([wallet]);
    const swapSig = await conn.sendTransaction(vtx); await conn.confirmTransaction(swapSig, "finalized");
    const ata = getAssociatedTokenAddressSync(mint, wallet.publicKey, false, tokenProgram);
    const out = await actualReceived(conn, swapSig, ata.toBase58());
    if (out <= 0n) throw new Error(`swap ${swapSig}: no $BAR received`);
    const burnTx = new Transaction().add(createBurnInstruction(ata, mint, wallet.publicKey, out, [], tokenProgram));
    const burnSig = await conn.sendTransaction(burnTx, [wallet]);
    await db.query("UPDATE buyback_orders SET bar_out=$2, swap_sig=$3, burn_sig=$4, status='burned' WHERE id=$1", [o.id, out.toString(), swapSig, burnSig]);
    left -= amount;
    await new Promise((r) => setTimeout(r, 60_000 + Math.random() * 240_000)); // spread orders (TWAP-ish)
  }
}

/** Actual $BAR received by our ATA in the swap tx (post - pre balance), not the quote's outAmount. */
export async function actualReceived(conn: Connection, sig: string, ata: string): Promise<bigint> {
  const tx = await conn.getTransaction(sig, { maxSupportedTransactionVersion: 0, commitment: "finalized" });
  if (!tx?.meta) throw new Error(`tx ${sig} not found`);
  const keys = tx.transaction.message.getAccountKeys({ accountKeysFromLookups: tx.meta.loadedAddresses }).staticAccountKeys
    .concat(tx.meta.loadedAddresses?.writable ?? [], tx.meta.loadedAddresses?.readonly ?? []).map((k) => k.toBase58());
  return balanceDelta(tx.meta.preTokenBalances ?? [], tx.meta.postTokenBalances ?? [], keys.indexOf(ata));
}
export function balanceDelta(pre: { accountIndex: number; uiTokenAmount: { amount: string } }[], post: typeof pre, idx: number) {
  const get = (l: typeof pre) => BigInt(l.find((b) => b.accountIndex === idx)?.uiTokenAmount.amount ?? "0");
  return idx < 0 ? 0n : get(post) - get(pre);
}
