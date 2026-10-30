/** GET /tokens/:mint/pending: PGlite (migration 0001 verbatim, never DATABASE_URL) + a fake RPC (no network). */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import { PGlite } from "@electric-sql/pglite";
import { Keypair, PublicKey } from "@solana/web3.js";
import { deriveDbcPoolAddress } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { candidatePools, DBC_PROGRAM_ID, matchPool, PendingLookup, pendingConfig, tokenExistsSql, WSOL_MINT, type AccountLite, type FoundPool, type PendingDeps } from "./pending.js";
import { FastIndexer, fastIndexConfig, type FastResult } from "./fastIndex.js";
import { registerPending } from "../routes/pending.js";

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../db/migrations/0001_app_store.sql");
const key = () => Keypair.generate().publicKey.toBase58();
const CONFIGS = [{ address: key() }, { address: key() }, { address: key() }];
const tick = () => new Promise((r) => setImmediate(r));

async function pglite() {
  const pg = new PGlite();
  await pg.exec(fs.readFileSync(MIGRATION, "utf8"));
  return pg;
}
async function insertToken(pg: PGlite, mint: string, pool: string) {
  await pg.query(`INSERT INTO tokens (mint,pool,config,tier,creator,created_at,name,symbol,uri,updated_at) VALUES ($1,$2,$3,'standard',$4,1,'Test Coin','TEST','',1)`, [mint, pool, CONFIGS[0].address, key()]);
}

/** Fake RPC: `onChain` = pools that exist (owner DBC unless given); records every getMultipleAccounts call. */
function fakeRpc(onChain: Map<string, PublicKey> = new Map()) {
  const calls: string[][] = [];
  let fail = false;
  const getMultipleAccounts = async (keys: PublicKey[]): Promise<(AccountLite | null)[]> => {
    calls.push(keys.map((k) => k.toBase58()));
    if (fail) throw new Error("rpc down");
    return keys.map((k) => { const owner = onChain.get(k.toBase58()); return owner ? { owner, data: new Uint8Array(424) } : null; });
  };
  return { calls, getMultipleAccounts, setFail: (v: boolean) => { fail = v; } };
}

function setup(o: { pg: PGlite; onChain?: Map<string, PublicKey>; cfg?: Partial<ReturnType<typeof pendingConfig>>; now?: () => number }) {
  const rpc = fakeRpc(o.onChain);
  const kicks: { mint: string; found: FoundPool }[] = [];
  const deps: PendingDeps = { tokenExists: tokenExistsSql(o.pg), configs: () => CONFIGS, getMultipleAccounts: rpc.getMultipleAccounts, kick: (mint, found) => { kicks.push({ mint, found }); } };
  const lk = new PendingLookup({ ...pendingConfig({}), ...o.cfg }, deps, o.now);
  return { lk, rpc, kicks };
}
const poolOf = (mint: string, config: string) => deriveDbcPoolAddress(WSOL_MINT, new PublicKey(mint), new PublicKey(config)).toBase58();

test("pendingConfig: unknown 10 s, pending 5 s, 20 RPC lookups per IP and 120 overall per minute; env overrides, bad values fall back", () => {
  assert.deepEqual(pendingConfig({}), { unknownTtlMs: 10_000, pendingTtlMs: 5000, perIpPerMin: 20, globalPerMin: 120, memory: 10_000 });
  const c = pendingConfig({ PENDING_RPC_PER_IP_PER_MIN: "3", PENDING_RPC_PER_MIN: "50", PENDING_TTL_MS: "x", PENDING_UNKNOWN_TTL_MS: "5" });
  assert.equal(c.perIpPerMin, 3); assert.equal(c.globalPerMin, 50); assert.equal(c.pendingTtlMs, 5000); assert.equal(c.unknownTtlMs, 10_000);
});

