import { ANTI_SNIPER, CURVE_FEE_BPS, LP_REBATE_BPS, PLATFORM_SPLIT, TIERS, curveFeeSplit, lpFeeSplit, postMigrationSplit, type TierId } from "@hb/shared";

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

/** Current anti-sniper fee in bps (linear decay). */
export function antiSniperFeeBps(elapsedSec: number) {
  const { startFeeBps, endFeeBps, decaySeconds } = ANTI_SNIPER;
  if (elapsedSec >= decaySeconds) return endFeeBps;
  return Math.round(startFeeBps - ((startFeeBps - endFeeBps) * elapsedSec) / decaySeconds);
}

export { ANTI_SNIPER, CURVE_FEE_BPS, PLATFORM_SPLIT, TIERS } from "@hb/shared";