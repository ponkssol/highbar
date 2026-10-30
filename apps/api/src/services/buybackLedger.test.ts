/** Catch-up buyback ledger against a real (in-process, WASM) Postgres: PGlite runs every migration verbatim; the chain is faked
 *  (no RPC, no transactions). Never touches DATABASE_URL. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { Keypair } from "@solana/web3.js";
import { parseGoPublic } from "../jobs/goPublic.js";
import {
  claimBuySig, drainBuyback, ledgerTotals, markBurned, reconcileOrders, reserveOrder, setBurnSig, STALE_MS, whenLaunched,
  type ChainOps, type DrainOpts, type LedgerDb, type Order,
} from "./buybackLedger.js";

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../db/migrations");
const MINT = Keypair.generate().publicKey.toBase58(); // "Test Coin" (TEST), throwaway key
const SOL = 1_000_000_000n;
/** The tests above the GO_PUBLIC_DATE section drive the devnet mock drain, which counts its own mock rows. */
const MOCK = { countMock: true };

async function freshDb(): Promise<LedgerDb & { pg: PGlite }> {
  const pg = new PGlite();
  for (const f of fs.readdirSync(DIR).filter((x) => /^\d+_.+\.sql$/.test(x)).sort()) await pg.exec(fs.readFileSync(path.join(DIR, f), "utf8"));
  const wrap = (q: { query: PGlite["query"] }) => ({ query: (t: string, p?: unknown[]) => q.query(t, p) as Promise<{ rows: any[] }> });
  return { pg, ...wrap(pg), tx: (fn) => pg.transaction((t) => fn(wrap(t))) };
}
const split = (q: LedgerDb, period: string, buyback: bigint) =>
  q.query("INSERT INTO treasury_splits (period, gross_lamports, cashback_lamports, buyback_lamports, ops_lamports, treasury_lamports, created_at) VALUES ($1,$2,0,$3,0,0,0)",
    [period, (buyback * 5n / 2n).toString(), buyback.toString()]);
const rows = async (q: LedgerDb) => (await q.query("SELECT id, status, source, sol_spent_lamports::text AS s, buy_sig, burn_sig FROM buybacks ORDER BY id")).rows;

/** Fake chain: signatures land (or fail) instantly, the wallet balance drops by every landed buy. */
function fakeChain(q: LedgerDb, balance: bigint) {
  const c = {
    balance, n: 0, burned: 0n, sent: [] as bigint[], sigs: new Map<string, "landed" | "failed" | "unknown">(),
    /** next buy: "ok" | "quote" (fails before signing) | "onchain" (signed, fails on-chain) | "crash" (lands, process dies before recording) */
    next: [] as ("ok" | "quote" | "onchain" | "crash")[],
    ops: null as unknown as ChainOps,
    async exec(id: number | undefined, amount: bigint): Promise<Order> {
      if (id === undefined) return { mode: "mock", solIn: amount, barOut: amount * 10n, status: "would-buy" };
      const what = c.next.shift() ?? "ok";
      if (what === "quote") return { id, mode: "mock", solIn: amount, barOut: 0n, status: "failed", note: "quote 503" };
      const sig = `buy${++c.n}`;
      await claimBuySig(q, id, sig, amount * 10n);
      if (what === "onchain") { c.sigs.set(sig, "failed"); return { id, mode: "mock", solIn: amount, barOut: 0n, buySig: sig, status: "failed", note: "tx failed" }; }
      c.sigs.set(sig, "landed"); c.balance -= amount; c.sent.push(amount);
      if (what === "crash") throw new Error("process killed after send");
      await q.query("UPDATE buybacks SET status = 'bought', updated_at = $2 WHERE id = $1", [id, Date.now()]);
      const burnSig = await c.ops.burn(id, amount * 10n, "x");
      return { id, mode: "mock", solIn: amount, barOut: amount * 10n, buySig: sig, burnSig, status: "burned" };
    },
  };
  c.ops = {
    sigState: async (s) => c.sigs.get(s) ?? "unknown",
    received: async (r) => r.barBought,
    burn: async (id, amount) => { const s = `burn${++c.n}`; await setBurnSig(q, id, s); c.sigs.set(s, "landed"); c.burned += amount; await markBurned(q, id); return s; },
  };
  return c;
}
const drain = (q: LedgerDb, c: ReturnType<typeof fakeChain>, o: Partial<DrainOpts> = {}) => drainBuyback({
  db: q, period: "2026-10-29", live: true, mode: "mock", barMint: MINT, decimals: 6,
  maxOrder: 1n * SOL, maxOrdersPerRun: 3, reserve: SOL / 10n, balance: async () => c.balance, exec: c.exec, ...o,
});
const spent = async (q: LedgerDb) => (await ledgerTotals(q, MOCK)).spent;

