import { test } from "node:test";
import assert from "node:assert/strict";
import { AddressLookupTableAccount, ComputeBudgetProgram, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { addLegacyFee, addV0Fee, cacheExtFee, EXT_FEE_BPS, extFeeLamports, FEE_LABEL, feeForSol, feeLeg, feeSol, launchFee, readExtFee, TX_MAX_BYTES } from "./fee";
import { ata, checkBuyTx, checkSellTx, DBC_PROGRAM, runBuy, runSell, WSOL_MINT, type BuildArgs, type BuyDeps, type SellDeps } from "./sell";
import { checkJupTx, JUP_PROGRAM, runJupBuy, runJupSell, type JupDeps, type JupQuote } from "./jup";
import { addLaunchFee, checkLaunchTx, launchDevBuyLamports } from "./txcheck";
import { TOKEN_PROGRAM } from "./rpc";

// Generated keypairs only, in memory. Nothing is sent anywhere: "send" is a recorder.
const BH = "11111111111111111111111111111111";
const owner = Keypair.generate(), me = owner.publicKey, RECEIVER = Keypair.generate().publicKey, other = Keypair.generate().publicKey;
const CFG = { bps: 2, receiver: RECEIVER.toBase58(), enabled: true };
const EXT = readExtFee(CFG)!;
const le = (v: bigint) => { const b = new Uint8Array(8); for (let i = 0; i < 8; i++) b[i] = Number((v >> BigInt(8 * i)) & 0xffn); return b; };
const any = () => ({ pubkey: Keypair.generate().publicKey, isSigner: false, isWritable: false });
const fee = (lamports: bigint | number, to = RECEIVER, from = me) => SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports: BigInt(lamports) });

test("fee math: same vectors and rounding as @hb/shared extFeeLamports", () => {
  assert.equal(EXT_FEE_BPS, 2);
  assert.equal(extFeeLamports(0), 0n); assert.equal(extFeeLamports(0n), 0n);
  assert.equal(extFeeLamports(4999), 0n); assert.equal(extFeeLamports(5000), 1n); assert.equal(extFeeLamports(9999), 1n); assert.equal(extFeeLamports(10000), 2n);
  assert.equal(extFeeLamports(1_000_000_000), 200_000n); assert.equal(extFeeLamports(100_000_000n), 20_000n);
  assert.equal(extFeeLamports(18_446_744_073_709_551_615n), 3_689_348_814_741_910n); // u64 max, floor
  assert.throws(() => extFeeLamports(-1)); assert.throws(() => extFeeLamports(1.5)); assert.throws(() => extFeeLamports(2 ** 60));
  assert.equal(feeForSol(0.5), 100_000n); assert.equal(feeForSol(0.1), 20_000n); assert.equal(feeForSol(0), 0n); assert.equal(feeForSol(NaN), 0n);
  assert.equal(feeSol(100_000n), "0.0001 SOL"); assert.equal(feeSol(1n), "0.000000001 SOL"); assert.equal(feeSol(0n), "0 SOL");
  assert.equal(FEE_LABEL, "highbar fee 0.02%");
});

test("fee config: only an enabled API extFee with a valid receiver at 2 bps turns it on (missing = off, current production)", () => {
  assert.deepEqual(readExtFee(CFG), { receiver: RECEIVER.toBase58(), bps: 2 });
  for (const v of [undefined, null, {}, "x", { bps: 2, receiver: null, enabled: false }, { bps: 2, receiver: RECEIVER.toBase58(), enabled: false },
    { bps: 3, receiver: RECEIVER.toBase58(), enabled: true }, { bps: 2, receiver: "not-a-key", enabled: true }, { bps: 2, receiver: RECEIVER.toBase58(), enabled: "true" }])
    assert.equal(readExtFee(v), null, JSON.stringify(v));
  assert.equal(feeLeg(null, 1_000_000_000n), null, "no receiver: no fee");
  assert.equal(feeLeg(EXT, 4999n), null, "rounds to 0: no fee");
  assert.equal(feeLeg(EXT, 1_000_000_000n)!.lamports, 200_000n);
});

