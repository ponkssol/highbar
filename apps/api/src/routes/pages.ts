import type { FastifyInstance } from "fastify";
import { store } from "../store.js";
import { officialMint } from "../services/officialToken.js";
import { scoresStore } from "../services/scoresStore.js";
import { hiddenSet } from "../services/hiddenTokens.js";
import { withoutHidden } from "@hb/shared";
import { survival, windowRange, SURVIVAL_MIN_RATIO } from "../services/leaderboard.js";

const SOL_USD = Number(process.env.SOL_USD ?? 150);
const KINDS = "tokens|creators|traders|scores|migrations|survivors";

/** Leaderboard and wallet endpoints computed from the indexed store (cashback / burn: routes/rewards.ts).
 *  ?window=24h|7d|week|all or ?week=YYYY-MM-DD (UTC Monday-start week containing that date). */
export function registerPages(app: FastifyInstance) {
  app.get("/leaderboard/:kind", async (req, reply) => {
    const { kind } = req.params as { kind: string };
    const q = req.query as { window?: string; week?: string; limit?: string };
    const limit = Math.min(200, Math.max(1, Number(q.limit ?? 50) || 50));
    const { from, to } = windowRange(q);
    const inWin = (ts: number | null | undefined) => ts != null && ts >= from && ts < to;
    // hidden test tokens are left out of the token / score / migration / survivor / creator boards (traders: real wallet volume, kept)
    const tokens = withoutHidden(await store.tokens(), hiddenSet());
    const scores = await scoresStore.scores();
    const sc = (mint: string) => scores.get(mint)?.score ?? null;
    const devLocks = await store.devLocks(tokens.map((t) => t.mint));
    const om = officialMint();
    const base = (t: (typeof tokens)[number]) => ({
      mint: t.mint, name: t.name, symbol: t.symbol, tier: t.tier, mcapUsd: t.mcapSol * SOL_USD, progress: t.progress, isMigrated: t.isMigrated,
      score: sc(t.mint), devLocked: devLocks.has(t.mint), unlockAt: devLocks.get(t.mint) ?? null, official: !!om && t.mint === om,
    });

    if (kind === "scores") {
      return tokens.filter((t) => sc(t.mint) != null && (from === 0 || inWin(t.createdAt)))
        // breakdown is always present (null only for a malformed scores row) so the web highbar table never reads a missing object.
        .map((t) => { const b = scores.get(t.mint)?.breakdown ?? null; return { ...base(t), label: b?.label ?? null, breakdown: b, volumeSol: t.volumeSol }; })
        .sort((a, b) => b.score! - a.score! || b.volumeSol - a.volumeSol).slice(0, limit);
    }
    if (kind === "migrations" || kind === "survivors") {
      const mig = await scoresStore.migrationInfo();
      const graduated = tokens.filter((t) => t.isMigrated).map((t) => ({ t, migratedAt: mig.get(t.mint)?.migratedAt ?? null }));
      if (kind === "migrations") {
        return graduated.filter((g) => inWin(g.migratedAt))
          .map(({ t, migratedAt }) => ({ ...base(t), migratedAt, createdAt: t.createdAt, timeToMigrateMs: migratedAt! - t.createdAt, raisedSol: t.quoteReserveSol, volumeSol: t.volumeSol }))
          .sort((a, b) => a.timeToMigrateMs - b.timeToMigrateMs).slice(0, limit);
      }
      // survivors: migrated tokens (migrated in the window) ranked by consecutive days above SURVIVAL_MIN_RATIO x mcap at migration.
      // mcap at migration = the curve's final price (tokens.mcap_sol freezes when the curve migrates); now = latest DAMM v2 snapshot.
      const rows = graduated.filter((g) => g.migratedAt != null && inWin(g.migratedAt));
      const snaps = await scoresStore.dammSnapshots(rows.map((g) => g.t.mint));
      return rows.map(({ t, migratedAt }) => {
        const s = survival(snaps.get(t.mint) ?? [], migratedAt!, t.mcapSol);
        return { ...base(t), migratedAt, mcapAtMigrationSol: t.mcapSol, ...s, nowMcapUsd: s.nowMcapSol == null ? null : s.nowMcapSol * SOL_USD, minRatio: SURVIVAL_MIN_RATIO };
      }).sort((a, b) => b.survivedDays - a.survivedDays || (b.ratioNow ?? -1) - (a.ratioNow ?? -1)).slice(0, limit);
    }

    const trades = (await store.allTrades(from)).filter((t) => inWin(t.ts));
    if (kind === "tokens") {
      const vol = new Map<string, number>(); const cnt = new Map<string, number>();
      for (const t of trades) { vol.set(t.mint, (vol.get(t.mint) ?? 0) + t.sol); cnt.set(t.mint, (cnt.get(t.mint) ?? 0) + 1); }
      return tokens.map((t) => ({ ...base(t), volumeSol: vol.get(t.mint) ?? 0, trades: cnt.get(t.mint) ?? 0, volume24hSol: t.volume24hSol }))
        .sort((a, b) => b.volumeSol - a.volumeSol || b.mcapUsd - a.mcapUsd).slice(0, limit);
    }
    if (kind === "creators") {
      const by = new Map<string, { creator: string; tokens: number; graduated: number; volumeSol: number; feesEarnedSol: number; avgScore: number | null; scored: number; scoreSum: number }>();
      const vol = new Map<string, number>();
      for (const t of trades) vol.set(t.mint, (vol.get(t.mint) ?? 0) + t.sol);
      for (const t of tokens) {
        const c = by.get(t.creator) ?? { creator: t.creator, tokens: 0, graduated: 0, volumeSol: 0, feesEarnedSol: 0, avgScore: null, scored: 0, scoreSum: 0 };
        const v = vol.get(t.mint) ?? 0, s = sc(t.mint);
        c.tokens++; c.graduated += t.isMigrated ? 1 : 0; c.volumeSol += v;
        c.feesEarnedSol += t.volumeSol ? t.creatorFeesSol * (v / t.volumeSol) : 0;
        if (s != null) { c.scored++; c.scoreSum += s; c.avgScore = Math.round(c.scoreSum / c.scored); }
        by.set(t.creator, c);
      }
      return [...by.values()].map(({ scored: _a, scoreSum: _b, ...c }) => c)
        .sort((a, b) => b.volumeSol - a.volumeSol || b.tokens - a.tokens).slice(0, limit);
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
    return reply.code(404).send({ error: `kind must be ${KINDS}` });
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
