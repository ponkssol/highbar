/** Open Book write + read paths on PGlite (every migration verbatim; never DATABASE_URL). Test data: "Test Coin" (TEST), throwaway keys,
 *  and two neutralized fixtures (indexer/fixtures: a create + dev-buy tx and a tipped swap one slot later). */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { Keypair } from "@solana/web3.js";
import type { Q } from "../db/pool.js";
import { decodeDbcEvents, type RawTx } from "../indexer/decode.js";
import { txCosts } from "../indexer/txCosts.js";
import type { TradeRow } from "../store.js";
import { ingestFailed, ingestLandedTx, swapExtra } from "./ingest.js";
import { isSniperTx } from "./math.js";
import { BadRequest, parseLedgerQuery } from "./params.js";
import { antiSniperSchedule, CursorError, decodeCursor, encodeCursor, filterHash, ledgerCsvLine, platformOpenBook, platformTokens, tokenLedger, tokenOpenBook,
  type LedgerParams, type ReadCtx } from "./read.js";
import { rebuildAgg } from "./rebuild.js";
import { foldSnapshot, snapshotOnce, snapshotPlan } from "./snapshot.js";
import { addTradeWithAgg, resetOpenbookTablesCache } from "./write.js";
import { normalizeQuery } from "../services/search.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(HERE, "../../db/migrations");
const fx = (n: string) => JSON.parse(fs.readFileSync(path.join(HERE, "../indexer/fixtures", `${n}.json`), "utf8")) as RawTx;
const key = () => Keypair.generate().publicKey.toBase58();
const NOW = 1_793_400_000_000;

async function freshDb(upTo = 9999) {
  resetOpenbookTablesCache();
  const pg = new PGlite();
  for (const f of fs.readdirSync(DIR).filter((x) => /^\d+_.+\.sql$/.test(x) && Number(x.slice(0, 4)) <= upTo).sort()) await pg.exec(fs.readFileSync(path.join(DIR, f), "utf8"));
  const q = { query: (t: string, p?: unknown[]) => pg.query(t, p as any[]).then((r: any) => ({ ...r, rowCount: r.affectedRows ?? r.rows.length })) } as unknown as Q;
  const tx = async <T>(fn: (c: Q) => Promise<T>) => { await pg.query("BEGIN"); try { const r = await fn(q); await pg.query("COMMIT"); return r; } catch (e) { await pg.query("ROLLBACK"); throw e; } };
  return { pg, q, tx };
}
const ctx = (over: Partial<ReadCtx> = {}): ReadCtx => ({ network: "mainnet", goPublic: null, barMint: null, now: NOW,
  wallets: { feeReceiver: "FeeRcv1111111111111111111111111111111111111", feeClaimer: "FeeCl11111111111111111111111111111111111111", referral: null, platform: null }, ...over });

const CREATE = fx("create-dev-buy"), SWAP = fx("swap-sniper");
const init = decodeDbcEvents(CREATE).find((e) => e.kind === "init") as Extract<ReturnType<typeof decodeDbcEvents>[number], { kind: "init" }>;
const MINT = init.mint, POOL = init.pool, CREATOR = init.creator;

async function addToken(q: Q, o: { mint?: string; pool?: string; creator?: string; name?: string; symbol?: string; createdAt?: number; migrated?: boolean; volume?: number; tier?: string } = {}) {
  await q.query(`INSERT INTO tokens (mint, pool, config, tier, anti_sniper, creator, created_at, quote_reserve_sol, threshold_sol, progress, is_migrated, price_sol, mcap_sol,
      name, symbol, uri, volume_sol, volume_24h_sol, trades, creator_fees_sol, fees_sol, updated_at, migrated_at, damm_pool)
    VALUES ($1,$2,'cfg',$11,false,$3,$4,10,85,0.1176,$5,0,0,$6,$7,'',$8,0,0,0,$9,$10,$12,$13)`,
    [o.mint ?? MINT, o.pool ?? POOL, o.creator ?? CREATOR, o.createdAt ?? CREATE.blockTime! * 1000, !!o.migrated, o.name ?? "Test Coin", o.symbol ?? "TEST", o.volume ?? 0, (o.volume ?? 0) / 100, NOW,
      o.tier ?? "max", o.migrated ? NOW - 1000 : null, o.migrated ? key() : null]);
}

