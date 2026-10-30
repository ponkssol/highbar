/** Hourly autoclaim (services/autoClaim.ts + FeeClaimer opts): gating, threshold, batched reads, receiver, cap, failure isolation,
 *  advisory lock and the idempotent fee_claims insert read back by Open Book (PGlite, every migration verbatim; never DATABASE_URL).
 *  Everything chain-side is mocked: no RPC is called, nothing is signed, simulated against a cluster or sent.
 *  Test data: "Test Coin" (TEST) and throwaway keys only. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import BN from "bn.js";
import { PGlite } from "@electric-sql/pglite";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import type { Q } from "../db/pool.js";

// TREASURY_PUBKEY is set on jobs-epoch; autoclaim must ignore it. Set before jobs/config.ts is loaded (dynamic imports below).
const TREASURY = Keypair.generate().publicKey;
process.env.TREASURY_PUBKEY = TREASURY.toBase58();
const { autoclaimSettings, chunk, CHUNK, dbcDecoder, partnerFeesOf, planAutoclaim, readAccounts, runAutoclaim, runsFeeClaims, epochSkipsFeeClaims, withAutoclaimLock } = await import("./autoClaim.js");
const { FeeClaimer, recordClaim } = await import("./feeClaimer.js");
const { tokenOpenBook } = await import("../openbook/read.js");
const { resetOpenbookTablesCache } = await import("../openbook/write.js");

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../db/migrations");
const key = () => Keypair.generate().publicKey.toBase58();
const SIGNER = Keypair.generate(); // throwaway; never funded, never used against a cluster
const CFG = key(), FOREIGN_CFG = key();
const MIN = 10_000_000n; // CLAIM_MIN_SOL default 0.01

// ---------- fakes ----------
type Pool = { quote: bigint; base?: bigint; migrated?: boolean; config?: string; wrap?: boolean };
/** Account data = JSON; the fake decoder returns what the DBC coder would (virtualPool fields wrapped in poolState like 2.0.0). */
const enc = (o: unknown) => Buffer.from(JSON.stringify(o, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
const poolData = (p: Pool) => enc({ kind: "pool", ...p, config: p.config ?? CFG });
const cfgData = (feeClaimer: string) => enc({ kind: "config", feeClaimer });
const decode = (account: "virtualPool" | "poolConfig", data: Buffer) => {
  const o = JSON.parse(data.toString());
  if (account === "poolConfig") { if (o.kind !== "config") throw new Error("not a config"); return { feeClaimer: new PublicKey(o.feeClaimer) }; }
  if (o.kind !== "pool") throw new Error("not a pool");
  const s = { partnerQuoteFee: new BN(o.quote), partnerBaseFee: new BN(o.base ?? "0"), isMigrated: o.migrated ? 1 : 0, config: new PublicKey(o.config) };
  return o.wrap === false ? s : { poolState: s };
};
function fakeConn(accounts: Map<string, Buffer | null>) {
  const calls: number[] = [];
  return { calls, getMultipleAccountsInfo: async (keys: PublicKey[]) => { calls.push(keys.length); return keys.map((k) => { const d = accounts.get(k.toBase58()); return d ? { data: d, executable: false, lamports: 1, owner: SIGNER.publicKey } : null; }); } };
}
/** DBC client stand-in: records claim params; per-pool getPoolFeeMetrics must never be called by autoclaim. */
function fakeDbc(o: { failPool?: string } = {}) {
  const trading: any[] = [];
  return {
    trading,
    dbc: {
      state: {
        getPoolFeeMetrics: async () => { throw new Error("getPoolFeeMetrics called: autoclaim must use the batched read"); },
        getPoolConfig: async () => ({ feeClaimer: SIGNER.publicKey, migrationFeeOption: 0 }),
        getPoolSurplus: async () => null,
      },
      partner: {
        claimPartnerTradingFee: async (p: any) => { if (p.pool.toBase58() === o.failPool) throw new Error("boom: Test Coin pool"); trading.push(p); return new Transaction(); },
        partnerWithdrawMigrationFee: async () => new Transaction(),
        partnerWithdrawSurplus: async () => new Transaction(),
      },
    } as any,
  };
}
const noAmm = { getPositionsByUserAndTokenMint: async () => [] } as any;
const offline = { getAccountInfo: async () => null, getTransaction: async () => null } as any;
function sender() { const sent: Transaction[] = []; let n = 0; return { sent, send: async (tx: Transaction) => { sent.push(tx); return `TESTSIG${++n}${"1".repeat(80)}`.slice(0, 88); } }; }
const okSim = async () => ({ ok: true as const });

const row = (o: { pool?: string; mint?: string; config?: string; migrated?: boolean } = {}) => ({ mint: o.mint ?? key(), pool: o.pool ?? key(), config: o.config ?? CFG, is_migrated: !!o.migrated, damm_pool: null as string | null });
function world(pools: (Pool & { config?: string; migrated?: boolean })[]) {
  const accounts = new Map<string, Buffer | null>([[CFG, cfgData(SIGNER.publicKey.toBase58())], [FOREIGN_CFG, cfgData(key())]]);
  const rows = pools.map((p) => { const r = row({ config: p.config, migrated: p.migrated }); accounts.set(r.pool, poolData(p)); return r; });
  return { rows, accounts };
}
const mockQ = (rows: unknown[]) => { const sql: string[] = []; return { sql, q: { query: async (t: string) => { sql.push(t); return t.startsWith("SELECT mint, pool") ? { rows } : { rows: [], rowCount: 1 }; } } as unknown as Q }; };

async function freshDb() {
  resetOpenbookTablesCache();
  const pg = new PGlite();
  for (const f of fs.readdirSync(DIR).filter((x) => /^\d+_.+\.sql$/.test(x)).sort()) await pg.exec(fs.readFileSync(path.join(DIR, f), "utf8"));
  const q = { query: (t: string, p?: unknown[]) => pg.query(t, p as any[]).then((r: any) => ({ ...r, rowCount: r.affectedRows ?? r.rows.length })) } as unknown as Q;
  return { pg, q };
}
async function addToken(q: Q, mint: string, pool: string) {
  await q.query(`INSERT INTO tokens (mint, pool, config, tier, anti_sniper, creator, created_at, quote_reserve_sol, threshold_sol, progress, is_migrated, price_sol, mcap_sol,
      name, symbol, uri, volume_sol, volume_24h_sol, trades, creator_fees_sol, fees_sol, updated_at)
    VALUES ($1,$2,$3,'max',false,$4,$5,10,85,0.1,false,0,0,'Test Coin','TEST','',0,0,0,0,0,$5)`, [mint, pool, CFG, key(), Date.now() - 3_600_000]);
}
const settings = (env: Record<string, string> = {}, net: "devnet" | "mainnet" = "devnet", argv: string[] = []) => autoclaimSettings(env, net, argv);

// ---------- gating ----------
test("gating: simulate unless CLAIM_LIVE=true / --live; mainnet also needs ALLOW_MAINNET=true; DRY_RUN is ignored; --dry-run wins", () => {
  assert.equal(settings().live, false);
  assert.match(settings().reason!, /CLAIM_LIVE/);
  assert.equal(settings({ DRY_RUN: "false" }).live, false, "DRY_RUN=false alone never sends");
  assert.equal(settings({ CLAIM_LIVE: "1" }).live, false, "only the literal 'true'");
  assert.equal(settings({ CLAIM_LIVE: "true" }).live, true);
  assert.equal(settings({ CLAIM_LIVE: "true", DRY_RUN: "true" }).live, true, "DRY_RUN=true does not block autoclaim");
  assert.equal(settings({}, "devnet", ["autoclaim", "--live"]).live, true);
  assert.equal(settings({ CLAIM_LIVE: "true" }, "devnet", ["autoclaim", "--dry-run"]).live, false);
  const m = settings({ CLAIM_LIVE: "true" }, "mainnet");
  assert.equal(m.live, false); assert.equal(m.requestedLive, true); assert.match(m.reason!, /ALLOW_MAINNET/);
  assert.equal(settings({}, "mainnet", ["autoclaim", "--live"]).live, false);
  assert.equal(settings({ CLAIM_LIVE: "true", ALLOW_MAINNET: "true" }, "mainnet").live, true);
  assert.equal(settings({ ALLOW_MAINNET: "true" }, "mainnet").live, false, "ALLOW_MAINNET alone is not CLAIM_LIVE");
});

test("settings: CLAIM_MIN_SOL 0.01 / CLAIM_MAX_PER_RUN 20 defaults, overrides, bad values throw; CLAIM_RECEIVER defaults to the signer", () => {
  const d = settings();
  assert.equal(d.minLamports, MIN); assert.equal(d.maxPerRun, 20); assert.equal(d.receiver, null);
  assert.equal(settings({ CLAIM_MIN_SOL: "0.05", CLAIM_MAX_PER_RUN: "3" }).minLamports, 50_000_000n);
  assert.equal(settings({ CLAIM_MAX_PER_RUN: "3" }).maxPerRun, 3);
  assert.equal(settings({ CLAIM_MIN_SOL: " " }).minLamports, MIN);
  assert.throws(() => settings({ CLAIM_MIN_SOL: "-1" }), /CLAIM_MIN_SOL/);
  assert.throws(() => settings({ CLAIM_MAX_PER_RUN: "lots" }), /CLAIM_MAX_PER_RUN/);
  assert.throws(() => settings({ CLAIM_RECEIVER: "not-a-key" }), /CLAIM_RECEIVER/);
  const r = key();
  assert.equal(settings({ CLAIM_RECEIVER: r }).receiver!.toBase58(), r);
  assert.equal(settings({ TREASURY_PUBKEY: TREASURY.toBase58() }).receiver, null, "TREASURY_PUBKEY is not the autoclaim receiver");
});

test("epoch skips its fee claims only when AUTOCLAIM_ENABLED=true; fees always claims; default unchanged", () => {
  assert.equal(runsFeeClaims("epoch", {}), true);
  assert.equal(runsFeeClaims("epoch", { AUTOCLAIM_ENABLED: "false" }), true);
  assert.equal(runsFeeClaims("epoch", { AUTOCLAIM_ENABLED: "true" }), false);
  assert.equal(runsFeeClaims("fees", { AUTOCLAIM_ENABLED: "true" }), true);
  for (const c of ["cashback", "buyback", "lprebate", "autoclaim"]) assert.equal(runsFeeClaims(c, {}), false, c);
  assert.equal(epochSkipsFeeClaims({ AUTOCLAIM_ENABLED: "true" }), true);
  assert.equal(epochSkipsFeeClaims({}), false);
});

// ---------- batched reads ----------
test("readAccounts: getMultipleAccountsInfo in chunks of 100, deduped, missing accounts kept as null", async () => {
  assert.equal(CHUNK, 100);
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunk([]), []);
  const keys = Array.from({ length: 250 }, key);
  const acc = new Map(keys.slice(0, 249).map((k) => [k, Buffer.from(k)] as const));
  const c = fakeConn(acc);
  const out = await readAccounts(c, [...keys, keys[0], keys[1]]);
  assert.deepEqual(c.calls, [100, 100, 50]);
  assert.equal(out.size, 250);
  assert.equal(out.get(keys[249]), null);
  assert.equal(out.get(keys[7])!.toString(), keys[7]);
});

test("partnerFeesOf: poolState-wrapped and flat decodes", () => {
  const c = new PublicKey(CFG);
  assert.deepEqual(partnerFeesOf({ poolState: { partnerQuoteFee: new BN(35964879), partnerBaseFee: new BN(0), isMigrated: 0, config: c } }), { quote: 35964879n, base: 0n, migrated: false, config: CFG });
  assert.deepEqual(partnerFeesOf({ partnerQuoteFee: new BN(1), partnerBaseFee: new BN(2), isMigrated: 1, config: c }), { quote: 1n, base: 2n, migrated: true, config: CFG });
  const p = { coder: { accounts: { decode: (n: string, d: Buffer) => ({ n, len: d.length }) } } };
  assert.deepEqual(dbcDecoder(p)("virtualPool", Buffer.alloc(3)), { n: "virtualPool", len: 3 });
});

// ---------- threshold ----------
test("planAutoclaim: quote >= CLAIM_MIN_SOL or base > 0; below-min skipped; foreign feeClaimer / missing pool skipped; biggest first", () => {
  const { rows, accounts } = world([
    { quote: 35_964_879n }, { quote: 14_630_746n, wrap: false }, { quote: 49_675n }, { quote: MIN }, { quote: MIN - 1n },
    { quote: 0n, base: 5n }, { quote: 0n }, { quote: 0n, migrated: true }, { quote: 99_000_000n, config: FOREIGN_CFG },
  ]);
  const missing = row(); rows.push(missing);
  const plan = planAutoclaim(rows, accounts, decode, SIGNER.publicKey, MIN);
  assert.deepEqual(plan.candidates.map((c) => [c.fees.quote, c.fees.base, c.trading, c.migrated]), [
    [35_964_879n, 0n, true, false], [14_630_746n, 0n, true, false], [MIN, 0n, true, false], [0n, 5n, true, false], [0n, 0n, false, true],
  ]);
  assert.equal(plan.belowMin, 2);
  assert.equal(plan.skipped.length, 2);
  assert.match(plan.skipped.find((s) => s.mint === rows[8].mint)!.reason, /feeClaimer .* not the signer/);
  assert.match(plan.skipped.find((s) => s.mint === missing.mint)!.reason, /not found/);
});

// ---------- receiver ----------
test("receiver = signer even with TREASURY_PUBKEY set (opts.receiver null); CLAIM_RECEIVER overrides; epoch default still the treasury", async () => {
  const me = SIGNER.publicKey;
  const mk = (receiver?: PublicKey | null) => { const f = fakeDbc(); return { f, c: new FeeClaimer(SIGNER, false, { receiver, dbc: f.dbc, amm: noAmm, conn: offline, simulate: okSim, q: mockQ([]).q }) }; };
  const auto = mk(null);
  assert.equal(auto.c.receiver, undefined);
  const r = await auto.c.forToken(key(), key(), false, null, CFG, { partner: { quote: MIN, base: 0n } });
  assert.equal(r[0].status, "would-claim");
  assert.equal(auto.f.trading[0].receiver, undefined, "SDK receiver unset = the feeClaimer (signer) itself");
  assert.ok(auto.f.trading[0].feeClaimer.equals(me));
  assert.ok(mk(me).c.receiver === undefined, "CLAIM_RECEIVER = signer -> plain claim");
  const other = Keypair.generate().publicKey;
  assert.ok(mk(other).c.receiver!.equals(other));
  assert.ok(mk(undefined).c.receiver!.equals(TREASURY), "unchanged epoch behaviour uses TREASURY_PUBKEY");
});

// ---------- run: simulate vs live ----------
test("simulate only: no CLAIM_LIVE -> would-claim lines, nothing sent, nothing written; mainnet without ALLOW_MAINNET -> no send", async () => {
  for (const s of [settings(), settings({ CLAIM_LIVE: "true" }, "mainnet")]) {
    const { rows, accounts } = world([{ quote: 35_964_879n }, { quote: 14_447_501n }, { quote: 49_675n }]);
    const { q, sql } = mockQ(rows), f = fakeDbc(), tx = sender(), lines: string[] = [];
    const sum = await runAutoclaim({ q, conn: fakeConn(accounts), decode, signer: SIGNER, settings: s, log: (m) => lines.push(m),
      claimerOpts: { dbc: f.dbc, amm: noAmm, conn: offline, simulate: okSim, send: tx.send } });
    assert.equal(tx.sent.length, 0);
    assert.equal(sql.filter((t) => /INSERT/i.test(t)).length, 0);
    assert.equal(sum.mode, "simulate"); assert.equal(sum.wouldClaim, 2); assert.equal(sum.claimed, 0);
    assert.equal(sum.lamports, 35_964_879n + 14_447_501n);
    assert.equal(lines.filter((l) => /would-claim dbc_trading/.test(l)).length, 2);
    assert.match(lines.at(-1)!, /summary mode=simulate .* wouldClaim=2 .* belowMin=1|summary mode=simulate .*belowMin=1 wouldClaim=2/);
    assert.ok(f.trading.every((p) => p.receiver === undefined));
  }
});

test("live (mocked send): claims land in fee_claims once (ON CONFLICT DO NOTHING) and Open Book reads them", async () => {
  const { pg, q } = await freshDb();
  try {
    const mint = key(), pool = key();
    await addToken(q, mint, pool);
    const accounts = new Map<string, Buffer | null>([[CFG, cfgData(SIGNER.publicKey.toBase58())], [pool, poolData({ quote: 14_630_746n })]]);
    const f = fakeDbc(), tx = sender();
    const run = () => runAutoclaim({ q, conn: fakeConn(accounts), decode, signer: SIGNER, settings: settings({ CLAIM_LIVE: "true" }), log: () => {},
      claimerOpts: { dbc: f.dbc, amm: noAmm, conn: offline, simulate: okSim, send: tx.send } });
    const sum = await run();
    assert.equal(sum.mode, "live"); assert.equal(sum.claimed, 1); assert.equal(tx.sent.length, 1);
    const sig = sum.results[0].sig!;
    const rows = (await q.query("SELECT sig, source, pool, mint, lamports, base_amount, period FROM fee_claims")).rows;
    assert.deepEqual(rows.map((r: any) => [r.sig, r.source, r.pool, r.mint, Number(r.lamports), r.base_amount, r.period]), [[sig, "dbc_trading", pool, mint, 14_630_746, "0", null]]);
    // retry of the same landed tx: no second row
    assert.equal(await recordClaim(q, { sig, source: "dbc_trading", pool, mint, lamports: 14_630_746n, baseAmount: 0n }), false);
    assert.equal(await recordClaim(q, { sig: "TESTSIGother", source: "dbc_trading", pool, mint, lamports: 1n, baseAmount: 0n }), true);
    assert.equal((await q.query("SELECT count(*)::int AS n FROM fee_claims")).rows[0].n, 2);
    await q.query("DELETE FROM fee_claims WHERE sig = 'TESTSIGother'");
    const ob: any = await tokenOpenBook(q, mint, { network: "mainnet", goPublic: null, barMint: null,
      wallets: { feeReceiver: SIGNER.publicKey.toBase58(), feeClaimer: SIGNER.publicKey.toBase58(), referral: null, platform: SIGNER.publicKey.toBase58() } });
    assert.equal(ob.postMigration.dbcTradingClaimedSol, 0.014630746);
    assert.deepEqual(ob.postMigration.claims.map((c: any) => [c.source, c.sig, c.sol]), [["dbc_trading", sig, 0.014630746]]);
  } finally { await pg.close(); }
});

// ---------- cap + failure isolation ----------
test("CLAIM_MAX_PER_RUN caps the txs per run (biggest first); the rest wait for the next run", async () => {
  const { rows, accounts } = world(Array.from({ length: 25 }, (_, i) => ({ quote: MIN + BigInt(i) })));
  const f = fakeDbc(), tx = sender(), lines: string[] = [];
  const sum = await runAutoclaim({ q: mockQ(rows).q, conn: fakeConn(accounts), decode, signer: SIGNER, settings: settings({ CLAIM_LIVE: "true" }), log: (m) => lines.push(m),
    claimerOpts: { dbc: f.dbc, amm: noAmm, conn: offline, simulate: okSim, send: tx.send } });
  assert.equal(sum.claimed, 20); assert.equal(tx.sent.length, 20); assert.equal(sum.capped, 5);
  assert.equal(f.trading.at(0).pool.toBase58(), rows[24].pool);
  assert.ok(lines.some((l) => /CLAIM_MAX_PER_RUN=20 reached: 5 left/.test(l)));
  const zero = await runAutoclaim({ q: mockQ(rows).q, conn: fakeConn(accounts), decode, signer: SIGNER, settings: settings({ CLAIM_LIVE: "true", CLAIM_MAX_PER_RUN: "0" }), log: () => {},
    claimerOpts: { dbc: f.dbc, amm: noAmm, conn: offline, simulate: okSim, send: tx.send } });
  assert.equal(zero.claimed, 0); assert.equal(zero.capped, 25);
});

test("one failing pool does not stop the others (builder error, simulation failure, thrown forToken)", async () => {
  const { rows, accounts } = world([{ quote: 30_000_000n }, { quote: 20_000_000n }, { quote: 15_000_000n }, { quote: 12_000_000n }]);
  const f = fakeDbc({ failPool: rows[0].pool }), tx = sender(), lines: string[] = [];
  const sim = async (t: Transaction) => (t === simFail ? { ok: false as const, err: "custom program error" } : { ok: true as const });
  let simFail: Transaction | null = null;
  const dbc = { ...f.dbc, partner: { ...f.dbc.partner, claimPartnerTradingFee: async (p: any) => { const t = await f.dbc.partner.claimPartnerTradingFee(p); if (p.pool.toBase58() === rows[1].pool) simFail = t; return t; } } };
  const sum = await runAutoclaim({ q: mockQ(rows).q, conn: fakeConn(accounts), decode, signer: SIGNER, settings: settings({ CLAIM_LIVE: "true" }), log: (m) => lines.push(m),
    claimerOpts: { dbc, amm: noAmm, conn: offline, simulate: sim as any, send: tx.send } });
  assert.equal(sum.claimed, 2); assert.equal(sum.skipped, 2); assert.equal(tx.sent.length, 2);
  assert.ok(lines.some((l) => /skipped dbc_trading .*boom: Test Coin pool/.test(l)));
  assert.ok(lines.some((l) => /simulation failed: custom program error/.test(l)));
  // a claimer that throws for one token
  let n = 0;
  const thrown = await runAutoclaim({ q: mockQ(rows).q, conn: fakeConn(accounts), decode, signer: SIGNER, settings: settings(), log: (m) => lines.push(m),
    makeClaimer: () => ({ forToken: async (mint: string, pool: string) => { if (n++ === 1) throw new Error("rpc down"); return [{ source: "dbc_trading", pool, mint, lamports: 1n, baseAmount: 0n, status: "would-claim" }]; } }) as any });
  assert.equal(thrown.failed, 1); assert.equal(thrown.wouldClaim, 3);
  assert.ok(lines.some((l) => /ERROR .* rpc down/.test(l)));
});

// ---------- lock ----------
test("advisory lock: a second run (lock taken) does nothing; the lock SQL runs on PGlite", async () => {
  let ran = 0;
  const held = async <R>(fn: (c: Q) => Promise<R>) => fn({ query: async () => ({ rows: [{ ok: false }] }) } as unknown as Q);
  assert.deepEqual(await withAutoclaimLock(held, async () => ++ran), { ran: false });
  assert.equal(ran, 0);
  const { pg, q } = await freshDb();
  try {
    const txFn = async <R>(fn: (c: Q) => Promise<R>) => { await pg.query("BEGIN"); try { const r = await fn(q); await pg.query("COMMIT"); return r; } catch (e) { await pg.query("ROLLBACK"); throw e; } };
    assert.deepEqual(await withAutoclaimLock(txFn, async () => ++ran), { ran: true, value: 1 });
  } finally { await pg.close(); }
});
