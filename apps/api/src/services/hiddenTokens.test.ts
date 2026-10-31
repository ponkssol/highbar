/** Hidden test tokens: left out of every public list (SQL against PGlite running the migrations verbatim, never DATABASE_URL),
 *  still reachable by mint, still counted in the Open Book platform totals. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { Keypair } from "@solana/web3.js";
import { HIDDEN_TOKEN_MINTS } from "@hb/shared";
import type { Q } from "../db/pool.js";
import { store } from "../store.js";
import { hiddenMints, isHiddenMint } from "./hiddenTokens.js";
import { hotTokens, normalizeQuery, searchTokens } from "./search.js";
import { platformOpenBook, platformTokens, type ReadCtx } from "../openbook/read.js";
import { resetOpenbookTablesCache } from "../openbook/write.js";

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../db/migrations");
const key = () => Keypair.generate().publicKey.toBase58();
const NOW = 1_793_400_000_000;
const HIDDEN = HIDDEN_TOKEN_MINTS[0]!;

async function freshDb() {
  resetOpenbookTablesCache();
  const pg = new PGlite();
  for (const f of fs.readdirSync(DIR).filter((x) => /^\d+_.+\.sql$/.test(x)).sort()) await pg.exec(fs.readFileSync(path.join(DIR, f), "utf8"));
  const q = { query: (t: string, p?: unknown[]) => pg.query(t, p as any[]).then((r: any) => ({ ...r, rowCount: r.affectedRows ?? r.rows.length })) } as unknown as Q;
  return { pg, q };
}
const ctx = (over: Partial<ReadCtx> = {}): ReadCtx => ({ network: "mainnet", goPublic: null, barMint: null, now: NOW,
  wallets: { feeReceiver: null, feeClaimer: null, referral: null, platform: null }, ...over });

async function addToken(q: Q, mint: string, o: { name: string; symbol: string; volume: number; migrated?: boolean }) {
  await q.query(`INSERT INTO tokens (mint, pool, config, tier, anti_sniper, creator, created_at, quote_reserve_sol, threshold_sol, progress, is_migrated, price_sol, mcap_sol,
      name, symbol, uri, volume_sol, volume_24h_sol, trades, creator_fees_sol, fees_sol, updated_at)
    VALUES ($1,$2,'cfg','standard',false,$3,$4,1,85,0.1,$5,0.000001,10,$6,$7,'',$8,$8,3,0,$9,$4)`,
    [mint, key(), key(), NOW - 3_600_000, !!o.migrated, o.name, o.symbol, o.volume, o.volume / 100]);
  await q.query(`INSERT INTO trades (sig,ix_idx,pool,mint,side,sol,tokens,wallet,ts) VALUES ($1,0,'p',$2,'buy',$3,1000,$4,$5)`, [key(), mint, o.volume, key(), Date.now() - 60_000]);
}
/** One visible "Test Coin" and one hidden token that would otherwise rank first everywhere (more volume, same search words). */
async function seeded() {
  const db = await freshDb(), visible = key();
  await addToken(db.q, visible, { name: "Test Coin", symbol: "TEST", volume: 1 });
  await addToken(db.q, HIDDEN, { name: "Test Coin Two", symbol: "TESTTWO", volume: 50 });
  return { ...db, visible };
}

test("hidden tokens: built-in list plus the optional HIDDEN_TOKEN_MINTS env var", () => {
  const saved = process.env.HIDDEN_TOKEN_MINTS, extra = key();
  try {
    delete process.env.HIDDEN_TOKEN_MINTS;
    assert.deepEqual(hiddenMints().sort(), [...HIDDEN_TOKEN_MINTS].sort());
    assert.ok(isHiddenMint(HIDDEN));
    assert.equal(isHiddenMint(extra), false);
    process.env.HIDDEN_TOKEN_MINTS = ` ${extra}, junk `;
    assert.equal(hiddenMints().length, HIDDEN_TOKEN_MINTS.length + 1);
    assert.ok(isHiddenMint(extra) && isHiddenMint(HIDDEN));
  } finally { if (saved === undefined) delete process.env.HIDDEN_TOKEN_MINTS; else process.env.HIDDEN_TOKEN_MINTS = saved; }
});

