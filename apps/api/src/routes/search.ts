import type { FastifyInstance } from "fastify";
import { db } from "../db/pool.js";
import { imageUrl } from "../media.js";
import { solUsd } from "../candles/price.js";
import { windowRange } from "../services/leaderboard.js";
import { buildSpark, clampLimit, hotTokens, hourlyCloses, normalizeQuery, round, searchTokens, searchWallets, sparkWindow, topTraders, TtlCache, walletStats } from "../services/search.js";

/** There is no display-name / label source for wallets yet (no users table); kept as a field so the web can show one later. */
const walletLabel = (_wallet: string): string | null => null;
const usd = async () => { const p = (await solUsd()).v; return p > 0 ? p : null; };
const mcapUsd = (mcapSol: number, p: number | null) => (p == null ? null : round(mcapSol * p, 2));

const searchCache = new TtlCache<unknown>(12_000), hotCache = new TtlCache<unknown>(45_000, 50), tradersCache = new TtlCache<unknown>(60_000, 50);

/** GET /search, /search/hot, /search/traders: read-only, short in-memory caches + Cache-Control (global per-IP rate limit applies). */
export function registerSearch(app: FastifyInstance) {
  app.get("/search", async (req, reply) => {
    const q = req.query as { q?: string; limit?: string };
    const limit = clampLimit(q.limit, 8, 25), s = normalizeQuery(q.q);
    reply.header("cache-control", "public, max-age=10");
    if (!s) return { tokens: [], users: [] };
    return searchCache.get(`${s.q}\u0000${limit}`, async () => {
      const [toks, users, p] = await Promise.all([searchTokens(db, s, limit), searchWallets(db, s, limit), usd()]);
      return {
        tokens: toks.map((t) => ({ mint: t.mint, name: t.name, symbol: t.symbol, image: imageUrl(t.mint, t.uri), marketCapSol: t.mcapSol, marketCapUsd: mcapUsd(t.mcapSol, p),
          createdAt: t.createdAt, tier: t.tier, progressPct: round((t.isMigrated ? 1 : t.progress) * 100, 2), migrated: t.isMigrated })),
        users: users.map((u) => ({ wallet: u.wallet, label: walletLabel(u.wallet), volumeSol: u.volumeSol, pnlSol: u.pnlSol })),
      };
    });
  });

  app.get("/search/hot", async (req, reply) => {
    const limit = clampLimit((req.query as { limit?: string }).limit, 12, 50);
    reply.header("cache-control", "public, max-age=30");
    return hotCache.get(String(limit), async () => {
      const now = Date.now(), w = sparkWindow(now, 24);
      const rows = await hotTokens(db, limit, now);
      const [pts, p] = await Promise.all([hourlyCloses(db, rows.map((r) => r.mint), w.start), usd()]);
      const by = new Map<string, typeof pts>();
      for (const x of pts) { const a = by.get(x.mint) ?? []; a.push(x); by.set(x.mint, a); }
      return {
        coins: rows.map((t) => {
          const s = buildSpark(by.get(t.mint) ?? [], w.buckets, t.priceSol);
          return { mint: t.mint, name: t.name, symbol: t.symbol, image: imageUrl(t.mint, t.uri), marketCapSol: t.mcapSol, marketCapUsd: mcapUsd(t.mcapSol, p),
            volume24hSol: t.vol24, change24hPct: s.change24hPct, spark: s.spark };
        }),
      };
    });
  });

  app.get("/search/traders", async (req, reply) => {
    const q = req.query as { limit?: string; window?: string; week?: string };
    const limit = clampLimit(q.limit, 12, 50), win = windowRange(q);
    reply.header("cache-control", "public, max-age=30");
    return tradersCache.get(`${limit}\u0000${win.label}`, async () => {
      const top = await topTraders(db, limit, win.from, Number.isFinite(win.to) ? win.to : Number.MAX_SAFE_INTEGER);
      // pnlSol is an all-time estimate, so it is only returned for the all-time board
      const st = win.from === 0 ? await walletStats(db, top.map((t) => t.wallet)) : new Map();
      return { window: win.label, traders: top.map((t) => ({ wallet: t.wallet, label: walletLabel(t.wallet), volumeSol: t.volumeSol, pnlSol: st.get(t.wallet)?.pnlSol ?? null, trades: t.trades })) };
    });
  });
}
