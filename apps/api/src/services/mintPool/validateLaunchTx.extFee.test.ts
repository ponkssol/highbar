import { test } from "node:test";
import assert from "node:assert/strict";
import { ComputeBudgetProgram, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, NATIVE_MINT } from "@solana/spl-token";
import { extFeeLamports } from "@hb/shared";
import { LaunchTxRejected, validateLaunchTx, type LaunchTxExpect } from "./validateLaunchTx.js";
import { extFeeReceiver } from "./index.js";
import { extFeeInfo } from "../../extFee.js";
import { buildLaunch, walletSign } from "./testTx.js";

// Extension platform fee (0.02% of the dev buy) -> fee receiver (EXT_FEE_RECEIVER), appended by the extension after the WSOL unwrap.
const configs = Array.from({ length: 6 }, () => Keypair.generate().publicKey);
const CFG = configs[1];
const RECEIVER = Keypair.generate().publicKey;
const LP = Keypair.generate();
const fresh = () => ({ creator: Keypair.generate(), mint: Keypair.generate().publicKey });
const expect = (creator: Keypair, mint: PublicKey, extra: Partial<LaunchTxExpect> = {}): LaunchTxExpect =>
  ({ mint: mint.toBase58(), creator: creator.publicKey.toBase58(), configs: configs.map((c) => c.toBase58()), feeReceiver: RECEIVER.toBase58(), ...extra });
const rejects = (fn: () => unknown, re: RegExp) => assert.throws(fn, (e) => e instanceof LaunchTxRejected && re.test((e as Error).message), String(re));
const edited = (tx: Transaction, edit: (ixs: TransactionInstruction[]) => TransactionInstruction[]) => {
  const t = new Transaction({ feePayer: tx.feePayer, recentBlockhash: tx.recentBlockhash });
  t.add(...edit([...tx.instructions])); return t;
};
const fee = (from: PublicKey, lamports: bigint | number, to: PublicKey = RECEIVER) => SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports: BigInt(lamports) });
/** what the extension does: API-built tx + one fee transfer at the very end */
const withFee = (tx: Transaction, ...extra: TransactionInstruction[]) => edited(tx, (ixs) => [...ixs, ...extra]);

test("ext fee: exact fee transfer last is accepted (plain, referral, Token-2022, launchpad signer); no transfer still passes", async () => {
  const referral = getAssociatedTokenAddressSync(NATIVE_MINT, Keypair.generate().publicKey);
  const shapes: Array<[string, Partial<Parameters<typeof buildLaunch>[0]>, Partial<LaunchTxExpect>]> = [
    ["plain", { devBuyLamports: 1e8 }, {}],
    ["referral", { devBuyLamports: 123_456_789, referral }, { referrals: [referral.toBase58()] }],
    ["token2022 min-fee", { devBuyLamports: 5e7, tokenType: 1, minFee: true }, {}],
    ["launchpad + referral", { devBuyLamports: 1e9, referral, launchpad: LP.publicKey }, { referrals: [referral.toBase58()], launchpad: LP.publicKey.toBase58() }],
  ];
  for (const [label, o, e] of shapes) {
    const { creator, mint } = fresh();
    const want = extFeeLamports(o.devBuyLamports!);
    const base = await buildLaunch({ mint, creator, config: CFG, ...o });
    const none = validateLaunchTx(walletSign(edited(base, (x) => x), creator), expect(creator, mint, e));
    assert.equal(none.extFeeLamports, 0n, label); assert.equal(none.devBuyLamports, BigInt(o.devBuyLamports!), label);
    const info = validateLaunchTx(walletSign(withFee(base, fee(creator.publicKey, want)), creator), expect(creator, mint, e));
    assert.equal(info.extFeeLamports, want, label); assert.equal(info.devBuyLamports, BigInt(o.devBuyLamports!), label);
    // API pre-check style (unsigned) works too
    validateLaunchTx(withFee(base, fee(creator.publicKey, want)).serialize({ requireAllSignatures: false, verifySignatures: false }), expect(creator, mint, { ...e, requireCreatorSignature: false }));
  }
  assert.equal(extFeeLamports(1e8), 20_000n);
});