test("GET /tokens list: hidden token left out for every sort, status, search and offset, row kept by mint", async () => {
  const { pg, q, visible } = await seeded();
  try {
    for (const sort of ["createdAt", "mcapSol", "volumeSol", "volume24hSol", "trades", "feesSol", "name", "symbol", "progress"]) for (const order of ["asc", "desc"]) {
      const r = await store.listTokens({ sort, order, limit: 50, offset: 0 }, q);
      assert.deepEqual(r.items.map((t) => t.mint), [visible], `${sort} ${order}`);
      assert.equal(r.total, 1);
    }
    assert.deepEqual((await store.listTokens({ status: "bonding", limit: 50, offset: 0 }, q)).items.map((t) => t.mint), [visible]);
    assert.deepEqual((await store.listTokens({ tier: "standard", limit: 50, offset: 0 }, q)).items.map((t) => t.mint), [visible]);
    assert.equal((await store.listTokens({ q: "testtwo", limit: 50, offset: 0 }, q)).total, 0);
    assert.equal((await store.listTokens({ q: HIDDEN, limit: 50, offset: 0 }, q)).total, 0);
    assert.deepEqual(await store.listTokens({ limit: 50, offset: 5 }, q), { total: 1, items: [] }); // count past the end excludes it too
    // an empty hidden list brings it back (the filter, not missing data)
    assert.equal((await store.listTokens({ limit: 50, offset: 0, hidden: [] }, q)).total, 2);
    const kept = await q.query("SELECT count(*)::int n FROM tokens WHERE mint = $1", [HIDDEN]);
    assert.equal(kept.rows[0].n, 1);
  } finally { await pg.close(); }
});

test("search, hot coins and the activity feed leave the hidden token out", async () => {
  const { pg, q, visible } = await seeded();
  try {
    const sql = q as unknown as Parameters<typeof searchTokens>[0];
    assert.deepEqual((await searchTokens(sql, normalizeQuery("test")!, 10)).map((t) => t.mint), [visible]);
    assert.deepEqual(await searchTokens(sql, normalizeQuery(HIDDEN)!, 10), []);
    assert.deepEqual((await hotTokens(sql, 10)).map((t) => t.mint), [visible]);
    assert.equal((await hotTokens(sql, 10, Date.now(), [])).length, 2);
    await store.addActivity({ id: "a1", type: "launch", mint: visible, symbol: "TEST", ts: NOW }, q);
    await store.addActivity({ id: "a2", type: "trade", mint: HIDDEN, symbol: "TESTTWO", ts: NOW + 1, side: "buy", amount: 1 }, q);
    assert.deepEqual((await store.listActivity(0, 50, q)).map((a) => a.id), ["a1"]);
    assert.deepEqual((await store.listActivity(0, 50, q, [])).map((a) => a.id), ["a2", "a1"]);
  } finally { await pg.close(); }
});

test("Open Book: per-token table hides it (rows, total, search), platform totals still count it", async () => {
  const { pg, q, visible } = await seeded();
  try {
    const r = await platformTokens(q, ctx(), { q: null, status: "all", sort: "volume", order: "desc", limit: 25, cursor: null });
    assert.deepEqual(r.rows.map((x) => x.mint), [visible]);
    assert.equal(r.total, 1);
    const s = await platformTokens(q, ctx(), { q: normalizeQuery("test"), status: "all", sort: "relevance", order: "desc", limit: 25, cursor: null });
    assert.deepEqual(s.rows.map((x) => x.mint), [visible]);
    assert.equal(s.total, 1);
    // keyset paging still works with the extra filter param
    const p1 = await platformTokens(q, ctx({ hiddenMints: [] }), { q: null, status: "all", sort: "volume", order: "desc", limit: 1, cursor: null });
    assert.equal(p1.total, 2);
    const p2 = await platformTokens(q, ctx({ hiddenMints: [] }), { q: null, status: "all", sort: "volume", order: "desc", limit: 1, cursor: p1.nextCursor });
    assert.equal(new Set([...p1.rows, ...p2.rows].map((x) => x.mint)).size, 2);
    const tot = await platformOpenBook(q, ctx(), "all");
    assert.equal(tot.totals.tokensLaunched, 2);
  } finally { await pg.close(); }
});
