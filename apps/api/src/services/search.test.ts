/** Search / hot coins / top traders: pure helpers, plus the SQL against PGlite running migration 0001 verbatim (never DATABASE_URL). */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { Keypair } from "@solana/web3.js";
import { buildSpark, clampLimit, escapeLike, hotTokens, hourlyCloses, HOUR_MS, matchRank, normalizeQuery, searchTokens, searchWallets, sparkWindow, topTraders, TtlCache, walletStats, type Sql } from "./search.js";

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../db/migrations/0001_app_store.sql");
const key = () => Keypair.generate().publicKey.toBase58();

test("normalizeQuery: trims, strips control chars, needs 2+ chars, flags base58", () => {
  assert.equal(normalizeQuery(undefined), null);
  assert.equal(normalizeQuery("   "), null);
  assert.equal(normalizeQuery(" a "), null);
  assert.deepEqual(normalizeQuery("  Te\u200bst  "), { q: "Test", lower: "test", base58: true });
  assert.equal(normalizeQuery("te_st")!.base58, false);
  assert.equal(normalizeQuery("0OIl")!.base58, false); // not base58 chars
  assert.equal(normalizeQuery("x".repeat(100))!.q.length, 64);
  const mint = key(); assert.equal(normalizeQuery(mint)!.base58, true);
});

test("escapeLike escapes %, _ and backslash", () => {
  assert.equal(escapeLike("50%_off\\"), "50\\%\\_off\\\\");
  assert.equal(escapeLike("plain"), "plain");
});

test("clampLimit: default, floor, cap", () => {
  assert.equal(clampLimit(undefined, 8, 25), 8);
  assert.equal(clampLimit("abc", 8, 25), 8);
  assert.equal(clampLimit("0", 8, 25), 8);
  assert.equal(clampLimit("3.9", 8, 25), 3);
  assert.equal(clampLimit("999", 8, 25), 25);
});

test("matchRank: exact symbol, symbol prefix, name / mint prefix, contains", () => {
  const s = normalizeQuery("test")!, mint = "Abcd" + "1".repeat(40);
  assert.equal(matchRank({ mint, name: "Whatever", symbol: "TEST" }, s), 0);
  assert.equal(matchRank({ mint, name: "Whatever", symbol: "TESTX" }, s), 1);
  assert.equal(matchRank({ mint, name: "Test Coin", symbol: "TC" }, s), 2);
  assert.equal(matchRank({ mint, name: "My Test Coin", symbol: "MTC" }, s), 3);
  assert.equal(matchRank({ mint, name: "Other", symbol: "OTH" }, s), -1);
  assert.equal(matchRank({ mint, name: "Other", symbol: "OTH" }, normalizeQuery("Abcd")!), 2);
  assert.equal(matchRank({ mint, name: "Other", symbol: "OTH" }, normalizeQuery("abcd")!), -1, "mint match is case-sensitive");
  assert.equal(matchRank({ mint, name: "Other", symbol: "OTH" }, normalizeQuery(mint)!), 0);
});

test("buildSpark: forward fill, seed, change, fallbacks", () => {
  const m = "M";
  // pre-window close 1, closes at hours 1 and 3
  let r = buildSpark([{ mint: m, bucket: -1, price: 1 }, { mint: m, bucket: -2, price: 1.5 }, { mint: m, bucket: 1, price: 2 }, { mint: m, bucket: 3, price: 1.5 }], 5, 9);
  assert.deepEqual(r.spark, [1, 2, 2, 1.5, 1.5]); assert.equal(r.change24hPct, 50);
  // young token: no pre-window close, leading hours use the first trade price, change vs first trade
  r = buildSpark([{ mint: m, bucket: -2, price: 2 }, { mint: m, bucket: 2, price: 3 }], 4, 9);
  assert.deepEqual(r.spark, [2, 2, 3, 3]); assert.equal(r.change24hPct, 50);
  // only an old trade: flat at its close, 0% change
  r = buildSpark([{ mint: m, bucket: -1, price: 4 }], 3, 9);
  assert.deepEqual(r.spark, [4, 4, 4]); assert.equal(r.change24hPct, 0);
  // never traded
  assert.deepEqual(buildSpark([], 3, 0.5), { spark: [0.5, 0.5, 0.5], change24hPct: null });
  assert.deepEqual(buildSpark([], 3, 0), { spark: [], change24hPct: null });
});

test("sparkWindow is hour-aligned and ends with the current hour", () => {
  const now = Date.parse("2026-10-30T09:42:00Z"), w = sparkWindow(now, 24);
  assert.equal(new Date(w.start).toISOString(), "2026-10-29T10:00:00.000Z");
  assert.equal(w.start + 23 * HOUR_MS, Date.parse("2026-10-30T09:00:00Z"));
});

test("TtlCache: hits within ttl, reloads after, drops failures", async () => {
  let t = 0, n = 0; const c = new TtlCache<number>(1000, 10, () => t);
  assert.equal(await c.get("a", async () => ++n), 1);
  assert.equal(await c.get("a", async () => ++n), 1);
  t = 1000; assert.equal(await c.get("a", async () => ++n), 2);
  await assert.rejects(c.get("b", async () => { throw new Error("x"); }));
  assert.equal(await c.get("b", async () => 7), 7);
});

