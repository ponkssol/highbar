import type { FastifyInstance, FastifyReply } from "fastify";
import { db } from "../db/pool.js";
import { jobs } from "../jobs/config.js";
import { clampLimit, normalizeQuery, TtlCache } from "../services/search.js";
import { CursorError, LEDGER_CSV_COLUMNS, ledgerCsvLine, platformOpenBook, platformTokens, tokenLedger, tokenOpenBook,
  type ReadCtx, type TokenSort, type Window } from "../openbook/read.js";
import { resolveWallets, type PlatformWallets } from "../openbook/wallets.js";
import { BadRequest, BASE58, int, oneOf, parseLedgerQuery } from "../openbook/params.js";

/** Open Book endpoints. DB only (ZERO RPC per request); in-memory TTL caches + Cache-Control. Shapes: API_SHAPE.final.md. */
const tokenCache = new TtlCache<unknown>(30_000, 500), ledgerCache = new TtlCache<unknown>(10_000, 1000), csvCache = new TtlCache<string>(60_000, 50);
const platformCache = new TtlCache<unknown>(60_000, 8), tokensCache = new TtlCache<unknown>(30_000, 500);
let walletsMemo: { at: number; w: PlatformWallets } | null = null;
const wallets = () => { if (!walletsMemo || Date.now() - walletsMemo.at > 300_000) walletsMemo = { at: Date.now(), w: resolveWallets() }; return walletsMemo.w; };

export function readCtx(): ReadCtx {
  const w = wallets();
  return { network: jobs.network === "mainnet" ? "mainnet" : "devnet", goPublic: jobs.goPublic, barMint: jobs.barMint,
    wallets: { feeReceiver: w.feeReceiver, feeClaimer: w.feeClaimer, referral: w.referral, platform: w.platform } };
}

const withAge = (r: any) => (r && r.meta ? { ...r, meta: { ...r.meta, cacheAgeMs: Math.max(0, Date.now() - r.meta.generatedAt) } } : r);
const cache = (reply: FastifyReply, maxAge: number, sMaxAge: number, swr: number) =>
  reply.header("cache-control", `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`);

export function registerOpenBook(app: FastifyInstance) {
  const guard = async (reply: FastifyReply, fn: () => Promise<unknown>) => {
    try { return await fn(); } catch (e) {
      if (e instanceof BadRequest || e instanceof CursorError) return reply.code(400).send({ error: (e as Error).message });
      throw e;
    }
  };

  app.get("/tokens/:mint/openbook", async (req, reply) => guard(reply, async () => {
    const { mint } = req.params as { mint: string }, q = req.query as Record<string, string | undefined>;
    if (!BASE58.test(mint)) throw new BadRequest("bad mint");
    const windowSec = int(q.window, 60, 1, 600, "window"), earlyLimit = int(q.early, 25, 1, 200, "early");
    const r = await tokenCache.get(`${mint}\u0000${windowSec}\u0000${earlyLimit}`, () => tokenOpenBook(db, mint, readCtx(), { windowSec, earlyLimit }));
    if (!r) return reply.code(404).send({ error: "token not found" });
    cache(reply, 10, 30, 60);
    return withAge(r);
  }));

  app.get("/tokens/:mint/openbook/ledger", async (req, reply) => guard(reply, async () => {
    const { mint } = req.params as { mint: string };
    if (!BASE58.test(mint)) throw new BadRequest("bad mint");
    const p = parseLedgerQuery(req.query as Record<string, string | undefined>);
    const r = await ledgerCache.get(`${mint}\u0000${JSON.stringify(p)}`, () => tokenLedger(db, mint, readCtx(), p));
    if (!r) return reply.code(404).send({ error: "token not found" });
    if (p.cursor) cache(reply, 30, 60, 120); else cache(reply, 5, 10, 30);
    return withAge(r);
  }));

  app.get("/tokens/:mint/openbook/ledger.csv", async (req, reply) => guard(reply, async () => {
    const { mint } = req.params as { mint: string };
    if (!BASE58.test(mint)) throw new BadRequest("bad mint");
    const p0 = parseLedgerQuery({ ...(req.query as Record<string, string | undefined>), cursor: undefined, limit: "500" }, 500);
    const CAP = 10_000;
    const csv = await csvCache.get(`${mint}\u0000${JSON.stringify(p0)}`, async () => {
      const lines = [LEDGER_CSV_COLUMNS.join(",")];
      let cursor: string | null = null, n = 0;
      do {
        const page = await tokenLedger(db, mint, readCtx(), { ...p0, cursor });
        if (!page) return "";
        for (const row of page.rows) { if (n++ >= CAP) break; lines.push(ledgerCsvLine(row)); }
        cursor = page.nextCursor;
      } while (cursor && n < CAP);
      return lines.join("\n") + "\n";
    });
    if (!csv) return reply.code(404).send({ error: "token not found" });
    cache(reply, 30, 60, 120);
    reply.header("content-type", "text/csv; charset=utf-8").header("content-disposition", `attachment; filename="openbook-${mint.slice(0, 8)}-ledger.csv"`);
    return csv;
  }));

  app.get("/openbook", async (req, reply) => guard(reply, async () => {
    const window = oneOf((req.query as { window?: string }).window, ["all", "30d", "7d", "24h"] as const, "all", "window") as Window;
    const r = await platformCache.get(window, () => platformOpenBook(db, readCtx(), window));
    cache(reply, 30, 60, 120);
    return withAge(r);
  }));

  app.get("/openbook/tokens", async (req, reply) => guard(reply, async () => {
    const q = req.query as Record<string, string | undefined>;
    const s = q.q ? normalizeQuery(q.q) : null;
    if (q.q && !s) throw new BadRequest("q must be 2..64 characters");
    const status = oneOf(q.status, ["all", "bonding", "migrated"] as const, "all", "status");
    const sort = oneOf(q.sort, ["relevance", "volume", "dbcFees", "creatorEarned", "tips", "sniperTipPct", "created"] as const, s ? "relevance" : "volume", "sort") as TokenSort;
    const order = oneOf(q.order, ["desc", "asc"] as const, "desc", "order"), limit = clampLimit(q.limit, 25, 100);
    const p = { q: s, status, sort, order, limit, cursor: q.cursor || null };
    const r = await tokensCache.get(JSON.stringify({ ...p, q: s?.q ?? null }), () => platformTokens(db, readCtx(), p));
    cache(reply, 15, 30, 60);
    return withAge(r);
  }));
}