// ---- DBC / DAMM (legacy tx from the api or built locally) ----
const MINT = Keypair.generate().publicKey.toBase58(), POOL = Keypair.generate().publicKey.toBase58();
const wsol = ata(me, new PublicKey(WSOL_MINT));
function dbc(input: PublicKey, output: PublicKey, amountIn: bigint, minOut: bigint) {
  return new TransactionInstruction({ programId: new PublicKey(DBC_PROGRAM), keys: [any(), any(), { pubkey: new PublicKey(POOL), isSigner: false, isWritable: true }, { pubkey: input, isSigner: false, isWritable: true }, { pubkey: output, isSigner: false, isWritable: true }, any(), any(), any(), any(), { pubkey: me, isSigner: true, isWritable: true }], data: Buffer.from([65, 75, 63, 76, 235, 91, 91, 136, ...le(amountIn), ...le(minOut), 0]) });
}
const buyTx = (lamports: bigint) => new Transaction({ feePayer: me, recentBlockhash: BH }).add(SystemProgram.transfer({ fromPubkey: me, toPubkey: wsol, lamports })).add(dbc(wsol, ata(me, new PublicKey(MINT)), lamports, 1000n));
const sellTx = (raw: bigint, minOut: bigint) => new Transaction({ feePayer: me, recentBlockhash: BH }).add(dbc(ata(me, new PublicKey(MINT)), wsol, raw, minOut));
const B = { mint: MINT, pool: POOL, route: "dbc" as const };

test("guards (DBC/DAMM buy): exactly one fee transfer, last, from the wallet, to the receiver, exact amount; everything else refused", () => {
  const L = 500_000_000n, F = extFeeLamports(L);
  assert.equal(checkBuyTx(buyTx(L).add(fee(F)), me, { ...B, lamports: L, feeReceiver: RECEIVER.toBase58() }).feeLamports, 100_000n);
  assert.equal(checkBuyTx(buyTx(L), me, { ...B, lamports: L, feeReceiver: RECEIVER.toBase58() }).feeLamports, 0n, "size-skipped fee is fine");
  const rejects = (t: Transaction, re: RegExp, recv: string | null = RECEIVER.toBase58()) => assert.throws(() => checkBuyTx(t, me, { ...B, lamports: L, feeReceiver: recv }), re);
  rejects(buyTx(L).add(fee(F)), /another account/, null); // fee off: a transfer to the receiver is just SOL leaving
  rejects(buyTx(L).add(fee(F + 1n)), /fee amount is wrong/);
  rejects(buyTx(L).add(fee(F - 1n)), /fee amount is wrong/);
  rejects(buyTx(L).add(fee(F, other)), /another account/);
  rejects(buyTx(L).add(fee(F)).add(fee(F)), /more than one|not the last/);
  rejects(new Transaction({ feePayer: me, recentBlockhash: BH }).add(fee(F)).add(...buyTx(L).instructions), /not the last/);
  rejects(buyTx(L).add(fee(F, RECEIVER, other)), /signed by this wallet only|not paid by this wallet/);
});

test("guards (DBC/DAMM sell): the fee is 0.02% of the minimum SOL out, nothing else may leave", () => {
  const MIN = 123_456_789n, F = extFeeLamports(MIN);
  const r = checkSellTx(sellTx(1000n, MIN).add(fee(F)), me, { ...B, amountRaw: 1000n, feeReceiver: RECEIVER.toBase58() });
  assert.equal(r.feeLamports, 24_691n);
  assert.throws(() => checkSellTx(sellTx(1000n, MIN).add(fee(F)), me, { ...B, amountRaw: 1000n }), /moves SOL out/);
  assert.throws(() => checkSellTx(sellTx(1000n, MIN).add(fee(F + 1n)), me, { ...B, amountRaw: 1000n, feeReceiver: RECEIVER.toBase58() }), /fee amount is wrong/);
  assert.throws(() => checkSellTx(sellTx(1000n, MIN).add(fee(F, other)), me, { ...B, amountRaw: 1000n, feeReceiver: RECEIVER.toBase58() }), /moves SOL out/);
  assert.throws(() => checkSellTx(sellTx(1000n, MIN).add(fee(F)).add(fee(F)), me, { ...B, amountRaw: 1000n, feeReceiver: RECEIVER.toBase58() }), /moves SOL out|more than one/);
});