// ---- SQL against PGlite ----
async function freshDb(): Promise<Sql & { pg: PGlite }> {
  const pg = new PGlite();
  await pg.exec(fs.readFileSync(MIGRATION, "utf8"));
  return { pg, query: (t, p) => pg.query(t, p as unknown[]) as Promise<{ rows: any[] }> };
}
async function addToken(q: Sql, t: { mint: string; name: string; symbol: string; mcapSol: number; createdAt: number; priceSol?: number; creator?: string; migrated?: boolean }) {
  await q.query(`INSERT INTO tokens (mint,pool,config,tier,creator,created_at,mcap_sol,price_sol,name,symbol,uri,progress,is_migrated,updated_at) VALUES ($1,$2,'cfg','standard',$3,$4,$5,$6,$7,$8,'',0.25,$9,$4)`,
    [t.mint, key(), t.creator ?? key(), t.createdAt, t.mcapSol, t.priceSol ?? t.mcapSol / 1e9, t.name, t.symbol, !!t.migrated]);
}
let sigN = 0;
async function addTrade(q: Sql, t: { mint: string; wallet: string; side: "buy" | "sell"; sol: number; tokens: number; ts: number }) {
  const sig = `sig${++sigN}`;
  await q.query(`INSERT INTO trades (sig,ix_idx,pool,mint,side,sol,tokens,wallet,ts) VALUES ($1,0,'p',$2,$3,$4,$5,$6,$7)`, [sig, t.mint, t.side, t.sol, t.tokens, t.wallet, t.ts]);
  await q.query(`INSERT INTO trade_points (sig,ix_idx,mint,ts,price_sol,amount,side,sol) VALUES ($1,0,$2,$3,$4,$5,$6,$7)`, [sig, t.mint, t.ts, t.sol / t.tokens, t.tokens, t.side, t.sol]);
}

test("searchTokens: ranking, escaping, mint exact / prefix (case-sensitive)", async () => {
  const q = await freshDb(), now = Date.now();
  const exact = key(), prefix = key(), name = key(), contains = key(), pct = key();
  await addToken(q, { mint: contains, name: "My Test Coin", symbol: "MTC", mcapSol: 900, createdAt: now });
  await addToken(q, { mint: name, name: "Test Coin", symbol: "TC", mcapSol: 500, createdAt: now });
  await addToken(q, { mint: prefix, name: "Another", symbol: "TESTX", mcapSol: 10, createdAt: now });
  await addToken(q, { mint: exact, name: "Sample", symbol: "TEST", mcapSol: 1, createdAt: now });
  await addToken(q, { mint: pct, name: "Fifty 50% Off", symbol: "OFF", mcapSol: 1, createdAt: now });
  await addToken(q, { mint: key(), name: "Fifty 500 Off", symbol: "OFX", mcapSol: 1, createdAt: now });

  assert.deepEqual((await searchTokens(q, normalizeQuery("test")!, 10)).map((t) => t.mint), [exact, prefix, name, contains]);
  assert.deepEqual((await searchTokens(q, normalizeQuery("test")!, 2)).map((t) => t.mint), [exact, prefix]);
  assert.deepEqual((await searchTokens(q, normalizeQuery("0%")!, 10)).map((t) => t.mint), [pct], "% is literal");
  assert.deepEqual((await searchTokens(q, normalizeQuery("t_st")!, 10)).length, 0, "_ is literal");
  assert.deepEqual((await searchTokens(q, normalizeQuery(name)!, 10)).map((t) => t.mint), [name]);
  assert.deepEqual((await searchTokens(q, normalizeQuery(name.slice(0, 8))!, 10)).map((t) => t.mint), [name]);
  const lowerPrefix = name.slice(0, 8).toLowerCase();
  if (lowerPrefix !== name.slice(0, 8)) assert.ok(!(await searchTokens(q, normalizeQuery(lowerPrefix)!, 10)).some((t) => t.mint === name));
  const t = (await searchTokens(q, normalizeQuery("TEST")!, 1))[0];
  assert.deepEqual(Object.keys(t).sort(), ["createdAt", "isMigrated", "mcapSol", "mint", "name", "progress", "symbol", "tier", "uri"]);
});

