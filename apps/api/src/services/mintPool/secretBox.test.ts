import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { Keypair } from "@solana/web3.js";
import { encKeyProblem, openSeed, parseEncKey, sealSeed } from "./secretBox.js";

const key = crypto.randomBytes(32);
const kp = Keypair.generate(), pub = kp.publicKey.toBase58(), seed = kp.secretKey.slice(0, 32);

test("seal/open roundtrip rebuilds the same keypair; format is versioned and never contains the seed", () => {
  const s = sealSeed(seed, pub, key);
  assert.match(s, /^v1\.[\w-]{16}\.[\w-]{22}\.[\w-]{43}$/);
  assert.ok(!s.includes(Buffer.from(seed).toString("base64url")) && !s.includes(Buffer.from(seed).toString("hex")));
  assert.notEqual(sealSeed(seed, pub, key), s, "fresh iv per seal");
  const back = openSeed(s, pub, key);
  assert.ok(Keypair.fromSeed(back).publicKey.equals(kp.publicKey));
});

test("open fails on tampering, a wrong key, another row's pubkey or an unknown version (generic error)", () => {
  const s = sealSeed(seed, pub, key);
  const [v, iv, tag, ct] = s.split(".");
  const flip = (b64: string) => { const b = Buffer.from(b64, "base64url"); b[0] ^= 1; return b.toString("base64url"); };
  for (const bad of [[v, iv, tag, flip(ct)], [v, iv, flip(tag), ct], [v, flip(iv), tag, ct]].map((p) => p.join(".")))
    assert.throws(() => openSeed(bad, pub, key), /decryption failed/);
  assert.throws(() => openSeed(s, pub, crypto.randomBytes(32)), /decryption failed/);
  assert.throws(() => openSeed(s, Keypair.generate().publicKey.toBase58(), key), /decryption failed/);
  assert.throws(() => openSeed(["v2", iv, tag, ct].join("."), pub, key), /unsupported format/);
  try { openSeed([v, iv, tag, flip(ct)].join("."), pub, key); } catch (e) { assert.ok(!(e as Error).message.includes(ct)); }
});

test("MINT_POOL_ENC_KEY parsing: 64 hex or base64 of 32 bytes; errors never echo the value", () => {
  assert.equal(parseEncKey(undefined), null); assert.equal(parseEncKey("  "), null);
  assert.deepEqual(parseEncKey(key.toString("hex")), key);
  assert.deepEqual(parseEncKey(key.toString("base64")), key);
  assert.deepEqual(parseEncKey(key.toString("base64url")), key);
  for (const bad of ["xyz", "ab".repeat(31), crypto.randomBytes(31).toString("base64"), crypto.randomBytes(48).toString("base64")]) {
    assert.throws(() => parseEncKey(bad), (e) => /32 bytes/.test((e as Error).message) && !(e as Error).message.includes(bad));
    assert.ok(encKeyProblem(bad));
  }
  assert.match(encKeyProblem("<FILL_ME>")!, /FILL_ME/);
  assert.equal(encKeyProblem(key.toString("hex")), null);
});