function legacyDeps(fx: { recv: typeof EXT | null }) {
  const sent: Transaction[] = [];
  const base = {
    owner: async () => ({ address: me.toBase58(), label: "W" }), keypair: async () => owner,
    target: async () => ({ route: "dbc" as const, pool: POOL }),
    buildDbc: async (a: BuildArgs) => (a.side === "buy" ? buyTx(a.amountRaw) : sellTx(a.amountRaw, 2_000_000_000n)),
    buildDamm: async () => { throw new Error("no"); },
    simulate: async (raw: Uint8Array) => { sent.push(Transaction.from(raw)); return { err: null }; },
    send: async (_r: Uint8Array, on: (s: string) => void) => { on("s"); return "sig"; },
    fee: async () => fx.recv,
  };
  return { sent, buy: { ...base, solBalance: async () => 2 } as BuyDeps, sell: { ...base, balance: async () => ({ raw: 1_000_000n, decimals: 6 }) } as SellDeps };
}
test("runBuy/runSell: the fee transfer is appended last when enabled, absent when the API names no receiver", async () => {
  const on = legacyDeps({ recv: EXT });
  const b = await runBuy({ walletId: "w", mint: MINT, sol: 0.5, slippagePct: 5 }, on.buy);
  assert.equal(b.feeLamports, "100000");
  const last = on.sent[0].instructions.at(-1)!;
  assert.ok(last.programId.equals(SystemProgram.programId) && last.keys[1].pubkey.equals(RECEIVER));
  const s = await runSell({ walletId: "w", mint: MINT, pct: 100, slippagePct: 5 }, on.sell);
  assert.equal(s.feeLamports, extFeeLamports(2_000_000_000n).toString());
  const off = legacyDeps({ recv: null });
  assert.equal((await runBuy({ walletId: "w", mint: MINT, sol: 0.5, slippagePct: 5 }, off.buy)).feeLamports, "0");
  const noCb = (t: Transaction) => t.instructions.filter((ix) => !ix.programId.equals(ComputeBudgetProgram.programId)).length;
  assert.equal(noCb(off.sent[0]), 2, "no fee instruction without a receiver");
  assert.equal((await runSell({ walletId: "w", mint: MINT, pct: 100, slippagePct: 5 }, off.sell)).feeLamports, "0");
  assert.equal(noCb(off.sent[1]), 1);
});

// ---- Jupiter (v0 + lookup tables) ----
const jupIx = (extra: PublicKey[] = []) => new TransactionInstruction({ programId: new PublicKey(JUP_PROGRAM), keys: [{ pubkey: me, isSigner: true, isWritable: true }, ...extra.map((pubkey) => ({ pubkey, isSigner: false, isWritable: true }))], data: Buffer.from([1, 2, 3]) });
const sync = () => new TransactionInstruction({ programId: new PublicKey(TOKEN_PROGRAM), keys: [{ pubkey: wsol, isSigner: false, isWritable: true }], data: Buffer.from([17]) });
const close = () => new TransactionInstruction({ programId: new PublicKey(TOKEN_PROGRAM), keys: [{ pubkey: wsol, isSigner: false, isWritable: true }, { pubkey: me, isSigner: false, isWritable: true }, { pubkey: me, isSigner: true, isWritable: false }], data: Buffer.from([9]) });
const routeKeys = Array.from({ length: 30 }, () => Keypair.generate().publicKey);
const alt = new AddressLookupTableAccount({ key: Keypair.generate().publicKey, state: { deactivationSlot: 2n ** 64n - 1n, lastExtendedSlot: 0, lastExtendedSlotStartIndex: 0, addresses: routeKeys } });
const cu = () => [ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 })];
const v0 = (ixs: TransactionInstruction[]) => new VersionedTransaction(new TransactionMessage({ payerKey: me, recentBlockhash: BH, instructions: ixs }).compileToV0Message([alt]));
const jBuy = (l: bigint) => v0([...cu(), SystemProgram.transfer({ fromPubkey: me, toPubkey: wsol, lamports: l }), sync(), jupIx(routeKeys), close()]);
const jSell = () => v0([...cu(), jupIx(routeKeys), close()]);

