/** DAMM v2 sell (after migration), built with Meteora's @meteora-ag/cp-amm-sdk the same way apps/api builds DAMM v2 txs:
 *  fetchPoolState, getQuote (slippage in bps), swap. Token in, SOL out, no referral account. Background worker only. */
import { PublicKey, type Connection, type Transaction } from "@solana/web3.js";
import BN from "bn.js";
import { SellAborted, WSOL_MINT, type BuildArgs } from "./sell";

export async function buildDammSell(conn: Connection, a: BuildArgs, blockhash: () => Promise<string>): Promise<Transaction> {
  const { CpAmm, getTokenProgram } = await import("@meteora-ag/cp-amm-sdk");
  const cp = new CpAmm(conn), pool = new PublicKey(a.pool), mint = new PublicKey(a.mint), wsol = new PublicKey(WSOL_MINT);
  const ps = await cp.fetchPoolState(pool);
  const aIsToken = ps.tokenAMint.equals(mint);
  if (!aIsToken && !ps.tokenBMint.equals(mint)) throw new SellAborted("This DAMM v2 pool does not trade this token");
  const other = aIsToken ? ps.tokenBMint : ps.tokenAMint;
  if (!other.equals(wsol)) throw new SellAborted("This DAMM v2 pool does not pair the token with SOL");
  const slot = await conn.getSlot("confirmed");
  const time = (await conn.getBlockTime(slot).catch(() => null)) ?? Math.floor(Date.now() / 1000);
  const amountIn = new BN(a.amountRaw.toString());
  const q = cp.getQuote({ inAmount: amountIn, inputTokenMint: mint, slippage: a.slippageBps, poolState: ps, currentTime: time, currentSlot: slot,
    tokenADecimal: aIsToken ? a.decimals : 9, tokenBDecimal: aIsToken ? 9 : a.decimals, hasReferral: false });
  if (q.minSwapOutAmount.lten(0)) throw new SellAborted("This sell would get no SOL back");
  const tx = await cp.swap({ payer: a.owner, pool, inputTokenMint: mint, outputTokenMint: other, amountIn, minimumAmountOut: q.minSwapOutAmount,
    tokenAMint: ps.tokenAMint, tokenBMint: ps.tokenBMint, tokenAVault: ps.tokenAVault, tokenBVault: ps.tokenBVault,
    tokenAProgram: getTokenProgram(ps.tokenAFlag), tokenBProgram: getTokenProgram(ps.tokenBFlag), referralTokenAccount: null, poolState: ps });
  tx.feePayer = a.owner;
  tx.recentBlockhash = await blockhash();
  return tx;
}

/** DAMM v2 buy (after migration): SOL in (the SDK wraps it into the owner's WSOL account), the token out to the owner. */
export async function buildDammBuy(conn: Connection, a: BuildArgs, blockhash: () => Promise<string>): Promise<Transaction> {
  const { CpAmm, getTokenProgram } = await import("@meteora-ag/cp-amm-sdk");
  const cp = new CpAmm(conn), pool = new PublicKey(a.pool), mint = new PublicKey(a.mint), wsol = new PublicKey(WSOL_MINT);
  const ps = await cp.fetchPoolState(pool);
  const aIsToken = ps.tokenAMint.equals(mint);
  if (!aIsToken && !ps.tokenBMint.equals(mint)) throw new SellAborted("This DAMM v2 pool does not trade this token");
  if (!(aIsToken ? ps.tokenBMint : ps.tokenAMint).equals(wsol)) throw new SellAborted("This DAMM v2 pool does not pair the token with SOL");
  const slot = await conn.getSlot("confirmed");
  const time = (await conn.getBlockTime(slot).catch(() => null)) ?? Math.floor(Date.now() / 1000);
  const amountIn = new BN(a.amountRaw.toString());
  const q = cp.getQuote({ inAmount: amountIn, inputTokenMint: wsol, slippage: a.slippageBps, poolState: ps, currentTime: time, currentSlot: slot,
    tokenADecimal: aIsToken ? a.decimals : 9, tokenBDecimal: aIsToken ? 9 : a.decimals, hasReferral: false });
  if (q.minSwapOutAmount.lten(0)) throw new SellAborted("This buy would get no tokens");
  const tx = await cp.swap({ payer: a.owner, pool, inputTokenMint: wsol, outputTokenMint: mint, amountIn, minimumAmountOut: q.minSwapOutAmount,
    tokenAMint: ps.tokenAMint, tokenBMint: ps.tokenBMint, tokenAVault: ps.tokenAVault, tokenBVault: ps.tokenBVault,
    tokenAProgram: getTokenProgram(ps.tokenAFlag), tokenBProgram: getTokenProgram(ps.tokenBFlag), referralTokenAccount: null, poolState: ps });
  tx.feePayer = a.owner;
  tx.recentBlockhash = await blockhash();
  return tx;
}