/** Feed one fixture through the same path as the poller (one db tx per signature). */
async function ingest(tx: <T>(fn: (c: Q) => Promise<T>) => Promise<T>, raw: RawTx, tsBase: number) {
  const evs = decodeDbcEvents(raw);
  const initInTx = evs.some((e) => e.kind === "init" && e.pool === POOL);
  let i = 0;
  const swaps = evs.filter((e): e is Extract<typeof e, { kind: "swap" }> => e.kind === "swap" && e.pool === POOL).map((ev) => {
    const row: TradeRow = { sig: `${raw.transaction.signatures[0]}:${i}`, pool: POOL, mint: MINT, side: ev.side, sol: Number(ev.solLamports) / 1e9, tokens: Number(ev.tokenAmount) / 1e6,
      feeSol: Number(ev.feeLamports) / 1e9, wallet: ev.trader, viaUi: false, ts: tsBase + i++, ...(initInTx && ev.side === "buy" ? { devBuy: true } : {}), referralFeeLamports: null };
    return { row, extra: swapExtra(ev, raw, { tier: "max", antiSniper: false }, false), solLamports: ev.solLamports };
  });
  return tx((c) => ingestLandedTx(c, { sig: raw.transaction.signatures[0]!, raw, mint: MINT, pool: POOL, creator: CREATOR, initInTx, swaps }));
}
const aggOf = async (q: Q, mint = MINT) => {
  const r = (await q.query("SELECT to_jsonb(a) - 'updated_at' - 'rebuilt_at' AS j FROM token_openbook_agg a WHERE mint = $1", [mint])).rows[0]?.j;
  return typeof r === "string" ? JSON.parse(r) : r;
};
const dump = async (q: Q, t: string) => (await q.query(`SELECT to_jsonb(x) AS j FROM ${t} x WHERE mint = $1 ORDER BY 1`, [MINT])).rows.map((r) => JSON.stringify(r.j)).sort();

// ---------------------------------------------------------------------------------------------------------------------
test("fixtures: tx cost breakdown is exact (fee = base + priority, tips by provider)", () => {
  const c = txCosts(SWAP)!;
  assert.equal(c.signatures, 2);
  assert.equal(c.feeLamports, 5_010_000n);
  assert.equal(c.baseFeeLamports + c.priorityFeeLamports, c.feeLamports);
  assert.equal(c.tipsLamports, 59_750_000n);
  assert.deepEqual(Object.keys(c.tipsByProvider).sort(), ["lunar-lander", "unknown-tip"]);
  assert.equal(SWAP.slot - CREATE.slot, 1);
  assert.equal(init.name, "Test Coin");
  assert.equal(init.symbol, "TEST");
  assert.ok(isSniperTx(SWAP.slot, CREATE.slot, c.feePayer, CREATOR));
  assert.ok(!isSniperTx(SWAP.slot, CREATE.slot, CREATOR, CREATOR));
  assert.ok(!isSniperTx(CREATE.slot + 3, CREATE.slot, c.feePayer, CREATOR));
});