test("searchWallets + walletStats: prefix / exact, traders and creators, PnL estimate", async () => {
  const q = await freshDb(), now = Date.now(), mint = key(), a = key(), b = key(), creator = key();
  await addToken(q, { mint, name: "Test Coin", symbol: "TEST", mcapSol: 30, createdAt: now, priceSol: 0.002, creator });
  await addTrade(q, { mint, wallet: a, side: "buy", sol: 1, tokens: 1000, ts: now - 1000 });
  await addTrade(q, { mint, wallet: a, side: "sell", sol: 1.5, tokens: 600, ts: now - 500 });
  await addTrade(q, { mint, wallet: b, side: "buy", sol: 0.2, tokens: 100, ts: now - 400 });
  const st = await walletStats(q, [a, b]);
  assert.equal(st.get(a)!.volumeSol, 2.5); assert.equal(st.get(a)!.trades, 2);
  assert.ok(Math.abs(st.get(a)!.pnlSol! - (1.5 - 1 + 400 * 0.002)) < 1e-9);
  assert.ok(Math.abs(st.get(b)!.pnlSol! - (-0.2 + 100 * 0.002)) < 1e-9);

  assert.deepEqual((await searchWallets(q, normalizeQuery(a)!, 5)).map((w) => w.wallet), [a]);
  assert.deepEqual((await searchWallets(q, normalizeQuery(a.slice(0, 6))!, 5)).map((w) => w.wallet)[0], a);
  const c = await searchWallets(q, normalizeQuery(creator)!, 5);
  assert.deepEqual(c, [{ wallet: creator, volumeSol: 0, trades: 0, pnlSol: null }], "creators without trades are found too");
  assert.deepEqual(await searchWallets(q, normalizeQuery("Test Coin")!, 5), [], "non-base58 query never matches wallets");
});

test("hotTokens + hourlyCloses: 24h volume first, recent trades next, one batched spark query", async () => {
  const q = await freshDb(), now = Date.parse("2026-10-30T09:42:00Z"), w = sparkWindow(now, 24);
  const hot = key(), warm = key(), old = key(), never = key(), u = key();
  await addToken(q, { mint: hot, name: "Test Coin", symbol: "TEST", mcapSol: 10, createdAt: now - 5 * 86_400_000 });
  await addToken(q, { mint: warm, name: "Test Two", symbol: "TWO", mcapSol: 99, createdAt: now - 5 * 86_400_000 });
  await addToken(q, { mint: old, name: "Test Old", symbol: "OLD", mcapSol: 99, createdAt: now - 9 * 86_400_000 });
  await addToken(q, { mint: never, name: "Test New", symbol: "NEW", mcapSol: 1, createdAt: now - 1000 });
  await addTrade(q, { mint: hot, wallet: u, side: "buy", sol: 1, tokens: 1000, ts: w.start - 2 * HOUR_MS }); // pre-window close 0.001
  await addTrade(q, { mint: hot, wallet: u, side: "buy", sol: 5, tokens: 2500, ts: w.start + 3 * HOUR_MS + 10 }); // 0.002
  await addTrade(q, { mint: hot, wallet: u, side: "sell", sol: 3, tokens: 1000, ts: w.start + 3 * HOUR_MS + 20 }); // 0.003 closes hour 3
  await addTrade(q, { mint: warm, wallet: u, side: "buy", sol: 1, tokens: 1000, ts: w.start + 23 * HOUR_MS }); // 1 SOL in 24h
  await addTrade(q, { mint: old, wallet: u, side: "buy", sol: 50, tokens: 1000, ts: now - 3 * 86_400_000 }); // only an old trade

  const rows = await hotTokens(q, 10, now);
  assert.deepEqual(rows.map((r) => r.mint), [hot, warm, old, never]);
  assert.equal(rows[0].vol24, 8);
  const pts = await hourlyCloses(q, rows.map((r) => r.mint), w.start);
  const sp = (m: string) => buildSpark(pts.filter((p) => p.mint === m), 24, rows.find((r) => r.mint === m)!.priceSol);
  const h = sp(hot);
  assert.equal(h.spark.length, 24); assert.equal(h.spark[0], 0.001); assert.equal(h.spark[2], 0.001); assert.equal(h.spark[3], 0.003); assert.equal(h.spark[23], 0.003);
  assert.equal(h.change24hPct, 200);
  assert.deepEqual(sp(old).spark, Array(24).fill(0.05)); assert.equal(sp(old).change24hPct, 0);
  assert.equal(sp(warm).spark[22], 0.001); assert.equal(sp(warm).change24hPct, 0);
  assert.equal(sp(never).change24hPct, null); assert.equal(sp(never).spark.length, 24);
});

test("topTraders: volume within the window", async () => {
  const q = await freshDb(), now = Date.now(), mint = key(), a = key(), b = key();
  await addToken(q, { mint, name: "Test Coin", symbol: "TEST", mcapSol: 1, createdAt: now });
  await addTrade(q, { mint, wallet: a, side: "buy", sol: 1, tokens: 10, ts: now - 1000 });
  await addTrade(q, { mint, wallet: a, side: "sell", sol: 1, tokens: 10, ts: now - 900 });
  await addTrade(q, { mint, wallet: b, side: "buy", sol: 5, tokens: 10, ts: now - 3 * 86_400_000 });
  assert.deepEqual(await topTraders(q, 10), [{ wallet: b, volumeSol: 5, trades: 1 }, { wallet: a, volumeSol: 2, trades: 2 }]);
  assert.deepEqual(await topTraders(q, 10, now - 86_400_000), [{ wallet: a, volumeSol: 2, trades: 2 }]);
  assert.equal((await topTraders(q, 1)).length, 1);
});
