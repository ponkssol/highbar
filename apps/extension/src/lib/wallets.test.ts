import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { encryptSecret, KeyMismatch, wrapSecret, WrongPassword } from "./crypto";
import { deviceKey, memoryKeyStore } from "./keystore";
import { encodeSecret } from "./keys";
import { cleanWalletLabel, nextWalletLabel, readReferrals } from "./wallets";

// The background wallet module, run against an in-memory chrome.storage.local and key store
const mem = new Map<string, unknown>();
const keysOf = (k: string | string[]) => (Array.isArray(k) ? k : [k]);
(globalThis as { chrome?: unknown }).chrome = { storage: { local: {
  get: async (k: string | string[]) => Object.fromEntries(keysOf(k).filter((x) => mem.has(x)).map((x) => [x, structuredClone(mem.get(x))])),
  set: async (o: Record<string, unknown>) => { for (const [k, v] of Object.entries(o)) mem.set(k, structuredClone(v)); },
  remove: async (k: string | string[]) => { for (const x of keysOf(k)) mem.delete(x); },
} } };
const W = await import("../background/wallet");

const fresh = () => { mem.clear(); const store = memoryKeyStore(); W.useKeyStore(store); return store; };
const keyInput = (kp: Keypair) => JSON.stringify(Array.from(kp.secretKey));
const signs = (kp: Keypair, pub: string) => { const m = new TextEncoder().encode("Test Coin sign-in"); return nacl.sign.detached.verify(m, nacl.sign.detached(m, kp.secretKey), bs58.decode(pub)); };

test("labels: cleaned, 1 to 24 characters, next free Wallet N", () => {
  assert.equal(cleanWalletLabel("  Main \n  launch  "), "Main launch");
  assert.equal(cleanWalletLabel(""), null); assert.equal(cleanWalletLabel("   "), null);
  assert.equal(cleanWalletLabel("x".repeat(25)), null); assert.equal(cleanWalletLabel(42), null);
  assert.equal(nextWalletLabel([]), "Wallet 1");
  assert.equal(nextWalletLabel(["Wallet 1"]), "Wallet 2");
  assert.equal(nextWalletLabel(["Wallet 1", "wallet 3", "Snipes"]), "Wallet 4");
});

test("referrals: the old single record becomes a map per address, junk is dropped", () => {
  assert.deepEqual(readReferrals({ address: "A1", referrer: "R1", at: 5 }), { A1: { referrer: "R1", at: 5 } });
  assert.deepEqual(readReferrals({ A1: { referrer: "R1", at: 5 }, B2: { nope: 1 }, C3: "x" }), { A1: { referrer: "R1", at: 5 } });
  assert.deepEqual(readReferrals(null), {});
});

test("wallet: create needs no password, signs right away, export works, removing the last one wipes the device key", async () => {
  const store = fresh();
  const { id, address, mnemonic } = await W.create(12);
  assert.equal(mnemonic.split(" ").length, 12);
  const raw = JSON.stringify(mem.get("hb.wallets"));
  assert.ok(!raw.includes(mnemonic.split(" ")[0] + " "));
  const [w] = await W.list();
  assert.equal(w.label, "Wallet 1"); assert.equal(w.active, true); assert.equal(w.needsMigration, false);
  assert.ok(!("sealed" in w) && !("vault" in w)); // the list given to pages has no key material, not even ciphertext
  W.useKeyStore(store); // drops the opened keypairs, as after a worker restart
  assert.equal((await W.keypair()).publicKey.toBase58(), address);
  assert.equal((await W.exportSecret(id)).mnemonic, mnemonic);
  await W.remove(id);
  assert.deepEqual(await W.list(), []);
  assert.equal(await store.get(), undefined);
});

test("wallet list: add several, labels count up, the new one is active, duplicates are refused", async () => {
  fresh();
  const a = Keypair.generate(), b = Keypair.generate();
  const wa = await W.importWallet(keyInput(a));
  const wb = await W.importWallet(keyInput(b), "Snipes");
  const wc = await W.create(24);
  const l = await W.list();
  assert.deepEqual(l.map((w) => w.label), ["Wallet 1", "Snipes", "Wallet 3"]);
  assert.equal(l.find((w) => w.active)?.id, wc.id);
  await assert.rejects(W.importWallet(keyInput(a)), /already added as Wallet 1/);
  await assert.rejects(W.importWallet(keyInput(Keypair.generate()), "   "), /1 to 24/);
  assert.equal(wa.address, a.publicKey.toBase58()); assert.equal(wb.address, b.publicKey.toBase58());
});

test("wallet list: switch, rename, and each wallet signs with its own key", async () => {
  const store = fresh();
  const a = Keypair.generate(), b = Keypair.generate();
  const wa = await W.importWallet(keyInput(a)), wb = await W.importWallet(keyInput(b));
  await W.setActive(wa.id);
  assert.equal((await W.active())?.id, wa.id);
  W.useKeyStore(store);
  // no ref: the active wallet. A ref (id or address): exactly that wallet, whatever is active
  assert.equal((await W.keypair()).publicKey.toBase58(), wa.address);
  const kb = await W.keypair(wb.id);
  assert.equal(kb.publicKey.toBase58(), wb.address);
  assert.ok(signs(kb, wb.address)); assert.ok(!signs(kb, wa.address));
  assert.equal((await W.keypair(wb.address)).publicKey.toBase58(), wb.address);
  await assert.rejects(W.keypair("w_missing"), W.UnknownWallet);
  await assert.rejects(W.setActive("w_missing"), W.UnknownWallet);
  await W.rename(wb.id, "  Launch B ");
  assert.equal((await W.find(wb.id))?.label, "Launch B");
  await assert.rejects(W.rename(wb.id, ""), /1 to 24/);
  assert.equal((await W.active())?.id, wa.id); // renaming does not switch
});

