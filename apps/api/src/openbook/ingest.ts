import type { TierId } from "@hb/shared";
import type { Q } from "../db/pool.js";
import type { DbcEvent, RawTx } from "../indexer/decode.js";
import { txCosts } from "../indexer/txCosts.js";
import type { TradeRow } from "../store.js";
import { splitSwapFee, swapPrices } from "./math.js";
import { addCostWithAgg, addFailedWithAgg, addTradeWithAgg, lockMint, type CostKind, type SwapExtra } from "./write.js";

type Swap = Extract<DbcEvent, { kind: "swap" }>;

/** Per-swap 0012 columns from the decoded event and the tx we already fetched (no extra RPC). */
export function swapExtra(ev: Swap, raw: RawTx, tok: { tier: TierId; antiSniper: boolean }, viaUi: boolean): SwapExtra {
  const split = splitSwapFee({ side: ev.side, solLamports: ev.solLamports, feeLamports: ev.feeLamports, tier: tok.tier, antiSniper: tok.antiSniper,
    parts: ev.feeParts, referralLamports: ev.hasReferral ? ev.referralFeeLamports : 0n, viaUi });
  const p = swapPrices({ side: ev.side, solLamports: ev.solLamports, tokenAmount: ev.tokenAmount, feeLamports: ev.feeLamports, nextSqrtPrice: ev.nextSqrtPrice });
  // swap: minimum_amount_out; swap2: amount_1 is the minimum out for ExactIn (0) / PartialFill (1), the max in for ExactOut (2)
  const minOutRaw = ev.params && ev.params.mode !== 2 ? ev.params.amount1 : null;
  return { slot: raw.slot, txIdx: raw.transactionIndex ?? null, split, exactParts: !!ev.feeParts, pricePre: p?.pre ?? null, pricePost: p?.post ?? null, minOutRaw };
}

/** Write one landed tx: its swaps on this pool + its cost row, all aggregates in ONE db transaction under the per-mint advisory lock. */
export async function ingestLandedTx(q: Q, a: { sig: string; raw: RawTx; mint: string; pool: string; creator: string; initInTx: boolean;
  swaps: { row: TradeRow; extra: SwapExtra; solLamports: bigint }[] }) {
  await lockMint(q, a.mint);
  const added: boolean[] = [];
  for (const s of a.swaps) added.push(await addTradeWithAgg(q, s.row, s.extra, s.solLamports));
  const costs = txCosts(a.raw);
  if (costs && (a.swaps.length || a.initInTx)) {
    const kind: CostKind = a.initInTx ? (a.swaps.length ? "create_swap" : "create") : "swap";
    await addCostWithAgg(q, { sig: a.sig, mint: a.mint, pool: a.pool, kind, slot: a.raw.slot, txIdx: a.raw.transactionIndex ?? null, blockTime: a.raw.blockTime, costs, creator: a.creator });
  }
  return added;
}

/** A failed tx on one of our pools (err != null in getSignaturesForAddress). wallet / fee only when the tx was fetched. */
export async function ingestFailed(q: Q, f: { sig: string; mint: string; pool: string; slot: number; err: unknown; blockTime: number | null; raw?: RawTx | null }, now = Date.now()) {
  await lockMint(q, f.mint);
  const wallet = f.raw?.transaction.message.accountKeys[0] ?? null;
  const fee = f.raw?.meta?.fee;
  return addFailedWithAgg(q, { sig: f.sig, mint: f.mint, pool: f.pool, slot: f.slot, err: f.err ?? null, ts: f.blockTime != null ? f.blockTime * 1000 : now,
    wallet, feeLamports: fee == null ? null : BigInt(fee) }, now);
}
