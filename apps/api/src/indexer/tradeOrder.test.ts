/** Trades ordering: pure helpers, plus the ORDER BY clauses against PGlite running migration 0001 verbatim (never DATABASE_URL). */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { MAX_TS_IN_SECOND_SQL, MINT_TRADES_ORDER, SUB_SECOND_STEPS, chronological, nextTradeTs, secondBaseMs, tradesOrder } from "./tradeOrder.js";

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../db/migrations/0001_app_store.sql");
const MINT = "TestMint1111111111111111111111111111111111";
const OTHER = "TestMint2222222222222222222222222222222222";
const DEV = "DevWallet111111111111111111111111111111111";
const SEC = 1_700_000_000; // block time (s) shared by the create tx and the next slot
const BASE = SEC * 1000;

async function freshDb() {
  const pg = new PGlite();
  await pg.exec(fs.readFileSync(MIGRATION, "utf8"));
  return pg;
}
type Row = { sig: string; ix: number; mint?: string; side?: "buy" | "sell"; wallet?: string; ts: number; dev?: boolean };
async function insert(pg: PGlite, r: Row) {
  await pg.query(`INSERT INTO trades (sig,ix_idx,pool,mint,side,sol,tokens,wallet,dev_buy,ts) VALUES ($1,$2,'pool',$3,$4,0.1,1000,$5,$6,$7)`,
    [r.sig, r.ix, r.mint ?? MINT, r.side ?? "buy", r.wallet ?? "Trader11111111111111111111111111111111111", !!r.dev, r.ts]);
}
const ids = (rows: { sig: string; ix_idx: number }[]) => rows.map((r) => `${r.sig}:${r.ix_idx}`);
const mintTrades = async (pg: PGlite, order: string, mint = MINT) =>
  ids((await pg.query<{ sig: string; ix_idx: number }>(`SELECT sig, ix_idx FROM trades WHERE mint = $1 ORDER BY ${order}`, [mint])).rows);

test("nextTradeTs: first trade of a second gets the whole second, then +1 ms, capped inside the second", () => {
  assert.equal(nextTradeTs(BASE), BASE);
  assert.equal(nextTradeTs(BASE, null), BASE);
  assert.equal(nextTradeTs(BASE, BASE), BASE + 1);
  assert.equal(nextTradeTs(BASE, BASE + 41), BASE + 42);
  assert.equal(nextTradeTs(BASE, BASE - 5), BASE, "a ts from an earlier second does not leak in");
  assert.equal(nextTradeTs(BASE, BASE + SUB_SECOND_STEPS - 1), BASE + SUB_SECOND_STEPS - 1, "never spills into the next second");
});

test("secondBaseMs: block time in ms; missing block time falls back to the current whole second", () => {
  assert.equal(secondBaseMs(SEC), BASE);
  assert.equal(secondBaseMs(null, BASE + 789), BASE);
  assert.equal(secondBaseMs(undefined, BASE + 1), BASE);
});

test("chronological: RPC newest-first page -> oldest first by slot, keeping block order inside a slot", () => {
  const page = [{ signature: "e", slot: 12 }, { signature: "d", slot: 11 }, { signature: "c", slot: 9 }, { signature: "b", slot: 9 }, { signature: "a", slot: 8 }];
  assert.deepEqual(chronological(page).map((s) => s.signature), ["a", "b", "c", "d", "e"]);
  const misordered = [{ signature: "d", slot: 11 }, { signature: "e", slot: 12 }, { signature: "a", slot: 8 }];
  assert.deepEqual(chronological(misordered).map((s) => s.signature), ["a", "d", "e"]);
  assert.equal(page[0].signature, "e", "input is not mutated");
});

test("legacy rows on the same second: the dev buy in the create tx sorts as the oldest trade", async () => {
  const pg = await freshDb();
  // Create tx (slot n, dev buy) and a sniper buy (slot n+1) share one block time; the create sig sorts after it as text.
  await insert(pg, { sig: "zCreateSig", ix: 0, wallet: DEV, ts: BASE, dev: true });
  await insert(pg, { sig: "aSnipeSig", ix: 0, ts: BASE });
  await insert(pg, { sig: "mLaterSig", ix: 0, ts: BASE + 1000 });
  assert.deepEqual(await mintTrades(pg, "ts DESC, sig DESC, ix_idx DESC"), ["mLaterSig:0", "zCreateSig:0", "aSnipeSig:0"], "old order: dev buy above the sniper");
  assert.deepEqual(await mintTrades(pg, MINT_TRADES_ORDER), ["mLaterSig:0", "aSnipeSig:0", "zCreateSig:0"]);
  assert.deepEqual(await mintTrades(pg, tradesOrder()), ["mLaterSig:0", "aSnipeSig:0", "zCreateSig:0"]);
});

