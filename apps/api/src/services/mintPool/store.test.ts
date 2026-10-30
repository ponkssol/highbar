/** mint_pool against a real (in-process, WASM) Postgres: PGlite runs migration 0010 verbatim (CHECKs, trigger, SKIP LOCKED).
 *  PGlite is single-connection, so "concurrent" calls are interleaved by the event loop and executed one statement at a time:
 *  this proves every hand-out is a single guarded statement (no read-then-write race in our code); true multi-session row
 *  locking is Postgres' FOR UPDATE SKIP LOCKED itself. Never touches DATABASE_URL. */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { Keypair, Transaction } from "@solana/web3.js";
import * as store from "./store.js";
import { confirmMint, MintPoolError, reserveMint, resolveLaunchMint, signLaunchTx, storeKeypair, sweepExpired } from "./index.js";
import { LaunchTxRejected } from "./validateLaunchTx.js";
import { buildLaunch, walletSign } from "./testTx.js";
import type { Sql } from "./store.js";

const MIGRATION = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../db/migrations/0010_mint_pool.sql");
const fakePub = (i: number) => `T${String(i).padStart(6, "0")}${"x".repeat(29)}high`; // fake ids, never real keys
const creatorA = Keypair.generate().publicKey.toBase58(), creatorB = Keypair.generate().publicKey.toBase58();

async function freshDb(rows = 0): Promise<Sql & { pg: PGlite }> {
  const pg = new PGlite();
  await pg.exec(fs.readFileSync(MIGRATION, "utf8"));
  for (let i = 0; i < rows; i++) await pg.query("INSERT INTO mint_pool (pubkey, secret_enc) VALUES ($1, 'v1.x.y.z')", [fakePub(i)]);
  return { pg, query: (t, p) => pg.query(t, p as unknown[]) as Promise<{ rows: any[] }> };
}
const expire = (q: Sql, pub: string) => q.query("UPDATE mint_pool SET reservation_expires_at = now() - interval '1 minute' WHERE pubkey = $1", [pub]);

before(() => { process.env.MINT_POOL_MAX_PER_CREATOR = "1000"; });

test("migration 0010: constraints (suffix, status, used is final) and idempotent re-run", async () => {
  const q = await freshDb(1);
  await assert.rejects(q.query("INSERT INTO mint_pool (pubkey, secret_enc) VALUES ('abcHIGH', 's')"));
  await assert.rejects(q.query("UPDATE mint_pool SET status = 'bogus'"));
  await assert.rejects(q.query("UPDATE mint_pool SET status = 'reserved'"), "reserved needs reserved_by / expiry");
  assert.ok(await store.markUsed(q, fakePub(0)));
  await assert.rejects(q.query("UPDATE mint_pool SET status = 'available' WHERE pubkey = $1", [fakePub(0)]), /never be reused/);
  await q.pg.exec(fs.readFileSync(MIGRATION, "utf8"));
});

test("100 concurrent reservations over 50 mints: 50 distinct mints, 50 empty, never a duplicate", async () => {
  const q = await freshDb(50);
  const creators = Array.from({ length: 100 }, () => Keypair.generate().publicKey.toBase58());
  const got = await Promise.all(creators.map((c) => store.reserveFresh(q, c, 10)));
  const mints = got.filter(Boolean).map((r) => r!.mint);
  assert.equal(mints.length, 50); assert.equal(new Set(mints).size, 50);
  assert.equal(got.filter((r) => r === null).length, 50);
  assert.deepEqual(await store.poolCounts(q), { available: 0, reserved: 50, used: 0 });
  await assert.rejects(reserveMint(q, creatorA), (e) => e instanceof MintPoolError && e.code === "MINT_POOL_EMPTY" && e.status === 503);
});

test("a creator's unsigned live reservation is reused; signed or expired ones are not", async () => {
  const q = await freshDb(5);
  const a1 = await reserveMint(q, creatorA), a2 = await reserveMint(q, creatorA);
  assert.equal(a2.mint, a1.mint);
  const b1 = await reserveMint(q, creatorB);
  assert.notEqual(b1.mint, a1.mint);
  assert.ok(await store.claimForSigning(q, a1.mint, creatorA, 5));
  const a3 = await reserveMint(q, creatorA);
  assert.notEqual(a3.mint, a1.mint, "after signing the creator gets a new mint");
  assert.equal(await store.claimForSigning(q, a3.mint, creatorB, 5), null, "only the reserving creator can claim");
  await expire(q, a3.mint);
  assert.equal(await store.claimForSigning(q, a3.mint, creatorA, 5), null, "expired reservations cannot be claimed");
});

