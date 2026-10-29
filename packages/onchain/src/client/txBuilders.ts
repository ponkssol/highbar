/** Browser-safe tx builders (no fs / dotenv). Wallet signs; createPool tx is pre-signed by the baseMint keypair. */
import { Connection, Keypair, PublicKey, type Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import BN from "bn.js";
import {
  DynamicBondingCurveClient, SwapMode, deriveDbcPoolAddress, getCurrentPoint, type SwapQuote2Result,
} from "@meteora-ag/dynamic-bonding-curve-sdk";

export const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

const cache = new WeakMap<Connection, DynamicBondingCurveClient>();
export function dbcClient(connection: Connection): DynamicBondingCurveClient {
  let c = cache.get(connection);
  if (!c) { c = new DynamicBondingCurveClient(connection, "confirmed"); cache.set(connection, c); }
  return c;
}

async function withBlockhash(connection: Connection, tx: Transaction, feePayer: PublicKey) {
  tx.feePayer = feePayer;
  tx.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
  return tx;
}

export async function buildCreatePoolTx(
  connection: Connection, configKey: PublicKey | string, name: string, symbol: string, uri: string, creator: PublicKey,
): Promise<{ tx: Transaction; baseMint: Keypair; pool: PublicKey }> {
  const client = dbcClient(connection);
  const config = new PublicKey(configKey);
  const cfg = await client.state.getPoolConfig(config);
  if (!cfg) throw new Error(`config ${config.toBase58()} not found`);
  if (!cfg.quoteMint.equals(WSOL_MINT)) throw new Error("config quote mint is not WSOL");
  const baseMint = Keypair.generate();
  const tx = await client.creator.createPool({ name, symbol, uri, payer: creator, poolCreator: creator, config, baseMint: baseMint.publicKey });
  await withBlockhash(connection, tx, creator);
  tx.partialSign(baseMint);
  return { tx, baseMint, pool: deriveDbcPoolAddress(WSOL_MINT, baseMint.publicKey, config) };
}

/** Referral = WSOL ATA of the referral wallet. */
export const referralTokenAccount = (wallet: PublicKey) => getAssociatedTokenAddressSync(WSOL_MINT, wallet, true);

export async function buildSwapTx(
  connection: Connection, pool: PublicKey, amountIn: BN, minOut: BN, isBuy: boolean, user: PublicKey,
  referral?: PublicKey, opts: { partialFill?: boolean } = {},
): Promise<Transaction> {
  const tx = await dbcClient(connection).pool.swap2({
    owner: user, payer: user, pool, swapBaseForQuote: !isBuy,
    referralTokenAccount: referral ?? null,
    swapMode: opts.partialFill ? SwapMode.PartialFill : SwapMode.ExactIn,
    amountIn, minimumAmountOut: minOut,
  } as any);
  return withBlockhash(connection, tx, user);
}

export async function quoteSwap(
  connection: Connection, pool: PublicKey, amountIn: BN, isBuy: boolean, slippageBps = 100, hasReferral = false, partialFill = false,
): Promise<SwapQuote2Result> {
  const client = dbcClient(connection);
  const virtualPool = await client.state.getPool(pool);
  if (!virtualPool) throw new Error(`pool ${pool.toBase58()} not found`);
  const config = await client.state.getPoolConfig(virtualPool.poolState.config);
  if (!config) throw new Error("pool config not found");
  const currentPoint = await getCurrentPoint(connection, config.activationType);
  return client.pool.swapQuote2({
    virtualPool, config, swapBaseForQuote: !isBuy, hasReferral, eligibleForFirstSwapWithMinFee: false, currentPoint, slippageBps,
    swapMode: partialFill ? SwapMode.PartialFill : SwapMode.ExactIn, amountIn,
  } as any);
}