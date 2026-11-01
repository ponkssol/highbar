import { test } from "node:test";
import assert from "node:assert/strict";
import nacl from "tweetnacl";
import { Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { ata, checkSellTx, DAMM_V2_PROGRAM, DBC_PROGRAM, decodeSwap, runSell, SellAborted, WSOL_MINT, type BuildArgs, type SellDeps, type SellRoute } from "./sell";
import { TOKEN_PROGRAM } from "./rpc";

// Generated keypairs only, in memory. Nothing is sent anywhere: "send" below is a recorder.
const BH = "11111111111111111111111111111111";
const MINT = Keypair.generate().publicKey.toBase58(), DBC_POOL = Keypair.generate().publicKey.toBase58(), DAMM_POOL = Keypair.generate().publicKey.toBase58();
const le = (v: bigint) => { const b = new Uint8Array(8); for (let i = 0; i < 8; i++) b[i] = Number((v >> BigInt(8 * i)) & 0xffn); return b; };
const any = () => ({ pubkey: Keypair.generate().publicKey, isSigner: false, isWritable: false });
/** A stand-in for the real builders: one swap instruction with the real program id, discriminator and account order. */
function fakeSwap(route: SellRoute, a: BuildArgs, o: { amountIn?: bigint; minOut?: bigint; input?: PublicKey; pool?: string } = {}) {
  const input = { pubkey: o.input ?? ata(a.owner, new PublicKey(a.mint)), isSigner: false, isWritable: true }, output = { pubkey: ata(a.owner, new PublicKey(WSOL_MINT)), isSigner: false, isWritable: true };
  const pool = { pubkey: new PublicKey(o.pool ?? a.pool), isSigner: false, isWritable: true }, payer = { pubkey: a.owner, isSigner: true, isWritable: true };
  const amt = le(o.amountIn ?? a.amountRaw), min = le(o.minOut ?? 1000n);
  const ix = route === "dbc"
    ? new TransactionInstruction({ programId: new PublicKey(DBC_PROGRAM), keys: [any(), any(), pool, input, output, any(), any(), any(), any(), payer], data: Buffer.from([65, 75, 63, 76, 235, 91, 91, 136, ...amt, ...min, 0]) })
    : new TransactionInstruction({ programId: new PublicKey(DAMM_V2_PROGRAM), keys: [any(), pool, input, output, any(), any(), any(), any(), payer], data: Buffer.from([248, 198, 158, 145, 225, 117, 135, 200, ...amt, ...min]) });
  return new Transaction({ feePayer: a.owner, recentBlockhash: BH }).add(ix);
}

function deps(owner: Keypair, o: { migrated?: boolean; simErr?: unknown; simThrow?: unknown; keyFor?: Keypair; raw?: bigint } = {}) {
  const log = { built: [] as SellRoute[], args: [] as BuildArgs[], simulated: 0, sent: [] as Uint8Array[], steps: [] as string[] };
  const d: SellDeps = {
    owner: async (id) => { assert.equal(id, "w2"); return { address: owner.publicKey.toBase58(), label: "Snipes" }; },
    keypair: async (id) => { assert.equal(id, "w2"); return o.keyFor ?? owner; },
    balance: async () => ({ raw: o.raw ?? 10_000_000_000n, decimals: 6 }),
    target: async () => (o.migrated ? { route: "damm", pool: DAMM_POOL } : { route: "dbc", pool: DBC_POOL }),
    buildDbc: async (a) => { log.built.push("dbc"); log.args.push(a); return fakeSwap("dbc", a); },
    buildDamm: async (a) => { log.built.push("damm"); log.args.push(a); return fakeSwap("damm", a); },
    simulate: async () => { log.simulated++; if (o.simThrow) throw o.simThrow; return { err: o.simErr ?? null, logs: o.simErr ? ["Program log: AnchorError occurred. Error Code: ExceededSlippage. Error Message: Exceeded slippage tolerance."] : [] }; },
    send: async (raw, onSent) => { log.sent.push(raw); onSent("sig"); return "5igTestSignature"; },
    step: (s) => log.steps.push(s),
  };
  return { d, log };
}

test("routing: before migration the DBC builder, after migration the DAMM v2 builder", async () => {
  const kp = Keypair.generate();
  const a = deps(kp);
  const r1 = await runSell({ walletId: "w2", mint: MINT, pct: 50, slippagePct: 10 }, a.d);
  assert.deepEqual(a.log.built, ["dbc"]); assert.equal(r1.route, "dbc"); assert.equal(a.log.args[0].pool, DBC_POOL);
  assert.equal(a.log.args[0].amountRaw, 5_000_000_000n); assert.equal(a.log.args[0].slippageBps, 1000); assert.equal(a.log.args[0].decimals, 6);
  const b = deps(kp, { migrated: true });
  const r2 = await runSell({ walletId: "w2", mint: MINT, pct: 100, slippagePct: 2.5 }, b.d);
  assert.deepEqual(b.log.built, ["damm"]); assert.equal(r2.route, "damm"); assert.equal(b.log.args[0].pool, DAMM_POOL);
  assert.equal(r2.amountRaw, "10000000000"); assert.equal(b.log.args[0].slippageBps, 250);
  assert.deepEqual(b.log.steps, ["build", "sign", "simulate", "send", "confirm"]);
});

test("a failed simulation aborts and never sends", async () => {
  const { d, log } = deps(Keypair.generate(), { simErr: { InstructionError: [0, { Custom: 6001 }] } });
  await assert.rejects(runSell({ walletId: "w2", mint: MINT, pct: 25, slippagePct: 10 }, d), (e: Error) => e instanceof SellAborted && /would fail: the price moved past your slippage\. Nothing was sent\./.test(e.message));
  assert.equal(log.simulated, 1); assert.equal(log.sent.length, 0); assert.ok(!log.steps.includes("send"));
});

test("an RPC error during the simulation: nothing sent, the real reason shown, no custom RPC demand", async () => {
  const notFound = Object.assign(new Error("Method not found"), { code: -32601 });
  const { d, log } = deps(Keypair.generate(), { simThrow: notFound });
  await assert.rejects(runSell({ walletId: "w2", mint: MINT, pct: 25, slippagePct: 10 }, d), (e: Error & { code?: string }) => e.code === "SELL_SIM" && /Method not found/.test(e.message) && !/own RPC|custom RPC/i.test(e.message));
  assert.equal(log.sent.length, 0);
  const t = deps(Keypair.generate(), { migrated: true });
  t.d.buildDamm = async () => { throw notFound; };
  await assert.rejects(runSell({ walletId: "w2", mint: MINT, pct: 25, slippagePct: 10 }, t.d), (e: Error) => e === notFound);
  assert.equal(t.log.simulated, 0); assert.equal(t.log.sent.length, 0);
});

test("the owning wallet signs, and only it", async () => {
  const owner = Keypair.generate(), other = Keypair.generate();
  const { d, log } = deps(owner);
  await runSell({ walletId: "w2", mint: MINT, pct: 50, slippagePct: 10 }, d);
  const tx = Transaction.from(log.sent[0]);
  assert.equal(tx.signatures.length, 1);
  assert.ok(tx.signatures[0].publicKey.equals(owner.publicKey));
  assert.ok(nacl.sign.detached.verify(tx.serializeMessage(), tx.signatures[0].signature!, owner.publicKey.toBytes()));
  assert.ok(!tx.signatures.some((s) => s.publicKey.equals(other.publicKey)));
  // A key that is not the wallet's: refused before anything is built or signed
  const bad = deps(owner, { keyFor: other });
  await assert.rejects(runSell({ walletId: "w2", mint: MINT, pct: 50, slippagePct: 10 }, bad.d), /does not match this wallet/);
  assert.equal(bad.log.built.length, 0); assert.equal(bad.log.sent.length, 0);
});

test("the built tx is checked before signing", () => {
  const owner = Keypair.generate(), a: BuildArgs = { owner: owner.publicKey, pool: DBC_POOL, mint: MINT, amountRaw: 1_000_000n, decimals: 6, slippageBps: 1000 };
  const x = { mint: MINT, pool: DBC_POOL, route: "dbc" as const, amountRaw: 1_000_000n };
  const ok = checkSellTx(fakeSwap("dbc", a), owner.publicKey, x); assert.equal(ok.amountIn, 1_000_000n);
  // the api may round one raw unit down
  checkSellTx(fakeSwap("dbc", a, { amountIn: 999_999n }), owner.publicKey, x);
  const refuse = (tx: Transaction, re: RegExp, y = x) => assert.throws(() => checkSellTx(tx, owner.publicKey, y), (e: Error) => e instanceof SellAborted && re.test(e.message) && /Nothing was signed\.$/.test(e.message));
  refuse(fakeSwap("dbc", a, { amountIn: 1_000_001n }), /amount/);
  refuse(fakeSwap("dbc", a, { minOut: 0n }), /minimum/);
  refuse(fakeSwap("dbc", a, { pool: DAMM_POOL }), /different pool/);
  refuse(fakeSwap("damm", a), /wrong pool type/);
  refuse(fakeSwap("dbc", a, { input: ata(Keypair.generate().publicKey, new PublicKey(MINT)) }), /take the token from this wallet/);
  const drain = fakeSwap("dbc", a).add(SystemProgram.transfer({ fromPubkey: owner.publicKey, toPubkey: Keypair.generate().publicKey, lamports: 1 }));
  refuse(drain, /moves SOL/);
  const other = Keypair.generate(), payerElse = fakeSwap("dbc", a); payerElse.feePayer = other.publicKey; refuse(payerElse, /fee payer/);
  const twoSigners = fakeSwap("dbc", a).add(new TransactionInstruction({ programId: new PublicKey(TOKEN_PROGRAM), keys: [{ pubkey: other.publicKey, isSigner: true, isWritable: false }], data: Buffer.from([9]) }));
  refuse(twoSigners, /signed by this wallet only/);
  const unknown = fakeSwap("dbc", a).add(new TransactionInstruction({ programId: Keypair.generate().publicKey, keys: [], data: Buffer.from([]) }));
  refuse(unknown, /program/);
  assert.equal(decodeSwap(fakeSwap("damm", { ...a, pool: DAMM_POOL }).instructions[0])?.pool, DAMM_POOL);
});

test("fast mode: no simulation step, the built tx is still checked before signing, one send", async () => {
  const kp = Keypair.generate();
  const a = deps(kp);
  await runSell({ walletId: "w2", mint: MINT, pct: 50, slippagePct: 10 }, { ...a.d, fast: true });
  assert.equal(a.log.simulated, 0); assert.equal(a.log.sent.length, 1);
  assert.deepEqual(a.log.steps, ["build", "sign", "send", "confirm"]);
  // a tampered build is refused before anything is signed or sent, fast or not
  const b = deps(kp);
  b.d.buildDbc = async (x) => fakeSwap("dbc", x, { amountIn: x.amountRaw * 2n });
  await assert.rejects(runSell({ walletId: "w2", mint: MINT, pct: 50, slippagePct: 10 }, { ...b.d, fast: true }));
  assert.equal(b.log.sent.length, 0);
});
