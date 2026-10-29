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


