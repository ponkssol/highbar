import "dotenv/config";
import { BAR_BALANCE_CACHE_MS, BAR_FEE_SHARE_BPS, networkOf } from "@hb/shared";
import { officialMint } from "../services/officialToken.js";

const num = (k: string, d: number, max = Infinity) => {
  const v = process.env[k], n = v === undefined || v === "" ? d : Number(v);
  if (!Number.isFinite(n) || n < 0 || n > max) throw new Error(`${k} must be a number between 0 and ${max}`);
  return n;
};
const bool = (k: string, d: boolean) => { const v = process.env[k]; return v === undefined || v === "" ? d : v.toLowerCase() === "true"; };
const list = (k: string) => (process.env[k] ?? "").split(",").map((s) => s.trim()).filter(Boolean);

const gateEnv = process.env.BAR_GATE_MAX_TIER ? bool("BAR_GATE_MAX_TIER", false) : null;

/** $HIGHER utility env (step 8). All optional: until $HIGHER resolves (BAR_MINT, else the detected official launch) every perk is off. */
export const bar = {
  /** Official $HIGHER mint from the shared resolver (services/officialToken.ts): BAR_MINT override, else the detected official launch. */
  get mint(): string | null { return officialMint(); },
  /** On-chain balance cache TTL (ms). */
  cacheMs: num("BAR_BALANCE_CACHE_MS", BAR_BALANCE_CACHE_MS),
  /** Max tier launches need MAX_TIER_MIN_BAR in the creator wallet (API + UI gate). Default (unset): on once $HIGHER exists. */
  get gateMaxTier(): boolean { return gateEnv ?? !!officialMint(); },
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