test("migration 0011: source column, unique buy signature", async () => {
  const q = await freshDb();
  await q.query("INSERT INTO buybacks (period, mode, bar_mint, bar_decimals, sol_spent_lamports, buy_sig, created_at, updated_at) VALUES ('p','mock',$1,6,1,'s1',0,0)", [MINT]);
  assert.equal((await rows(q))[0].source, "period");
  await assert.rejects(q.query("INSERT INTO buybacks (period, mode, bar_mint, bar_decimals, sol_spent_lamports, buy_sig, created_at, updated_at) VALUES ('p','mock',$1,6,1,'s1',0,0)", [MINT]));
  await assert.rejects(q.query("UPDATE buybacks SET source = 'bogus'"));
});

test("backlog = sum of every period's buyback split minus non-failed buybacks", async () => {
  const q = await freshDb();
  await split(q, "2026-10-01", 1_500_000_000n); await split(q, "2026-10-02", 700_000_000n); await split(q, "2026-10-03", 300_000_001n);
  assert.deepEqual(await ledgerTotals(q, MOCK), { budget: 2_500_000_001n, spent: 0n, inflight: 0n, backlog: 2_500_000_001n });
  const ins = (s: bigint, status: string) => q.query("INSERT INTO buybacks (period, mode, bar_mint, bar_decimals, sol_spent_lamports, status, created_at, updated_at) VALUES ('2026-10-02','mock',$1,6,$2,$3,0,0)", [MINT, s.toString(), status]);
  await ins(400_000_000n, "burned"); await ins(100_000_000n, "pending"); await ins(900_000_000n, "failed");
  assert.deepEqual(await ledgerTotals(q, MOCK), { budget: 2_500_000_001n, spent: 500_000_000n, inflight: 100_000_000n, backlog: 2_000_000_001n });
});

test("ecosystem mint unset: no-op, the budget only accrues; first launched run spends the whole backlog", async () => {
  const q = await freshDb();
  await split(q, "2026-10-01", SOL / 2n); await split(q, "2026-10-02", SOL / 4n);
  let called = 0;
  for (const mint of [null, undefined, ""]) assert.match(String(await whenLaunched(mint, async () => { called++; return "x"; })), /accrues only/);
  assert.equal(called, 0); assert.equal((await rows(q)).length, 0);
  await split(q, "2026-10-03", SOL / 4n);
  const c = fakeChain(q, 10n * SOL);
  const r = await whenLaunched(MINT, () => drain(q, c));
  assert.ok(typeof r !== "string");
  assert.equal(r.backlog, SOL); assert.equal(await spent(q), SOL);
  assert.deepEqual(c.sent, [SOL]); assert.equal(c.burned, SOL * 10n);
  assert.deepEqual((await rows(q)).map((x) => [x.status, x.source]), [["burned", "ledger"]]);
});

