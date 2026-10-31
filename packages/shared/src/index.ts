export type TierId = "standard" | "higher" | "max";

export interface Tier {
  id: TierId;
  label: string;
  /** Mainnet migration target in SOL (= MAINNET_THRESHOLD_SOL). Devnet configs use DEVNET_THRESHOLD_SOL; prefer thresholdSolFor(tier, network). */
  migrationQuoteThresholdSol: number;
  /** On-chain (u8) share of the non-protocol trading fee that goes to the creator (DBC creatorTradingFeePercentage) */
  creatorTradingFeePercentage: number;
  /** On-chain (u8) migration fee as % of migrated quote */
  migrationFeePercentage: number;
  /** On-chain (u8) creator share of the migration fee, % */
  creatorMigrationFeePercentage: number;
  /** Locked LP split after migration to DAMM v2, % */
  lpCreatorPercentage: number;
  lpPlatformPercentage: number;
  /** BUILD_BRIEF section 5 targets, aligned with the on-chain whole-number values (see ONCHAIN_PERCENT_NOTE) */
  brief: { creatorTradingFeePercentage: number; migrationFeePercentage: number; creatorMigrationFeePercentage: number };
}

export const BPS = 10_000;
export const CURVE_FEE_BPS = 100; // 1%
export const METEORA_PROTOCOL_SHARE = 0.2; // 20% of trading fee
export const DAMM_V2_POOL_FEE_BPS = 100; // 1%
/** DAMM v2 protocol cut of the post-migration pool fee (20%), so LP holders receive 0.8% of volume. */
export const DAMM_V2_PROTOCOL_SHARE = 0.2;
export const TRADER_CASHBACK_BPS = 5; // 0.05%, paid off-chain by platform

/** Inputs createConfigs.ts hands to the DBC SDK for the "*_on" configs (2500 bps -> CURVE_FEE_BPS over 60 s, 60 periods, exponential).
 *  The deployed on-chain result is ANTI_SNIPER_SCHEDULE (./antiSniper.ts); the UI derives the live fee from that, not from a straight line. */
export const ANTI_SNIPER = {
  /** Starting fee (cliff), decays exponentially to CURVE_FEE_BPS */
  startFeeBps: 2500,
  endFeeBps: CURVE_FEE_BPS,
  decaySeconds: 60,
} as const;

/** Mainnet migration targets in SOL. pump.fun's curve graduates at ~85 SOL, so Standard matches it and Higher / Max raise the bar. */
export const MAINNET_THRESHOLD_SOL: Record<TierId, number> = { standard: 85, higher: 150, max: 250 };
/** Devnet migration targets in SOL: what the 6 existing devnet configs were created with (checked on-chain), kept so they need no recreating. */
export const DEVNET_THRESHOLD_SOL: Record<TierId, number> = { standard: 40, higher: 80, max: 100 };
/** Migration target of a tier on a network: the devnet value for "devnet", the mainnet value otherwise. */
export const thresholdSolFor = (tier: TierId, network?: string | null): number => (network === "devnet" ? DEVNET_THRESHOLD_SOL : MAINNET_THRESHOLD_SOL)[tier];

export const TIERS: Record<TierId, Tier> = {
  standard: {
    id: "standard",
    label: "Standard",
    migrationQuoteThresholdSol: MAINNET_THRESHOLD_SOL.standard, // 85 (devnet configs: 40)
    creatorTradingFeePercentage: 50,
    migrationFeePercentage: 1, // earlier target 1.5 is not expressible on-chain (see ONCHAIN_PERCENT_NOTE)
    creatorMigrationFeePercentage: 0,
    lpCreatorPercentage: 20,
    lpPlatformPercentage: 80,
    brief: { creatorTradingFeePercentage: 50, migrationFeePercentage: 1, creatorMigrationFeePercentage: 0 },
  },
  higher: {
    id: "higher",
    label: "Higher",
    migrationQuoteThresholdSol: MAINNET_THRESHOLD_SOL.higher, // 150 (devnet configs: 80)
    creatorTradingFeePercentage: 62, // earlier target 62.5 (u8 on-chain; 62 keeps the deployed configs and the platform side of the rounding)
    migrationFeePercentage: 1,
    creatorMigrationFeePercentage: 50,
    lpCreatorPercentage: 40,
    lpPlatformPercentage: 60,
    brief: { creatorTradingFeePercentage: 62, migrationFeePercentage: 1, creatorMigrationFeePercentage: 50 },
  },
  max: {
    id: "max",
    label: "Max",
    migrationQuoteThresholdSol: MAINNET_THRESHOLD_SOL.max, // 250 (devnet configs: 100)
    creatorTradingFeePercentage: 75,
    migrationFeePercentage: 0, // earlier target 0.5 is not expressible on-chain
    creatorMigrationFeePercentage: 0, // the SDK requires 0 when migrationFeePercentage is 0
    lpCreatorPercentage: 50,
    lpPlatformPercentage: 50,
    brief: { creatorTradingFeePercentage: 75, migrationFeePercentage: 0, creatorMigrationFeePercentage: 0 },
  },
};

