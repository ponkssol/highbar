/**
 * Anti-sniper fee curve as the DBC fee scheduler applies it on-chain.
 *
 * Mirrors the base fee of the 3 mainnet "*_on" configs (configs.mainnet.json, built by packages/onchain createConfigs.ts and
 * read back from mainnet): cliffFeeNumerator 250_000_000 (= 2500 bps), baseFeeMode 1 = FeeSchedulerExponential,
 * firstFactor (numberOfPeriod) 60, secondFactor (periodFrequency) 1, thirdFactor (reductionFactor) 522, activationType 1 = Timestamp.
 * The "*_off" configs are a flat 100 bps (numberOfPeriod 0).
 *
 * DBC: n = min(numberOfPeriod, floor((currentPoint - pool.activationPoint) / periodFrequency))
 *   linear:      fee = cliff - n * reductionFactor          (reductionFactor in fee-numerator units; here expressed in bps)
 *   exponential: fee = cliff * (1 - reductionFactor / 10_000) ^ n
 */
export interface FeeSchedule {
  /** Starting (cliff) fee in bps. */
  cliffFeeBps: number;
  numberOfPeriod: number;
  /** Length of one period in activation units (seconds for timestamp activation, slots for slot activation). */
  periodFrequency: number;
  /** Exponential: bps of the current fee removed per period. Linear: bps removed per period. */
  reductionFactor: number;
  mode: "linear" | "exponential";
  activationType: "timestamp" | "slot";
}

/** ~0.4 s per Solana slot; only used to turn slot-based schedules into wall-clock seconds (approximate). */
export const SECONDS_PER_SLOT = 0.4;

/** The real mainnet anti-sniper schedule (see header comment). 2500 bps -> ~100 bps, exponential, 60 x 1 s periods, timestamp. */
export const ANTI_SNIPER_SCHEDULE: FeeSchedule = {
  cliffFeeBps: 2500,
  numberOfPeriod: 60,
  periodFrequency: 1,
  reductionFactor: 522,
  mode: "exponential",
  activationType: "timestamp",
};

/** Seconds of one scheduler period (slot schedules converted at ~0.4 s/slot). */
export const periodSeconds = (s: FeeSchedule) => s.periodFrequency * (s.activationType === "slot" ? SECONDS_PER_SLOT : 1);
/** Total decay duration in seconds: numberOfPeriod x period length. */
export const scheduleDurationSeconds = (s: FeeSchedule) => s.numberOfPeriod * periodSeconds(s);

/** Fee (bps) after `n` periods, as DBC computes it (n capped at numberOfPeriod, never below 0). */
export function feeAfterPeriods(s: FeeSchedule, n: number): number {
  const p = Math.max(0, Math.min(s.numberOfPeriod, Math.floor(n)));
  if (s.mode === "linear") return Math.max(0, s.cliffFeeBps - p * s.reductionFactor);
  return s.cliffFeeBps * (1 - s.reductionFactor / 10_000) ** p;
}

/** Fee (bps) at `elapsedSec` seconds after the pool's activation point. */
export function scheduledFeeBps(s: FeeSchedule, elapsedSec: number): number {
  const per = periodSeconds(s);
  return feeAfterPeriods(s, per > 0 ? Math.max(0, elapsedSec) / per : s.numberOfPeriod);
}

/** Fee (bps) the schedule settles at once all periods have passed. */
export const scheduleEndFeeBps = (s: FeeSchedule) => feeAfterPeriods(s, s.numberOfPeriod);

/** elapsed = clamp(now - launch, 0, duration), all in seconds. */
export const antiSniperElapsed = (nowSec: number, launchSec: number, s: FeeSchedule = ANTI_SNIPER_SCHEDULE) =>
  Math.min(scheduleDurationSeconds(s), Math.max(0, nowSec - launchSec));