test("write path: one tx per signature, idempotent re-index, sniper tips, rebuild == incremental", async () => {
  const { pg, q, tx } = await freshDb();
  try {
    await addToken(q);
    const base = CREATE.blockTime! * 1000;
    assert.deepEqual(await ingest(tx, CREATE, base), [true]);
    assert.deepEqual(await ingest(tx, SWAP, base + 10), [true]);
    const a1 = await aggOf(q);
    // re-index the same signatures: nothing added, nothing double-counted
    assert.deepEqual(await ingest(tx, CREATE, base), [false]);
    assert.deepEqual(await ingest(tx, SWAP, base + 10), [false]);
    assert.deepEqual(await aggOf(q), a1);
    assert.equal(Number(a1.trades), 2);
    assert.equal(Number(a1.buys), 2);
    assert.equal(Number(a1.cost_txs), 2);
    assert.equal(Number(a1.create_slot), CREATE.slot);
    assert.equal(Number(a1.sniper_txs), 1);
    assert.equal(Number(a1.sniper_tips_lamports), 59_750_000);
    assert.equal(Number(a1.tips_lamports), 59_750_000);
    assert.equal(Number(a1.fee_total_lamports), 35_100_000);
    assert.equal(Number(a1.fee_protocol_lamports), 7_020_000);
    assert.equal(Number(a1.fee_exact_trades), 2);
    // fee parts add up
    assert.equal(Number(a1.fee_protocol_lamports) + Number(a1.fee_referral_lamports) + Number(a1.fee_creator_lamports) + Number(a1.fee_platform_lamports), Number(a1.fee_total_lamports));
    // a failed attempt by the sniper wallet one slot later -> duplicate of its landed swap
    const sniper = txCosts(SWAP)!.feePayer;
    await tx((c) => ingestFailed(c, { sig: "FailSig1111", mint: MINT, pool: POOL, slot: SWAP.slot + 1, err: { InstructionError: [3, { Custom: 6001 }] }, blockTime: SWAP.blockTime,
      raw: { ...SWAP, transaction: { ...SWAP.transaction, message: { ...SWAP.transaction.message, accountKeys: [sniper, ...SWAP.transaction.message.accountKeys.slice(1)] } }, meta: { ...SWAP.meta!, fee: 5000 } } }));
    await tx((c) => ingestFailed(c, { sig: "FailSig2222", mint: MINT, pool: POOL, slot: SWAP.slot + 50, err: "x", blockTime: SWAP.blockTime! + 20 }));
    const a2 = await aggOf(q);
    assert.equal(Number(a2.failed_attempts), 2);
    assert.equal(Number(a2.duplicate_attempts), 1);
    assert.equal((await q.query("SELECT status, duplicate_of FROM failed_attempts WHERE sig = 'FailSig1111'")).rows[0].status, "duplicate");
    const daily = await dump(q, "token_openbook_daily"), tips = await dump(q, "token_tip_agg");
    // rebuild from stored rows gives the same aggregates
    await tx((c) => rebuildAgg(c, MINT, NOW));
    assert.deepEqual(await aggOf(q), a2);
    assert.deepEqual(await dump(q, "token_openbook_daily"), daily);
    assert.deepEqual(await dump(q, "token_tip_agg"), tips);
  } finally { await pg.close(); }
});

async function seeded() {
  const db = await freshDb();
  await addToken(db.q);
  const base = CREATE.blockTime! * 1000;
  await ingest(db.tx, CREATE, base);
  await ingest(db.tx, SWAP, base + 10);
  // more landed trades (no tx fetched for costs): 3 sells / buys by other wallets later on
  const others = [key(), key(), key()];
  for (const [i, w] of others.entries()) {
    const row: TradeRow = { sig: `Later${i}Sig`, pool: POOL, mint: MINT, side: i === 1 ? "sell" : "buy", sol: 0.5, tokens: 1_000_000, feeSol: 0.005, wallet: w, viaUi: i === 0,
      ts: base + 120_000 + i * 1000, referralFeeLamports: i === 0 ? 200_000n : null };
    await db.tx(async (c) => addTradeWithAgg(c, row, { slot: CREATE.slot + 300 + i, txIdx: null, exactParts: false, pricePre: null, pricePost: null, minOutRaw: null,
      split: (await import("./math.js")).splitSwapFee({ side: row.side, solLamports: 500_000_000n, feeLamports: 5_000_000n, tier: "max", antiSniper: false, referralLamports: row.referralFeeLamports, viaUi: row.viaUi }) }, 500_000_000n));
  }
  await db.tx((c) => ingestFailed(c, { sig: "FailLate", mint: MINT, pool: POOL, slot: CREATE.slot + 400, err: "x", blockTime: CREATE.blockTime! + 200 }));
  await db.q.query("INSERT INTO holders (mint, wallet, balance, updated_at) VALUES ($1,$2,$3,$4),($1,$5,$6,$4),($1,$7,$8,$4)",
    [MINT, CREATOR, 126_704.947035, NOW, txCosts(SWAP)!.feePayer, 42_571_548.96055, others[0], 1_000_000]);
  // the token row and the Open Book agg were written by the same indexer pass
  await db.q.query("UPDATE tokens SET updated_at = (SELECT updated_at FROM token_openbook_agg WHERE mint = $1) WHERE mint = $1", [MINT]);
  return { ...db, others, base };
}

