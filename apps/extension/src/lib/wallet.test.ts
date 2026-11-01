import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import { derivePath } from "ed25519-hd-key";
import { mnemonicToSeedSync } from "@scure/bip39";
import { decryptSecret, encryptSecret, PBKDF2_ITERATIONS, WrongPassword } from "./crypto";
import { isMnemonic, newMnemonic, seedFromMnemonic, slip10Ed25519, SOLANA_PATH } from "./seed";
import { decodeSecret, encodeSecret, keypairOf, parseImport } from "./keys";
import { checkClaimTx, checkCosigned, checkLaunchTx, TxCheckFailed } from "./txcheck";

// Public BIP39 test mnemonic (all-zero entropy). Never holds funds.
const TEST_MNEMONIC = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

test("vault: AES-GCM roundtrip with the default 600k PBKDF2 iterations", async () => {
  const secret = Keypair.generate().secretKey;
  const v = await encryptSecret(secret, "correct horse battery");
  assert.equal(v.iter, PBKDF2_ITERATIONS);
  assert.equal(v.iter, 600_000);
  assert.equal(v.kdf, "PBKDF2-SHA256");
  assert.equal(atob(v.salt).length, 16);
  assert.equal(atob(v.iv).length, 12);
  assert.equal(atob(v.ct).length, secret.length + 16, "ciphertext + 16 byte GCM tag");
  assert.ok(!v.ct.includes(bs58.encode(secret)) && !JSON.stringify(v).includes(Buffer.from(secret).toString("base64")));
  assert.deepEqual(await decryptSecret(v, "correct horse battery"), secret);
});

test("vault: wrong password and tampered ciphertext are refused", async () => {
  const v = await encryptSecret(new Uint8Array([1, 2, 3, 4]), "password-one", 100_000);
  await assert.rejects(decryptSecret(v, "password-two"), WrongPassword);
  const ct = Uint8Array.from(atob(v.ct), (c) => c.charCodeAt(0)); ct[0] ^= 1;
  await assert.rejects(decryptSecret({ ...v, ct: btoa(String.fromCharCode(...ct)) }, "password-one"), WrongPassword);
  await assert.rejects(decryptSecret({ ...v, iter: 1000 }, "password-one"), /Unsupported/);
});

test("vault: same secret and password give a fresh salt and IV every time", async () => {
  const s = new Uint8Array(32).fill(7);
  const [a, b] = await Promise.all([encryptSecret(s, "same-password", 100_000), encryptSecret(s, "same-password", 100_000)]);
  assert.notEqual(a.salt, b.salt); assert.notEqual(a.iv, b.iv); assert.notEqual(a.ct, b.ct);
});

test("seed: SLIP-10 ed25519 test vector 1 (master and m/0')", () => {
  const seed = Buffer.from("000102030405060708090a0b0c0d0e0f", "hex");
  assert.equal(Buffer.from(slip10Ed25519(seed, "m")).toString("hex"), "2b4be7f19ee27bbf30c667b642d5f4aa69fd169872f8fc3059c08ebae2eb19e7");
  assert.equal(Buffer.from(slip10Ed25519(seed, "m/0'")).toString("hex"), "68e0fe46dfb67e368c75379acec591dad19df3cde26e63b93a8e704f1dade7a3");
  assert.throws(() => slip10Ed25519(seed, "m/0"), /hardened/);
});

test("seed: Phantom path m/44'/501'/0'/0' gives the known address for the BIP39 test mnemonic", () => {
  assert.equal(SOLANA_PATH(0), "m/44'/501'/0'/0'");
  const kp = Keypair.fromSeed(seedFromMnemonic(TEST_MNEMONIC));
  assert.equal(kp.publicKey.toBase58(), "HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk");
  // independent implementation (ed25519-hd-key) agrees for account 0 and 1
  for (const acct of [0, 1]) {
    const ref = derivePath(SOLANA_PATH(acct), Buffer.from(mnemonicToSeedSync(TEST_MNEMONIC)).toString("hex")).key;
    assert.deepEqual(Buffer.from(seedFromMnemonic(TEST_MNEMONIC, acct)), Buffer.from(ref));
  }
  assert.equal(keypairOf({ kind: "mnemonic", mnemonic: TEST_MNEMONIC, account: 0 }).publicKey.toBase58(), kp.publicKey.toBase58());
});