/** Why the fee percentages are whole numbers (verified in @meteora-ag/dynamic-bonding-curve-sdk 2.0.0):
 *  - creatorTradingFeePercentage, migrationFee.feePercentage and migrationFee.creatorFeePercentage are `u8` in the DBC
 *    program IDL, and the SDK's validateMigrationFee() throws "must be whole numbers"; creatorFeePercentage must be 0 when
 *    feePercentage is 0. So the earlier targets 62.5 / 1.5 / 0.5 cannot be set on a config.
 *  - TIERS fee percentages are the values the 6 devnet configs were created with (checked on-chain), so no devnet config has to be
 *    recreated. Thresholds differ per network: devnet configs keep DEVNET_THRESHOLD_SOL (40/80/100), mainnet configs are created
 *    with MAINNET_THRESHOLD_SOL (85/150/250); see thresholdSolFor.
 *    `brief` is aligned with these on-chain values, so feeModel(tier, "brief") = feeModel(tier) = the section 5 simulation table.
 *  - Getting the earlier fractional targets back would need recreating configs (e.g. Standard 2%, Max 1% migration fee), or an off-chain top-up. */
/** Share of the token supply that goes into the DAMM v2 pool at migration (createConfigs percentageSupplyOnMigration). */
export const SUPPLY_ON_MIGRATION_PCT = 20;
/** Approximate market cap in SOL at migration: migrated quote (threshold minus the migration fee) / pool share of the supply.
 *  Mainnet 420.75 / 742.5 / 1250 SOL (ignores Meteora's fixed 0.2% liquidity cut). */
export const migrationMcapSol = (tier: TierId, network?: string | null): number =>
  Math.round(((thresholdSolFor(tier, network) * (100 - TIERS[tier].migrationFeePercentage)) / (100 * (SUPPLY_ON_MIGRATION_PCT / 100))) * 100) / 100;

export const ONCHAIN_PERCENT_NOTE = "DBC fee percentages are whole-number u8 values on-chain";

export type ConfigKey = `${TierId}_${"on" | "off"}`;

export const CONFIG_KEYS: ConfigKey[] = (Object.keys(TIERS) as TierId[]).flatMap(
  (t) => [`${t}_off`, `${t}_on`] as ConfigKey[],
);

/** Platform income split after cashback (example) */
export const PLATFORM_SPLIT = { buyback: 0.4, ops: 0.5, treasury: 0.1 } as const;
export const SPLIT_BPS = { buyback: 4000, ops: 5000, treasury: 1000 } as const;

/** Per-trade fee split in bps of volume for a tier (on-chain values unless `values` = "brief") */
export function curveFeeSplit(tier: Tier, values: "onchain" | "brief" = "onchain") {
  const total = CURVE_FEE_BPS;
  const protocol = total * METEORA_PROTOCOL_SHARE;
  const rest = total - protocol;
  const creator = (rest * (values === "brief" ? tier.brief : tier).creatorTradingFeePercentage) / 100;
  return { total, protocol, creator, platform: rest - creator };
}

/** Post-migration (DAMM v2) fee split in bps of pool volume: 1% pool fee, 20% to DAMM v2 protocol, 80% to the locked LP,
 *  split by lpCreatorPercentage / lpPlatformPercentage. Creator: 16 / 32 / 40 bps (0.16% / 0.32% / 0.40%) for Standard / Higher / Max. */
export function lpFeeSplit(tier: Tier) {
  const total = DAMM_V2_POOL_FEE_BPS;
  const protocol = total * DAMM_V2_PROTOCOL_SHARE;
  const lp = total - protocol;
  return { total, protocol, lp, creator: (lp * tier.lpCreatorPercentage) / 100, platform: (lp * tier.lpPlatformPercentage) / 100 };
}

