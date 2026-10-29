import BN from "bn.js";
import { Keypair, PublicKey, type Transaction } from "@solana/web3.js";
import { deriveDbcPoolAddress, getCurrentPoint, SwapMode, type PoolConfig } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { configPubkey, getClient, getConnection, usableReferralAta } from "@hb/onchain";

const WSOL = new PublicKey("So11111111111111111111111111111111111111112");
export const DEV_BUY_MAX_SOL = 20;
const LAMPORTS = 1e9, BASE_DEC = 1e6;
const cfgCache = new Map<string, PoolConfig>();

async function poolConfig(config: PublicKey): Promise<PoolConfig> {
  const k = config.toBase58();
  let c = cfgCache.get(k);
  if (!c) { const got = await getClient().state.getPoolConfig(config); if (!got) throw new Error("pool config not found"); c = got; cfgCache.set(k, c); }
  return c;
}

/**
 * DBC rule (SDK 2.0.0, isFirstSwapWithMinFee): the first swap gets the scheduler's MIN base fee only if
 *   config.enableFirstSwapWithMinFee === 1 AND the swap has NO referral account AND pool.hasSwap === 0,
 * and on-chain it must sit in the same tx as initialize_pool (validated via the instructions sysvar, error 6057
 * FirstSwapValidationFailed). Otherwise the normal fee scheduler applies (anti-sniper configs start at the cliff fee).
 */
export async function quoteDevBuy(tier: string, antiSniper: boolean, devBuySol: number, slippageBps = 100) {
  const config = configPubkey(tier, antiSniper);
  const cfg = await poolConfig(config);
  const thresholdSol = Number(cfg.migrationQuoteThreshold.toString()) / LAMPORTS;
  const minFeeEligible = cfg.enableFirstSwapWithMinFee === 1;
  const ref = minFeeEligible ? null : await usableReferralAta(); // keep platform referral unless it would forfeit the min fee (or the account is missing)
  const hasReferral = !!ref;
  const base = { config, cfg, thresholdSol, minFeeEligible, hasReferral };
  if (!(devBuySol > 0)) return { ...base, amountIn: new BN(0), outTokens: 0, minOut: new BN(0), feeSol: 0, feePct: 0, supplyPct: 0 };
  const amountIn = new BN(Math.round(devBuySol * LAMPORTS).toString());
  const currentPoint = await getCurrentPoint(getConnection(), cfg.activationType);
  // Fresh pool as initialize_pool leaves it: price at sqrtStartPrice, no reserves, activation now, no swaps yet.
  const virtualPool: any = {
    poolState: {
      config, sqrtPrice: cfg.sqrtStartPrice, quoteReserve: new BN(0), baseReserve: new BN(0), activationPoint: currentPoint, hasSwap: 0,
      volatilityTracker: { lastUpdateTimestamp: new BN(0), padding: [], sqrtPriceReference: cfg.sqrtStartPrice, volatilityAccumulator: new BN(0), volatilityReference: new BN(0) },
    },
  };
  virtualPool.hasSwap = 0; virtualPool.activationPoint = currentPoint; virtualPool.sqrtPrice = cfg.sqrtStartPrice; virtualPool.quoteReserve = new BN(0); virtualPool.volatilityTracker = virtualPool.poolState.volatilityTracker;
  const q: any = getClient().pool.swapQuote2({
    virtualPool, config: cfg, swapBaseForQuote: false, hasReferral, eligibleForFirstSwapWithMinFee: minFeeEligible,
    currentPoint, slippageBps, swapMode: SwapMode.ExactIn, amountIn,
  });
  const out = new BN(q.outputAmount.toString());
  const tradingFee = new BN((q.tradingFee ?? 0).toString()), protocolFee = new BN((q.protocolFee ?? 0).toString()), refFee = new BN((q.referralFee ?? 0).toString());
  const feeLamports = Number(tradingFee.add(protocolFee).add(refFee).toString());
  const supply = Number(cfg.postMigrationTokenSupply?.toString() ?? cfg.preMigrationTokenSupply?.toString() ?? "0") / BASE_DEC;
  const outTokens = Number(out.toString()) / BASE_DEC;
  return {
    ...base, amountIn, outTokens, minOut: new BN(q.minimumAmountOut.toString()), feeSol: feeLamports / LAMPORTS,
    feePct: (feeLamports / Number(amountIn.toString())) * 100, supplyPct: supply ? (outTokens / supply) * 100 : 0,
  };
}

export interface LaunchReq { creator: string; name: string; symbol: string; uri?: string; tier: string; antiSniper: boolean; devBuySol?: number; slippageBps?: number }

export async function buildLaunchTx(b: LaunchReq) {
  const creator = new PublicKey(b.creator);
  const devBuySol = Number(b.devBuySol ?? 0), slippageBps = b.slippageBps ?? 100;
  if (!Number.isFinite(devBuySol) || devBuySol < 0) throw new Error("devBuySol must be >= 0");
  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps > 5000) throw new Error("slippageBps must be an integer between 0 and 5000");
  const q = await quoteDevBuy(b.tier, !!b.antiSniper, devBuySol, slippageBps);
  if (devBuySol > Math.min(q.thresholdSol, DEV_BUY_MAX_SOL)) throw new Error(`devBuySol must be <= ${Math.min(q.thresholdSol, DEV_BUY_MAX_SOL)} SOL`);
  const baseMint = Keypair.generate();
  const tx: Transaction = await getClient().creator.createPoolWithFirstBuy({
    createPoolParam: { name: b.name, symbol: b.symbol, uri: b.uri ?? "", payer: creator, poolCreator: creator, config: q.config, baseMint: baseMint.publicKey },
    firstBuyParam: devBuySol > 0 ? { buyer: creator, receiver: creator, buyAmount: q.amountIn, minimumAmountOut: q.minOut, referralTokenAccount: q.hasReferral ? await usableReferralAta() : null } : undefined,
  });
  tx.feePayer = creator;
  tx.recentBlockhash = (await getConnection().getLatestBlockhash("confirmed")).blockhash;
  tx.partialSign(baseMint);
  const bytes = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
  if (bytes.length > 1232) throw new Error(`launch tx too large (${bytes.length} bytes)`);
  const pool = deriveDbcPoolAddress(WSOL, baseMint.publicKey, q.config);
  return {
    tx: bytes.toString("base64"), size: bytes.length, mint: baseMint.publicKey.toBase58(), pool: pool.toBase58(),
    devBuy: devBuySol > 0 ? { sol: devBuySol, estTokens: q.outTokens, minTokens: Number(q.minOut.toString()) / BASE_DEC, supplyPct: q.supplyPct, feeSol: q.feeSol, feePct: q.feePct, minFeeApplied: q.minFeeEligible } : null,
  };
}