test("jupiter: the fee goes in as a System transfer (no receiver token account), lookup tables kept, guards accept only that", () => {
  const L = 10_000_000n, F = extFeeLamports(L);
  const out = addV0Fee(jBuy(L), me, feeLeg(EXT, L), [alt])!;
  assert.ok(out, "rebuilt");
  assert.equal(out.message.addressTableLookups.length, 1, "route accounts stay behind the table");
  assert.equal(checkJupTx(out, me, { side: "buy", lamports: L, feeReceiver: RECEIVER.toBase58() }).fee, F);
  assert.throws(() => checkJupTx(out, me, { side: "buy", lamports: L }), /another account/, "fee off: refused");
  const wrong = addV0Fee(jBuy(L), me, { receiver: RECEIVER, lamports: F + 1n }, [alt])!;
  assert.throws(() => checkJupTx(wrong, me, { side: "buy", lamports: L, feeReceiver: RECEIVER.toBase58() }), /fee amount is wrong/);
  const elsewhere = addV0Fee(jBuy(L), me, { receiver: other, lamports: F }, [alt])!;
  assert.throws(() => checkJupTx(elsewhere, me, { side: "buy", lamports: L, feeReceiver: RECEIVER.toBase58() }), /another account/);
  const early = v0([...cu(), fee(F), SystemProgram.transfer({ fromPubkey: me, toPubkey: wsol, lamports: L }), sync(), jupIx(routeKeys), close()]);
  assert.throws(() => checkJupTx(early, me, { side: "buy", lamports: L, feeReceiver: RECEIVER.toBase58() }), /not the last/);
  // sell: basis = quoted minimum SOL out
  const MIN = 77_777_777n;
  const s = addV0Fee(jSell(), me, feeLeg(EXT, MIN), [alt])!;
  assert.equal(checkJupTx(s, me, { side: "sell", minOut: MIN, feeReceiver: RECEIVER.toBase58() }).fee, extFeeLamports(MIN));
  assert.throws(() => checkJupTx(s, me, { side: "sell", minOut: MIN + 10_000n, feeReceiver: RECEIVER.toBase58() }), /fee amount is wrong/);
  assert.throws(() => checkJupTx(s, me, { side: "sell", minOut: MIN }), /moves SOL out/);
  assert.equal(addV0Fee(jBuy(L), me, feeLeg(EXT, L), []), null, "a missing lookup table: no rebuild");
});

