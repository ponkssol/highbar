/** Pure $HIGHER utility math (no DB / RPC), shared by the jobs, the API and the tests. */
import { BAR_TIERS, BPS, TRADER_CASHBACK_BPS, type BarTier } from "@hb/shared";

const unit = (decimals: number) => 10n ** BigInt(decimals);
export const minRawOf = (t: BarTier, decimals: number) => BigInt(t.minBar) * unit(decimals);
export const rawToBar = (raw: bigint, decimals: number) => Number(raw / unit(decimals)) + Number(raw % unit(decimals)) / 10 ** decimals;

/** Highest tier whose threshold the raw balance meets (exact bigint compare). */
export function tierForRaw(raw: bigint, decimals: number): BarTier {
  let best = BAR_TIERS[0];
  for (const t of BAR_TIERS) if (raw >= minRawOf(t, decimals)) best = t;
  return best;
}
/** Next tier up and how much more $HIGHER it needs (null at the top). */
export function nextTier(raw: bigint, decimals: number): { tier: BarTier; needBar: number } | null {
  const t = BAR_TIERS.find((x) => minRawOf(x, decimals) > raw);
  return t ? { tier: t, needBar: rawToBar(minRawOf(t, decimals) - raw, decimals) } : null;
}
/** Smallest raw balance stored in snapshots / eligible for the fee share. */
export const feeShareMinRaw = (decimals: number) => minRawOf(BAR_TIERS.find((t) => t.feeShare) ?? BAR_TIERS[BAR_TIERS.length - 1], decimals);

/** Base cashback, identical to computeAccruals (TRADER_CASHBACK_BPS of volume). */
export const baseCashback = (volume: bigint) => (volume * BigInt(TRADER_CASHBACK_BPS)) / BigInt(BPS);
/** Holder extra on top of base cashback: base * (multiplier - 1) + fee rebate (feeRebateBps of volume). 0 for tier "none". */
export function cashbackBonus(volume: bigint, tier: BarTier): bigint {
  const base = baseCashback(volume);
  return (base * BigInt(tier.cashbackMultiplierBps)) / BigInt(BPS) - base + (volume * BigInt(tier.feeRebateBps)) / BigInt(BPS);
}

export const feeSharePool = (opsLamports: bigint, shareBps: number) => (opsLamports * BigInt(shareBps)) / BigInt(BPS);
export interface ShareRow { wallet: string; raw: bigint; amount: bigint }
/** Pro-rata split of `pool` by balance among holders with raw >= minRaw (floor; dust stays in ops). Sorted by wallet. */
export function allocateFeeShare(pool: bigint, holders: Iterable<[string, bigint]>, minRaw: bigint): { rows: ShareRow[]; totalRaw: bigint; allocated: bigint } {
  const elig = [...holders].filter(([, r]) => r >= minRaw && r > 0n).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const totalRaw = elig.reduce((a, [, r]) => a + r, 0n);
  if (pool <= 0n || totalRaw === 0n) return { rows: elig.map(([wallet, raw]) => ({ wallet, raw, amount: 0n })), totalRaw, allocated: 0n };
  const rows = elig.map(([wallet, raw]) => ({ wallet, raw, amount: (pool * raw) / totalRaw }));
  return { rows, totalRaw, allocated: rows.reduce((a, r) => a + r.amount, 0n) };
}