test("a big backlog drains across runs under BUYBACK_MAX_ORDER_SOL x MAX_ORDERS_PER_RUN", async () => {
  const q = await freshDb();
  for (let d = 1; d <= 5; d++) await split(q, `2026-10-0${d}`, 1_400_000_000n); // 7 SOL
  const c = fakeChain(q, 100n * SOL);
  const sizes: bigint[][] = [];
  for (let run = 0; run < 4; run++) { const r = await drain(q, c, { maxOrder: SOL, maxOrdersPerRun: 3 }); sizes.push(r.orders.map((o) => o.solIn)); }
  assert.deepEqual(sizes, [[SOL, SOL, SOL], [SOL, SOL, SOL], [SOL], []]);
  assert.equal(await spent(q), 7n * SOL); assert.equal((await ledgerTotals(q, MOCK)).backlog, 0n);
  // a new period after the catch-up is bought on the next run
  await split(q, "2026-10-06", SOL / 2n);
  assert.deepEqual((await drain(q, c)).orders.map((o) => o.solIn), [SOL / 2n]);
});

test("never spends more than wallet balance - reserve - owed payouts - in-flight orders", async () => {
  const q = await freshDb();
  await split(q, "2026-10-01", 5n * SOL);
  await q.query("INSERT INTO cashback_ledger (wallet, period, period_start, period_end, trades, volume_lamports, amount_lamports, created_at) VALUES ('w','2026-10-01',0,1,1,1,$1,0)", [(SOL / 5n).toString()]);
  const c = fakeChain(q, 2n * SOL); // 2 - 0.1 reserve - 0.2 owed cashback = 1.7 SOL spendable
  const r = await drain(q, c, { maxOrdersPerRun: 5 });
  assert.deepEqual(r.orders.map((o) => o.solIn), [SOL, 700_000_000n]);
  assert.match(r.stop!, /wallet available/);
  assert.equal(c.balance, 300_000_000n);
  assert.equal((await ledgerTotals(q, MOCK)).backlog, 3_300_000_000n, "the rest stays in the backlog");
});

test("idempotent: rerun spends nothing more; concurrent runs never reserve the same lamports", async () => {
  const q = await freshDb();
  await split(q, "2026-10-01", 2_500_000_000n);
  const c = fakeChain(q, 50n * SOL);
  await drain(q, c, { maxOrdersPerRun: 10 });
  const again = await drain(q, c, { maxOrdersPerRun: 10 });
  assert.equal(again.orders.length, 0); assert.equal(again.stop, "nothing to spend");
  assert.equal(await spent(q), 2_500_000_000n); assert.equal(c.sent.reduce((a, b) => a + b, 0n), 2_500_000_000n);

  const q2 = await freshDb();
  await split(q2, "2026-10-01", 4_200_000_000n);
  const c2 = fakeChain(q2, 50n * SOL);
  await Promise.all([1, 2, 3].map(() => drain(q2, c2, { maxOrdersPerRun: 10 })));
  assert.equal(c2.sent.reduce((a, b) => a + b, 0n), 4_200_000_000n, "three parallel runs spend the backlog exactly once");
  assert.equal(await spent(q2), 4_200_000_000n);
});

test("crash between send and record: the landed buy stays reserved, reconcile burns it, nothing is bought twice", async () => {
  const q = await freshDb();
  await split(q, "2026-10-01", 2n * SOL);
  const c = fakeChain(q, 50n * SOL);
  c.next = ["ok", "crash"];
  const r1 = await drain(q, c);
  assert.deepEqual(r1.orders.map((o) => o.status), ["burned", "failed"]);
  assert.deepEqual((await rows(q)).map((x) => x.status), ["burned", "pending"]);
  assert.equal((await ledgerTotals(q, MOCK)).backlog, 0n, "the signed, unrecorded buy still counts");
  assert.equal((await drain(q, c)).orders.length, 0, "rerun does not re-buy it");
  await reconcileOrders(q, MINT, c.ops);
  assert.deepEqual((await rows(q)).map((x) => x.status), ["burned", "burned"]);
  assert.equal(c.burned, 20n * SOL); assert.deepEqual(c.sent, [SOL, SOL]);

  // crash after reserving, before signing: held while fresh, released once stale, then spent exactly once
  await split(q, "2026-10-02", SOL);
  const hold = await reserveOrder(q, { period: "2026-10-02", mode: "mock", barMint: MINT, decimals: 6, source: "ledger", maxOrder: SOL, reserve: 0n, balance: async () => c.balance });
  assert.equal(hold.amount, SOL);
  assert.equal((await drain(q, c)).orders.length, 0);
  await reconcileOrders(q, MINT, c.ops);
  assert.equal((await ledgerTotals(q, MOCK)).backlog, 0n, "a fresh unsigned reservation is not released");
  await reconcileOrders(q, MINT, c.ops, () => {}, Date.now() + STALE_MS + 1);
  await assert.rejects(claimBuySig(q, hold.id!, "late"), /no longer an unsigned pending reservation/, "a late signer is refused, so it never sends");
  assert.equal((await drain(q, c)).orders.length, 1);
  assert.equal(await spent(q), 3n * SOL); assert.equal(c.sent.reduce((a, b) => a + b, 0n), 3n * SOL);
});

