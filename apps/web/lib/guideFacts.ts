/** Numbers for the public guides. Every figure is derived from @hb/shared (the same constants as /docs), not typed by hand. */
import {
  ANTI_SNIPER_SCHEDULE, CASHBACK_MIN_PAYOUT_SOL, CURVE_FEE_BPS, DAMM_V2_POOL_FEE_BPS, DAMM_V2_PROTOCOL_SHARE, EXT_FEE_BPS,
  LP_REBATE_BPS, LP_REBATE_MIN_PAYOUT_SOL, MAINNET_THRESHOLD_SOL, METEORA_MIGRATION_LIQUIDITY_SHARE, METEORA_PROTOCOL_SHARE,
  REFERRAL_DEFAULTS, REFERRAL_SHARE_OF_PROTOCOL, SPLIT_BPS, SUPPLY_ON_MIGRATION_PCT, TIERS, TRADER_CASHBACK_BPS,
  curveFeeSplit, migrationMcapSol, postMigrationSplit, scheduleDurationSeconds, scheduleEndFeeBps, scheduledFeeBps, type TierId,
} from "@hb/shared";

const num = (v: number, d = 3) => v.toLocaleString("en-US", { maximumFractionDigits: d });
/** Basis points to a percent string. 100 -> "1%", 49.6 -> "0.496%". */
export const bpsPct = (bps: number, d = 3) => `${num(bps / 100, d)}%`;
export const solAmt = (v: number) => `${num(v, 3)} SOL`;

const IDS = Object.keys(TIERS) as TierId[];
const S = ANTI_SNIPER_SCHEDULE;

export interface TierFact {
  id: TierId;
  label: string;
  target: string;
  targetSol: number;
  mcap: string;
  curveCreator: string;
  curvePlatform: string;
  curveMeteora: string;
  migFeePct: string;
  migFeeSol: string;
  creatorMigPct: string;
  lpCreator: string;
  lpPlatform: string;
  postCreator: string;
  postPlatform: string;
  postMeteora: string;
  rebate: string;
}

const migFeeSol = (id: TierId) => (MAINNET_THRESHOLD_SOL[id] * TIERS[id].migrationFeePercentage) / 100;

export const TIERS_FACT: TierFact[] = IDS.map((id) => {
  const curve = curveFeeSplit(TIERS[id]);
  const post = postMigrationSplit(TIERS[id]);
  const feeSol = migFeeSol(id);
  return {
    id,
    label: TIERS[id].label,
    target: solAmt(MAINNET_THRESHOLD_SOL[id]),
    targetSol: MAINNET_THRESHOLD_SOL[id],
    mcap: solAmt(migrationMcapSol(id, "mainnet")),
    curveCreator: bpsPct(curve.creator),
    curvePlatform: bpsPct(curve.platform),
    curveMeteora: bpsPct(curve.protocol),
    migFeePct: `${TIERS[id].migrationFeePercentage}%`,
    migFeeSol: feeSol > 0 ? solAmt(feeSol) : "none",
    creatorMigPct: `${TIERS[id].creatorMigrationFeePercentage}%`,
    lpCreator: `${TIERS[id].lpCreatorPercentage}%`,
    lpPlatform: `${TIERS[id].lpPlatformPercentage}%`,
    postCreator: bpsPct(post.creator),
    postPlatform: bpsPct(post.platform),
    postMeteora: bpsPct(post.protocol),
    rebate: bpsPct(LP_REBATE_BPS[id], 2),
  };
});

export const tierFact = (id: TierId) => {
  const t = TIERS_FACT.find((x) => x.id === id);
  if (!t) throw new Error(id);
  return t;
};

export const ANTI_SECONDS = [0, 5, 10, 15, 30, 45, 60] as const;
export const ANTI_ROWS = ANTI_SECONDS.map((s) => ({ seconds: s, fee: bpsPct(scheduledFeeBps(S, s), 2) }));

/** Facts the guides quote. Percent strings already include the % sign. */
export const FACT = {
  curveFee: bpsPct(CURVE_FEE_BPS, 0),
  meteoraShareOfFee: `${num(METEORA_PROTOCOL_SHARE * 100, 0)}%`,
  dammFee: bpsPct(DAMM_V2_POOL_FEE_BPS, 0),
  dammProtocolShare: `${num(DAMM_V2_PROTOCOL_SHARE * 100, 0)}%`,
  antiStart: bpsPct(S.cliffFeeBps, 0),
  antiEnd: bpsPct(scheduleEndFeeBps(S), 2),
  antiSeconds: scheduleDurationSeconds(S),
  antiPeriods: S.numberOfPeriod,
  antiStep: S.periodFrequency,
  antiCut: bpsPct(S.reductionFactor, 2),
  supply: (1_000_000_000).toLocaleString("en-US"),
  decimals: 6,
  supplyOnMigration: `${SUPPLY_ON_MIGRATION_PCT}%`,
  meteoraLiquidityCut: `${num(METEORA_MIGRATION_LIQUIDITY_SHARE * 100, 1)}%`,
  cashback: bpsPct(TRADER_CASHBACK_BPS, 2),
  cashbackMin: solAmt(CASHBACK_MIN_PAYOUT_SOL),
  rebateMin: solAmt(LP_REBATE_MIN_PAYOUT_SOL),
  referralOfProtocol: `${num(REFERRAL_SHARE_OF_PROTOCOL * 100, 0)}%`,
  referralOfVolume: bpsPct(CURVE_FEE_BPS * METEORA_PROTOCOL_SHARE * REFERRAL_SHARE_OF_PROTOCOL, 2),
  referralMin: solAmt(REFERRAL_DEFAULTS.minPayoutSol),
  buyback: bpsPct(SPLIT_BPS.buyback, 0),
  ops: bpsPct(SPLIT_BPS.ops, 0),
  treasury: bpsPct(SPLIT_BPS.treasury, 0),
  extFee: bpsPct(EXT_FEE_BPS, 2),
  devBuyMax: "20 SOL",
  nameBytes: 32,
  tickerBytes: 10,
  imageMb: 2,
  lockMinDays: 1,
  lockMaxDays: 3650,
  configs: 6,
} as const;
