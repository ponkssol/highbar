import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair, PublicKey } from "@solana/web3.js";
import { GrindAbortedError, grindVanity, grindVanitySync, hasVanitySuffix, keypairFromSeed, residueMatches, suffixTarget } from "./vanity.js";

test("suffixTarget / residueMatches agree with a full base58 encode", () => {
  for (const suffix of ["h", "hi", "high", "1", "z1"]) {
    const { mod, target } = suffixTarget(suffix);
    for (let i = 0; i < 3000; i++) {
      const pub = Keypair.generate().publicKey.toBytes();
      assert.equal(residueMatches(pub, mod, target), new PublicKey(pub).toBase58().endsWith(suffix), suffix);
    }
  }
  assert.throws(() => suffixTarget("0"), /base58/); assert.throws(() => suffixTarget("l"), /base58/); assert.throws(() => suffixTarget(""));
});

test("grindVanitySync finds a key ending in 'h' and the keypair is consistent", () => {
  const r = grindVanitySync({ suffix: "h", maxAttempts: 100_000 });
  assert.ok(r.keypair); assert.ok(r.keypair.publicKey.toBase58().endsWith("h"));
  assert.ok(Keypair.fromSecretKey(r.keypair.secretKey).publicKey.equals(r.keypair.publicKey));
});

test("grindVanity (worker pool) returns `count` distinct keys ending in 'hi', each delivered to onKey", async () => {
  const seen: string[] = [];
  const r = await grindVanity({ suffix: "hi", count: 3, threads: 2, timeoutMs: 60_000, onKey: (kp) => { seen.push(kp.publicKey.toBase58()); } });
  assert.equal(r.keypairs.length, 3);
  const keys = r.keypairs.map((k) => k.publicKey.toBase58());
  assert.equal(new Set(keys).size, 3);
  for (const k of keys) assert.ok(hasVanitySuffix(k, "hi"), k);
  assert.deepEqual(seen, keys);
  for (const kp of r.keypairs) assert.ok(Keypair.fromSeed(kp.secretKey.slice(0, 32)).publicKey.equals(kp.publicKey));
  assert.ok(r.attempts > 0 && r.keysPerSec > 0);
});

test("grindVanity honours AbortSignal and timeout", async () => {
  const ac = new AbortController(); setTimeout(() => ac.abort(), 200);
  await assert.rejects(grindVanity({ suffix: "zzzzzz", threads: 1, signal: ac.signal }), (e) => e instanceof GrindAbortedError && e.reason === "aborted");
  await assert.rejects(grindVanity({ suffix: "zzzzzz", threads: 1, timeoutMs: 200 }), (e) => e instanceof GrindAbortedError && e.reason === "timeout");
  const pre = new AbortController(); pre.abort();
  await assert.rejects(grindVanity({ suffix: "h", threads: 1, signal: pre.signal }), GrindAbortedError);
});

test("keypairFromSeed refuses a seed that does not match the expected pubkey", () => {
  const kp = Keypair.generate();
  assert.throws(() => keypairFromSeed(kp.secretKey.slice(0, 32), Keypair.generate().publicKey.toBase58()));
  assert.ok(keypairFromSeed(kp.secretKey.slice(0, 32), kp.publicKey.toBase58()).publicKey.equals(kp.publicKey));
});

// One real "...high" address: ~11.3M attempts (~70-100 s on a 6-12 thread desktop), so opt-in only.
test("grindVanity finds a real '...high' address (VANITY_REAL_TEST=1)", { skip: process.env.VANITY_REAL_TEST !== "1" }, async () => {
  const r = await grindVanity({ count: 1, timeoutMs: 15 * 60_000 });
  assert.ok(r.keypairs[0].publicKey.toBase58().endsWith("high"));
});
