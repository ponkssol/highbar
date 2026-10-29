import type { TradePoint } from "./store.js";

export const TF_MS = { "1m": 60_000, "5m": 300_000, "15m": 900_000, "1h": 3_600_000, "4h": 14_400_000, "1d": 86_400_000 } as const;
export type Tf = keyof typeof TF_MS;
export const MAX_BUCKETS = 5000, DEFAULT_BUCKETS = 500;
export interface Candle { t: number; o: number; h: number; l: number; c: number; v: number; vSol: number; n: number; oUsd: number; hUsd: number; lUsd: number; cUsd: number; vUsd: number }

export class RangeError400 extends Error {}

/** Validate tf/from/to (ms). Buckets are UTC-aligned (epoch multiples). */
export function parseRange(q: { tf?: string; from?: string; to?: string }, now = Date.now()) {
  const tf = (q.tf ?? "1m") as Tf;
  if (!(tf in TF_MS)) throw new RangeError400(`invalid tf (use ${Object.keys(TF_MS).join("|")})`);
  const step = TF_MS[tf];
  const num = (v: string | undefined) => (v === undefined || v === "" ? undefined : Number(v));
  let to = num(q.to) ?? now, from = num(q.from);
  if (!Number.isFinite(to) || (from !== undefined && !Number.isFinite(from))) throw new RangeError400("from/to must be ms timestamps");
  to = Math.floor(to / step) * step;
  from = from === undefined ? Math.max(0, to - (DEFAULT_BUCKETS - 1) * step) : Math.floor(from / step) * step;
  if (from < 0 || from > to) throw new RangeError400("from must be <= to");
  if ((to - from) / step + 1 > MAX_BUCKETS) throw new RangeError400(`range exceeds ${MAX_BUCKETS} buckets`);
  return { tf, step, from, to };
}

/** Aggregate trades (sorted by ts) into OHLCV buckets [from, to] inclusive. Seeds from the last trade before `from`;
 * empty buckets carry the previous close with v=0. Leading buckets before any price are omitted. */
export function buildCandles(trades: TradePoint[], from: number, to: number, step: number, solUsd: number): Candle[] {
  let i = 0, prev: number | null = null;
  while (i < trades.length && trades[i].ts < from) { prev = trades[i].priceSol; i++; }
  const out: Candle[] = [];
  for (let t = from; t <= to; t += step) {
    const end = t + step;
    let o = prev, h = prev ?? -Infinity, l = prev ?? Infinity, c = prev, v = 0, vSol = 0, n = 0;
    let first = true;
    while (i < trades.length && trades[i].ts < end) {
      const p = trades[i].priceSol;
      if (first) { o = p; h = p; l = p; first = false; } else { h = Math.max(h, p); l = Math.min(l, p); }
      c = p; v += trades[i].amount; vSol += trades[i].sol ?? p * trades[i].amount; n++; i++;
    }
    if (o === null || c === null) continue;
    if (n === 0) { h = c; l = c; }
    out.push({ t, o, h, l, c, v, vSol, n, oUsd: o * solUsd, hUsd: h * solUsd, lUsd: l * solUsd, cUsd: c * solUsd, vUsd: vSol * solUsd });
    prev = c;
  }
  return out;
}