test("token read: meta, split, tips + sniper callout, early buyers, migration, holders; unknown -> null", async () => {
  const { pg, q } = await seeded();
  try {
    const r = (await tokenOpenBook(q, MINT, ctx(), { windowSec: 60, earlyLimit: 25 }))!;
    assert.equal(r.meta.network, "mainnet");
    assert.equal(r.meta.indexState, "synced");
    assert.equal(r.meta.costsAvailable, true);
    assert.equal(r.phase, "bonding");
    assert.equal(r.launch.launchSlot, CREATE.slot);
    assert.equal(r.launch.createSig, CREATE.transaction.signatures[0]);
    assert.equal(r.summary.volume.txCount, 5);
    assert.equal(r.summary.volume.totalUsd, null);
    const pctSum = r.feesSplit!.rows.reduce((s, x) => s + (x.pct ?? 0), 0);
    assert.ok(Math.abs(pctSum - 100) < 1e-6);
    assert.equal(r.feesSplit!.rows.find((x) => x.recipient === "creator")!.account, CREATOR);
    assert.equal(r.summary.tips!.snipers!.sol, 0.05975);
    assert.equal(r.summary.tips!.snipers!.pct, 100);
    assert.equal(r.summary.antiSniper, null); // max_off: no anti-sniper fee
    assert.equal(r.earlyBuyers!.rows[0]!.tag, "dev");
    assert.equal(r.earlyBuyers!.rows[1]!.tag, "sniper");
    assert.equal(r.earlyBuyers!.rows[1]!.slotOffset, 1);
    assert.equal(r.earlyBuyers!.rows[1]!.tipSol, 0.05975);
    assert.equal(r.earlyBuyers!.snipers.walletCount, 1);
    assert.equal(r.earlyBuyers!.rules.bundle, null);
    assert.equal(r.tipsByProvider!.largestTip!.sol, 0.05975);
    assert.equal(r.tipsByProvider!.medianTipSol, null);
    assert.equal(r.migration.etaMs, null);
    assert.equal(r.migration.steps.migrated, null);
    assert.equal(r.devActivity.undisclosedLinkedCount, null);
    assert.equal(r.devActivity.events[0]!.atomicWithCreate, true);
    assert.equal(r.holders!.count, 3);
    assert.ok(r.holders!.top10Pct > 4 && r.holders!.top10Pct < 5);
    assert.equal(r.ledger!.counts.all, 6);
    assert.equal(r.ledger!.counts.failed, 1);
    assert.equal(r.platformFlow.buckets.map((b) => b.bucket).join(), "buyback,ops,treasury");
    assert.equal(r.platformFlow.buckets[0]!.state, "soon");
    assert.equal(await tokenOpenBook(q, key(), ctx()), null);
  } finally { await pg.close(); }
});

test("anti-sniper schedule: 61 timestamp points from 2500 bps down to ~100", () => {
  const s = antiSniperSchedule();
  assert.equal(s.points.length, 61);
  assert.equal(s.points[0]!.feeBps, 2500);
  assert.equal(s.points[60]!.offsetMs, 60_000);
  assert.ok(Math.abs(s.points[60]!.feeBps - 100) < 2);
  for (let i = 1; i < s.points.length; i++) assert.ok(s.points[i]!.feeBps <= s.points[i - 1]!.feeBps);
});

const P = (o: Partial<LedgerParams> = {}): LedgerParams => ({ wallet: null, side: null, status: null, sniper: false, windowSec: 60, order: "desc", limit: 2, cursor: null, ...o });