test("candidatePools: one (config, mint, WSOL) PDA per distinct config; matchPool needs an account owned by the DBC program", () => {
  const mint = key();
  const c = candidatePools(mint, [...CONFIGS, CONFIGS[0]]);
  assert.deepEqual(c, CONFIGS.map((x) => ({ pool: poolOf(mint, x.address), config: x.address })));
  const acc = (owner: PublicKey): AccountLite => ({ owner, data: new Uint8Array(424) });
  assert.deepEqual(matchPool(c, [null, acc(DBC_PROGRAM_ID), null]), c[1]);
  assert.equal(matchPool(c, [acc(new PublicKey(key())), null, null]), null, "foreign owner");
  assert.equal(matchPool(c, [{ owner: DBC_PROGRAM_ID, data: new Uint8Array(0) }, null, null]), null, "empty account");
  assert.equal(matchPool(c, [null, null, null]), null);
});

test("indexed: a db row (by mint or pool) answers without any RPC", async () => {
  const pg = await pglite();
  const mint = key(), pool = key();
  await insertToken(pg, mint, pool);
  const { lk, rpc, kicks } = setup({ pg });
  assert.deepEqual(await lk.lookup(mint, "1.1.1.1"), { status: "indexed" });
  assert.deepEqual(await lk.lookup(pool, "1.1.1.1"), { status: "indexed" });
  assert.equal(rpc.calls.length, 0); assert.equal(kicks.length, 0);
});

test("pending: ONE getMultipleAccounts over every tier config's PDA, kicks the fast index of that pool, cached briefly, then indexed once the row lands", async () => {
  const pg = await pglite();
  const mint = key(), pool = poolOf(mint, CONFIGS[1].address);
  let now = 1_000_000;
  const { lk, rpc, kicks } = setup({ pg, onChain: new Map([[pool, DBC_PROGRAM_ID]]), now: () => now });
  const r = await lk.lookup(mint, "1.1.1.1");
  assert.deepEqual(r, { status: "pending", pool });
  assert.equal(rpc.calls.length, 1);
  assert.deepEqual(rpc.calls[0], CONFIGS.map((c) => poolOf(mint, c.address)), "one batched call, one key per config, no tx history");
  assert.deepEqual(kicks, [{ mint, found: { pool, config: CONFIGS[1].address } }]);
  now += 4999;
  assert.deepEqual(await lk.lookup(mint, "2.2.2.2"), { status: "pending", pool });
  assert.equal(rpc.calls.length, 1, "cached for PENDING_TTL_MS");
  now += 2;
  assert.equal((await lk.lookup(mint, "2.2.2.2")).status, "pending");
  assert.equal(rpc.calls.length, 2, "re-checked after the TTL");
  await insertToken(pg, mint, pool);
  assert.deepEqual(await lk.lookup(mint, "2.2.2.2"), { status: "indexed" }, "the db wins over the cache");
  assert.equal(rpc.calls.length, 2);
  assert.ok(!("name" in r) && !("symbol" in r) && !("uri" in r), "nothing but status and pool");
});

test("unknown: no pool of ours (none, or owned by another program) is cached for 10 s; an RPC error is not cached", async () => {
  const pg = await pglite();
  const ghost = key(), foreign = key();
  let now = 0;
  const { lk, rpc, kicks } = setup({ pg, onChain: new Map([[poolOf(foreign, CONFIGS[0].address), new PublicKey(key())]]), now: () => now });
  assert.deepEqual(await lk.lookup(ghost, "1.1.1.1"), { status: "unknown" });
  assert.deepEqual(await lk.lookup(foreign, "1.1.1.1"), { status: "unknown" });
  assert.equal(rpc.calls.length, 2);
  now = 9999;
  assert.equal((await lk.lookup(ghost, "1.1.1.1")).status, "unknown");
  assert.equal(rpc.calls.length, 2, "cached");
  now = 10_000;
  rpc.setFail(true);
  assert.deepEqual(await lk.lookup(ghost, "1.1.1.1"), { status: "error" });
  rpc.setFail(false);
  assert.equal((await lk.lookup(ghost, "1.1.1.1")).status, "unknown");
  assert.equal(rpc.calls.length, 4, "the error was not cached");
  assert.equal(kicks.length, 0);
});

test("concurrent lookups of one mint share one RPC call", async () => {
  const pg = await pglite();
  const mint = key();
  const { lk, rpc } = setup({ pg });
  const all = await Promise.all([1, 2, 3, 4, 5].map((i) => lk.lookup(mint, `10.0.0.${i}`)));
  assert.ok(all.every((r) => r.status === "unknown"));
  assert.equal(rpc.calls.length, 1);
});

