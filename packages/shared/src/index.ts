export type TierId = "standard" | "higher" | "max";

export interface Tier {
  id: TierId;
  label: string;
  /** Migration target in SOL (example values, final TBD) */
  migrationQuoteThresholdSol: number;
  /** Share of the non-protocol trading fee that goes to the creator (DBC creatorTradingFeePercentage) */
  creatorTradingFeePercentage: number;
  /** Migration fee as % of migrated quote */
  migrationFeePercentage: number;
  /** Creator share of the migration fee, % */
  creatorMigrationFeePercentage: number;
  /** Locked LP split after migration to DAMM v2, % */
  lpCreatorPercentage: number;
  lpPlatformPercentage: number;
}

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
    migrationFeePercentage: 1,
    creatorMigrationFeePercentage: 0,
    lpCreatorPercentage: 20,
    lpPlatformPercentage: 80,
  },
  higher: {
    id: "higher",
    label: "Higher",
    migrationQuoteThresholdSol: 80,
    creatorTradingFeePercentage: 62,
    migrationFeePercentage: 1,
    creatorMigrationFeePercentage: 50,
    lpCreatorPercentage: 40,
    lpPlatformPercentage: 60,
  },
  max: {
    id: "max",
    label: "Max",
    migrationQuoteThresholdSol: 100,
    creatorTradingFeePercentage: 75,
    migrationFeePercentage: 0,
    creatorMigrationFeePercentage: 0,
    lpCreatorPercentage: 50,
    lpPlatformPercentage: 50,
  },
};

export type ConfigKey = `${TierId}_${"on" | "off"}`;

export const CONFIG_KEYS: ConfigKey[] = (Object.keys(TIERS) as TierId[]).flatMap(
  (t) => [`${t}_off`, `${t}_on`] as ConfigKey[],
);

/** Platform income split after cashback (example) */
export const PLATFORM_SPLIT = { buyback: 0.4, ops: 0.5, treasury: 0.1 } as const;

/** Per-trade fee split in bps of volume for a tier */
export function curveFeeSplit(tier: Tier) {
  const total = CURVE_FEE_BPS;
  const protocol = total * METEORA_PROTOCOL_SHARE;
  const rest = total - protocol;
  const creator = (rest * tier.creatorTradingFeePercentage) / 100;
  return { total, protocol, creator, platform: rest - creator };
}



// ---- merged from hb-backend backup (bps-based constants used by apps/api services) ----
export type Tier_ = TierId;
export const BPS = 10_000;
export const METEORA_PROTOCOL_SHARE_PCT = 20;
export const CREATOR_TRADING_FEE_PCT: Record<TierId, number> = { standard: 50, higher: 62, max: 75 };
export const MIGRATION_FEE_PCT: Record<TierId, number> = { standard: 1, higher: 1, max: 0 };
export const CASHBACK_BPS = TRADER_CASHBACK_BPS;
export const SPLIT_BPS = { buyback: 4000, ops: 5000, treasury: 1000 } as const;

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

// ---- step 8: $BAR utility (holder tiers by $BAR balance; all perks are off-chain, see apps/api/BAR_UTILITY.md) ----
export type BarTierId = "none" | "holder" | "raiser" | "maxi";
export interface BarTier {
  id: BarTierId; label: string;
  /** Minimum balance in whole $BAR (example thresholds, final TBD). */
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
/** Share of each closed period's ops allocation (SPLIT_BPS.ops) accrued to $BAR holders, pro-rata by balance. Env override BAR_FEE_SHARE_BPS. */
export const BAR_FEE_SHARE_BPS = 2000;
/** On-chain $BAR balance cache TTL. */
export const BAR_BALANCE_CACHE_MS = 60_000;
export const barTierOf = (balanceBar: number): BarTier => [...BAR_TIERS].reverse().find((t) => balanceBar >= t.minBar) ?? BAR_TIERS[0];
/** Smallest tier that unlocks Max tier launches. */
export const MAX_TIER_MIN_BAR = BAR_TIERS.find((t) => t.maxTierAccess)?.minBar ?? 0;