test("ext fee: wallet-added ComputeBudget / Lighthouse around the fee transfer are still fine", async () => {
  const { creator, mint } = fresh();
  const base = await buildLaunch({ mint, creator, config: CFG, devBuyLamports: 1e8 });
  const lh = new TransactionInstruction({ programId: new PublicKey("L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95"), keys: [{ pubkey: creator.publicKey, isSigner: false, isWritable: false }], data: Buffer.from([2, 0, 1]) });
  const tx = edited(base, (ixs) => [ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }), ...ixs, fee(creator.publicKey, 20_000), lh]);
  assert.equal(validateLaunchTx(walletSign(tx, creator), expect(creator, mint)).extFeeLamports, 20_000n);
});

test("ext fee: wrong amount (incl. off by one), wrong destination, wrong source, two transfers are refused", async () => {
  const { creator, mint } = fresh();
  const base = await buildLaunch({ mint, creator, config: CFG, devBuyLamports: 1e8 }); // fee 20000
  for (const amt of [19_999, 20_001, 0, 1, 200_000, 2e8])
    rejects(() => validateLaunchTx(walletSign(withFee(base, fee(creator.publicKey, amt)), creator), expect(creator, mint)), /amount must be exactly 20000/);
  // wrong destination: an attacker, the creator itself, the creator's WSOL account
  for (const to of [Keypair.generate().publicKey, creator.publicKey, getAssociatedTokenAddressSync(NATIVE_MINT, creator.publicKey)])
    rejects(() => validateLaunchTx(walletSign(withFee(base, fee(creator.publicKey, 20_000, to)), creator), expect(creator, mint)), /go to the fee receiver/);
  // wrong source, signing: changes the signer set
  const other = Keypair.generate();
  const t1 = withFee(base, fee(other.publicKey, 20_000)); t1.partialSign(creator, other);
  rejects(() => validateLaunchTx(t1.serialize({ requireAllSignatures: false, verifySignatures: false }), expect(creator, mint)), /signers/);
  // wrong source, non-signer meta (hand-built): caught by the source check
  const data = Buffer.alloc(12); data.writeUInt32LE(2, 0); data.writeBigUInt64LE(20_000n, 4);
  const notCreator = new TransactionInstruction({ programId: SystemProgram.programId, data, keys: [{ pubkey: other.publicKey, isSigner: false, isWritable: true }, { pubkey: RECEIVER, isSigner: false, isWritable: true }] });
  rejects(() => validateLaunchTx(walletSign(withFee(base, notCreator), creator), expect(creator, mint)), /come from the creator/);
  // two transfers (both exact, or exact + split)
  rejects(() => validateLaunchTx(walletSign(withFee(base, fee(creator.publicKey, 20_000), fee(creator.publicKey, 20_000)), creator), expect(creator, mint)), /at most one/);
  rejects(() => validateLaunchTx(walletSign(withFee(base, fee(creator.publicKey, 10_000), fee(creator.publicKey, 10_000)), creator), expect(creator, mint)), /amount must be exactly/);
  rejects(() => validateLaunchTx(walletSign(withFee(base, fee(creator.publicKey, 20_000), fee(creator.publicKey, 1, Keypair.generate().publicKey)), creator), expect(creator, mint)), /at most one/);
});

test("ext fee: only right after the unwrap; elsewhere is an extra instruction", async () => {
  const { creator, mint } = fresh();
  const base = await buildLaunch({ mint, creator, config: CFG, devBuyLamports: 1e8 });
  const f = fee(creator.publicKey, 20_000);
  const n = base.instructions.length;
  for (const at of [0, 1, n - 1]) {
    const tx = edited(base, (ixs) => [...ixs.slice(0, at), f, ...ixs.slice(at)]);
    rejects(() => validateLaunchTx(walletSign(tx, creator), expect(creator, mint)), /./);
  }
});