test("ledger: trades + failed merged in chain order, keyset cursors forward / back, filters, totals", async () => {
  const { pg, q, others } = await seeded();
  try {
    const seen: string[] = [];
    let page = (await tokenLedger(q, MINT, ctx(), P()))!;
    assert.equal(page.total, 6);
    assert.equal(page.totalExact, true);
    assert.equal(page.prevCursor, null);
    const first = page;
    for (;;) { seen.push(...page.rows.map((r) => `${r.sig}:${r.ixIdx}`)); if (!page.nextCursor) break; page = (await tokenLedger(q, MINT, ctx(), P({ cursor: page.nextCursor })))!; }
    assert.equal(seen.length, 6);
    assert.equal(new Set(seen).size, 6);
    assert.equal(seen[0], "FailLate:null"); // newest first
    assert.equal(seen[5], `${CREATE.transaction.signatures[0]}:0`);
    // back from page 2 returns page 1
    const p2 = (await tokenLedger(q, MINT, ctx(), P({ cursor: first.nextCursor })))!;
    const back = (await tokenLedger(q, MINT, ctx(), P({ cursor: p2.prevCursor })))!;
    assert.deepEqual(back.rows.map((r) => r.sig), first.rows.map((r) => r.sig));
    // asc
    const asc = (await tokenLedger(q, MINT, ctx(), P({ order: "asc", limit: 1 })))!;
    assert.equal(asc.rows[0]!.sig, CREATE.transaction.signatures[0]);
    // filters
    assert.equal((await tokenLedger(q, MINT, ctx(), P({ side: "sell", limit: 10 })))!.rows.length, 1);
    assert.equal((await tokenLedger(q, MINT, ctx(), P({ side: "buy", limit: 10 })))!.total, 4);
    const failed = (await tokenLedger(q, MINT, ctx(), P({ status: "notok", limit: 10 })))!;
    assert.deepEqual(failed.rows.map((r) => r.status), ["failed"]);
    assert.equal(failed.rows[0]!.wallet, null);
    const w = (await tokenLedger(q, MINT, ctx(), P({ wallet: others[0]!, limit: 10 })))!;
    assert.equal(w.rows.length, 1);
    assert.equal(w.total, 1); // capped count (exact below the 10k cap)
    assert.equal(w.totalExact, true);
    assert.equal(w.totalCap, null);
    const sn = (await tokenLedger(q, MINT, ctx(), P({ sniper: true, limit: 10 })))!;
    assert.deepEqual(sn.rows.map((r) => r.wallet), [txCosts(SWAP)!.feePayer]);
    // detail of the sniper swap
    const row = sn.rows[0] as any;
    assert.deepEqual(row.tags, ["sniper", "early"]);
    assert.equal(row.slotOffset, 1);
    assert.equal(row.baseFeeSol, 0.00001);
    assert.equal(row.priorityFeeSol, 0.005);
    assert.equal(row.tipSol, 0.05975);
    assert.equal(row.detail.dbc.totalProvenance, "exact");
    assert.ok(Math.abs(row.detail.dbc.feeBps - 100) < 1e-9);
    assert.equal(row.detail.network.cuPriceMicroLamports, 41666666);
    assert.ok(row.detail.allIn.pctOnTop > 2.8 && row.detail.allIn.pctOnTop < 2.9);
    // derived row (no exact parts): referral from the stored referral fee
    const ui = (await tokenLedger(q, MINT, ctx(), P({ wallet: others[0]!, limit: 1 })))!.rows[0] as any;
    assert.equal(ui.detail.dbc.shares.find((s: any) => s.recipient === "referral").sol, 0.0002);
    assert.equal(ui.baseFeeSol, null); // tx not fetched: unknown, not 0
    // cursor from another filter set -> rejected
    await assert.rejects(tokenLedger(q, MINT, ctx(), P({ side: "buy", cursor: first.nextCursor })), CursorError);
    await assert.rejects(tokenLedger(q, MINT, ctx(), P({ cursor: "garbage" })), CursorError);
    assert.equal(await tokenLedger(q, key(), ctx(), P()), null);
    // CSV line escaping
    assert.equal(ledgerCsvLine({ ts: 1, wallet: 'a,"b"', tags: ["sniper", "early"] }).split(",").length >= 15, true);
  } finally { await pg.close(); }
});

