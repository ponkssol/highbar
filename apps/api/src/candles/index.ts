import type { FastifyInstance } from "fastify";
import type { TradePoint } from "./store.js";
import { buildCandles, parseRange, RangeError400 } from "./candles.js";
import { solUsd } from "./price.js";
import { store } from "../store.js";
import type { Q } from "../db/pool.js";

/** Indexer TradeRow (sig = "<txsig>:<ixIdx>") -> trade point. */
export function tradeRowToPoint(t: { sig: string; mint: string; side: "buy" | "sell"; sol: number; tokens: number; ts: number }): TradePoint | null {
  if (!(t.tokens > 0) || !(t.sol > 0)) return null;
  const k = t.sig.lastIndexOf(":");
  const sig = k > 0 ? t.sig.slice(0, k) : t.sig, ixIdx = k > 0 ? Number(t.sig.slice(k + 1)) || 0 : 0;
  return { mint: t.mint, sig, ixIdx, ts: t.ts, priceSol: t.sol / t.tokens, amount: t.tokens, side: t.side, sol: t.sol };
}
/** Record a candle point in Postgres (deduped on sig+ix_idx). */
export async function recordTrade(t: Parameters<typeof tradeRowToPoint>[0], q?: Q) { const p = tradeRowToPoint(t); return p ? store.addPoint(p, q) : false; }
/** Backfill from already-indexed trades (idempotent). */
export async function backfill(rows: Iterable<Parameters<typeof tradeRowToPoint>[0]>) { let n = 0; for (const r of rows) if (await recordTrade(r)) n++; return n; }

export function registerCandles(app: FastifyInstance) {
  app.get("/tokens/:mint/candles", async (req, reply) => {
    const { mint } = req.params as { mint: string };
    let r;
    try { r = parseRange(req.query as Record<string, string>); } catch (e) {
      if (e instanceof RangeError400) return reply.code(400).send({ error: e.message });
      throw e;
    }
    const usd = await solUsd();
    const pts = await store.points(mint, 0, r.to + r.step - 1);
    return { mint, tf: r.tf, from: r.from, to: r.to, solUsd: usd.v, solUsdSource: usd.src, candles: buildCandles(pts, r.from, r.to, r.step, usd.v) };
  });
}