const jq = (o: Partial<JupQuote>): JupQuote => ({ inputMint: WSOL_MINT, outputMint: MINT, inAmount: "10000000", outAmount: "5000", otherAmountThreshold: "4950", swapMode: "ExactIn", slippageBps: 100, ...o });
function jupDeps(tx: VersionedTransaction, recv: typeof EXT | null, quote: JupQuote, lamportsAfter: number | null = null) {
  const log = { simulated: [] as VersionedTransaction[], sent: 0 };
  const d: JupDeps = {
    owner: async () => ({ address: me.toBase58(), label: "W" }), keypair: async () => owner,
    solLamports: async () => 2e9, tokenBalance: async () => ({ raw: 1_000_000n, decimals: 6 }),
    quote: async () => quote, swapTx: async () => Buffer.from(tx.serialize()).toString("base64"),
    simulate: async (raw) => { log.simulated.push(VersionedTransaction.deserialize(raw)); return { err: null, lamportsAfter }; },
    send: async (_r, on) => { log.sent++; on("s"); return "sig"; },
    fee: async () => recv, lookupTables: async () => [alt],
  };
  return { d, log };
}
test("runJupBuy/runJupSell: fee appended and charged, sim spend limit includes it, off without a receiver", async () => {
  const L = 10_000_000n;
  const a = jupDeps(jBuy(L), EXT, jq({}), 2e9 - Number(L) - 20_000_000 - 2000 - 1000);
  const r = await runJupBuy({ walletId: "w", mint: MINT, sol: 0.01, slippagePct: 1 }, a.d);
  assert.equal(r.feeLamports, "2000"); assert.equal(r.priorityLamports, "1000"); assert.equal(a.log.sent, 1, "spend = amount + fee + priority + slack passes");
  const over = jupDeps(jBuy(L), EXT, jq({}), 2e9 - Number(L) - 20_000_000 - 2001 - 1000);
  await assert.rejects(runJupBuy({ walletId: "w", mint: MINT, sol: 0.01, slippagePct: 1 }, over.d), /more SOL than expected/);
  const s = jupDeps(jSell(), EXT, jq({ inputMint: MINT, outputMint: WSOL_MINT, inAmount: "1000000", otherAmountThreshold: "250000000" }));
  assert.equal((await runJupSell({ walletId: "w", mint: MINT, pct: 100, slippagePct: 1 }, s.d)).feeLamports, "50000");
  const off = jupDeps(jBuy(L), null, jq({}));
  assert.equal((await runJupBuy({ walletId: "w", mint: MINT, sol: 0.01, slippagePct: 1 }, off.d)).feeLamports, "0");
  assert.equal(off.log.simulated[0].message.compiledInstructions.length, jBuy(L).message.compiledInstructions.length);
});

// ---- launch dev buy ----
function launchTx(mint: PublicKey, devBuy: bigint | null, padIxs = 0) {
  const t = new Transaction({ feePayer: me, recentBlockhash: BH });
  t.add(new TransactionInstruction({ programId: new PublicKey(DBC_PROGRAM), keys: [{ pubkey: mint, isSigner: true, isWritable: true }, { pubkey: me, isSigner: true, isWritable: true }], data: Buffer.alloc(40, 1) }));
  for (let i = 0; i < padIxs; i++) t.add(new TransactionInstruction({ programId: new PublicKey(DBC_PROGRAM), keys: [any()], data: Buffer.alloc(60, 2) }));
  if (devBuy !== null) {
    t.add(SystemProgram.transfer({ fromPubkey: me, toPubkey: wsol, lamports: devBuy })).add(sync());
    t.add(new TransactionInstruction({ programId: new PublicKey(DBC_PROGRAM), keys: [{ pubkey: me, isSigner: true, isWritable: true }], data: Buffer.from([...Array(8).fill(7), ...le(devBuy), ...le(1n)]) }));
    t.add(close());
  }
  return t;
}
test("launch: the dev buy fee is appended last when allowed and it fits; skipped above 1232 bytes; guard exact", () => {
  const mint = Keypair.generate().publicKey;
  const t = launchTx(mint, 100_000_000n);
  assert.equal(launchDevBuyLamports(t), 100_000_000n);
  assert.equal(launchDevBuyLamports(launchTx(mint, null)), null);
  const ext = { bps: 2, lamports: "20000", sol: 0.00002, receiver: RECEIVER.toBase58(), allowed: true };
  const leg = launchFee(ext, EXT, 100_000_000n)!;
  assert.equal(leg.lamports, 20_000n);
  assert.equal(launchFee({ ...ext, allowed: false }, EXT, 100_000_000n), null, "random-mint path / no dev buy: allowed false");
  assert.equal(launchFee({ ...ext, receiver: other.toBase58() }, EXT, 100_000_000n), null, "receiver must match GET /config");
  assert.equal(launchFee({ ...ext, lamports: "20001" }, EXT, 100_000_000n), null, "amount must match the local math");
  assert.equal(launchFee(ext, null, 100_000_000n), null, "no /config receiver: no fee");
  assert.equal(launchFee(undefined, EXT, 100_000_000n), null, "production api without extFee: no fee");
  assert.equal(launchFee({ ...ext, lamports: "0", allowed: false }, EXT, 4999n), null);
  const before = t.instructions.length;
  assert.equal(addLaunchFee(t, me, leg), true);
  assert.equal(t.instructions.length, before + 1);
  assert.ok(t.instructions.at(-1)!.keys[1].pubkey.equals(RECEIVER));
  // size-skip: a launch tx already close to 1232 bytes gets no fee (and stays untouched)
  let pad = 0, big = launchTx(mint, 100_000_000n, pad);
  while (big.serialize({ requireAllSignatures: false, verifySignatures: false }).length + 49 <= TX_MAX_BYTES) big = launchTx(mint, 100_000_000n, ++pad);
  const size = big.serialize({ requireAllSignatures: false, verifySignatures: false }).length, n = big.instructions.length;
  assert.ok(size <= TX_MAX_BYTES && size + 49 > TX_MAX_BYTES);
  assert.equal(addLaunchFee(big, me, leg), false, `size ${size} + fee would pass 1232`);
  assert.equal(big.instructions.length, n);
  assert.equal(addLegacyFee(launchTx(mint, 100_000_000n), me, null), false, "no leg: nothing added");
});

