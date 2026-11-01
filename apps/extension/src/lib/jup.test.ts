import { test } from "node:test";
import assert from "node:assert/strict";
import { ComputeBudgetProgram, Keypair, PublicKey, SystemProgram, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { checkJupTx, checkQuote, JUP_PROGRAM, quotePath, routeLabel, runJupBuy, runJupSell, swapBody, type JupDeps, type JupQuote } from "./jup";
import { ATA_PROGRAM, WSOL_MINT, ata } from "./sell";
import { TOKEN_PROGRAM } from "./rpc";

const MINT = "BkMjuu1cPLzTaLp8uTsR5xE9NttRsKVTqTKyrdKepump";
const owner = Keypair.generate(); // throwaway, never funded
const other = Keypair.generate().publicKey;
const me = owner.publicKey;
const wsol = ata(me, new PublicKey(WSOL_MINT));
const BH = "11111111111111111111111111111111";

const jupIx = () => new TransactionInstruction({ programId: new PublicKey(JUP_PROGRAM), keys: [{ pubkey: me, isSigner: true, isWritable: true }], data: Buffer.from([1, 2, 3]) });
const ataIx = (payer = me, wallet = me) => new TransactionInstruction({ programId: new PublicKey(ATA_PROGRAM), keys: [
  { pubkey: payer, isSigner: true, isWritable: true }, { pubkey: wsol, isSigner: false, isWritable: true }, { pubkey: wallet, isSigner: false, isWritable: false },
  { pubkey: new PublicKey(WSOL_MINT), isSigner: false, isWritable: false }], data: Buffer.from([1]) });
const sync = () => new TransactionInstruction({ programId: new PublicKey(TOKEN_PROGRAM), keys: [{ pubkey: wsol, isSigner: false, isWritable: true }], data: Buffer.from([17]) });
const closeIx = (dest = me, auth = me) => new TransactionInstruction({ programId: new PublicKey(TOKEN_PROGRAM), keys: [
  { pubkey: wsol, isSigner: false, isWritable: true }, { pubkey: dest, isSigner: false, isWritable: true }, { pubkey: auth, isSigner: true, isWritable: false }], data: Buffer.from([9]) });
const cu = (limit = 200_000, microLamports = 5_000) => [ComputeBudgetProgram.setComputeUnitLimit({ units: limit }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports })];
const v0 = (ixs: TransactionInstruction[], payer = me) => new VersionedTransaction(new TransactionMessage({ payerKey: payer, recentBlockhash: BH, instructions: ixs }).compileToV0Message());
const buyTx = (lamports = 10_000_000, to = wsol) => v0([...cu(), ataIx(), SystemProgram.transfer({ fromPubkey: me, toPubkey: to, lamports }), sync(), jupIx(), closeIx()]);

test("jup: a normal buy and sell pass the checks", () => {
  const r = checkJupTx(buyTx(), me, { side: "buy", lamports: 10_000_000n });
  assert.equal(r.jup, 1); assert.equal(r.moved, 10_000_000n); assert.equal(r.priority, 1000n);
  assert.equal(checkJupTx(v0([...cu(), ataIx(), jupIx(), closeIx()]), me, { side: "sell" }).moved, 0n);
});