test("rate limits: per IP and global per minute, counted only for lookups that reach the RPC; null IP (web server) only the global cap", async () => {
  const pg = await pglite();
  let now = 0;
  const { lk, rpc } = setup({ pg, cfg: { perIpPerMin: 2, globalPerMin: 4 }, now: () => now });
  const a = [key(), key(), key()];
  assert.equal((await lk.lookup(a[0], "1.1.1.1")).status, "unknown");
  assert.equal((await lk.lookup(a[1], "1.1.1.1")).status, "unknown");
  const limited = await lk.lookup(a[2], "1.1.1.1");
  assert.equal(limited.status, "rate_limited");
  assert.ok(limited.status === "rate_limited" && limited.retryAfterMs > 0 && limited.retryAfterMs <= 60_000);
  assert.equal((await lk.lookup(a[0], "1.1.1.1")).status, "unknown", "a cache hit is free");
  assert.equal(rpc.calls.length, 2);
  assert.equal((await lk.lookup(a[2], null)).status, "unknown");
  assert.equal((await lk.lookup(key(), "3.3.3.3")).status, "unknown");
  assert.equal((await lk.lookup(key(), null)).status, "rate_limited", "global cap");
  assert.equal((await lk.lookup(key(), "4.4.4.4")).status, "rate_limited", "global cap for every IP");
  assert.equal(rpc.calls.length, 4);
  now = 60_000;
  assert.equal((await lk.lookup(key(), "1.1.1.1")).status, "unknown", "next window");
});

test("fast index mint-only path: `found` makes a request eligible and reaches run; dedupe per mint and the FAST_INDEX caps still apply", async () => {
  const runs: { mint: string; sig?: string; found?: FoundPool }[] = [];
  const f = new FastIndexer({ ...fastIndexConfig({}), perMin: 1 }, {
    tokenExists: async () => false,
    run: async (mint, sig, found): Promise<FastResult> => { runs.push({ mint, sig, found }); return { status: "indexed" }; },
  });
  const m1 = key(), m2 = key(), found = { pool: key(), config: CONFIGS[0].address };
  assert.equal((await f.request(m1)).status, "ineligible");
  assert.equal((await f.request(m1, { found })).status, "indexed");
  assert.deepEqual(runs, [{ mint: m1, sig: undefined, found }]);
  assert.equal((await f.request(m1, { found })).status, "duplicate");
  assert.equal((await f.request(m2, { found })).status, "rate_limited");
  assert.equal(runs.length, 1);
});

test("route: 400 on a bad address, the status json (no-store), 429 with retry-after, 503 on errors; the fast index is kicked once", async () => {
  const pg = await pglite();
  const mint = key(), pool = poolOf(mint, CONFIGS[2].address);
  const { lk, kicks, rpc } = setup({ pg, onChain: new Map([[pool, DBC_PROGRAM_ID]]), cfg: { perIpPerMin: 3 } });
  const app = Fastify();
  registerPending(app, { lookup: lk });
  const bad = await app.inject({ method: "GET", url: "/tokens/not-an-address/pending" });
  assert.equal(bad.statusCode, 400);
  const r = await app.inject({ method: "GET", url: `/tokens/${mint}/pending` });
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.json(), { status: "pending", pool });
  assert.equal(r.headers["cache-control"], "no-store");
  const u = await app.inject({ method: "GET", url: `/tokens/${key()}/pending` });
  assert.deepEqual(u.json(), { status: "unknown" });
  rpc.setFail(true);
  const e = await app.inject({ method: "GET", url: `/tokens/${key()}/pending` });
  assert.equal(e.statusCode, 503); assert.deepEqual(e.json(), { status: "error" });
  const l = await app.inject({ method: "GET", url: `/tokens/${key()}/pending` });
  assert.equal(l.statusCode, 429); assert.ok(Number(l.headers["retry-after"]) >= 1);
  await insertToken(pg, mint, pool);
  assert.deepEqual((await app.inject({ method: "GET", url: `/tokens/${mint}/pending` })).json(), { status: "indexed" });
  await tick();
  assert.equal(kicks.length, 1);
});