test("failed orders are not counted: pre-sign failures release at once, on-chain failures once reconciled", async () => {
  const q = await freshDb();
  await split(q, "2026-10-01", 2n * SOL);
  const c = fakeChain(q, 50n * SOL);
  c.next = ["quote"];
  const r1 = await drain(q, c);
  assert.deepEqual(r1.orders.map((o) => o.status), ["failed"], "a failed order stops the run");
  assert.deepEqual((await rows(q)).map((x) => x.status), ["failed"]);
  assert.equal((await ledgerTotals(q, MOCK)).backlog, 2n * SOL);

  c.next = ["onchain"];
  await drain(q, c);
  assert.equal((await ledgerTotals(q, MOCK)).inflight, SOL, "signed + unconfirmed stays reserved until settled");
  await reconcileOrders(q, MINT, c.ops);
  assert.deepEqual((await rows(q)).map((x) => x.status), ["failed", "failed"]);
  assert.equal((await ledgerTotals(q, MOCK)).backlog, 2n * SOL);

  await drain(q, c);
  assert.equal(await spent(q), 2n * SOL); assert.deepEqual(c.sent, [SOL, SOL]);
});

test("dry-run writes nothing and includes this run's unwritten split", async () => {
  const q = await freshDb();
  await split(q, "2026-10-01", SOL);
  const c = fakeChain(q, 50n * SOL);
  const r = await drain(q, c, { live: false, previewExtra: SOL / 2n });
  assert.equal(r.backlog, 1_500_000_000n);
  assert.deepEqual(r.orders.map((o) => [o.status, o.solIn]), [["would-buy", SOL], ["would-buy", SOL / 2n]]);
  assert.equal((await rows(q)).length, 0);
});

test("manual --budget-sol spends its own budget once per period and counts against the ledger", async () => {
  const q = await freshDb();
  await split(q, "2026-10-01", 3n * SOL);
  const c = fakeChain(q, 50n * SOL);
  const m = await drain(q, c, { source: "manual", manualBudget: SOL / 2n });
  assert.deepEqual(m.orders.map((o) => o.solIn), [SOL / 2n]);
  assert.equal((await drain(q, c, { source: "manual", manualBudget: SOL / 2n })).orders.length, 0);
  assert.equal((await ledgerTotals(q, MOCK)).backlog, 2_500_000_000n);
});

// ---- GO_PUBLIC_DATE + mock exclusion (jobs/goPublic.ts) ----
const GP = parseGoPublic("2026-11-01")!;
const order = (q: LedgerDb, mode: "jupiter" | "mock", status: string, l: bigint, extra: { buy_sig?: string } = {}) =>
  q.query("INSERT INTO buybacks (period, mode, bar_mint, bar_decimals, sol_spent_lamports, status, source, buy_sig, created_at, updated_at) VALUES ('2026-11-01',$1,$2,6,$3,$4,'ledger',$5,0,0)",
    [mode, MINT, l.toString(), status, extra.buy_sig ?? null]);