test("wallet list: removing the active wallet moves active to the next, others keep working", async () => {
  const store = fresh();
  const a = Keypair.generate(), b = Keypair.generate(), c = Keypair.generate();
  const wa = await W.importWallet(keyInput(a)), wb = await W.importWallet(keyInput(b)), wc = await W.importWallet(keyInput(c));
  await W.setActive(wb.id);
  await W.remove(wb.id);
  const l = await W.list();
  assert.deepEqual(l.map((w) => w.id), [wa.id, wc.id]);
  assert.equal(l.find((w) => w.active)?.id, wa.id);
  assert.ok(await store.get(), "the device key stays while wallets are left");
  W.useKeyStore(store);
  assert.equal((await W.keypair(wc.id)).publicKey.toBase58(), wc.address);
  await assert.rejects(W.exportSecret(wb.id), W.UnknownWallet);
});

test("migration: a single sealed wallet (hb.vault v2) becomes Wallet 1 with the same key, once", async () => {
  const store = fresh();
  const kp = Keypair.generate();
  const key = (await deviceKey(store, true))!;
  const sealed = await wrapSecret(encodeSecret({ kind: "key", secretKey: bs58.encode(kp.secretKey) }), key);
  mem.set("hb.vault", { sealed, address: kp.publicKey.toBase58(), kind: "key", createdAt: 1_793_000_000_000 });
  const l = await W.list();
  assert.equal(l.length, 1);
  assert.deepEqual({ label: l[0].label, address: l[0].address, active: l[0].active, createdAt: l[0].createdAt, needsMigration: l[0].needsMigration },
    { label: "Wallet 1", address: kp.publicKey.toBase58(), active: true, createdAt: 1_793_000_000_000, needsMigration: false });
  assert.equal(mem.has("hb.vault"), false);
  assert.ok(signs(await W.keypair(), kp.publicKey.toBase58()));
  // a second read (or a leftover old entry after a crash) does not add it twice
  mem.set("hb.vault", { sealed, address: kp.publicKey.toBase58(), kind: "key", createdAt: 1 });
  assert.equal((await W.list()).length, 1);
  assert.equal(mem.has("hb.vault"), false);
  // then more wallets can be added next to it
  const w2 = await W.importWallet(keyInput(Keypair.generate()));
  assert.deepEqual((await W.list()).map((w) => w.label), ["Wallet 1", "Wallet 2"]);
  assert.equal((await W.active())?.id, w2.id);
});

test("migration: a password vault (v1) lands in the list and is opened once with the old password", async () => {
  const store = fresh();
  const kp = Keypair.generate(), secret = { kind: "key" as const, secretKey: bs58.encode(kp.secretKey) };
  const vault = await encryptSecret(encodeSecret(secret), "old password 1", 100_000);
  mem.set("hb.vault", { vault, address: kp.publicKey.toBase58(), kind: "key", createdAt: 1_793_000_000_000 });
  const [w] = await W.list();
  assert.equal(w.label, "Wallet 1"); assert.equal(w.needsMigration, true);
  await assert.rejects(W.keypair(), W.NeedsMigration);
  // a new wallet can be added meanwhile, the old one keeps waiting for its password
  const other = await W.importWallet(keyInput(Keypair.generate()));
  assert.equal((await W.find(w.id))?.needsMigration, true);
  await assert.rejects(W.migrate(w.id, "wrong password"), WrongPassword);
  assert.deepEqual(await W.migrate(w.id, "old password 1"), { id: w.id, address: kp.publicKey.toBase58() });
  W.useKeyStore(store);
  assert.equal((await W.keypair(w.id)).publicKey.toBase58(), kp.publicKey.toBase58());
  assert.equal((await W.find(w.id))?.needsMigration, false);
  assert.equal((await W.find(w.id))?.createdAt, 1_793_000_000_000);
  await assert.rejects(W.migrate(w.id, "old password 1"), /Nothing to update/);
  await assert.rejects(W.migrate(other.id, "x"), /Nothing to update/);
});

test("wallet: losing the device key cannot be bypassed, it asks for the backup", async () => {
  fresh();
  const w = await W.importWallet(keyInput(Keypair.generate()));
  W.useKeyStore(memoryKeyStore());
  await assert.rejects(W.keypair(w.id), /Import it again from your backup/);
  const other = memoryKeyStore(); await deviceKey(other, true); W.useKeyStore(other);
  await assert.rejects(W.keypair(w.id), KeyMismatch);
});

test("wallet list: concurrent adds do not overwrite each other", async () => {
  fresh();
  await Promise.all(Array.from({ length: 5 }, () => W.importWallet(keyInput(Keypair.generate()))));
  const l = await W.list();
  assert.equal(l.length, 5);
  assert.equal(new Set(l.map((w) => w.label)).size, 5);
});
