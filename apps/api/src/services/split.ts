import { BPS, SPLIT_BPS } from "@hb/shared";
/** Waterfall of a period's claimed platform fees (gross): the creator LP rebate first (LP_REBATE_BPS of the platform's claimed DAMM v2
 *  LP SOL), then trader cashback, then 40/50/10 (buyback / ops / treasury) of the remainder. Rounding dust goes to treasury. */
export function splitEpoch(gross: bigint, cashback: bigint, rebate = 0n) {
  if (cashback < 0n || rebate < 0n) throw new Error("cashback / rebate must be >= 0");
  if (rebate > gross) throw new Error(`creator LP rebate ${rebate} exceeds gross ${gross}; manual review`);
  if (cashback > gross - rebate) throw new Error(`cashback ${cashback} exceeds gross ${gross} after the creator LP rebate ${rebate}; manual review`);
  const rest = gross - rebate - cashback;
  const buyback = (rest * BigInt(SPLIT_BPS.buyback)) / BigInt(BPS);
  const ops = (rest * BigInt(SPLIT_BPS.ops)) / BigInt(BPS);
  return { gross, rebate, cashback, buyback, ops, treasury: rest - buyback - ops };
}
