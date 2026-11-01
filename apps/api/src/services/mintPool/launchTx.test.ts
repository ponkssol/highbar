import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, NATIVE_MINT } from "@solana/spl-token";
import { finishLaunchTx } from "../../launchTx.js";
import { validateLaunchTx } from "./validateLaunchTx.js";
import { BLOCKHASH, buildLaunch } from "./testTx.js";

// Test token "Test Coin" / TEST. Worst case on the wire = 32-byte name + 10-byte symbol + 200-char uri (the /tx/launch
// limits): the same byte count is reached here with "Test Coin" / TEST and a uri padded by the 29 missing bytes.
const WORST_URI = "https://example.com/" + "m".repeat(229 - "https://example.com/".length - 5) + ".json";
const raw = async (o: Parameters<typeof buildLaunch>[0]) => { const t = await buildLaunch(o); t.signatures = []; return t; };

test("launch tx size with the dev buy bundled: the launchpad signer adds exactly 97 bytes and the worst case still fits 1232", async (t) => {
  assert.equal(WORST_URI.length, 229);
  const creator = Keypair.generate(), mint = Keypair.generate(), launchpad = Keypair.generate(), config = Keypair.generate().publicKey;
  const referral = getAssociatedTokenAddressSync(NATIVE_MINT, Keypair.generate().publicKey);
  const shapes: Array<[string, Partial<Parameters<typeof buildLaunch>[0]>]> = [
    ["no dev buy", {}], ["dev buy + referral", { devBuyLamports: 1e8, referral }], ["dev buy Token-2022 min-fee (no referral)", { devBuyLamports: 1e8, tokenType: 1, minFee: true }],
    ["worst case: dev buy + referral, max name / symbol / uri", { devBuyLamports: 1e8, referral, uri: WORST_URI }],
  ];
  for (const [label, o] of shapes) {
    const base = { mint: mint.publicKey, creator, config, ...o };
    const before = finishLaunchTx(await raw(base), { creator: creator.publicKey, blockhash: BLOCKHASH, mintSigner: mint, launchpad: null }).length;
    const after = finishLaunchTx(await raw(base), { creator: creator.publicKey, blockhash: BLOCKHASH, mintSigner: mint, launchpad }).length;
    t.diagnostic(`${label}: ${before} -> ${after} bytes`);
    assert.equal(after - before, 97, label);
    assert.ok(after <= 1232, `${label}: ${after}`);
  }
});

test("random-mint path: API signs mint then launchpad, wallet signs last, signatures verify; vanity path leaves both slots empty", async () => {
  const creator = Keypair.generate(), mint = Keypair.generate(), launchpad = Keypair.generate(), config = Keypair.generate().publicKey;
  const tx = await raw({ mint: mint.publicKey, creator, config, devBuyLamports: 1e8 });
  const bytes = finishLaunchTx(tx, { creator: creator.publicKey, blockhash: BLOCKHASH, mintSigner: mint, launchpad });
  const got = Transaction.from(bytes);
  assert.deepEqual(got.signatures.map((s) => [s.publicKey.toBase58(), !!s.signature]), [[creator.publicKey.toBase58(), false], [mint.publicKey.toBase58(), true], [launchpad.publicKey.toBase58(), true]]);
  const msg = got.serializeMessage();
  got.partialSign(creator); // the wallet, last
  assert.ok(got.serializeMessage().equals(msg)); assert.ok(got.verifySignatures(true));

  const v = await raw({ mint: mint.publicKey, creator, config, devBuyLamports: 1e8 });
  const vb = finishLaunchTx(v, { creator: creator.publicKey, blockhash: BLOCKHASH, mintSigner: null, launchpad });
  assert.ok(Transaction.from(vb).signatures.every((s) => !s.signature));
  // what POST /tx/launch self-checks for the vanity path
  validateLaunchTx(vb, { mint: mint.publicKey.toBase58(), creator: creator.publicKey.toBase58(), configs: [config.toBase58()], requireCreatorSignature: false, launchpad: launchpad.publicKey.toBase58() });

  // unset: unchanged 2-signer tx
  const plain = Transaction.from(finishLaunchTx(await raw({ mint: mint.publicKey, creator, config }), { creator: creator.publicKey, blockhash: BLOCKHASH, mintSigner: mint, launchpad: null }));
  assert.equal(plain.signatures.length, 2);
});

test("launch tx size with the extension fee transfer appended (creator -> fee receiver): +49 bytes; fits 1232 unless the metadata is near the max", async (t) => {
  const { SystemProgram } = await import("@solana/web3.js");
  const { extFeeLamports } = await import("@hb/shared");
  const creator = Keypair.generate(), mint = Keypair.generate(), launchpad = Keypair.generate(), config = Keypair.generate().publicKey, receiver = Keypair.generate().publicKey;
  const referral = getAssociatedTokenAddressSync(NATIVE_MINT, Keypair.generate().publicKey);
  // FEE_MAX_URI: name + symbol + uri = 213 bytes (29 below the 242-byte /tx/launch maximum) is the largest that still fits with the fee
  const FEE_MAX_URI = "https://example.com/" + "m".repeat(229 - 29 - "https://example.com/".length - 5) + ".json";
  const shapes: Array<[string, Partial<Parameters<typeof buildLaunch>[0]>, boolean]> = [
    ["real launch: dev buy + referral + launchpad signer", { devBuyLamports: 1e8, referral }, true],
    ["dev buy 20 SOL + referral + launchpad, name + symbol + uri = 213 bytes", { devBuyLamports: 2e10, referral, uri: FEE_MAX_URI }, true],
    ["worst case: dev buy + referral + launchpad, max name / symbol / uri (242 bytes)", { devBuyLamports: 2e10, referral, uri: WORST_URI }, false],
  ];
  for (const [label, o, fits] of shapes) {
    const base = { mint: mint.publicKey, creator, config, ...o };
    const before = finishLaunchTx(await raw(base), { creator: creator.publicKey, blockhash: BLOCKHASH, mintSigner: null, launchpad }).length;
    const tx = await raw(base);
    tx.add(SystemProgram.transfer({ fromPubkey: creator.publicKey, toPubkey: receiver, lamports: extFeeLamports(o.devBuyLamports!) }));
    let bytes: Buffer | null = null;
    try { bytes = finishLaunchTx(tx, { creator: creator.publicKey, blockhash: BLOCKHASH, mintSigner: null, launchpad }); } catch (e) { assert.match((e as Error).message, /large/, label); }
    const wire = tx.serializeMessage().length + 1 + 64 * 3; // wire size: message + 3 signature slots (finishLaunchTx already set payer / launchpad)
    t.diagnostic(`${label}: ${before} -> ${wire} bytes with the fee transfer`);
    assert.equal(wire - before, 49, label); // 32 (receiver key) + 17 (ix: program idx, account count + 2 idxs, data len + 12 data bytes)
    if (!fits) { assert.ok(wire > 1232 && !bytes, label); continue; }
    assert.ok(bytes, label); assert.equal(bytes.length, wire); assert.ok(bytes.length <= 1232, `${label}: ${bytes.length}`);
    const info = validateLaunchTx(bytes, { mint: mint.publicKey.toBase58(), creator: creator.publicKey.toBase58(), configs: [config.toBase58()], referrals: [referral.toBase58()],
      requireCreatorSignature: false, launchpad: launchpad.publicKey.toBase58(), feeReceiver: receiver.toBase58() });
    assert.equal(info.extFeeLamports, extFeeLamports(o.devBuyLamports!));
  }
});
