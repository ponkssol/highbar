import type { TierId } from "@hb/shared";

/** Higher Bar score (BUILD_BRIEF section 7): 0-100 from tier, anti-sniper, dev lock and holder spread. Pure, no I/O. */
export const SCORE_MAX = { tier: 30, antiSniper: 15, devLock: 25, spread: 30 } as const;
export const TIER_POINTS: Record<TierId, number> = { standard: 10, higher: 20, max: 30 };
/** Lock earns full duration credit at >= 90 days left and full size credit at >= 5% of supply. */
export const LOCK_FULL_DAYS = 90;
export const LOCK_FULL_SUPPLY_PCT = 5;
/** Holder count earns full credit at 200 holders (log scale); concentration full credit when top 10 hold <= 30%. */
export const SPREAD_FULL_HOLDERS = 200;
export const SPREAD_FULL_TOP10 = 0.3;
export const TOTAL_SUPPLY = 1_000_000_000;

export interface ScoreInput {
  tier: TierId;
  antiSniper: boolean;
  /** Active dev lock (tokens still locked), unlockAt in unix seconds. */
  lock: { lockedTokens: number; unlockAt: number | null } | null;
  /** Holder balances in whole tokens (non-positive ignored). */
  balances: number[];
  nowSec: number;
}
export interface ScoreBreakdown {
  tier: number; antiSniper: number; devLock: number; spread: number;
  holders: number; top10Pct: number; lockedPct: number; lockDaysLeft: number;
}
export type ScoreLabel = "Higher Bar" | "Solid" | "Early";

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const r1 = (x: number) => Math.round(x * 10) / 10;

export function computeScore(i: ScoreInput): { score: number; label: ScoreLabel; breakdown: ScoreBreakdown } {
  const tier = TIER_POINTS[i.tier] ?? 0;
  const antiSniper = i.antiSniper ? SCORE_MAX.antiSniper : 0;

  let devLock = 0, lockedPct = 0, lockDaysLeft = 0;
  if (i.lock && i.lock.lockedTokens > 0 && i.lock.unlockAt && i.lock.unlockAt > i.nowSec) {
    lockDaysLeft = (i.lock.unlockAt - i.nowSec) / 86400;
    lockedPct = (i.lock.lockedTokens / TOTAL_SUPPLY) * 100;
    devLock = SCORE_MAX.devLock * (0.6 * clamp(lockDaysLeft / LOCK_FULL_DAYS) + 0.4 * clamp(lockedPct / LOCK_FULL_SUPPLY_PCT));
  }

  const bal = i.balances.filter((b) => b > 1e-6).sort((a, b) => b - a);
  const total = bal.reduce((a, b) => a + b, 0);
  const top10 = total ? bal.slice(0, 10).reduce((a, b) => a + b, 0) / total : 1;
  const countPts = 10 * clamp(Math.log10(1 + bal.length) / Math.log10(1 + SPREAD_FULL_HOLDERS));
  const concPts = bal.length ? 20 * clamp((1 - top10) / (1 - SPREAD_FULL_TOP10)) : 0;
  const spread = countPts + concPts;

  const breakdown: ScoreBreakdown = {
    tier, antiSniper, devLock: r1(devLock), spread: r1(spread),
    holders: bal.length, top10Pct: r1(top10 * 100), lockedPct: Math.round(lockedPct * 100) / 100, lockDaysLeft: r1(lockDaysLeft),
  };
  const score = Math.max(0, Math.min(100, Math.round(tier + antiSniper + devLock + spread)));
  return { score, label: scoreLabel(score), breakdown };
}
export const scoreLabel = (s: number): ScoreLabel => (s >= 70 ? "Higher Bar" : s >= 40 ? "Solid" : "Early");