test("per-creator reservation cap", async () => {
  const q = await freshDb(10);
  process.env.MINT_POOL_MAX_PER_CREATOR = "2";
  try {
    for (let i = 0; i < 2; i++) { const r = await reserveMint(q, creatorA); await store.claimForSigning(q, r.mint, creatorA, 5); }
    await assert.rejects(reserveMint(q, creatorA), (e) => e instanceof MintPoolError && e.code === "TOO_MANY_RESERVATIONS");
  } finally { process.env.MINT_POOL_MAX_PER_CREATOR = "1000"; }
});

test("sweep: expired + absent on-chain -> available; expired + on-chain -> used; RPC error -> untouched; live -> untouched", async () => {
  const q = await freshDb(4);
  const [r0, r1, r2, r3] = await Promise.all([0, 1, 2, 3].map(() => store.reserveFresh(q, creatorA, 10)));
  for (const r of [r0, r1, r2]) await expire(q, r!.mint);
  await assert.rejects(sweepExpired(q, async () => { throw new Error("rpc down"); }));
  assert.equal((await store.poolCounts(q)).reserved, 4, "nothing changes when the RPC fails");
  const onChain = new Set([r1!.mint]);
  const res = await sweepExpired(q, async (keys) => keys.map((k) => onChain.has(k)));
  assert.deepEqual(res, { freed: 2, used: 1 });
  assert.equal((await store.getReservation(q, r1!.mint))!.status, "used");
  assert.equal((await store.getReservation(q, r0!.mint))!.status, "available");
  assert.equal((await store.getReservation(q, r3!.mint))!.status, "reserved");
  // a used mint is never handed out again
  const again = await Promise.all([0, 1, 2].map(() => store.reserveFresh(q, creatorB, 10)));
  assert.ok(!again.some((r) => r?.mint === r1!.mint));
  assert.ok(await confirmMint(q, r3!.mint, async () => [true]));
  assert.equal((await store.getReservation(q, r3!.mint))!.status, "used");
});

test("signing extends a reservation past blockhash lifetime, so the sweeper cannot free a mint whose tx may still land", async () => {
  const q = await freshDb(1);
  const r = await store.reserveFresh(q, creatorA, 1);
  await q.query("UPDATE mint_pool SET reservation_expires_at = now() + interval '5 seconds' WHERE pubkey = $1", [r!.mint]);
  assert.ok(await store.claimForSigning(q, r!.mint, creatorA, 5));
  const row = (await q.query("SELECT reservation_expires_at > now() + interval '4 minutes' AS ok, signed_at IS NOT NULL AS s FROM mint_pool")).rows[0];
  assert.ok(row.ok && row.s);
  assert.deepEqual(await store.expiredReservations(q), []);
});