test("launch guard: SOL moves only into the wallet's WSOL account and through the one exact fee transfer", () => {
  // A real "...high" mint is ground by the API; here the vanity rule is bypassed by checking a mint string that ends in "high"
  // and signs the tx (base58 decode of random chars + "high", as wallet.test.ts does).
  const A = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let mint: PublicKey;
  for (;;) { let s = ""; for (let i = 0; i < 40; i++) s += A[Math.floor(Math.random() * 58)]; try { const k = new PublicKey(s + "high"); if (k.toBase58() === s + "high") { mint = k; break; } } catch { /* retry */ } }
  const m = mint.toBase58(), L = 100_000_000n, F = extFeeLamports(L), leg = { receiver: RECEIVER, lamports: F };
  checkLaunchTx(launchTx(mint, L), me, m);
  checkLaunchTx(launchTx(mint, L).add(fee(F)), me, m, leg);
  checkLaunchTx(launchTx(mint, null), me, m, leg);
  assert.throws(() => checkLaunchTx(launchTx(mint, L).add(fee(F)), me, m), /another account/, "the API's tx may not carry a fee");
  assert.throws(() => checkLaunchTx(launchTx(mint, L).add(fee(F + 1n)), me, m, leg), /amount is wrong/);
  assert.throws(() => checkLaunchTx(launchTx(mint, L).add(fee(F, other)), me, m, leg), /another account/);
  assert.throws(() => checkLaunchTx(launchTx(mint, L).add(fee(F)).add(fee(F)), me, m, leg), /more than one|not the last/);
  const early = launchTx(mint, L); early.instructions.splice(1, 0, fee(F));
  assert.throws(() => checkLaunchTx(early, me, m, leg), /not the last/);
});

// ---- priority fee (ComputeBudget limit + price) ----
import { budgetIxs, cuPrice, CU_LIMIT, priorityCost, priorityError, priorityLamports, readBudget, readPrioritySol, setLegacyBudget, tightLimit, COMPUTE_BUDGET_ID } from "./priority";
import { costsText, extraCosts } from "./costs";
const cbOf = (t: Transaction) => t.instructions.filter((ix) => ix.programId.toBase58() === COMPUTE_BUDGET_ID);
const budgetOf = (t: Transaction) => readBudget(t.instructions.map((ix) => ({ program: ix.programId.toBase58(), data: ix.data, keys: ix.keys.length })));

