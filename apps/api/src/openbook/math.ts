import { BPS, CURVE_FEE_BPS, METEORA_PROTOCOL_SHARE, REFERRAL_SHARE_OF_PROTOCOL, SPLIT_BPS, TIERS, TRADER_CASHBACK_BPS, type TierId } from "@hb/shared";

/** Open Book fee math. Pure (no db / env), lamports as bigint, floors like the program (dust stays with the last party).
 *
 *  Curve trade fee (DBC):  total = trading + protocol + referral  (exact from EvtSwap3 / EvtSwap2 / EvtSwap since 0012)
 *   - protocol (Meteora) = 20% of total, minus the referral part when the swap passes a referral account
 *   - referral           = 20% of the protocol share (4% of total); our referral ATA when the trade came through our UI
 *   - trading            = the other 80%: creator gets creatorTradingFeePercentage (50 / 62 / 75 by tier), the platform the rest
 *   - antiSniper         = the part of the total above the 1% base fee (only "_on" configs during the 60 s decay). It is NOT an extra
 *                          party: it is already inside total / protocol / trading.
 *  Fee basis: buys pay the fee on the SOL input (trades.sol includes it), sells on the gross SOL output (trades.sol + fee). */
/** A swap tx landing within this many slots of the pool-creation slot, not paid by the creator, is a SNIPER tx (aggregates and
 *  tags use the same rule; changing it needs an aggregate rebuild: scripts/backfillTradeCosts.ts --rebuild-only). */
export const OPENBOOK_SNIPER_SLOTS = 2;
export const isSniperTx = (slot: number | null | undefined, createSlot: number | null | undefined, payer: string, creator: string) =>
  slot != null && createSlot != null && slot >= createSlot && slot - createSlot <= OPENBOOK_SNIPER_SLOTS && payer !== creator;
export type Source = "indexed" | "derived" | "onchain";
export interface FeeSplit { total: bigint; protocol: bigint; referral: bigint; trading: bigint; creator: bigint; platform: bigint; antiSniper: bigint;
  /** where protocol / referral / trading came from: 'indexed' = event parts, 'derived' = 20% / 4% / 80% of the exact total */ source: Source }

const pctOf = (v: bigint, bps: number) => (v * BigInt(Math.round(bps))) / BigInt(BPS);
export const creatorPct = (tier: TierId) => TIERS[tier]?.creatorTradingFeePercentage ?? TIERS.standard.creatorTradingFeePercentage;

/** Fee above the 1% base (rounding noise of a couple of lamports is not anti-sniper). */
export function antiSniperPortion(side: "buy" | "sell", solLamports: bigint, feeLamports: bigint, antiSniperConfig: boolean): bigint {
  if (!antiSniperConfig || feeLamports <= 0n) return 0n;
  const basis = side === "buy" ? solLamports : solLamports + feeLamports;
  const extra = feeLamports - pctOf(basis, CURVE_FEE_BPS);
  return extra > 2n ? extra : 0n;
}

export function splitSwapFee(i: {
  side: "buy" | "sell"; solLamports: bigint; feeLamports: bigint; tier: TierId; antiSniper: boolean;
  /** exact event parts (trades.trading_fee_lamports / protocol_fee_lamports / referral_fee_lamports) */
  parts?: { trading: bigint; protocol: bigint; referral: bigint } | null;
  /** trades.referral_fee_lamports (exact since 0009 for via_ui) when parts are unknown */ referralLamports?: bigint | null; viaUi?: boolean;
}): FeeSplit {
  const total = i.feeLamports;
  let protocol: bigint, referral: bigint, trading: bigint, source: Source;
  if (i.parts) { ({ protocol, referral, trading } = i.parts); source = "indexed"; }
  else {
    const protocolGross = pctOf(total, METEORA_PROTOCOL_SHARE * BPS);
    referral = i.referralLamports ?? (i.viaUi ? pctOf(protocolGross, REFERRAL_SHARE_OF_PROTOCOL * BPS) : 0n);
    if (referral > protocolGross) referral = protocolGross;
    protocol = protocolGross - referral; trading = total - protocolGross; source = "derived";
  }
  const creator = (trading * BigInt(creatorPct(i.tier))) / 100n;
  return { total, protocol, referral, trading, creator, platform: trading - creator, antiSniper: antiSniperPortion(i.side, i.solLamports, total, i.antiSniper), source };
}

/** SOL per whole token from a DBC sqrt price (Q64.64), base 6 / quote 9 decimals. */
export function priceFromSqrt(sqrt: bigint): number {
  const s = Number(sqrt) / 2 ** 64;
  return s * s * 1e-3;
}

/** Price before / after a swap and its impact. post = event next_sqrt_price (exact). pre is DERIVED: on a concentrated-liquidity
 *  segment the average execution price equals sqrt(P_pre) * sqrt(P_post), so sqrt(P_pre) = exec / sqrt(P_post) (exact unless the swap
 *  crossed a curve segment). exec excludes the fee (buy: input - fee, sell: output + fee). */
export function swapPrices(i: { side: "buy" | "sell"; solLamports: bigint; tokenAmount: bigint; feeLamports: bigint; nextSqrtPrice: bigint }) {
  if (i.tokenAmount <= 0n || i.nextSqrtPrice <= 0n) return null;
  const quote = i.side === "buy" ? i.solLamports - i.feeLamports : i.solLamports + i.feeLamports;
  if (quote <= 0n) return null;
  const execRaw = Number(quote) / Number(i.tokenAmount); // lamports per raw token
  const sPost = Number(i.nextSqrtPrice) / 2 ** 64;
  const sPre = execRaw / sPost;
  const pre = sPre * sPre * 1e-3, post = sPost * sPost * 1e-3, exec = execRaw * 1e-3;
  return { pre, post, exec, impactPct: pre > 0 ? (post / pre - 1) * 100 : null };
}

/** Exact-in swaps: how far below the actual output the trader's minimum was (their slippage allowance actually left unused), %. */
export function minOutHeadroomPct(actualOut: bigint, minOut: bigint | null | undefined): number | null {
  if (minOut == null || actualOut <= 0n) return null;
  return (Number(actualOut - minOut) / Number(actualOut)) * 100;
}

/** Platform flow of one token (derived): the platform's gross for this token, minus the creator LP rebate it paid and the trader
 *  cashback attributed to it, then 40 / 50 / 10 (buyback / ops / treasury) of the rest, dust to treasury (services/split.ts rule).
 *  Never throws: cashback is funded from the pooled platform income, so a token can show more cashback than its own gross (rest 0). */
export function platformFlow(gross: bigint, rebate: bigint, cashback: bigint) {
  const rest = gross - rebate - cashback > 0n ? gross - rebate - cashback : 0n;
  const buyback = pctOf(rest, SPLIT_BPS.buyback), ops = pctOf(rest, SPLIT_BPS.ops);
  return { gross, rebate, cashback, net: rest, buyback, ops, treasury: rest - buyback - ops };
}

/** Trader cashback accrued on UI volume (TRADER_CASHBACK_BPS of via_ui volume; base rate, before $HIGHER multipliers / exclusions). */
export const cashbackOn = (uiVolumeLamports: bigint) => pctOf(uiVolumeLamports, TRADER_CASHBACK_BPS);

export const lamportsToSol = (v: bigint | number | null | undefined) => (v == null ? 0 : Number(v) / 1e9);
export const solToLamports = (v: number) => BigInt(Math.round(v * 1e9));
export const TOTAL_SUPPLY_TOKENS = 1_000_000_000;
export const pctSupply = (tokens: number) => (tokens / TOTAL_SUPPLY_TOKENS) * 100;
