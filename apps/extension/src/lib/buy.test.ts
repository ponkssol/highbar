import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { ata, checkBuyTx, DAMM_V2_PROGRAM, DBC_PROGRAM, runBuy, SellAborted, WSOL_MINT, type BuildArgs, type BuyDeps, type SellRoute } from "./sell";

// Generated keypairs only, in memory. Nothing is sent anywhere: "send" below is a recorder.
const BH = "11111111111111111111111111111111";
const MINT = Keypair.generate().publicKey.toBase58(), DBC_POOL = Keypair.generate().publicKey.toBase58(), DAMM_POOL = Keypair.generate().publicKey.toBase58();
const le = (v: bigint) => { const b = new Uint8Array(8); for (let i = 0; i < 8; i++) b[i] = Number((v >> BigInt(8 * i)) & 0xffn); return b; };
const any = () => ({ pubkey: Keypair.generate().publicKey, isSigner: false, isWritable: false });
type Fake = { amountIn?: bigint; minOut?: bigint; output?: PublicKey; wrap?: bigint; wrapTo?: PublicKey };
function fakeBuy(route: SellRoute, a: BuildArgs, o: Fake = {}) {
  const wsol = ata(a.owner, new PublicKey(WSOL_MINT));
  const input = { pubkey: wsol, isSigner: false, isWritable: true }, output = { pubkey: o.output ?? ata(a.owner, new PublicKey(a.mint)), isSigner: false, isWritable: true };
  const pool = { pubkey: new PublicKey(a.pool), isSigner: false, isWritable: true }, payer = { pubkey: a.owner, isSigner: true, isWritable: true };
  const amt = le(o.amountIn ?? a.amountRaw), min = le(o.minOut ?? 1000n);
  const ix = route === "dbc"
    ? new TransactionInstruction({ programId: new PublicKey(DBC_PROGRAM), keys: [any(), any(), pool, input, output, any(), any(), any(), any(), payer], data: Buffer.from([65, 75, 63, 76, 235, 91, 91, 136, ...amt, ...min, 0]) })
    : new TransactionInstruction({ programId: new PublicKey(DAMM_V2_PROGRAM), keys: [any(), pool, input, output, any(), any(), any(), any(), payer], data: Buffer.from([248, 198, 158, 145, 225, 117, 135, 200, ...amt, ...min]) });
  return new Transaction({ feePayer: a.owner, recentBlockhash: BH })
    .add(SystemProgram.transfer({ fromPubkey: a.owner, toPubkey: o.wrapTo ?? wsol, lamports: Number(o.wrap ?? a.amountRaw) })).add(ix);
}
function deps(owner: Keypair, o: { migrated?: boolean; sol?: number; fake?: Fake; simErr?: unknown } = {}) {
  const log = { built: [] as SellRoute[], args: [] as BuildArgs[], sent: 0, simulated: 0, steps: [] as string[] };
  const d: BuyDeps = {
    owner: async () => ({ address: owner.publicKey.toBase58(), label: "Snipes" }),
    keypair: async () => owner,
    solBalance: async () => o.sol ?? 2,
    target: async () => (o.migrated ? { route: "damm", pool: DAMM_POOL } : { route: "dbc", pool: DBC_POOL }),
    buildDbc: async (a) => { log.built.push("dbc"); log.args.push(a); return fakeBuy("dbc", a, o.fake); },
    buildDamm: async (a) => { log.built.push("damm"); log.args.push(a); return fakeBuy("damm", a, o.fake); },
    simulate: async () => { log.simulated++; return { err: o.simErr ?? null, logs: [] }; },
    send: async (_raw, onSent) => { log.sent++; onSent("sig"); return "5igTestSignature"; },
    step: (s) => log.steps.push(s),
  };
  return { d, log };
}

test("buy: DBC before migration, DAMM v2 after, SOL in lamports, simulate before send", async () => {
  const kp = Keypair.generate();
  const a = deps(kp);
  const r = await runBuy({ walletId: "w2", mint: MINT, sol: 0.5, slippagePct: 10 }, a.d);
  assert.deepEqual(a.log.built, ["dbc"]); assert.equal(a.log.args[0].side, "buy"); assert.equal(a.log.args[0].amountRaw, 500_000_000n); assert.equal(a.log.args[0].slippageBps, 1000);
  assert.equal(r.lamports, "500000000"); assert.deepEqual(a.log.steps, ["build", "sign", "simulate", "send", "confirm"]);
  const b = deps(kp, { migrated: true });
  await runBuy({ walletId: "w2", mint: MINT, sol: 1, slippagePct: 2 }, b.d);
  assert.deepEqual(b.log.built, ["damm"]); assert.equal(b.log.args[0].pool, DAMM_POOL);
});

test("buy: not enough SOL, a bad amount or a failed simulation never sends", async () => {
  const kp = Keypair.generate();
  const poor = deps(kp, { sol: 0.1 });
  await assert.rejects(runBuy({ walletId: "w2", mint: MINT, sol: 0.1, slippagePct: 10 }, poor.d), (e: Error) => e instanceof SellAborted && /Not enough SOL in Snipes/.test(e.message));
  assert.equal(poor.log.built.length, 0);
  for (const sol of [0, -1, Number.NaN, 1000]) await assert.rejects(runBuy({ walletId: "w2", mint: MINT, sol, slippagePct: 10 }, deps(kp).d), SellAborted);
  const bad = deps(kp, { simErr: { InstructionError: [0, { Custom: 6001 }] } });
  await assert.rejects(runBuy({ walletId: "w2", mint: MINT, sol: 0.5, slippagePct: 10 }, bad.d), /would fail/);
  assert.equal(bad.log.simulated, 1); assert.equal(bad.log.sent, 0);
});

test("checkBuyTx refuses a wrong amount, output, extra SOL or a transfer elsewhere", async () => {
  const kp = Keypair.generate(), stranger = Keypair.generate().publicKey;
  const cases: [Fake, RegExp][] = [
    [{ amountIn: 900_000_000n }, /amount is not what you picked/],
    [{ output: ata(stranger, new PublicKey(MINT)) }, /does not send the token to this wallet/],
    [{ wrap: 600_000_000n }, /wraps more SOL/],
    [{ wrapTo: stranger }, /moves SOL to another account/],
    [{ minOut: 0n }, /no minimum out/],
  ];
  for (const [fake, re] of cases) {
    const x = deps(kp, { fake });
    await assert.rejects(runBuy({ walletId: "w2", mint: MINT, sol: 0.5, slippagePct: 10 }, x.d), (e: Error) => e instanceof SellAborted && re.test(e.message) && /Nothing was signed/.test(e.message));
    assert.equal(x.log.simulated, 0); assert.equal(x.log.sent, 0);
  }
  const a: BuildArgs = { owner: kp.publicKey, pool: DBC_POOL, mint: MINT, amountRaw: 100_000_000n, decimals: 6, slippageBps: 100, side: "buy" };
  assert.equal(checkBuyTx(fakeBuy("dbc", a), kp.publicKey, { mint: MINT, pool: DBC_POOL, route: "dbc", lamports: 100_000_000n }).amountIn, 100_000_000n);
});

test("no server RPC gating text is left in the trade code", () => {
  for (const f of ["./sell.ts", "../content/holding.ts", "../background/index.ts"]) {
    const src = readFileSync(new URL(f, import.meta.url), "utf8");
    assert.ok(!/own RPC for now|can't sell yet|sellRpc|serverTradeRpc|NEEDS_RPC/.test(src), f);
  }
});