test("ext fee: dev buy 0 and dev buys whose fee rounds to 0 allow NO fee transfer; rounding edges", async () => {
  // no dev buy at all
  const a = fresh();
  const noBuy = await buildLaunch({ mint: a.mint, creator: a.creator, config: CFG });
  assert.equal(validateLaunchTx(walletSign(edited(noBuy, (x) => x), a.creator), expect(a.creator, a.mint)).devBuyLamports, 0n);
  for (const amt of [0, 1])
    rejects(() => validateLaunchTx(walletSign(withFee(noBuy, fee(a.creator.publicKey, amt)), a.creator), expect(a.creator, a.mint)), /without a dev buy/);
  // 4999 lamports -> fee floor(0.9998) = 0: no transfer allowed (not even 0 lamports), the tx without one passes
  const b = fresh();
  const tiny = await buildLaunch({ mint: b.mint, creator: b.creator, config: CFG, devBuyLamports: 4999 });
  validateLaunchTx(walletSign(edited(tiny, (x) => x), b.creator), expect(b.creator, b.mint));
  for (const amt of [0, 1])
    rejects(() => validateLaunchTx(walletSign(withFee(tiny, fee(b.creator.publicKey, amt)), b.creator), expect(b.creator, b.mint)), /rounds to 0/);
  // 5000 -> 1 lamport (exact accepted, 0 / 2 refused); 9999 -> 1; 10000 -> 2
  for (const [buy, want] of [[5000, 1n], [9999, 1n], [10_000, 2n], [14_999, 2n], [15_000, 3n]] as const) {
    const c = fresh();
    const tx = await buildLaunch({ mint: c.mint, creator: c.creator, config: CFG, devBuyLamports: buy });
    assert.equal(extFeeLamports(buy), want);
    assert.equal(validateLaunchTx(walletSign(withFee(tx, fee(c.creator.publicKey, want)), c.creator), expect(c.creator, c.mint)).extFeeLamports, want, String(buy));
    for (const off of [want - 1n, want + 1n])
      rejects(() => validateLaunchTx(walletSign(withFee(tx, fee(c.creator.publicKey, off)), c.creator), expect(c.creator, c.mint)), /amount must be exactly/);
  }
});

test("ext fee: without a configured fee receiver any fee transfer stays an extra instruction", async () => {
  const { creator, mint } = fresh();
  const base = await buildLaunch({ mint, creator, config: CFG, devBuyLamports: 1e8 });
  for (const feeReceiver of [null, undefined])
    rejects(() => validateLaunchTx(walletSign(withFee(base, fee(creator.publicKey, 20_000)), creator), expect(creator, mint, { feeReceiver })), /unexpected extra instructions/);
  // the receiver resolved from env: TREASURY_PUBKEY alone gives none, so a transfer to the treasury is refused too
  const treasury = Keypair.generate().publicKey;
  const fromEnv = extFeeReceiver({ TREASURY_PUBKEY: treasury.toBase58() });
  assert.equal(fromEnv, null);
  rejects(() => validateLaunchTx(walletSign(withFee(base, fee(creator.publicKey, 20_000, treasury)), creator), expect(creator, mint, { feeReceiver: fromEnv })), /unexpected extra instructions/);
  // with EXT_FEE_RECEIVER set, a transfer to TREASURY_PUBKEY is the wrong destination
  const env = { TREASURY_PUBKEY: treasury.toBase58(), EXT_FEE_RECEIVER: RECEIVER.toBase58() };
  rejects(() => validateLaunchTx(walletSign(withFee(base, fee(creator.publicKey, 20_000, treasury)), creator), expect(creator, mint, { feeReceiver: extFeeReceiver(env) })), /go to the fee receiver/);
  assert.equal(validateLaunchTx(walletSign(withFee(base, fee(creator.publicKey, 20_000)), creator), expect(creator, mint, { feeReceiver: extFeeReceiver(env) })).extFeeLamports, 20_000n);
});

test("ext fee: extFeeReceiver reads EXT_FEE_RECEIVER only (public key), extFeeInfo describes the fee", () => {
  const t = RECEIVER.toBase58();
  assert.equal(extFeeReceiver({ EXT_FEE_RECEIVER: ` ${t} ` }), t);
  assert.equal(extFeeReceiver({}), null);
  assert.equal(extFeeReceiver({ EXT_FEE_RECEIVER: "not-a-key" }), null);
  assert.equal(extFeeReceiver({ TREASURY_PUBKEY: t }), null, "TREASURY_PUBKEY alone does not enable the fee");
  assert.equal(extFeeReceiver({ NEXT_PUBLIC_EXT_FEE_RECEIVER: t }), null);
  assert.deepEqual(extFeeInfo(100_000_000n, t), { bps: 2, lamports: "20000", sol: 0.00002, receiver: t, allowed: true });
  assert.deepEqual(extFeeInfo(4999n, t), { bps: 2, lamports: "0", sol: 0, receiver: t, allowed: false });
  assert.deepEqual(extFeeInfo(0n, t), { bps: 2, lamports: "0", sol: 0, receiver: t, allowed: false });
  assert.equal(extFeeInfo(100_000_000n, null).allowed, false);
  assert.equal(extFeeInfo(100_000_000n, t, false).allowed, false, "random-mint path: pre-signed, not editable");
});
