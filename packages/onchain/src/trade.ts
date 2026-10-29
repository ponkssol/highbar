import { Keypair, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { SwapMode, getCurrentPoint, type SwapQuote2Result } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { arg, getClient, getConnection, isMain, loadPlatformKeypair, usableReferralAta, sendTx } from "./client.js";

export interface QuoteParams {
  pool: PublicKey;
  amountIn: BN;
  /** true = sell tokens for SOL */
  sell: boolean;
  slippageBps?: number;
}

export async function quote(q: QuoteParams): Promise<SwapQuote2Result> {
  const client = getClient();
  const virtualPool = await client.state.getPool(q.pool);
  if (!virtualPool) throw new Error(`pool ${q.pool.toBase58()} not found`);
  const config = await client.state.getPoolConfig(virtualPool.poolState.config);
  if (!config) throw new Error("pool config not found");
  const currentPoint = await getCurrentPoint(getConnection(), config.activationType);
  return client.pool.swapQuote2({
    virtualPool,
    config,
    swapBaseForQuote: q.sell,
    hasReferral: true,
    eligibleForFirstSwapWithMinFee: false,
    currentPoint,
    slippageBps: q.slippageBps ?? 100,
    swapMode: SwapMode.ExactIn,
    amountIn: q.amountIn,
  });
}

export interface TradeParams extends QuoteParams {
  owner: Keypair;
}

export async function trade(t: TradeParams): Promise<{ signature: string; minimumAmountOut: string }> {
  const client = getClient();
  const qr = await quote(t);
  const minimumAmountOut = qr.minimumAmountOut ?? new BN(0);
  const tx = await client.pool.swap2({
    owner: t.owner.publicKey,
    pool: t.pool,
    swapBaseForQuote: t.sell,
    referralTokenAccount: await usableReferralAta(),
    swapMode: SwapMode.ExactIn,
    amountIn: t.amountIn,
    minimumAmountOut,
  });
  const signature = await sendTx(tx, [t.owner]);
  return { signature, minimumAmountOut: minimumAmountOut.toString() };
}

export const buy = (owner: Keypair, pool: PublicKey, lamports: BN, slippageBps = 100) =>
  trade({ owner, pool, amountIn: lamports, sell: false, slippageBps });
export const sell = (owner: Keypair, pool: PublicKey, tokenAmount: BN, slippageBps = 100) =>
  trade({ owner, pool, amountIn: tokenAmount, sell: true, slippageBps });

// CLI: tsx src/trade.ts buy --pool X --amount 0.05 [--slippage 100] [--quote-only]
//      tsx src/trade.ts sell --pool X --amount <raw token units>
if (isMain(import.meta.url)) {
  const side = process.argv[2];
  const pool = new PublicKey(arg("pool")!);
  const raw = arg("amount", "0")!;
  const isSell = side === "sell";
  const amountIn = isSell ? new BN(raw) : new BN(Math.round(Number(raw) * 1e9));
  const slippageBps = Number(arg("slippage", "100"));
  const run = process.argv.includes("--quote-only")
    ? quote({ pool, amountIn, sell: isSell, slippageBps }).then((q) => ({ outputAmount: q.outputAmount?.toString(), minimumAmountOut: q.minimumAmountOut?.toString() }))
    : trade({ owner: loadPlatformKeypair(), pool, amountIn, sell: isSell, slippageBps });
  run.then((r) => console.log(JSON.stringify(r, null, 2)), (e) => { console.error(e); process.exit(1); });
}