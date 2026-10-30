import { test } from "node:test";
import assert from "node:assert/strict";
import { ComputeBudgetProgram, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { AuthorityType, createSetAuthorityInstruction, createMintToInstruction, getAssociatedTokenAddressSync, NATIVE_MINT } from "@solana/spl-token";
import { LaunchTxRejected, validateLaunchTx, type LaunchTxExpect } from "./validateLaunchTx.js";
import { buildLaunch, walletSign } from "./testTx.js";

// Test token: "Test Coin" / TEST (see testTx.ts). Mints here are random keys: the validator checks identity, not the suffix.
const configs = Array.from({ length: 6 }, () => Keypair.generate().publicKey);
const CFG = configs[2];
const fresh = () => ({ creator: Keypair.generate(), mint: Keypair.generate().publicKey });
const expect = (creator: Keypair, mint: PublicKey, extra: Partial<LaunchTxExpect> = {}): LaunchTxExpect =>
  ({ mint: mint.toBase58(), creator: creator.publicKey.toBase58(), configs: configs.map((c) => c.toBase58()), ...extra });
const rejects = (fn: () => unknown, re: RegExp) => assert.throws(fn, (e) => e instanceof LaunchTxRejected && re.test((e as Error).message), String(re));
/** rebuild a tx (same blockhash / payer) with its instructions passed through `edit` */
const edited = (tx: Transaction, edit: (ixs: TransactionInstruction[]) => TransactionInstruction[]) => {
  const t = new Transaction({ feePayer: tx.feePayer, recentBlockhash: tx.recentBlockhash });
  t.add(...edit([...tx.instructions])); return t;
};

test("accepts exactly what the SDK emits: no dev buy, dev buy, Token-2022, referral, compute-budget prefix", async () => {
  for (const o of [{}, { devBuyLamports: 1e8 }, { devBuyLamports: 5e7, tokenType: 1 as const }, { devBuyLamports: 1e8, minFee: true }]) {
    const { creator, mint } = fresh();
    const tx = await buildLaunch({ mint, creator, config: CFG, ...o });
    const info = validateLaunchTx(walletSign(tx, creator), expect(creator, mint));
    assert.equal(info.config, CFG.toBase58()); assert.equal(info.devBuy, !!o.devBuyLamports);
  }
  const { creator, mint } = fresh(), referral = getAssociatedTokenAddressSync(NATIVE_MINT, Keypair.generate().publicKey);
  const tx = await buildLaunch({ mint, creator, config: CFG, devBuyLamports: 1e8, referral });
  validateLaunchTx(walletSign(tx, creator), expect(creator, mint, { referrals: [referral.toBase58()] }));
  const { creator: c2, mint: m2 } = fresh();
  const cb = edited(await buildLaunch({ mint: m2, creator: c2, config: CFG, devBuyLamports: 1e8 }),
    (ixs) => [ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }), ...ixs]);
  validateLaunchTx(walletSign(cb, c2), expect(c2, m2));
  // the API's own pre-check (before the wallet signed)
  const { creator: c3, mint: m3 } = fresh();
  const un = await buildLaunch({ mint: m3, creator: c3, config: CFG });
  validateLaunchTx(un.serialize({ requireAllSignatures: false, verifySignatures: false }), expect(c3, m3, { requireCreatorSignature: false }));
});

test("rejects a config outside the 6 platform configs", async () => {
  const { creator, mint } = fresh();
  const tx = await buildLaunch({ mint, creator, config: Keypair.generate().publicKey });
  rejects(() => validateLaunchTx(walletSign(tx, creator), expect(creator, mint)), /config/);
});

test("rejects a different mint than the reserved one, and another creator", async () => {
  const { creator, mint } = fresh();
  const tx = await buildLaunch({ mint: Keypair.generate().publicKey, creator, config: CFG });
  rejects(() => validateLaunchTx(walletSign(tx, creator), expect(creator, mint)), /mint|signer/);
  const ok = await buildLaunch({ mint, creator, config: CFG });
  rejects(() => validateLaunchTx(walletSign(ok, creator), expect(Keypair.generate(), mint)), /creator|payer|signer/);
});

test("rejects an extra instruction anywhere (transfer to an attacker, memo, mint-to)", async () => {
  const { creator, mint } = fresh();
  const base = await buildLaunch({ mint, creator, config: CFG, devBuyLamports: 1e8 });
  const thief = Keypair.generate().publicKey;
  const extras = [
    SystemProgram.transfer({ fromPubkey: creator.publicKey, toPubkey: thief, lamports: 1 }),
    new TransactionInstruction({ programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"), keys: [], data: Buffer.from("hi") }),
    createMintToInstruction(mint, getAssociatedTokenAddressSync(mint, thief), creator.publicKey, 1),
  ];
  for (const x of extras) {
    for (const at of ["end", "middle", "start"] as const) {
      const tx = edited(base, (ixs) => at === "end" ? [...ixs, x] : at === "start" ? [x, ...ixs] : [ixs[0], x, ...ixs.slice(1)]);
      rejects(() => validateLaunchTx(walletSign(tx, creator), expect(creator, mint)), /./);
    }
  }
});

test("rejects SetAuthority on the vanity mint", async () => {
  const { creator, mint } = fresh();
  const tx = edited(await buildLaunch({ mint, creator, config: CFG }),
    (ixs) => [...ixs, createSetAuthorityInstruction(mint, creator.publicKey, AuthorityType.MintTokens, Keypair.generate().publicKey)]);
  rejects(() => validateLaunchTx(walletSign(tx, creator), expect(creator, mint)), /./);
});

test("rejects the pool instruction aimed at a different program (same data and accounts)", async () => {
  const { creator, mint } = fresh();
  const evil = Keypair.generate().publicKey;
  const tx = edited(await buildLaunch({ mint, creator, config: CFG }),
    (ixs) => ixs.map((ix, i) => i === 0 ? new TransactionInstruction({ programId: evil, keys: ix.keys, data: ix.data }) : ix));
  rejects(() => validateLaunchTx(walletSign(tx, creator), expect(creator, mint)), /program|instruction/);
});

test("rejects a missing / invalid creator signature, a pre-filled mint signature and garbage", async () => {
  const { creator, mint } = fresh();
  const tx = await buildLaunch({ mint, creator, config: CFG });
  rejects(() => validateLaunchTx(tx.serialize({ requireAllSignatures: false, verifySignatures: false }), expect(creator, mint)), /signature/);
  const signed = Buffer.from(walletSign(tx, creator), "base64");
  signed[1] ^= 0xff; // corrupt the creator signature
  rejects(() => validateLaunchTx(signed, expect(creator, mint)), /signature/);
  rejects(() => validateLaunchTx("AAAA", expect(creator, mint)), /size|transaction/);
  rejects(() => validateLaunchTx(Buffer.alloc(300, 7).toString("base64"), expect(creator, mint)), /./);
});

test("rejects a dev-buy referral account that is not the platform referral", async () => {
  const { creator, mint } = fresh();
  const own = getAssociatedTokenAddressSync(NATIVE_MINT, creator.publicKey);
  const tx = await buildLaunch({ mint, creator, config: CFG, devBuyLamports: 1e8, referral: own });
  rejects(() => validateLaunchTx(walletSign(tx, creator), expect(creator, mint)), /referral/);
});
