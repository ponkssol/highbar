export type TierId = "standard" | "higher" | "max";

export interface Tier {
  id: TierId;
  label: string;
  /** Migration target in SOL (example values, final TBD) */
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
  /** BUILD_BRIEF section 5 targets (may be fractional; see ONCHAIN_PERCENT_NOTE) */
  brief: { creatorTradingFeePercentage: number; migrationFeePercentage: number; creatorMigrationFeePercentage: number };
}

export const BPS = 10_000;
export const CURVE_FEE_BPS = 100; // 1%
export const METEORA_PROTOCOL_SHARE = 0.2; // 20% of trading fee
export const DAMM_V2_POOL_FEE_BPS = 100; // 1%
export const TRADER_CASHBACK_BPS = 5; // 0.05%, paid off-chain by platform

export const ANTI_SNIPER = {
  /** Example only: starting fee that decays to CURVE_FEE_BPS */
  startFeeBps: 2500,
  endFeeBps: CURVE_FEE_BPS,
  decaySeconds: 60,
} as const;

export const TIERS: Record<TierId, Tier> = {
  standard: {
    id: "standard",
    label: "Standard",
    migrationQuoteThresholdSol: 40,
    creatorTradingFeePercentage: 50,
    migrationFeePercentage: 1, // brief: 1.5 (not expressible on-chain, see ONCHAIN_PERCENT_NOTE)
    creatorMigrationFeePercentage: 0,
    lpCreatorPercentage: 20,
    lpPlatformPercentage: 80,
    brief: { creatorTradingFeePercentage: 50, migrationFeePercentage: 1.5, creatorMigrationFeePercentage: 0 },
  },
  higher: {
    id: "higher",
    label: "Higher",
    migrationQuoteThresholdSol: 80,
    creatorTradingFeePercentage: 62, // brief: 62.5 (u8 on-chain; 62 keeps the deployed configs and the platform side of the rounding)
    migrationFeePercentage: 1,
    creatorMigrationFeePercentage: 50,
    lpCreatorPercentage: 40,
    lpPlatformPercentage: 60,
    brief: { creatorTradingFeePercentage: 62.5, migrationFeePercentage: 1, creatorMigrationFeePercentage: 50 },
  },
  max: {
    id: "max",
    label: "Max",
    migrationQuoteThresholdSol: 100,
    creatorTradingFeePercentage: 75,
    migrationFeePercentage: 0, // brief: 0.5 (not expressible on-chain)
    creatorMigrationFeePercentage: 0, // brief: 50; the SDK requires 0 when migrationFeePercentage is 0
    lpCreatorPercentage: 50,
    lpPlatformPercentage: 50,
    brief: { creatorTradingFeePercentage: 75, migrationFeePercentage: 0.5, creatorMigrationFeePercentage: 50 },
  },
};

/** Why TIERS differ from BUILD_BRIEF section 5 (verified in @meteora-ag/dynamic-bonding-curve-sdk 2.0.0):
 *  - creatorTradingFeePercentage, migrationFee.feePercentage and migrationFee.creatorFeePercentage are `u8` in the DBC
 *    program IDL, and the SDK's validateMigrationFee() throws "must be whole numbers"; creatorFeePercentage must be 0 when
 *    feePercentage is 0. So 62.5 / 1.5 / 0.5 cannot be set on a config.
 *  - TIERS holds the values the 6 devnet configs were created with (checked on-chain), so no config has to be recreated.
 *    `brief` keeps the approved target; feeModel(tier, "brief") reproduces the section 5 simulation table.
 *  - Getting closer would need recreating configs (e.g. Standard 2%, Max 1% migration fee), or an off-chain top-up. */
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

/** Referral account share of Meteora's protocol fee (20% of protocol = 4% of the total fee). */
export const REFERRAL_SHARE_OF_PROTOCOL = 0.2;
/** Meteora's fixed cut of migrated liquidity. */
export const METEORA_MIGRATION_LIQUIDITY_SHARE = 0.002;

/** Per-token fee model in SOL (BUILD_BRIEF section 5 simulation): curve volume, reaches migration, anti-sniper OFF.
 *  `values`: "onchain" = TIERS (what the configs do), "brief" = approved targets. */
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
/** Cashback + split + buyback period: one UTC day ('YYYY-MM-DD'). */
export const REWARD_PERIOD_MS = 86_400_000;
/** Buyback order caps (env overrides in apps/api: BUYBACK_MAX_ORDER_SOL, BUYBACK_MAX_SLIPPAGE_BPS, BUYBACK_MAX_PRICE_IMPACT_BPS). */
export const BUYBACK_DEFAULTS = { maxOrderSol: 1, maxSlippageBps: 100, maxPriceImpactBps: 100, maxOrdersPerRun: 5 } as const;
/** Smallest cashback payout; smaller balances carry over to the next period. */
export const CASHBACK_MIN_PAYOUT_SOL = 0.001;
