import "dotenv/config";
import { BAR_BALANCE_CACHE_MS, BAR_FEE_SHARE_BPS, networkOf } from "@hb/shared";

const num = (k: string, d: number, max = Infinity) => {
  const v = process.env[k], n = v === undefined || v === "" ? d : Number(v);
  if (!Number.isFinite(n) || n < 0 || n > max) throw new Error(`${k} must be a number between 0 and ${max}`);
  return n;
};
const bool = (k: string, d: boolean) => { const v = process.env[k]; return v === undefined || v === "" ? d : v.toLowerCase() === "true"; };
const list = (k: string) => (process.env[k] ?? "").split(",").map((s) => s.trim()).filter(Boolean);

/** $BAR utility env (step 8). All optional: without BAR_MINT every perk is off and behaviour matches step 7. */
export const bar = {
  mint: process.env.BAR_MINT || null,
  /** On-chain balance cache TTL (ms). */
  cacheMs: num("BAR_BALANCE_CACHE_MS", BAR_BALANCE_CACHE_MS),
  /** Max tier launches need MAX_TIER_MIN_BAR in the creator wallet (API + UI gate). Default: on when BAR_MINT is set. */
  gateMaxTier: bool("BAR_GATE_MAX_TIER", !!process.env.BAR_MINT),
  /** Holder cashback multiplier + fee rebate in the cashback job. */
  cashbackBoost: bool("BAR_CASHBACK_BOOST", true),
  /** Live runs refuse to use current balances when the period has no snapshots (current balances can be bought right before the job). Default: on for mainnet. */
  requireSnapshots: bool("BAR_REQUIRE_SNAPSHOTS", networkOf(process.env.NETWORK) === "mainnet"),
  /** Share of the ops allocation accrued to holders, bps. */
  feeShareBps: num("BAR_FEE_SHARE_BPS", BAR_FEE_SHARE_BPS, 10_000),
  /** Fee share payouts stay off until legal review: --live only writes the accrual ledger unless this is true. */
  feeShareLive: bool("BAR_FEE_SHARE_LIVE", false),
  /** Wallets that never get the fee share (team, LP / vault owners, CEX), besides platform / treasury / referral. */
  feeShareExclude: list("BAR_FEE_SHARE_EXCLUDE_WALLETS"),
};
