import type { FastifyInstance } from "fastify";
import { store } from "../store.js";
import { scoresStore } from "../services/scoresStore.js";
import { SCORE_MAX } from "../services/score.js";

/** Higher Bar score + holder endpoints (written by services/scoreJob.ts). */
export function registerScores(app: FastifyInstance) {
  app.get("/tokens/:mint/score", async (req, reply) => {
    const { mint } = req.params as { mint: string };
    const t = await store.getToken(mint);
    if (!t) return reply.code(404).send({ error: "not found" });
    const s = (await scoresStore.scores([t.mint])).get(t.mint);
    return s ? { mint: t.mint, score: s.score, label: s.breakdown.label, breakdown: s.breakdown, max: SCORE_MAX, updatedAt: s.updatedAt }
      : { mint: t.mint, score: null, label: null, breakdown: null, max: SCORE_MAX, updatedAt: null };
  });
  app.get("/tokens/:mint/holders", async (req, reply) => {
    const { mint } = req.params as { mint: string };
    const limit = Math.min(200, Math.max(1, Number((req.query as { limit?: string }).limit) || 50));
    const t = await store.getToken(mint);
    if (!t) return reply.code(404).send({ error: "not found" });
    const rows = await scoresStore.holders(t.mint, limit);
    const total = rows.reduce((a, r) => a + r.balance, 0);
    return { mint: t.mint, source: "curve trades (net buys - sells; creator net of locked tokens)", items: rows.map((r) => ({ ...r, pct: total ? (r.balance / total) * 100 : 0, creator: r.wallet === t.creator })) };
  });
}