test("jup: refuses a tx paid by someone else, an unknown program or no Jupiter instruction", () => {
  assert.throws(() => checkJupTx(v0([jupIx()], other), me, { side: "sell" }), /paid and signed by this wallet/);
  const memo = new TransactionInstruction({ programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"), keys: [], data: Buffer.from("x") });
  assert.throws(() => checkJupTx(v0([memo, jupIx()]), me, { side: "sell" }), /program it should not/);
  assert.throws(() => checkJupTx(v0([...cu(), sync()]), me, { side: "sell" }), /no Jupiter instruction/);
});

test("jup: SOL moves only into the owner's wrapped SOL account, never on a sell, at most the amount", () => {
  assert.throws(() => checkJupTx(buyTx(10_000_000, other), me, { side: "buy", lamports: 10_000_000n }), /SOL to another account/);
  assert.throws(() => checkJupTx(buyTx(20_000_000), me, { side: "buy", lamports: 10_000_000n }), /more SOL than you picked/);
  assert.throws(() => checkJupTx(buyTx(), me, { side: "sell" }), /moves SOL out/);
});

test("jup: token accounts close and get created only for the owner, priority fee capped", () => {
  assert.throws(() => checkJupTx(v0([jupIx(), closeIx(other)]), me, { side: "sell" }), /closes a token account to someone else/);
  assert.throws(() => checkJupTx(v0([ataIx(me, other), jupIx()]), me, { side: "sell" }), /creates a token account for someone else/);
  const xfer = new TransactionInstruction({ programId: new PublicKey(TOKEN_PROGRAM), keys: [{ pubkey: wsol, isSigner: false, isWritable: true }], data: Buffer.from([3, 1, 0, 0, 0, 0, 0, 0, 0]) });
  assert.throws(() => checkJupTx(v0([xfer, jupIx()]), me, { side: "sell" }), /token instruction it should not/);
  assert.throws(() => checkJupTx(v0([...cu(1_400_000, 2_000_000), jupIx()]), me, { side: "sell" }), /priority fee is too high/);
});

const q = (o: Partial<JupQuote> = {}): JupQuote => ({ inputMint: WSOL_MINT, outputMint: MINT, inAmount: "10000000", outAmount: "5000", otherAmountThreshold: "4950", swapMode: "ExactIn", slippageBps: 100,
  routePlan: [{ swapInfo: { label: "Meteora DAMM v2" } }, { swapInfo: { label: "Meteora DAMM v2" } }], ...o });

test("jup: the quote must be the asked swap", () => {
  const x = { input: WSOL_MINT, output: MINT, amount: 10_000_000n, bps: 100 };
  assert.deepEqual(checkQuote(q(), x), { inAmount: 10_000_000n, minOut: 4950n });
  assert.throws(() => checkQuote(q({ outputMint: WSOL_MINT }), x), /other tokens/);
  assert.throws(() => checkQuote(q({ swapMode: "ExactOut" }), x), /exact amount in/);
  assert.throws(() => checkQuote(q({ inAmount: "9" }), x), /not what you picked/);
  assert.throws(() => checkQuote(q({ otherAmountThreshold: "0" }), x), /no minimum out/);
  assert.throws(() => checkQuote(q({ slippageBps: 5000 }), x), /another slippage/);
  assert.equal(routeLabel(q()), "Meteora DAMM v2");
  assert.equal(routeLabel(q({ routePlan: [] })), "Jupiter");
});

test("jup: request shapes", () => {
  assert.equal(quotePath(WSOL_MINT, MINT, 5n, 100), `/quote?inputMint=${WSOL_MINT}&outputMint=${MINT}&amount=5&slippageBps=100&swapMode=ExactIn&restrictIntermediateTokens=true`);
  const b = swapBody(q(), me.toBase58());
  assert.equal(b.userPublicKey, me.toBase58()); assert.equal(b.wrapAndUnwrapSol, true);
  assert.equal(b.prioritizationFeeLamports.priorityLevelWithMaxLamports.maxLamports, 1_000_000);
});

function deps(o: Partial<JupDeps> & { tx?: VersionedTransaction; lamportsAfter?: number | null; simErr?: unknown } = {}) {
  const calls: string[] = [];
  const d: JupDeps = {
    owner: async () => ({ address: me.toBase58(), label: "Wallet 1" }),
    keypair: async () => owner,
    solLamports: async () => 1_000_000_000,
    tokenBalance: async () => ({ raw: 1_000_000n, decimals: 6 }),
    quote: async (i, out, amount, bps) => { calls.push("quote"); return q({ inputMint: i, outputMint: out, inAmount: String(amount), slippageBps: bps }); },
    swapTx: async () => { calls.push("swap"); return Buffer.from((o.tx ?? buyTx()).serialize()).toString("base64"); },
    simulate: async (raw) => { calls.push("simulate"); assert.ok(VersionedTransaction.deserialize(raw).signatures[0].some((b) => b !== 0)); return { err: o.simErr ?? null, logs: [], lamportsAfter: o.lamportsAfter ?? null }; },
    send: async () => { calls.push("send"); return "sig"; },
    ...o,
  };
  return { d, calls };
}

test("jup: buy runs quote, build, check, sign, simulate, then send (send is a mock)", async () => {
  const { d, calls } = deps();
  const r = await runJupBuy({ walletId: "w1", mint: MINT, sol: 0.01, slippagePct: 1 }, d);
  assert.deepEqual(calls, ["quote", "swap", "simulate", "send"]);
  assert.equal(r.route, "Meteora DAMM v2"); assert.equal(r.amountRaw, "10000000");
});

test("jup: nothing is sent when the simulation fails or spends too much", async () => {
  const a = deps({ simErr: { InstructionError: [0, "Custom"] } });
  await assert.rejects(runJupBuy({ walletId: "w1", mint: MINT, sol: 0.01, slippagePct: 1 }, a.d), /would fail/);
  assert.ok(!a.calls.includes("send"));
  const b = deps({ lamportsAfter: 1_000_000_000 - 50_000_000 });
  await assert.rejects(runJupBuy({ walletId: "w1", mint: MINT, sol: 0.01, slippagePct: 1 }, b.d), /more SOL than expected/);
  assert.ok(!b.calls.includes("send"));
  const c = deps({ tx: buyTx(10_000_000, other) });
  await assert.rejects(runJupBuy({ walletId: "w1", mint: MINT, sol: 0.01, slippagePct: 1 }, c.d), /another account/);
  assert.deepEqual(c.calls, ["quote", "swap"]);
});

test("jup: sell sells the picked share of the balance and refuses a SOL transfer", async () => {
  const sell = deps({ tx: v0([...cu(), jupIx(), closeIx()]) });
  const r = await runJupSell({ walletId: "w1", mint: MINT, pct: 50, slippagePct: 1 }, sell.d);
  assert.equal(r.amountRaw, "500000");
  const bad = deps({ tx: buyTx() });
  await assert.rejects(runJupSell({ walletId: "w1", mint: MINT, pct: 50, slippagePct: 1 }, bad.d), /moves SOL out/);
  assert.ok(!bad.calls.includes("send"));
  await assert.rejects(runJupBuy({ walletId: "w1", mint: WSOL_MINT, sol: 0.01, slippagePct: 1 }, deps().d), /SOL itself/);
  await assert.rejects(runJupBuy({ walletId: "w1", mint: MINT, sol: 0, slippagePct: 1 }, deps().d), /Pick an amount/);
});
