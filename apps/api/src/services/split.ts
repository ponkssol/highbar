import { BPS, SPLIT_BPS } from "@hb/shared";
/** Waterfall: cashback first, then 40/50/10 of the remainder. Rounding dust goes to treasury. */
export function splitEpoch(gross: bigint, cashback: bigint) {
  if (cashback > gross) throw new Error(`cashback ${cashback} exceeds gross ${gross}; manual review`);
  const rest = gross - cashback;
  const buyback = (rest * BigInt(SPLIT_BPS.buyback)) / BigInt(BPS);
  const ops = (rest * BigInt(SPLIT_BPS.ops)) / BigInt(BPS);
  return { gross, cashback, buyback, ops, treasury: rest - buyback - ops };
}
