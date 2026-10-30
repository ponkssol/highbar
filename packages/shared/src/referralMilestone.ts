// ---- step 8: user referral + milestone bonus (apps/api jobs, /referral page) ----
import { BPS, CREATOR_TRADING_FEE_PCT, CURVE_FEE_BPS, METEORA_PROTOCOL_SHARE_PCT, type TierId } from "./index.js";

/** Referrer reward = REFERRAL_DEFAULTS.rewardBps of the PLATFORM share of each referred trade's curve fee
 *  (after Meteora's protocol cut and the creator share), so it never touches creator fees. Env overrides in apps/api:
 *  REFERRAL_REWARD_BPS, REFERRAL_MIN_PAYOUT_SOL. Paid per closed UTC day, capped at that day's ops share. */
export const REFERRAL_DEFAULTS = { rewardBps: 2000, minPayoutSol: 0.001 } as const;
/** ?ref=<wallet> link parameter and the localStorage key the web app keeps it under until the wallet signs in. */
export const REFERRAL_PARAM = "ref";

/** Platform share (lamports) of a curve trade fee for a tier. `feeLamports` = total trading fee (0 -> estimated from volume at CURVE_FEE_BPS). */
export function platformFeeLamports(tier: TierId, feeLamports: bigint, volumeLamports = 0n): bigint {
  const fee = feeLamports > 0n ? feeLamports : (volumeLamports * BigInt(CURVE_FEE_BPS)) / BigInt(BPS);
  const afterProtocol = (fee * BigInt(100 - METEORA_PROTOCOL_SHARE_PCT)) / 100n;
  return (afterProtocol * BigInt(100 - (CREATOR_TRADING_FEE_PCT[tier] ?? 50))) / 100n;
}
export const referralRewardLamports = (platformFee: bigint, rewardBps: number = REFERRAL_DEFAULTS.rewardBps) => (platformFee * BigInt(rewardBps)) / BigInt(BPS);

/** Milestone bonus: the treasury pays the creator `rewardSol` once their token's market cap (SOL) stays at or above `mcapSol`
 *  for `days` consecutive full UTC days after migration. Override with MILESTONES="id:mcapSol:days:rewardSol,..." in apps/api. */
export interface Milestone { id: string; mcapSol: number; days: number; rewardSol: number }
export const MILESTONE_DEFAULTS: Milestone[] = [
  { id: "hold-1k-7d", mcapSol: 1_000, days: 7, rewardSol: 1 },
  { id: "hold-5k-30d", mcapSol: 5_000, days: 30, rewardSol: 5 },
];

/** "id:mcapSol:days:rewardSol,..." -> milestones (throws on a malformed entry). Empty -> defaults. */
export function parseMilestones(spec?: string | null): Milestone[] {
  if (!spec || !spec.trim()) return MILESTONE_DEFAULTS;
  const out = spec.split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
    const [id, m, d, r] = s.split(":").map((x) => x.trim());
    const mcapSol = Number(m), days = Number(d), rewardSol = Number(r);
    if (!id || !/^[a-z0-9-]{1,32}$/i.test(id) || !(mcapSol > 0) || !Number.isInteger(days) || days < 1 || days > 365 || !(rewardSol >= 0))
      throw new Error(`bad milestone "${s}" (use id:mcapSol:days:rewardSol, e.g. hold-1k-7d:1000:7:1)`);
    return { id, mcapSol, days, rewardSol };
  });
  if (new Set(out.map((x) => x.id)).size !== out.length) throw new Error("duplicate milestone id");
  return out;
}

export interface MilestoneDay { day: string; minMcapSol: number; samples: number }
export interface MilestoneProgress { id: string; mcapSol: number; days: number; rewardSol: number; streak: number; qualified: boolean; qualifiedDay: string | null; broken: number }

/** Count consecutive full UTC days strictly after the migration day whose LOWEST sampled mcap is >= the threshold.
 *  A day below the threshold resets the streak; a day with fewer than `minSamples` samples (tracker down) is skipped,
 *  neither counting nor breaking. Once `days` is reached the milestone is qualified for good (qualifiedDay = the day it completed).
 *  `days` must be sorted ascending and only contain CLOSED days (the open day is never counted). */
export function milestoneProgress(m: Milestone, migratedDay: string, days: MilestoneDay[], minSamples = 1): MilestoneProgress {
  let streak = 0, broken = 0;
  for (const d of days) {
    if (d.day <= migratedDay || d.samples < minSamples) continue;
    if (d.minMcapSol >= m.mcapSol) { streak++; if (streak >= m.days) return { ...m, streak, qualified: true, qualifiedDay: d.day, broken }; }
    else { if (streak) broken++; streak = 0; }
  }
  return { ...m, streak, qualified: false, qualifiedDay: null, broken };
}