test("cursor: opaque, bound to mint + filter set", () => {
  const f = P();
  const h = filterHash(f, "mintA");
  const c = encodeCursor({ ts: 5, sig: "s", ix: 0 }, "after", h);
  assert.deepEqual(decodeCursor(c, h).key, { ts: 5, sig: "s", ix: 0 });
  assert.throws(() => decodeCursor(c, filterHash(f, "mintB")), CursorError);
  assert.throws(() => decodeCursor(c, filterHash({ ...f, wallet: "x" }, "mintA")), CursorError);
  assert.notEqual(filterHash({ ...f, sniper: true, windowSec: 30 }, "m"), filterHash({ ...f, sniper: true, windowSec: 60 }, "m"));
});

test("ledger params: aliases and 400s", () => {
  assert.equal(parseLedgerQuery({ filter: "buys" }).side, "buy");
  assert.equal(parseLedgerQuery({ filter: "failed" }).status, "notok");
  assert.equal(parseLedgerQuery({ status: "ok" }).status, "success");
  assert.equal(parseLedgerQuery({ filter: "snipers" }).sniper, true);
  assert.throws(() => parseLedgerQuery({ side: "buy", status: "failed" }), BadRequest);
  assert.throws(() => parseLedgerQuery({ side: "long" }), BadRequest);
  assert.throws(() => parseLedgerQuery({ limit: "1000" }), BadRequest);
  assert.throws(() => parseLedgerQuery({ wallet: "not-an-address" }), BadRequest);
  assert.throws(() => parseLedgerQuery({ sniper: "maybe" }), BadRequest);
});

test("platform: totals by window (daily buckets), fee flow, wallet cards with a 24-point spark", async () => {
  const { pg, q } = await seeded();
  try {
    // snapshots: one wallet every hour for 2 days
    for (let h = 0; h < 48; h++)
      await q.query("INSERT INTO wallet_snapshots (address, taken_at, roles, lamports, wsol_lamports, bar_raw, slot) VALUES ('Wal1111111111111111111111111111111111111111', $1, 'feeReceiver', $2, NULL, NULL, 1)",
        [NOW - h * 3_600_000, String(1_000_000_000 + h * 1_000_000)]);
    const all = await platformOpenBook(q, ctx(), "all");
    assert.equal(all.totals.tokensLaunched, 1);
    assert.equal(all.totals.txCount, 5);
    assert.equal(all.higherMint, null);
    assert.equal(all.buyback.status, "soon");
    assert.ok(Math.abs(all.feeFlow!.recipients.burnedBaseFeeSol + all.feeFlow!.recipients.validatorsSol - 0.00502) < 1e-12);
    const w = all.treasuryWallets[0]!;
    assert.equal(w.owner, null);
    assert.equal(w.balanceSol, 1);
    assert.ok(w.spark.length >= 1 && w.spark.length <= 24);
    assert.equal(w.spark.at(-1)!.balanceSol, 1); // newest snapshot lands in the last bucket
    const day = await platformOpenBook(q, ctx(), "24h");
    assert.equal(day.windowGranularity, "utc-day");
    assert.equal(day.treasuryWallets[0]!.netChange24hSol, -0.024);
    assert.ok(day.treasuryWallets[0]!.spark.length >= 23 && day.treasuryWallets[0]!.spark.length <= 24);
  } finally { await pg.close(); }
});