/** Creator LP rebate (post-migration): the platform forwards this share (bps) of the DAMM v2 LP SOL it actually CLAIMED on its own
 *  locked position to the token's creator. Fixed per tier in code (not runtime-configurable). The on-chain pool fee (1%) and the
 *  LP split (lpCreatorPercentage / lpPlatformPercentage) are unchanged; with the rebate the creator ends at 0.60% / 0.65% / 0.70%
 *  of post-migration volume and the platform at 0.20% / 0.15% / 0.10% (Meteora keeps its 0.20%). See postMigrationSplit. */
export const LP_REBATE_BPS: Record<TierId, number> = { standard: 6875, higher: 6875, max: 7500 };
/** Smallest creator LP rebate payout (SOL); smaller balances carry over. apps/api env LP_REBATE_MIN_PAYOUT_SOL (>= 0.001). */
export const LP_REBATE_MIN_PAYOUT_SOL = 0.01;
export const LP_REBATE_MIN_PAYOUT_FLOOR_SOL = 0.001;
/** Rebate on a claimed platform LP amount (lamports, floored; the rounding dust stays with the platform / treasury). */
export const lpRebateLamports = (tier: TierId, claimedLamports: bigint): bigint =>
  claimedLamports > 0n ? (claimedLamports * BigInt(LP_REBATE_BPS[tier])) / BigInt(BPS) : 0n;
/** Effective post-migration split in bps of DAMM v2 volume: LP shares (lpFeeSplit) + the platform-to-creator rebate.
 *  Standard 60 / 20 / 20, Higher 65 / 15 / 20, Max 70 / 10 / 20 (creator / platform / Meteora). */
export function postMigrationSplit(tier: Tier) {
  const lp = lpFeeSplit(tier);
  const rebate = (lp.platform * LP_REBATE_BPS[tier.id]) / BPS;
  return { total: lp.total, protocol: lp.protocol, creatorLp: lp.creator, rebate, creator: lp.creator + rebate, platform: lp.platform - rebate };
}

/** Referral account share of Meteora's protocol fee (20% of protocol = 4% of the total fee). */
export const REFERRAL_SHARE_OF_PROTOCOL = 0.2;
/** Meteora's fixed cut of migrated liquidity. */
export const METEORA_MIGRATION_LIQUIDITY_SHARE = 0.002;

/** Per-token fee model in SOL (BUILD_BRIEF section 5 simulation): curve volume, reaches migration, anti-sniper OFF.
 *  `values`: "onchain" = TIERS (what the configs do), "brief" = approved targets. Uses the mainnet threshold (TIERS). */
export function feeModel(tier: Tier, values: "onchain" | "brief" = "onchain", o: { volumeSol?: number; referral?: boolean; cashback?: boolean } = {}) {
  const v = o.volumeSol ?? 500, referral = o.referral ?? true, cashback = o.cashback ?? true;
  const p = values === "brief" ? tier.brief : tier;
  const fee = (v * CURVE_FEE_BPS) / BPS;
  const protocol = fee * METEORA_PROTOCOL_SHARE;
  const ref = referral ? protocol * REFERRAL_SHARE_OF_PROTOCOL : 0;
  const creatorCurve = ((fee - protocol) * p.creatorTradingFeePercentage) / 100;
  const platformCurve = fee - protocol - creatorCurve;
  const migFee = (tier.migrationQuoteThresholdSol * p.migrationFeePercentage) / 100;
  const creatorMig = (migFee * p.creatorMigrationFeePercentage) / 100;
  const cb = cashback ? (v * TRADER_CASHBACK_BPS) / BPS : 0;
  const platformNet = platformCurve + ref + migFee - creatorMig - cb;
  return {
    traderPays: fee, cashback: cb, creator: creatorCurve + creatorMig, meteora: protocol - ref + tier.migrationQuoteThresholdSol * METEORA_MIGRATION_LIQUIDITY_SHARE,
    platformNet, buyback: (platformNet * SPLIT_BPS.buyback) / BPS, ops: (platformNet * SPLIT_BPS.ops) / BPS, treasury: (platformNet * SPLIT_BPS.treasury) / BPS,
  };
}

// ---- bps-based aliases used by apps/api services (derived from TIERS so they can't drift) ----
export type Tier_ = TierId;
export const METEORA_PROTOCOL_SHARE_PCT = METEORA_PROTOCOL_SHARE * 100;
const byTier = (f: (t: Tier) => number) => Object.fromEntries(Object.values(TIERS).map((t) => [t.id, f(t)])) as Record<TierId, number>;
export const CREATOR_TRADING_FEE_PCT: Record<TierId, number> = byTier((t) => t.creatorTradingFeePercentage);
export const MIGRATION_FEE_PCT: Record<TierId, number> = byTier((t) => t.migrationFeePercentage);
export const CASHBACK_BPS = TRADER_CASHBACK_BPS;