test("seed: new phrases validate, bad phrases do not", () => {
  const m12 = newMnemonic(12), m24 = newMnemonic(24);
  assert.equal(m12.split(" ").length, 12); assert.equal(m24.split(" ").length, 24);
  assert.ok(isMnemonic(m12) && isMnemonic(m24));
  assert.ok(isMnemonic(`  ${TEST_MNEMONIC.toUpperCase()}  `), "case and spacing are normalized");
  assert.ok(!isMnemonic(TEST_MNEMONIC.replace("about", "abandon")), "checksum");
  assert.throws(() => seedFromMnemonic("abandon abandon"), /12 or 24/);
});

test("import: base58 key, JSON key file and seed phrase", () => {
  const kp = Keypair.generate();
  const a = parseImport(` ${bs58.encode(kp.secretKey)} `);
  assert.equal(a.kind, "key"); assert.equal(keypairOf(a).publicKey.toBase58(), kp.publicKey.toBase58());
  const b = parseImport(JSON.stringify([...kp.secretKey]));
  assert.equal(keypairOf(b).publicKey.toBase58(), kp.publicKey.toBase58());
  const c = parseImport(TEST_MNEMONIC);
  assert.deepEqual(c, { kind: "mnemonic", mnemonic: TEST_MNEMONIC, account: 0 });
  assert.deepEqual(decodeSecret(encodeSecret(c)), c);
  const bad = new Uint8Array(kp.secretKey); bad[40] ^= 1;
  for (const x of ["", "not a seed phrase at all", bs58.encode(kp.secretKey.slice(0, 32)), bs58.encode(bad), "[1,2,3]", "0OIl"]) assert.throws(() => parseImport(x));
});

function tx(feePayer: PublicKey, signers: PublicKey[]) {
  const t = new Transaction({ feePayer, recentBlockhash: bs58.encode(new Uint8Array(32).fill(9)) });
  for (const s of signers) t.add(SystemProgram.transfer({ fromPubkey: s, toPubkey: Keypair.generate().publicKey, lamports: 1 }));
  return t;
}

test("pre-sign checks: fee payer must be the wallet, the mint must end in high and sign the same tx", () => {
  const w = Keypair.generate(), other = Keypair.generate(), mint = Keypair.generate();
  assert.throws(() => checkClaimTx(tx(other.publicKey, [other.publicKey, w.publicKey]), w.publicKey), TxCheckFailed);
  checkClaimTx(tx(w.publicKey, [w.publicKey]), w.publicKey);
  const launch = tx(w.publicKey, [w.publicKey, mint.publicKey]);
  assert.throws(() => checkLaunchTx(launch, w.publicKey, mint.publicKey.toBase58()), /does not end in "high"/, "random mint refused");
  assert.throws(() => checkLaunchTx(launch, w.publicKey, "1111111111111111111111111111high"), /not part of this launch|not valid/);
  assert.throws(() => checkLaunchTx(tx(other.publicKey, [other.publicKey]), w.publicKey, "x"), /fee payer/);
  // an address ending in "high" (random bytes, built from base58, no grinding): accepted only when it signs the same tx
  const highMint = vanityLike();
  checkLaunchTx(tx(w.publicKey, [w.publicKey, highMint]), w.publicKey, highMint.toBase58());
  assert.throws(() => checkLaunchTx(launch, w.publicKey, highMint.toBase58()), /not part of this launch/);
});
function vanityLike(): PublicKey {
  const A = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  for (;;) {
    let s = ""; for (let i = 0; i < 40; i++) s += A[Math.floor(Math.random() * 58)];
    const b = bs58.decode(s + "high");
    if (b.length === 32) return new PublicKey(b);
  }
}

test("pre-sign checks: the co-signed tx must carry the same message and our signature", () => {
  const w = Keypair.generate(), mint = Keypair.generate();
  const t = tx(w.publicKey, [w.publicKey, mint.publicKey]);
  t.partialSign(w);
  const full = Transaction.from(t.serialize({ requireAllSignatures: false }));
  full.partialSign(mint);
  checkCosigned(t, full, w.publicKey);
  const swapped = tx(w.publicKey, [w.publicKey, mint.publicKey, Keypair.generate().publicKey]);
  assert.throws(() => checkCosigned(t, swapped, w.publicKey), /changed by the server/);
  const unsigned = Transaction.from(t.serialize({ requireAllSignatures: false }));
  unsigned.signatures.forEach((s) => { s.signature = null; });
  assert.throws(() => checkCosigned(t, unsigned, w.publicKey), /signature is missing/);
});
