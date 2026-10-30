import type { FastifyInstance } from "fastify";
import { store, type TradeRow } from "../store.js";

const SOL_USD = Number(process.env.SOL_USD ?? 150);
const DAY = 86400_000;
const since = (w?: string) => (w === "24h" ? Date.now() - DAY : w === "7d" ? Date.now() - 7 * DAY : 0);
const inWin = (w?: string) => { const s = since(w); return (t: TradeRow) => t.ts >= s; };

/** Leaderboard and wallet endpoints computed from the indexed store (cashback / burn: routes/rewards.ts). */
export function registerPages(app: FastifyInstance) {
  app.get("/leaderboard/:kind", async (req, reply) => {
    const { kind } = req.params as { kind: string };
    const q = req.query as { window?: string; limit?: string };
    const limit = Math.min(200, Number(q.limit ?? 50));
    const trades = (await store.allTrades()).filter(inWin(q.window));
    const tokens = await store.tokens();
    if (kind === "tokens") {
      const vol = new Map<string, number>(); const cnt = new Map<string, number>();
      for (const t of trades) { vol.set(t.mint, (vol.get(t.mint) ?? 0) + t.sol); cnt.set(t.mint, (cnt.get(t.mint) ?? 0) + 1); }
      return tokens.map((t) => ({
        mint: t.mint, name: t.name, symbol: t.symbol, tier: t.tier, mcapUsd: t.mcapSol * SOL_USD, progress: t.progress, isMigrated: t.isMigrated,
        volumeSol: vol.get(t.mint) ?? 0, trades: cnt.get(t.mint) ?? 0, volume24hSol: t.volume24hSol,
      })).sort((a, b) => b.volumeSol - a.volumeSol || b.mcapUsd - a.mcapUsd).slice(0, limit);
    }
    if (kind === "creators") {
      const by = new Map<string, { creator: string; tokens: number; graduated: number; volumeSol: number; feesEarnedSol: number }>();
      const vol = new Map<string, number>();
      for (const t of trades) vol.set(t.mint, (vol.get(t.mint) ?? 0) + t.sol);
      for (const t of tokens) {
        const c = by.get(t.creator) ?? { creator: t.creator, tokens: 0, graduated: 0, volumeSol: 0, feesEarnedSol: 0 };
        const v = vol.get(t.mint) ?? 0;
        c.tokens++; c.graduated += t.isMigrated ? 1 : 0; c.volumeSol += v;
        c.feesEarnedSol += t.volumeSol ? t.creatorFeesSol * (v / t.volumeSol) : 0;
        by.set(t.creator, c);
      }
      return [...by.values()].sort((a, b) => b.volumeSol - a.volumeSol || b.tokens - a.tokens).slice(0, limit);
    }
    if (kind === "traders") {
      const by = new Map<string, { wallet: string; volumeSol: number; trades: number; buys: number; sells: number; lastTs: number }>();
      for (const t of trades) {
        const w = by.get(t.wallet) ?? { wallet: t.wallet, volumeSol: 0, trades: 0, buys: 0, sells: 0, lastTs: 0 };
        w.volumeSol += t.sol; w.trades++; w[t.side === "buy" ? "buys" : "sells"]++; w.lastTs = Math.max(w.lastTs, t.ts);
        by.set(t.wallet, w);
      }
      return [...by.values()].sort((a, b) => b.volumeSol - a.volumeSol).slice(0, limit);
    }
    return reply.code(404).send({ error: "kind must be tokens|creators|traders" });
  });

  app.get("/wallet/:address/trades", async (req) => {
    const { address } = req.params as { address: string };
    return store.walletTrades(address, 200);
  });

  app.get("/wallet/:address/created", async (req) => {
    const { address } = req.params as { address: string };
    return (await store.tokensByCreator(address))
      .map((t) => ({ ...t, mcapUsd: t.mcapSol * SOL_USD }));
  });
}