test("mock buybacks never count against the backlog, jupiter pending / bought / burned always do", async () => {
  const q = await freshDb();
  await split(q, "2026-11-01", 10n * SOL);
  await order(q, "mock", "burned", 4n * SOL); await order(q, "mock", "pending", SOL);
  assert.deepEqual(await ledgerTotals(q), { budget: 10n * SOL, spent: 0n, inflight: 0n, backlog: 10n * SOL });
  await order(q, "jupiter", "pending", SOL / 2n); await order(q, "jupiter", "bought", SOL, { buy_sig: "b1" }); await order(q, "jupiter", "burned", 2n * SOL, { buy_sig: "b2" });
  await order(q, "jupiter", "failed", 3n * SOL);
  assert.deepEqual(await ledgerTotals(q), { budget: 10n * SOL, spent: 3_500_000_000n, inflight: SOL / 2n, backlog: 6_500_000_000n });
  assert.equal((await ledgerTotals(q, MOCK)).spent, 8_500_000_000n); // only the devnet mock drain counts its own rows
});

test("GO_PUBLIC_DATE: splits of earlier periods are not in the budget, unset = every period", async () => {
  const q = await freshDb();
  await split(q, "2026-10-30", 3n * SOL); await split(q, "2026-10-31", 2n * SOL); await split(q, "2026-11-01", SOL); await split(q, "2026-11-02", SOL / 2n);
  assert.equal((await ledgerTotals(q)).budget, 6_500_000_000n);
  assert.equal((await ledgerTotals(q, { goPublic: null })).budget, 6_500_000_000n);
  assert.deepEqual(await ledgerTotals(q, { goPublic: GP }), { budget: 1_500_000_000n, spent: 0n, inflight: 0n, backlog: 1_500_000_000n });
});

test("jupiter drain with GO_PUBLIC_DATE: reserves only the post-cut-off backlog under the advisory lock, ignores mock rows, idempotent", async () => {
  const q = await freshDb();
  await split(q, "2026-10-31", 5n * SOL); await split(q, "2026-11-01", 2n * SOL);
  await order(q, "mock", "burned", 2n * SOL); // devnet leftovers: not spent SOL on mainnet
  const c = fakeChain(q, 50n * SOL);
  const r = await drain(q, c, { mode: "jupiter", goPublic: GP });
  assert.equal(r.budget, 2n * SOL); assert.equal(r.spentBefore, 0n); assert.equal(r.backlog, 2n * SOL);
  assert.deepEqual(r.orders.map((o) => o.solIn), [SOL, SOL]);
  const t = await ledgerTotals(q, { goPublic: GP });
  assert.equal(t.spent, 2n * SOL); assert.equal(t.backlog, 0n);
  assert.equal((await drain(q, c, { mode: "jupiter", goPublic: GP })).orders.length, 0); // rerun: nothing more
  // concurrent reservations still serialise on the advisory lock
  await split(q, "2026-11-02", SOL);
  const ro = { period: "2026-11-02", mode: "jupiter" as const, barMint: MINT, decimals: 6, source: "ledger" as const, goPublic: GP, maxOrder: SOL, reserve: 0n, balance: async () => 50n * SOL };
  const [a, b] = await Promise.all([reserveOrder(q, ro), reserveOrder(q, ro)]);
  assert.deepEqual([a.amount + b.amount, [a.id, b.id].filter((x) => x !== null).length], [SOL, 1]);
});

test("reconcile still settles a signed jupiter reservation and it keeps counting until it fails", async () => {
  const q = await freshDb();
  await split(q, "2026-11-01", 2n * SOL);
  await order(q, "jupiter", "pending", SOL, { buy_sig: "lost" });
  assert.equal((await ledgerTotals(q, { goPublic: GP })).backlog, SOL);
  const c = fakeChain(q, 50n * SOL); c.sigs.set("lost", "failed");
  await reconcileOrders(q, MINT, c.ops, () => {}, Date.now() + STALE_MS + 1);
  assert.equal((await ledgerTotals(q, { goPublic: GP })).backlog, 2n * SOL);
});