test("priority math: price = floor(lamports x 1e6 / limit), never costs more than picked; limits from the simulation x 1.2", () => {
  assert.equal(priorityLamports(0.0001), 100_000n); assert.equal(priorityLamports(0.005), 5_000_000n); assert.equal(priorityLamports(0.2), 100_000n, "above 0.1: default");
  assert.equal(cuPrice(100_000n, 200_000), 500_000n); assert.equal(cuPrice(100_000n, 60_000), 1_666_666n);
  assert.ok(priorityCost(cuPrice(100_000n, 60_000), 60_000) <= 100_000n);
  assert.equal(tightLimit(50_000, CU_LIMIT.dbc), 60_000); assert.equal(tightLimit(10, CU_LIMIT.dbc), 30_000); assert.equal(tightLimit(190_000, CU_LIMIT.dbc), 200_000); assert.equal(tightLimit(null, CU_LIMIT.damm), 250_000);
  assert.equal(readPrioritySol("0.005"), 0.005); assert.equal(readPrioritySol(-1), 0.0001); assert.equal(readPrioritySol(true), 0.0001); assert.equal(readPrioritySol(0), 0);
  assert.equal(priorityError("0.2"), "Max 0.1 SOL"); assert.equal(priorityError("abc"), "Enter a SOL amount"); assert.equal(priorityError("0.001"), null);
  assert.equal(budgetIxs(200_000, 0n).length, 1, "0 SOL: a limit, no price");
});

test("priority: replaces the builder's compute budget (never two), skipped when signed or over 1232 bytes; guards read it back", () => {
  const t = buyTx(10_000_000n);
  t.instructions.unshift(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 9 }), ComputeBudgetProgram.setComputeUnitLimit({ units: 999 }));
  assert.equal(setLegacyBudget(t, 200_000, 1_000_000n), true);
  assert.equal(cbOf(t).length, 2); assert.ok(t.instructions[0].programId.toBase58() === COMPUTE_BUDGET_ID && t.instructions[1].programId.toBase58() === COMPUTE_BUDGET_ID);
  assert.deepEqual(budgetOf(t), { limit: 200_000, price: 5_000_000n, lamports: 1_000_000n });
  assert.equal(setLegacyBudget(t, 100_000, 1_000_000n), true); assert.equal(cbOf(t).length, 2, "set twice: still one of each");
  // guards
  const mk = (...ixs: TransactionInstruction[]) => readBudget(ixs.map((ix) => ({ program: ix.programId.toBase58(), data: ix.data, keys: ix.keys.length })), 1_000_000n);
  assert.throws(() => mk(...budgetIxs(200_000, 1000n), ...budgetIxs(200_000, 1000n)), /two compute unit/);
  assert.throws(() => mk(ComputeBudgetProgram.requestHeapFrame({ bytes: 64 * 1024 })), /unknown compute budget/);
  assert.throws(() => mk(...budgetIxs(200_000, 2_000_000n)), /above your setting/);
  assert.throws(() => readBudget(budgetIxs(1_400_000, 200_000_000n).map((ix) => ({ program: ix.programId.toBase58(), data: ix.data, keys: 0 }))), /above the 0.1 SOL max/);
  // signed: untouched
  const s = buyTx(10_000_000n); s.sign(owner);
  assert.equal(setLegacyBudget(s, 200_000, 1000n), false); assert.equal(cbOf(s).length, 0);
});