test("dev buy stays the oldest trade of its mint even if its ts is later (missing block time fallback)", async () => {
  const pg = await freshDb();
  await insert(pg, { sig: "createSig", ix: 0, wallet: DEV, ts: BASE + 5000, dev: true });
  await insert(pg, { sig: "buySig", ix: 0, ts: BASE + 2000 });
  await insert(pg, { sig: "sellSig", ix: 0, side: "sell", ts: BASE + 3000 });
  assert.deepEqual(await mintTrades(pg, MINT_TRADES_ORDER), ["sellSig:0", "buySig:0", "createSig:0"]);
});

test("indexer sequence: newest first by slot, then tx position in the block, then instruction index (across poll batches)", async () => {
  const pg = await freshDb();
  // Chain order inside one block-time second: slot 8 create tx (dev buy), slot 9 tx A (2 swaps), slot 9 tx B, slot 10 tx C.
  // Batch 1 indexes slots 8-9 (tx A only), batch 2 picks up tx B and C later in the same second.
  const lastInSecond = new Map<number, number>();
  const assign = async (fresh: boolean) => {
    if (fresh) lastInSecond.clear(); // a new poll starts with an empty in-memory map and reads the DB
    const prev = lastInSecond.has(BASE) ? lastInSecond.get(BASE) : (await pg.query<{ m: number | null }>(MAX_TS_IN_SECOND_SQL, [MINT, BASE, BASE + 1000])).rows[0].m;
    const ts = nextTradeTs(BASE, prev == null ? null : Number(prev));
    lastInSecond.set(BASE, ts);
    return ts;
  };
  const batch1: Row[] = [{ sig: "sigCreate", ix: 0, wallet: DEV, dev: true, ts: 0 }, { sig: "sigTxA", ix: 0, ts: 0 }, { sig: "sigTxA", ix: 1, side: "sell", ts: 0 }];
  for (const r of batch1) await insert(pg, { ...r, ts: await assign(false) });
  const batch2: Row[] = [{ sig: "sigTxB", ix: 0, ts: 0 }, { sig: "sigTxC", ix: 0, ts: 0 }];
  let first = true;
  for (const r of batch2) { await insert(pg, { ...r, ts: await assign(first) }); first = false; }
  // Other mints in the same second do not shift this mint's sequence.
  await insert(pg, { sig: "sigOther", ix: 0, mint: OTHER, ts: BASE + 500 });
  const want = ["sigTxC:0", "sigTxB:0", "sigTxA:1", "sigTxA:0", "sigCreate:0"];
  assert.deepEqual(await mintTrades(pg, MINT_TRADES_ORDER), want);
  assert.deepEqual(await mintTrades(pg, tradesOrder()), want);
  const tsRows = (await pg.query<{ ts: number }>(`SELECT ts FROM trades WHERE mint = $1 ORDER BY ${MINT_TRADES_ORDER}`, [MINT])).rows.map((r) => Number(r.ts));
  assert.deepEqual(tsRows, [BASE + 4, BASE + 3, BASE + 2, BASE + 1, BASE]);
  assert.ok(tsRows.every((t) => Math.floor(t / 1000) === SEC), "all trades keep their block-time second");
});

test("wallet history order (aliased, joined with tokens): newest first, dev buy oldest within a tie", async () => {
  const pg = await freshDb();
  await insert(pg, { sig: "zCreateSig", ix: 0, wallet: DEV, ts: BASE, dev: true });
  await insert(pg, { sig: "aBuySig", ix: 0, wallet: DEV, mint: OTHER, ts: BASE });
  await insert(pg, { sig: "bBuySig", ix: 0, wallet: DEV, mint: OTHER, ts: BASE + 1000 });
  const rows = (await pg.query<{ sig: string; ix_idx: number }>(
    `SELECT t.sig, t.ix_idx FROM trades t LEFT JOIN tokens k ON k.mint = t.mint WHERE t.wallet = $1 ORDER BY ${tradesOrder("t")}`, [DEV])).rows;
  assert.deepEqual(ids(rows), ["bBuySig:0", "aBuySig:0", "zCreateSig:0"]);
  assert.equal(tradesOrder("t"), "t.ts DESC, t.dev_buy ASC, t.sig DESC, t.ix_idx DESC");
});