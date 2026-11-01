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
