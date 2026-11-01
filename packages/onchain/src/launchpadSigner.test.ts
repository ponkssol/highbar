import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { DynamicBondingCurveIdl, DYNAMIC_BONDING_CURVE_PROGRAM_ID } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { addLaunchpadSigner, dbcInitIndex, launchpadSignerStatus, loadLaunchpadSigner, LAUNCHPAD_SIGNER_ENV } from "./launchpadSigner.js";

const disc = (name: string) => Buffer.from((DynamicBondingCurveIdl as unknown as { instructions: { name: string; discriminator: number[] }[] }).instructions.find((i) => i.name === name)!.discriminator);
const BLOCKHASH = new PublicKey(Buffer.alloc(32, 7)).toBase58();
const secretJson = (kp: Keypair) => JSON.stringify([...kp.secretKey]);

/** a launch-shaped legacy tx: a DBC init (creator + mint signers, 14 accounts) then an unrelated transfer */
function launchShape(creator: Keypair, mint: Keypair, name = "initialize_virtual_pool_with_spl_token") {
  const keys = [
    { pubkey: creator.publicKey, isSigner: true, isWritable: true }, { pubkey: mint.publicKey, isSigner: true, isWritable: true },
    ...Array.from({ length: 12 }, () => ({ pubkey: Keypair.generate().publicKey, isSigner: false, isWritable: false })),
  ];
  const tx = new Transaction().add(new TransactionInstruction({ programId: DYNAMIC_BONDING_CURVE_PROGRAM_ID, keys, data: Buffer.concat([disc(name), Buffer.alloc(60, 1)]) }))
    .add(SystemProgram.transfer({ fromPubkey: creator.publicKey, toPubkey: Keypair.generate().publicKey, lamports: 1 }));
  tx.feePayer = creator.publicKey; tx.recentBlockhash = BLOCKHASH;
  return tx;
}
const wire = (tx: Transaction) => tx.serialize({ requireAllSignatures: false, verifySignatures: false });

test("launchpad signer env: unset / disabled skip, JSON or file loads, bad or mismatched key refused without echoing the value", () => {
  assert.equal(launchpadSignerStatus({}).state, "unset");
  assert.equal(loadLaunchpadSigner({}), null);
  const kp = Keypair.generate();
  assert.equal(launchpadSignerStatus({ [LAUNCHPAD_SIGNER_ENV.json]: secretJson(kp), [LAUNCHPAD_SIGNER_ENV.disabled]: "true" }).state, "disabled");
  const ok = launchpadSignerStatus({ [LAUNCHPAD_SIGNER_ENV.json]: secretJson(kp), [LAUNCHPAD_SIGNER_ENV.pubkey]: kp.publicKey.toBase58() });
  assert.ok(ok.state === "ok" && ok.pubkey === kp.publicKey.toBase58());
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hb-lp-"));
  try {
    const f = path.join(dir, "k.json"); fs.writeFileSync(f, secretJson(kp), { mode: 0o600 });
    assert.ok(loadLaunchpadSigner({ [LAUNCHPAD_SIGNER_ENV.path]: f })!.publicKey.equals(kp.publicKey));
    assert.equal(launchpadSignerStatus({ [LAUNCHPAD_SIGNER_ENV.path]: path.join(dir, "missing.json") }).state, "bad");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  for (const env of [{ [LAUNCHPAD_SIGNER_ENV.json]: "[1,2,3]" }, { [LAUNCHPAD_SIGNER_ENV.json]: "<FILL_ME>" },
    { [LAUNCHPAD_SIGNER_ENV.json]: secretJson(kp), [LAUNCHPAD_SIGNER_ENV.pubkey]: Keypair.generate().publicKey.toBase58() }]) {
    const s = launchpadSignerStatus(env);
    assert.equal(s.state, "bad");
    assert.throws(() => loadLaunchpadSigner(env), (e: Error) => !e.message.includes(String(kp.secretKey[0]) + ",") && !e.message.includes("[1,2,3]"));
  }
});

test("addLaunchpadSigner: read-only 3rd signer as the init's last account, +97 bytes, signs after the mint, wallet signs last", () => {
  for (const name of ["initialize_virtual_pool_with_spl_token", "initialize_virtual_pool_with_token2022"]) {
    const creator = Keypair.generate(), mint = Keypair.generate(), lp = Keypair.generate();
    const before = wire(launchShape(creator, mint, name)).length;
    const tx = launchShape(creator, mint, name);
    assert.equal(dbcInitIndex(tx), 0);
    addLaunchpadSigner(tx, lp.publicKey);
    const msg = tx.compileMessage();
    assert.equal(msg.header.numRequiredSignatures, 3);
    assert.equal(msg.header.numReadonlySignedAccounts, 1);
    assert.deepEqual(msg.accountKeys.slice(0, 3).map(String), [creator.publicKey, mint.publicKey, lp.publicKey].map(String));
    const last = tx.instructions[0].keys.at(-1)!;
    assert.ok(last.pubkey.equals(lp.publicKey) && last.isSigner && !last.isWritable);
    assert.equal(wire(tx).length - before, 97, "64 signature + 32 key + 1 account index");
    tx.partialSign(mint); tx.partialSign(lp); // API side
    const unsigned = tx.serializeMessage();
    tx.partialSign(creator); // wallet last
    assert.ok(tx.serializeMessage().equals(unsigned), "signing never changes the message");
    assert.ok(tx.verifySignatures(true));
  }
});

test("addLaunchpadSigner refuses: no init ix, signer already referenced, after a signature", () => {
  const creator = Keypair.generate(), mint = Keypair.generate(), lp = Keypair.generate();
  const noInit = new Transaction().add(SystemProgram.transfer({ fromPubkey: creator.publicKey, toPubkey: lp.publicKey, lamports: 1 }));
  assert.throws(() => addLaunchpadSigner(noInit, Keypair.generate().publicKey), /no DBC initialize pool instruction/);
  assert.throws(() => addLaunchpadSigner(launchShape(creator, mint), creator.publicKey), /already referenced/);
  const twice = launchShape(creator, mint); addLaunchpadSigner(twice, lp.publicKey);
  assert.throws(() => addLaunchpadSigner(twice, lp.publicKey), /already referenced/);
  const signed = launchShape(creator, mint); signed.partialSign(mint);
  assert.throws(() => addLaunchpadSigner(signed, lp.publicKey), /before signing/);
});
