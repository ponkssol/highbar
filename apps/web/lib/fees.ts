import { ANTI_SNIPER_SCHEDULE, CURVE_FEE_BPS, LP_REBATE_BPS, METEORA_PROTOCOL_SHARE, PLATFORM_SPLIT, REFERRAL_SHARE_OF_PROTOCOL, TIERS, TRADER_CASHBACK_BPS, curveFeeSplit, lpFeeSplit, postMigrationSplit, scheduledFeeBps, type TierId } from "@hb/shared";

/** Fee split in percent of volume, using shared tier config. */
export function feeSplitPct(tier: TierId) {
  const s = curveFeeSplit(TIERS[tier]);
  const r = (v: number) => Math.round(v) / 100; // bps -> %, 2dp
  return { total: r(s.total), meteora: r(s.protocol), creator: r(s.creator), platform: r(s.platform) };
}

/** Post-migration (DAMM v2) split in percent of pool volume: 1% fee, 0.2% DAMM v2 protocol, 0.8% to the locked LP (creator / platform by LP split). */
export function lpFeeSplitPct(tier: TierId) {
  const s = lpFeeSplit(TIERS[tier]);
  const r = (v: number) => Math.round(v) / 100;
  return { total: r(s.total), protocol: r(s.protocol), lp: r(s.lp), creator: r(s.creator), platform: r(s.platform), lpCreatorPct: TIERS[tier].lpCreatorPercentage };
}

/** Post-migration net shares in percent of pool volume after the platform's creator LP rebate (LP_REBATE_BPS of the platform's claimed LP fees). */
export function postMigrationPct(tier: TierId) {
  const s = postMigrationSplit(TIERS[tier]);
  const r = (v: number) => Math.round(v * 100) / 10000; // bps -> %, 4dp
  return { total: r(s.total), protocol: r(s.protocol), creatorLp: r(s.creatorLp), rebate: r(s.rebate), creator: r(s.creator), platform: r(s.platform), rebatePct: LP_REBATE_BPS[tier] / 100 };
}

/** Anti-sniper fee in bps `elapsedSec` after pool activation, following the deployed DBC fee scheduler (exponential, 60 x 1 s). */
export const antiSniperFeeBps = (elapsedSec: number) => scheduledFeeBps(ANTI_SNIPER_SCHEDULE, elapsedSec);

/** Migration fee of a tier (% of migrated quote) and the creator's share of it (%). */
export const migrationFeePct = (tier: TierId) => ({ fee: TIERS[tier].migrationFeePercentage, creatorShare: TIERS[tier].creatorMigrationFeePercentage });
/** Trader cashback in % of volume (0.05%). */
export const CASHBACK_PCT = TRADER_CASHBACK_BPS / 100;
/** Referral account share of Meteora's DBC protocol fee, % (paid out of Meteora's share). */
export const REFERRAL_OF_PROTOCOL_PCT = REFERRAL_SHARE_OF_PROTOCOL * 100;
/** Referral fee in % of curve volume (1% fee x 20% protocol x 20% referral = 0.04%). */
export const REFERRAL_VOLUME_PCT = Math.round(CURVE_FEE_BPS * METEORA_PROTOCOL_SHARE * REFERRAL_SHARE_OF_PROTOCOL) / 100;

export { ANTI_SNIPER, ANTI_SNIPER_SCHEDULE, CURVE_FEE_BPS, PLATFORM_SPLIT, TIERS, migrationMcapSol, thresholdSolFor } from "@hb/shared";