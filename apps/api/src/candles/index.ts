import type { FastifyInstance } from "fastify";
import { tradeStore, type TradePoint } from "./store.js";
import { buildCandles, parseRange, RangeError400 } from "./candles.js";
import { solUsd } from "./price.js";

/** Indexer TradeRow (sig = "<txsig>:<ixIdx>") -> trade point. */
export function tradeRowToPoint(t: { sig: string; mint: string; side: "buy" | "sell"; sol: number; tokens: number; ts: number }): TradePoint | null {
  if (!(t.tokens > 0) || !(t.sol > 0)) return null;
  const k = t.sig.lastIndexOf(":");
  const sig = k > 0 ? t.sig.slice(0, k) : t.sig, ixIdx = k > 0 ? Number(t.sig.slice(k + 1)) || 0 : 0;
  return { mint: t.mint, sig, ixIdx, ts: t.ts, priceSol: t.sol / t.tokens, amount: t.tokens, side: t.side, sol: t.sol };
}
export function recordTrade(t: Parameters<typeof tradeRowToPoint>[0]) { const p = tradeRowToPoint(t); return p ? tradeStore.add(p) : false; }
/** Backfill from already-indexed trades (idempotent thanks to sig+ixIdx dedupe). */
export function backfill(rows: Iterable<Parameters<typeof tradeRowToPoint>[0]>) { let n = 0; for (const r of rows) if (recordTrade(r)) n++; tradeStore.flush(); return n; }

export function registerCandles(app: FastifyInstance) {
  app.get("/tokens/:mint/candles", async (req, reply) => {
    const { mint } = req.params as { mint: string };
    let r;
    try { r = parseRange(req.query as Record<string, string>); } catch (e) {
      if (e instanceof RangeError400) return reply.code(400).send({ error: e.message });
      throw e;
    }
    const usd = await solUsd();
    return { mint, tf: r.tf, from: r.from, to: r.to, solUsd: usd.v, solUsdSource: usd.src, candles: buildCandles(tradeStore.trades(mint), r.from, r.to, r.step, usd.v) };
  });
}