test("end to end: stored encrypted mint -> reserve -> wallet signs -> API co-signs after validation -> fully signed", async () => {
  const q = await freshDb(0), key = crypto.randomBytes(32);
  const creator = Keypair.generate(), config = Keypair.generate().publicKey;
  // grinding a real '...high' key takes minutes, so this throwaway db drops the suffix CHECK and stores a random keypair
  await q.query("ALTER TABLE mint_pool DROP CONSTRAINT mint_pool_pubkey_check");
  const mintKp = Keypair.generate();
  const pub = mintKp.publicKey.toBase58();
  const { sealSeed } = await import("./secretBox.js");
  await store.insertMint(q, pub, sealSeed(mintKp.secretKey.slice(0, 32), pub, key));
  await assert.rejects(storeKeypair(q, Keypair.generate(), key), /non-vanity/);
  const r = await store.reserveFresh(q, creator.publicKey.toBase58(), 10);
  assert.equal(r!.mint, pub);
  const opts = { configs: [config.toBase58()], referrals: [], key };
  // tampered tx: refused, secret never claimed
  const bad = await buildLaunch({ mint: mintKp.publicKey, creator, config: Keypair.generate().publicKey });
  await assert.rejects(signLaunchTx(q, pub, walletSign(bad, creator), opts), LaunchTxRejected);
  assert.equal((await store.getReservation(q, pub))!.signed, false);
  // good tx
  const tx = await buildLaunch({ mint: mintKp.publicKey, creator, config, devBuyLamports: 1e8 });
  const out = await signLaunchTx(q, pub, walletSign(tx, creator), opts);
  const full = Transaction.from(Buffer.from(out.tx, "base64"));
  assert.ok(full.verifySignatures(true));
  assert.equal(full.signatures.length, 2);
  assert.ok(!JSON.stringify(out).includes(Buffer.from(mintKp.secretKey).toString("base64")));
  assert.equal((await store.getReservation(q, pub))!.signed, true);
  // the wrong key cannot open it
  const r2 = await store.getReservation(q, pub);
  assert.equal(r2!.status, "reserved");
  await assert.rejects(signLaunchTx(q, pub, walletSign(await buildLaunch({ mint: mintKp.publicKey, creator, config }), creator), { ...opts, key: crypto.randomBytes(32) }), /decryption failed/);
});

// ---- VANITY_MINTS modes (services/mintPool/mode.ts) ----
test("VANITY_MINTS: fallback + empty pool -> random-fallback (logged); on -> 503; off never touches the pool", async () => {
  const empty = await freshDb(0);
  const logs: string[] = [];
  const fb = await resolveLaunchMint(empty, creatorA, undefined, { mode: "fallback", keyOk: true, log: (m) => logs.push(m) });
  assert.deepEqual(fb, { source: "random-fallback", reason: "pool empty" });
  assert.equal(logs.length, 1);
  assert.ok(logs[0].startsWith(`[mint-pool] pool empty -> fallback random mint for creator ${creatorA}`));
  assert.ok(!/v1\.|secret|postgres/i.test(logs[0]));
  // fallback when the key is missing (pool unusable) or the table is missing: random, flagged
  const one = await freshDb(1);
  assert.equal((await resolveLaunchMint(one, creatorA, undefined, { mode: "fallback", keyOk: false, log: () => {} })).source, "random-fallback");
  assert.equal((await store.poolCounts(one)).available, 1, "no key: the pool is not touched");
  const noTable: Sql = { query: async () => { throw new Error('relation "mint_pool" does not exist'); } };
  assert.deepEqual(await resolveLaunchMint(noTable, creatorA, undefined, { mode: "fallback", keyOk: true, log: () => {} }), { source: "random-fallback", reason: "pool unavailable" });
  // fallback with mints available -> pool
  const r = await resolveLaunchMint(one, creatorB, undefined, { mode: "fallback", keyOk: true, log: () => {} });
  assert.deepEqual(r, { source: "pool", mint: fakePub(0) });
  // on: an empty pool is a clear 503, never a random mint
  await assert.rejects(resolveLaunchMint(empty, creatorA, undefined, { mode: "on", keyOk: true }), (e) => e instanceof MintPoolError && e.code === "MINT_POOL_EMPTY" && e.status === 503);
  // off: the pool is never queried
  const boom: Sql = { query: async () => { throw new Error("off must not touch the pool"); } };
  assert.deepEqual(await resolveLaunchMint(boom, creatorA, undefined, { mode: "off", keyOk: true }), { source: "random", reason: "VANITY_MINTS=off" });
  // per-wallet errors are never turned into a random mint
  process.env.MINT_POOL_MAX_PER_CREATOR = "1";
  try {
    const two = await freshDb(2);
    await resolveLaunchMint(two, creatorA, undefined, { mode: "fallback", keyOk: true });
    await two.query("UPDATE mint_pool SET signed_at = now() WHERE reserved_by = $1", [creatorA]); // signed: not reusable
    await assert.rejects(resolveLaunchMint(two, creatorA, undefined, { mode: "fallback", keyOk: true, log: () => {} }), (e) => e instanceof MintPoolError && e.code === "TOO_MANY_RESERVATIONS");
  } finally { process.env.MINT_POOL_MAX_PER_CREATOR = "1000"; }
});
