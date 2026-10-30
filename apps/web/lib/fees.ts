import { ANTI_SNIPER, CURVE_FEE_BPS, PLATFORM_SPLIT, TIERS, curveFeeSplit, lpFeeSplit, type TierId } from "@hb/shared";

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

/** Current anti-sniper fee in bps (linear decay). */
export function antiSniperFeeBps(elapsedSec: number) {
  const { startFeeBps, endFeeBps, decaySeconds } = ANTI_SNIPER;
  if (elapsedSec >= decaySeconds) return endFeeBps;
  return Math.round(startFeeBps - ((startFeeBps - endFeeBps) * elapsedSec) / decaySeconds);
}

export { ANTI_SNIPER, CURVE_FEE_BPS, PLATFORM_SPLIT, TIERS } from "@hb/shared";