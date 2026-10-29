import { ANTI_SNIPER, CURVE_FEE_BPS, PLATFORM_SPLIT, TIERS, curveFeeSplit, type TierId } from "@hb/shared";

/** Fee split in percent of volume, using shared tier config. */
export function feeSplitPct(tier: TierId) {
  const s = curveFeeSplit(TIERS[tier]);
  const r = (v: number) => Math.round(v) / 100; // bps -> %, 2dp
  return { total: r(s.total), meteora: r(s.protocol), creator: r(s.creator), platform: r(s.platform) };
}

/** Current anti-sniper fee in bps (linear decay). */
export function antiSniperFeeBps(elapsedSec: number) {
  const { startFeeBps, endFeeBps, decaySeconds } = ANTI_SNIPER;
  if (elapsedSec >= decaySeconds) return endFeeBps;
  return Math.round(startFeeBps - ((startFeeBps - endFeeBps) * elapsedSec) / decaySeconds);
}

export { ANTI_SNIPER, CURVE_FEE_BPS, PLATFORM_SPLIT, TIERS } from "@hb/shared";