test("tokens table: q search (search.ts ranking), status filter, sort + keyset cursor, cursor bound to filters", async () => {
  const { pg, q } = await freshDb();
  try {
    const mints: string[] = [];
    for (let i = 0; i < 7; i++) { const m = key(); mints.push(m); await addToken(q, { mint: m, pool: key(), name: i === 3 ? "Other Test Coin" : `Test Coin ${i}`, symbol: i === 5 ? "TEST" : `TST${i}`, volume: i % 3, migrated: i === 6 }); }
    const all: string[] = [];
    let r = await platformTokens(q, ctx(), { q: null, status: "all", sort: "volume", order: "desc", limit: 3, cursor: null });
    assert.equal(r.total, 7);
    for (;;) { all.push(...r.rows.map((x) => x.mint)); if (!r.nextCursor) break; r = await platformTokens(q, ctx(), { q: null, status: "all", sort: "volume", order: "desc", limit: 3, cursor: r.nextCursor }); }
    assert.equal(all.length, 7);
    assert.equal(new Set(all).size, 7);
    const s = await platformTokens(q, ctx(), { q: normalizeQuery("test"), status: "all", sort: "relevance", order: "desc", limit: 10, cursor: null });
    assert.equal(s.rows[0]!.symbol, "TEST"); // exact symbol first
    assert.equal(s.total, 7);
    const mig = await platformTokens(q, ctx(), { q: null, status: "migrated", sort: "volume", order: "desc", limit: 10, cursor: null });
    assert.deepEqual(mig.rows.map((x) => x.status), ["migrated"]);
    const pre = await platformTokens(q, ctx(), { q: normalizeQuery(mints[2]!.slice(0, 6)), status: "all", sort: "relevance", order: "desc", limit: 10, cursor: null });
    assert.ok(pre.rows.some((x) => x.mint === mints[2]));
    const first = await platformTokens(q, ctx(), { q: null, status: "all", sort: "volume", order: "desc", limit: 2, cursor: null });
    await assert.rejects(platformTokens(q, ctx(), { q: null, status: "bonding", sort: "volume", order: "desc", limit: 2, cursor: first.nextCursor }), CursorError);
    // tokens with no Open Book agg row yet
    assert.equal(first.rows[0]!.creatorEarnedSol, null); // not indexed yet: unknown, not 0
  } finally { await pg.close(); }
});

test("snapshot: one batched account read folded per wallet (referral WSOL ATA + $HIGHER ATAs), pruned after 35 d", async () => {
  const { pg, q } = await freshDb();
  try {
    const w = { feeReceiver: key(), feeClaimer: key(), leftoverReceiver: null, treasury: null, platform: null, referral: key(), referralWsolAta: key(), lockTip: key(), lockTipSol: 0.005 };
    const bar = key();
    const plan = snapshotPlan(w, bar);
    const roles = [...plan.roles.keys()];
    assert.equal(roles.length, 4);
    const tokenAcct = (amt: bigint) => { const d = Buffer.alloc(165); d.writeBigUInt64LE(amt, 64); return { lamports: 2_039_280, data: d }; };
    const infos = plan.keys.map((k) => (k === w.referralWsolAta ? tokenAcct(7_000_000n) : plan.extra.some((e) => e.key === k) ? (k === plan.extra.find((e) => e.kind === "bar")!.key ? tokenAcct(5_000_000n) : null) : { lamports: 1_000_000_000, data: Buffer.alloc(0) }));
    const rows = foldSnapshot(plan, infos, 9);
    assert.equal(rows.find((r) => r.address === w.referral)!.wsolLamports, 7_000_000n);
    assert.equal(rows.find((r) => r.address === w.feeReceiver)!.barRaw, "5000000");
    let calls = 0;
    const conn = { getMultipleAccountsInfoAndContext: async (ks: unknown[]) => { calls++; assert.equal(ks.length, plan.keys.length); return { context: { slot: 9 }, value: infos } } } as any;
    await q.query("INSERT INTO wallet_snapshots (address, taken_at, roles, lamports) VALUES ('old', 1, 'x', 1)");
    assert.equal(await snapshotOnce(q, conn, w, bar, NOW), 4);
    assert.equal(calls, 1);
    assert.equal((await q.query("SELECT count(*)::int AS n FROM wallet_snapshots WHERE address = 'old'")).rows[0].n, 0);
  } finally { await pg.close(); }
});

test("before 0012 is applied: endpoints degrade (pending, nulls), indexer path falls back", async () => {
  const { pg, q } = await freshDb(11);
  try {
    await addToken(q, { volume: 2 });
    const r = (await tokenOpenBook(q, MINT, ctx()))!;
    assert.equal(r.meta.indexState, "pending");
    assert.equal(r.meta.costsAvailable, false);
    assert.equal(r.summary.tips, null);
    assert.equal((await tokenLedger(q, MINT, ctx(), P()))!.rows.length, 0);
    const t = await platformTokens(q, ctx(), { q: null, status: "all", sort: "volume", order: "desc", limit: 5, cursor: null });
    assert.equal(t.rows.length, 1);
    assert.equal(t.rows[0]!.tipsSol, null);
    const p = await platformOpenBook(q, ctx(), "7d");
    assert.equal(p.meta.indexState, "pending");
  } finally { await pg.close(); }
});
