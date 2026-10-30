/**
 * Trades-table ordering (newest first).
 *
 * The trades table has no slot / transaction-index columns: PK is (sig, ix_idx) and ts is the block time in ms, which
 * only has whole-second precision on chain. Two trades in different slots of the same second (e.g. the pool-creation tx
 * with the dev buy and a sniper one slot later) used to tie on ts and fall back to `sig DESC`, i.e. random base58 order,
 * so the dev buy could show up as the NEWEST trade. Without a DB migration:
 *  - the indexer writes ts = blockTime * 1000 + a per-mint sub-second sequence (`nextTradeTs`), assigned in chain order
 *    (slot, then position in the block as returned by getSignaturesForAddress, then event index in the tx), so ts DESC
 *    is slot DESC, tx index DESC, instruction index DESC for every newly indexed trade;
 *  - `dev_buy` (the first buy inside the pool-creation tx) is always the oldest trade of its mint, and breaks the
 *    remaining ties for rows written before the sequence existed (those all sit on the whole second);
 *  - sig DESC, ix_idx DESC stay as the last tiebreak (stable paging, events of one tx newest first).
 */

/** Per-mint trade list (token page): the dev buy is ALWAYS the oldest row, whatever its ts. */
export const MINT_TRADES_ORDER = "dev_buy ASC, ts DESC, sig DESC, ix_idx DESC";

/** Cross-mint lists (wallet history, all trades): newest first; within one ms the dev buy sorts oldest. */
export const tradesOrder = (alias = "") => {
  const p = alias ? `${alias}.` : "";
  return `${p}ts DESC, ${p}dev_buy ASC, ${p}sig DESC, ${p}ix_idx DESC`;
};

/** Largest stored ts for a mint inside [$2, $3) (one second). Params: mint, secondMs, secondMs + 1000. */
export const MAX_TS_IN_SECOND_SQL = `SELECT max(ts) AS m FROM trades WHERE mint = $1 AND ts >= $2 AND ts < $3`;

/** Max trades per mint per second the sub-second sequence can order (ts stays inside the same second). */
export const SUB_SECOND_STEPS = 1000;

/** Whole-second base (ms) for a tx's block time; falls back to the current second when the RPC has no block time. */
export const secondBaseMs = (blockTimeSec: number | null | undefined, nowMs = Date.now()) =>
  (blockTimeSec ?? Math.floor(nowMs / 1000)) * 1000;

/**
 * Next ts for a trade in the second starting at `baseMs`, given the largest ts already used for this mint in that second
 * (`lastTs`, null/undefined when none). First trade of the second gets baseMs, then +1 ms each, capped at the second's end.
 */
export function nextTradeTs(baseMs: number, lastTs?: number | null): number {
  if (lastTs == null || lastTs < baseMs) return baseMs;
  return Math.min(baseMs + SUB_SECOND_STEPS - 1, lastTs + 1);
}

/**
 * getSignaturesForAddress returns newest first (slot DESC, then position in the block DESC). Returns them oldest first:
 * reversed, then a stable sort by slot so a misordered page can never put a later slot before an earlier one.
 */
export function chronological<T extends { slot: number }>(sigs: readonly T[]): T[] {
  return [...sigs].reverse().sort((a, b) => a.slot - b.slot);
}