test("runBuy/runSell: priority set before the fee, guard bounded by the setting, limit tightened to simulated units x 1.2", async () => {
  const sent: Transaction[] = [], simmed: Transaction[] = [];
  const base = legacyDeps({ recv: EXT });
  const deps = { ...base.buy, simulate: async (raw: Uint8Array) => { simmed.push(Transaction.from(raw)); return { err: null, unitsConsumed: 50_000 }; },
    send: async (raw: Uint8Array, on: (s: string) => void) => { sent.push(Transaction.from(raw)); on("s"); return "sig"; } } as BuyDeps;
  const r = await runBuy({ walletId: "w", mint: MINT, sol: 0.5, slippagePct: 5, prioritySol: 0.001 }, deps);
  assert.equal(budgetOf(simmed[0]).limit, CU_LIMIT.dbc, "simulated with the path's limit");
  const b = budgetOf(sent[0]);
  assert.equal(b.limit, 60_000); assert.equal(b.price, cuPrice(1_000_000n, 60_000)); assert.ok(b.lamports <= 1_000_000n);
  assert.equal(r.cuLimit, 60_000); assert.equal(r.feeLamports, "100000");
  const last = sent[0].instructions.at(-1)!; assert.ok(last.keys[1].pubkey.equals(RECEIVER), "fee stays last");
  assert.ok(sent[0].verifySignatures(), "re-signed after the tighter limit");
  const s = await runSell({ walletId: "w", mint: MINT, pct: 100, slippagePct: 5, prioritySol: 0 }, base.sell);
  assert.equal(cbOf(base.sent.at(-1)!).length, 1, "0 SOL priority: only a limit"); assert.ok(s.signature);
});

test("launch: priority + fee pass the guard; a priority above the setting is refused", () => {
  const A = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let mint: PublicKey;
  for (;;) { let s = ""; for (let i = 0; i < 40; i++) s += A[Math.floor(Math.random() * 58)]; try { const k = new PublicKey(s + "high"); if (k.toBase58() === s + "high") { mint = k; break; } } catch { /* retry */ } }
  const m = mint.toBase58(), L = 100_000_000n, leg = { receiver: RECEIVER, lamports: extFeeLamports(L) };
  const t = launchTx(mint, L);
  assert.equal(setLegacyBudget(t, CU_LIMIT.launch, 1_000_000n), true);
  assert.equal(addLaunchFee(t, me, leg), true);
  checkLaunchTx(t, me, m, leg, 1_000_000n);
  assert.throws(() => checkLaunchTx(t, me, m, leg, 500_000n), /bad priority fee \(priority fee above your setting\)/);
  // near 1232 bytes: the fee is dropped first (priority kept), no tip is ever added
  let pad = 0, big = launchTx(mint, L, pad);
  while (big.serialize({ requireAllSignatures: false, verifySignatures: false }).length + 49 + 62 <= TX_MAX_BYTES) big = launchTx(mint, L, ++pad);
  assert.equal(setLegacyBudget(big, CU_LIMIT.launch, 1_000_000n), true);
  assert.equal(addLaunchFee(big, me, leg), false);
  checkLaunchTx(big, me, m, null, 1_000_000n);
});

test("extra costs shown before signing: priority + highbar fee (only when on)", () => {
  const on = { enabled: true, bps: 2 };
  assert.equal(costsText(extraCosts(0.0001, on, 1_000_000_000n)), "Priority 0.0001 · highbar fee 0.02% 0.0002 · Extra 0.0003 SOL");
  assert.equal(costsText(extraCosts(0.001, null, 1_000_000_000n)), "Priority 0.001 · Extra 0.001 SOL");
  assert.equal(costsText(extraCosts(0.0001, on, null)), "Priority 0.0001 · highbar fee 0.02% of SOL out · Extra ≥ 0.0001 SOL");
  assert.equal(extraCosts(0.005, { enabled: false, bps: 2 }, 5n).fee, null);
});

test("the cached /config fee reads back the same (a cached config never turns the fee off or on by itself)", () => {
  assert.deepEqual(readExtFee(cacheExtFee(CFG)), EXT);
  assert.equal(cacheExtFee({ ...CFG, enabled: false }), null); assert.equal(readExtFee(cacheExtFee(undefined)), null);
});
