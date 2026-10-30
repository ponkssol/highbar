/** GO_PUBLIC_DATE cut-off: date math, the cashback guard and the read-only dry-run summary (PGlite, every migration verbatim).
 *  Never touches DATABASE_URL. Test data: "Test Coin" (TEST) and throwaway keys only. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { Keypair } from "@solana/web3.js";
import { period } from "./period.js";
import {
  cashbackGate, cashbackPeriodOk, claimedOnOrAfter, cutoffSummary, formatSummary, notMock, parseGoPublic, pendingFrom, periodOnOrAfter, summaryQueries,
} from "./goPublic.js";

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../db/migrations");
const DAY = 86_400_000;
const GP = parseGoPublic("2026-11-01")!;
const MINT = Keypair.generate().publicKey.toBase58(); // "Test Coin" (TEST), throwaway key
const W = Keypair.generate().publicKey.toBase58();
const SOL = 1_000_000_000n;

async function freshDb() {
  const pg = new PGlite();
  for (const f of fs.readdirSync(DIR).filter((x) => /^\d+_.+\.sql$/.test(x)).sort()) await pg.exec(fs.readFileSync(path.join(DIR, f), "utf8"));
  return { pg, query: (t: string, p?: unknown[]) => pg.query(t, p) as Promise<{ rows: any[] }> };
}

test("parseGoPublic: UTC midnight of a real calendar day, unset = null, anything else throws", () => {
  assert.deepEqual(GP, { id: "2026-11-01", ms: Date.parse("2026-11-01T00:00:00Z") });
  assert.equal(parseGoPublic(undefined), null); assert.equal(parseGoPublic(""), null); assert.equal(parseGoPublic("  "), null);
  assert.deepEqual(parseGoPublic(" 2026-11-01 "), GP);
  for (const bad of ["2026-11-31", "2026-02-29", "2026-1-01", "11/01/2026", "2026-11-01T00:00:00Z", "soon"]) assert.throws(() => parseGoPublic(bad), /GO_PUBLIC_DATE/, bad);
  assert.equal(parseGoPublic("2028-02-29")!.id, "2028-02-29"); // leap day
});

test("cashbackGate: refuses every period before the cut-off and everything while it is unset, never throws", () => {
  assert.equal(cashbackGate(period("2026-11-01"), GP).ok, true);
  assert.equal(cashbackGate(period("2026-11-02"), GP).ok, true);
  const before = cashbackGate(period("2026-10-31"), GP); // ends exactly at the cut-off: a dry-run day
  assert.equal(before.ok, false); assert.match(!before.ok ? before.reason : "", /before GO_PUBLIC_DATE 2026-11-01/);
  assert.equal(cashbackGate(period("2026-10-01"), GP).ok, false); // manual --period backfill of a dry-run day
  const unset = cashbackGate(period("2026-11-05"), null);
  assert.equal(unset.ok, false); assert.match(!unset.ok ? unset.reason : "", /GO_PUBLIC_DATE unset/);
  // default 'yesterday' period on go-public day itself is still a dry-run day; the day after is the first one accrued
  assert.equal(cashbackGate(period("yesterday", GP.ms + 3_600_000), GP).ok, false);
  assert.equal(cashbackGate(period("yesterday", GP.ms + DAY + 3_600_000), GP).ok, true);
  assert.equal(cashbackPeriodOk("2026-11-01", GP), true); assert.equal(cashbackPeriodOk("2026-10-31", GP), false); assert.equal(cashbackPeriodOk("2026-11-01", null), false);
});

test("pendingFrom: never before the cut-off, the last closed period or yesterday (older days are never accrued by the job)", () => {
  assert.equal(pendingFrom(null, 0, GP.ms + 5 * DAY), null);
  assert.equal(pendingFrom(GP, 0, GP.ms - 3 * DAY), GP.ms); // cut-off still ahead: nothing before it
  assert.equal(pendingFrom(GP, 0, GP.ms + 3_600_000), GP.ms); // go-public day
  const now = GP.ms + 5 * DAY + 3_600_000;
  assert.equal(pendingFrom(GP, GP.ms + 5 * DAY, now), GP.ms + 5 * DAY); // yesterday closed: only today
  assert.equal(pendingFrom(GP, GP.ms + 2 * DAY, now), GP.ms + 4 * DAY); // missed days are not awaiting, yesterday still is
  assert.equal(pendingFrom(GP, 0, now), GP.ms + 4 * DAY);
});

test("SQL fragments: no-op while unset, mock is always excluded", () => {
  assert.equal(periodOnOrAfter("period", null), "true"); assert.equal(claimedOnOrAfter("claimed_at", null), "true");
  assert.equal(periodOnOrAfter("period", GP), "period >= '2026-11-01'"); assert.equal(claimedOnOrAfter("f.claimed_at", GP), `f.claimed_at >= ${GP.ms}`);
  assert.equal(notMock(), "mode <> 'mock'");
  assert.deepEqual(summaryQueries(null).map((q) => q.table), ["fee_claims", "treasury_splits", "buybacks", "cashback_ledger"]);
});

async function seed(q: Awaited<ReturnType<typeof freshDb>>) {
  const fc = (sig: string, lamports: bigint, at: number) => q.query("INSERT INTO fee_claims (sig, source, pool, mint, lamports, claimed_at) VALUES ($1,'dbc_trading','pool',$2,$3,$4)", [sig, MINT, lamports.toString(), at]);
  await fc("c1", 2n * SOL, GP.ms - DAY); await fc("c2", 3n * SOL, GP.ms); await fc("c3", 1n * SOL, GP.ms + DAY);
  const split = (p: string, b: bigint) => q.query("INSERT INTO treasury_splits (period, gross_lamports, cashback_lamports, buyback_lamports, ops_lamports, treasury_lamports, created_at) VALUES ($1,0,0,$2,0,0,0)", [p, b.toString()]);
  await split("2026-10-30", SOL); await split("2026-10-31", SOL); await split("2026-11-01", 2n * SOL);
  const bb = (mode: string, status: string, l: bigint) => q.query("INSERT INTO buybacks (period, mode, bar_mint, bar_decimals, sol_spent_lamports, status, created_at, updated_at) VALUES ('2026-11-01',$1,$2,6,$3,$4,0,0)", [mode, MINT, l.toString(), status]);
  await bb("mock", "burned", 5n * SOL); await bb("jupiter", "burned", SOL); await bb("jupiter", "pending", SOL / 2n); await bb("jupiter", "failed", 7n * SOL);
  const cb = (p: string, a: bigint) => q.query("INSERT INTO cashback_ledger (wallet, period, period_start, period_end, trades, volume_lamports, amount_lamports, created_at) VALUES ($1,$2,0,1,1,1,$3,0)", [W, p, a.toString()]);
  await cb("2026-10-31", 4_000_000n); await cb("2026-11-01", 1_000_000n);
}

test("dry-run cutoff summary: included vs excluded per table, read-only", async () => {
  const q = await freshDb(); await seed(q);
  const set = await cutoffSummary(q, GP);
  const by = Object.fromEntries(set.map((r) => [r.table, r]));
  assert.deepEqual([by.fee_claims.includedCount, by.fee_claims.includedLamports, by.fee_claims.excludedCount, by.fee_claims.excludedLamports], [2, 4n * SOL, 1, 2n * SOL]);
  assert.deepEqual([by.treasury_splits.includedCount, by.treasury_splits.includedLamports, by.treasury_splits.excludedCount, by.treasury_splits.excludedLamports], [1, 2n * SOL, 2, 2n * SOL]);
  assert.deepEqual([by.buybacks.includedCount, by.buybacks.includedLamports, by.buybacks.excludedCount, by.buybacks.excludedLamports], [2, SOL + SOL / 2n, 1, 5n * SOL]); // failed never counted
  assert.deepEqual([by.cashback_ledger.includedLamports, by.cashback_ledger.excludedLamports], [1_000_000n, 4_000_000n]);
  const unset = Object.fromEntries((await cutoffSummary(q, null)).map((r) => [r.table, r]));
  assert.equal(unset.fee_claims.excludedCount, 0); assert.equal(unset.treasury_splits.includedLamports, 4n * SOL);
  assert.equal(unset.buybacks.excludedLamports, 5n * SOL); // mock excluded even while unset
  assert.equal(unset.cashback_ledger.includedCount, 0); assert.equal(unset.cashback_ledger.excludedLamports, 5_000_000n); // unset: nothing is paid
  // read-only: nothing changed
  assert.equal((await q.query("SELECT count(*)::int AS n FROM fee_claims WHERE period IS NULL")).rows[0].n, 3);
  const text = formatSummary(set, GP);
  assert.match(text, /GO_PUBLIC_DATE 2026-11-01/);
  assert.match(text, /fee_claims\.lamports: included 2 rows 4\.000000000 SOL, excluded 1 rows 2\.000000000 SOL/);
  assert.match(text, /cashback_ledger\.amount_lamports: included 1 rows 0\.001000000 SOL/);
  assert.ok(!/;/.test(text)); assert.ok(!/ \.\d/.test(text)); // copy rules: no semicolons, leading zeros
  assert.match(formatSummary([], null), /GO_PUBLIC_DATE unset/);
});

test("cashback payout filter: only periods on or after the cut-off are owed", async () => {
  const q = await freshDb(); await seed(q);
  const owed = async (g: typeof GP | null) => (await q.query(`SELECT coalesce(sum(amount_lamports), 0)::text AS s FROM cashback_ledger WHERE paid_sig IS NULL AND ${g ? periodOnOrAfter("period", g) : "false"}`)).rows[0].s;
  assert.equal(await owed(GP), "1000000"); assert.equal(await owed(null), "0");
});
