import { test } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { Keypair } from "@solana/web3.js";
import { KeyMismatch, newWrapKey, unwrapSecret, wrapSecret } from "./crypto";
import { deviceKey, memoryKeyStore } from "./keystore";

test("key wrap: the device key is non-extractable AES-GCM-256 and cannot be exported", async () => {
  const k = await newWrapKey();
  assert.equal(k.extractable, false);
  assert.equal((k.algorithm as AesKeyAlgorithm).name, "AES-GCM");
  assert.equal((k.algorithm as AesKeyAlgorithm).length, 256);
  await assert.rejects(webcrypto.subtle.exportKey("raw", k as webcrypto.CryptoKey));
  await assert.rejects(webcrypto.subtle.exportKey("jwk", k as webcrypto.CryptoKey));
});

test("key wrap: roundtrip, fresh IV each time, no plaintext in the record", async () => {
  const secret = Keypair.generate().secretKey, k = await newWrapKey();
  const a = await wrapSecret(secret, k), b = await wrapSecret(secret, k);
  assert.equal(a.v, 2); assert.equal(a.alg, "AES-GCM-256");
  assert.notEqual(a.iv, b.iv); assert.notEqual(a.ct, b.ct);
  assert.ok(!JSON.stringify(a).includes(Buffer.from(secret).toString("base64")));
  assert.deepEqual(await unwrapSecret(a, k), secret);
});

test("key wrap: another key or a tampered record fails with KeyMismatch", async () => {
  const k = await newWrapKey(), w = await wrapSecret(Keypair.generate().secretKey, k);
  await assert.rejects(unwrapSecret(w, await newWrapKey()), KeyMismatch);
  const ct = Buffer.from(w.ct, "base64"); ct[0] ^= 1;
  await assert.rejects(unwrapSecret({ ...w, ct: ct.toString("base64") }, k), KeyMismatch);
  await assert.rejects(unwrapSecret({ ...w, v: 1 as 2 }, k));
});

test("key wrap: an extractable key is refused for wrapping and in the key store", async () => {
  const ext = await webcrypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]) as CryptoKey;
  await assert.rejects(wrapSecret(new Uint8Array(64), ext));
  const store = memoryKeyStore(); await store.put(ext);
  await assert.rejects(deviceKey(store, true), /extractable/);
});

test("key store: created once on demand, then reused, and gone after clear", async () => {
  const store = memoryKeyStore();
  assert.equal(await deviceKey(store, false), null);
  const k1 = await deviceKey(store, true), k2 = await deviceKey(store, true);
  assert.ok(k1); assert.equal(k1, k2);
  await store.clear();
  assert.equal(await deviceKey(store, false), null);
});