// ---- step 7: fee claimer / cashback / buyback (apps/api jobs) ----
export type Network = "devnet" | "mainnet";
/** NETWORK env -> cluster; anything but mainnet/mainnet-beta is devnet. */
export const networkOf = (v?: string | null): Network => (v === "mainnet" || v === "mainnet-beta" ? "mainnet" : "devnet");
const cluster = (n: Network) => (n === "devnet" ? "?cluster=devnet" : "");
export const solscanTx = (sig: string, network: Network = "devnet") => `https://solscan.io/tx/${sig}${cluster(network)}`;
export const solscanAccount = (addr: string, network: Network = "devnet") => `https://solscan.io/account/${addr}${cluster(network)}`;
export const solscanToken = (mint: string, network: Network = "devnet") => `https://solscan.io/token/${mint}${cluster(network)}`;
export const solscanBlock = (slot: number, network: Network = "devnet") => `https://solscan.io/block/${slot}${cluster(network)}`;
/** Cashback + split + buyback period: one UTC day ('YYYY-MM-DD'). */
export const REWARD_PERIOD_MS = 86_400_000;
/** Buyback order caps (env overrides in apps/api: BUYBACK_MAX_ORDER_SOL, BUYBACK_MAX_SLIPPAGE_BPS, BUYBACK_MAX_PRICE_IMPACT_BPS). */
export const BUYBACK_DEFAULTS = { maxOrderSol: 1, maxSlippageBps: 100, maxPriceImpactBps: 100, maxOrdersPerRun: 5 } as const;
/** Smallest cashback payout; smaller balances carry over to the next period. */
export const CASHBACK_MIN_PAYOUT_SOL = 0.001;

// ---- step 8: $HIGHER utility (holder tiers by $HIGHER balance; all perks are off-chain, see apps/api/BAR_UTILITY.md) ----
export type BarTierId = "none" | "holder" | "raiser" | "maxi";
export interface BarTier {
  id: BarTierId; label: string;
  /** Minimum balance in whole $HIGHER (example thresholds, final TBD). */
  minBar: number;
  /** Cashback multiplier on TRADER_CASHBACK_BPS, in bps (10_000 = 1x). */
  cashbackMultiplierBps: number;
  /** "Fee discount": extra rebate in bps of platform volume, paid with cashback (DBC fees are fixed per config on-chain). */
  feeRebateBps: number;
  /** May launch on the Max tier configs (enforced by the API / UI, not on-chain). */
  maxTierAccess: boolean;
  /** Counts toward the holder fee share. */
  feeShare: boolean;
}
/** Ascending by minBar; a wallet gets the highest tier it qualifies for. */
export const BAR_TIERS: readonly BarTier[] = [
  { id: "none", label: "None", minBar: 0, cashbackMultiplierBps: 10_000, feeRebateBps: 0, maxTierAccess: false, feeShare: false },
  { id: "holder", label: "Holder", minBar: 10_000, cashbackMultiplierBps: 15_000, feeRebateBps: 0, maxTierAccess: false, feeShare: true },
  { id: "raiser", label: "Raiser", minBar: 100_000, cashbackMultiplierBps: 20_000, feeRebateBps: 5, maxTierAccess: true, feeShare: true },
  { id: "maxi", label: "Maxi", minBar: 1_000_000, cashbackMultiplierBps: 30_000, feeRebateBps: 10, maxTierAccess: true, feeShare: true },
];
/** Share of each closed period's ops allocation (SPLIT_BPS.ops) accrued to $HIGHER holders, pro-rata by balance. Env override BAR_FEE_SHARE_BPS. */
export const BAR_FEE_SHARE_BPS = 2000;
/** On-chain $HIGHER balance cache TTL. */
export const BAR_BALANCE_CACHE_MS = 60_000;
export const barTierOf = (balanceBar: number): BarTier => [...BAR_TIERS].reverse().find((t) => balanceBar >= t.minBar) ?? BAR_TIERS[0];
/** Smallest tier that unlocks Max tier launches. */
export const MAX_TIER_MIN_BAR = BAR_TIERS.find((t) => t.maxTierAccess)?.minBar ?? 0;
export * from "./referralMilestone.js";
export * from "./leaderboard.js";
export * from "./antiSniper.js";
export * from "./hiddenTokens.js";
