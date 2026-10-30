import { Connection, PublicKey, SystemProgram, Transaction, VersionedTransaction, type Keypair } from "@solana/web3.js";
import {
  NATIVE_MINT, createAssociatedTokenAccountIdempotentInstruction, createBurnCheckedInstruction, createMintToInstruction,
  getAssociatedTokenAddressSync, getMint,
} from "@solana/spl-token";
import { getConnection, referralWallet } from "@hb/onchain";
import { db, tx } from "../db/pool.js";
import { buybackMode, jobs } from "../jobs/config.js";
import { memoIx, sendOnce, sendVersionedOnce, sigState, simulate, sleep } from "../jobs/chain.js";
import {
  claimBuySig, drainBuyback, markBought, markBurned, reconcileOrders, setBurnSig,
  type DrainResult, type LedgerDb, type Order,
} from "./buybackLedger.js";

export type { Order } from "./buybackLedger.js";

/** The jobs' Postgres as a ledger db (tx = one pooled connection, BEGIN/COMMIT: PgBouncer transaction mode safe). */
const pgLedger: LedgerDb = { query: (t, p) => db.query(t, p as unknown[]), tx: (fn) => tx((c) => fn(c)) };

interface Bar { mint: PublicKey; decimals: number; program: PublicKey; authority: PublicKey | null }
/** null = the official mint is not on-chain yet (budget keeps accruing). */
async function loadBar(): Promise<Bar | null> {
  if (!jobs.barMint) throw new Error("$HIGHER has not launched yet (BAR_MINT unset, no official launch detected; devnet: pnpm --filter @hb/api bar:mock-mint)");
  const conn = getConnection(), mint = new PublicKey(jobs.barMint);
  const info = await conn.getAccountInfo(mint);
  if (!info) return null;
  const m = await getMint(conn, mint, "confirmed", info.owner);
  return { mint, decimals: m.decimals, program: info.owner, authority: m.mintAuthority };
}

/** Buy back & burn $HIGHER from the ledger (services/buybackLedger.ts).
 *  Default: spend the UNSPENT budget of ALL closed periods (sum treasury_splits.buyback_lamports - non-failed buybacks), so the first
 *  live run after the official mint is detected catches up on everything accrued before launch. Orders are capped by BUYBACK_MAX_ORDER_SOL,
 *  at most BUYBACK_MAX_ORDERS_PER_RUN per run (a big backlog drains over several runs), and by the wallet's balance minus
 *  BUYBACK_WALLET_RESERVE_SOL, unpaid cashback / LP rebates / fee share and in-flight orders. Every order is reserved in the DB
 *  (advisory-locked) before it is signed, so reruns, crashes and concurrent instances never double spend. Every buy is burned.
 *  manualBudget (--budget-sol): spend that amount for `period` instead (also counted as spent against the ledger).
 *  previewExtra (dry-run): this run's unwritten split. mode "jupiter": Jupiter quote (slippage + price-impact caps) -> /swap ->
 *  actual received via balance delta -> burnChecked. mode "mock" (devnet only): the platform keypair is the mock mint authority and
 *  "buys" by minting at BAR_MOCK_PRICE_SOL, then burns. */
export async function runBuyback(o: { period: string; payer: Keypair; live: boolean; manualBudget?: bigint; previewExtra?: bigint; log?: (m: string) => void }): Promise<DrainResult | string> {
  const log = o.log ?? console.log, mode = buybackMode();
  if (mode === "mock" && jobs.network !== "devnet") throw new Error("BUYBACK_MODE=mock is devnet only");
  if (mode === "jupiter" && jobs.network === "devnet") throw new Error("Jupiter does not route devnet; use BUYBACK_MODE=mock");
  if (mode === "jupiter" && referralWallet()?.equals(o.payer.publicKey)) throw new Error("buyback wallet is the referral wallet: Jupiter wrapAndUnwrapSol would close its WSOL ATA; use a separate PLATFORM_KEYPAIR_PATH");
  const bar = await loadBar();
  if (!bar) { const m = `$HIGHER mint ${jobs.barMint} not found on ${jobs.network} yet: buyback budget accrues only`; log(`[buyback] ${m}`); return m; }
  if (mode === "mock" && !bar.authority?.equals(o.payer.publicKey)) throw new Error(`mock BAR ${bar.mint.toBase58()} mint authority is ${bar.authority?.toBase58() ?? "none"}, not the platform keypair`);
  if (o.live) await reconcile(bar, o.payer, log);
  const conn = getConnection();
  return drainBuyback({
    db: pgLedger, period: o.period, live: o.live, mode, barMint: bar.mint.toBase58(), decimals: bar.decimals,
    source: o.manualBudget !== undefined ? "manual" : "ledger", manualBudget: o.manualBudget, previewExtra: o.live ? 0n : o.previewExtra,
    maxOrder: jobs.maxOrder, maxOrdersPerRun: jobs.maxOrdersPerRun, reserve: jobs.buybackReserve,
    balance: async () => BigInt(await conn.getBalance(o.payer.publicKey, "confirmed")),
    exec: (id, amount) => (mode === "mock" ? mockOrder : jupiterOrder)(bar, o.payer, o.period, amount, id),
    between: o.live && mode === "jupiter" ? () => sleep(jobs.orderDelayMs + Math.random() * jobs.orderDelayMs) : undefined, // spread orders
    log,
  });
}

/** live = id set (the reserved row); dry-run = id undefined (simulate / quote only, write nothing). */
async function mockOrder(bar: Bar, payer: Keypair, period: string, solIn: bigint, id?: number): Promise<Order> {
  const price = BigInt(Math.round(jobs.mockPriceSol * 1e9)); // lamports per whole BAR
  if (price <= 0n) throw new Error("BAR_MOCK_PRICE_SOL must be > 0");
  const barOut = (solIn * 10n ** BigInt(bar.decimals)) / price;
  const ata = getAssociatedTokenAddressSync(bar.mint, payer.publicKey, false, bar.program);
  const sink = jobs.mockSolSink ? new PublicKey(jobs.mockSolSink) : null;
  const buy = new Transaction().add(createAssociatedTokenAccountIdempotentInstruction(payer.publicKey, ata, payer.publicKey, bar.mint, bar.program));
  if (sink && !sink.equals(payer.publicKey)) buy.add(SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: sink, lamports: solIn }));
  buy.add(createMintToInstruction(bar.mint, ata, payer.publicKey, barOut, [], bar.program), memoIx(`highbar mock buyback ${period}`));
  if (id === undefined) { const s = await simulate(buy, payer.publicKey); return { mode: "mock", solIn, barOut, status: s.ok ? "would-buy" : "failed", note: s.err }; }
  let buySig: string | undefined;
  try {
    buySig = await sendOnce(buy, [payer], (s) => claimBuySig(db, id, s, barOut));
    await markBought(db, id, barOut);
    const burnSig = await burn(id, bar, payer, barOut, period);
    return { id, mode: "mock", solIn, barOut, buySig, burnSig, status: "burned" };
  } catch (e) { return { id, mode: "mock", solIn, barOut, buySig, status: "failed", note: (e as Error).message }; } // signed: reconcile() settles it next live run
}

async function jupiterOrder(bar: Bar, payer: Keypair, period: string, solIn: bigint, id?: number): Promise<Order> {
  const live = id !== undefined;
  const headers: Record<string, string> = jobs.jupiterKey ? { "x-api-key": jobs.jupiterKey } : {};
  const qs = new URLSearchParams({ inputMint: NATIVE_MINT.toBase58(), outputMint: bar.mint.toBase58(), amount: solIn.toString(), slippageBps: String(jobs.maxSlippageBps), restrictIntermediateTokens: "true" });
  const qr = await fetch(`${jobs.jupiterUrl}/quote?${qs}`, { headers });
  if (!qr.ok) return { id, mode: "jupiter", solIn, barOut: 0n, status: "failed", note: `quote ${qr.status}: ${(await qr.text()).slice(0, 200)}` };
  const quote = await qr.json() as { outAmount: string; otherAmountThreshold: string; priceImpactPct: string };
  const impactBps = Number(quote.priceImpactPct) * 10_000;
  if (!(impactBps <= jobs.maxPriceImpactBps)) return { id, mode: "jupiter", solIn, barOut: BigInt(quote.outAmount), status: "failed", note: `price impact ${impactBps.toFixed(1)} bps > ${jobs.maxPriceImpactBps}` };
  if (!live) return { mode: "jupiter", solIn, barOut: BigInt(quote.outAmount), status: "would-buy", note: `min out ${quote.otherAmountThreshold}, impact ${impactBps.toFixed(1)} bps` };
  const sr = await fetch(`${jobs.jupiterUrl}/swap`, { method: "POST", headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ quoteResponse: quote, userPublicKey: payer.publicKey.toBase58(), wrapAndUnwrapSol: true, dynamicComputeUnitLimit: true, prioritizationFeeLamports: "auto" }) });
  if (!sr.ok) return { id, mode: "jupiter", solIn, barOut: 0n, status: "failed", note: `swap ${sr.status}: ${(await sr.text()).slice(0, 200)}` };
  const { swapTransaction, lastValidBlockHeight } = await sr.json() as { swapTransaction: string; lastValidBlockHeight: number };
  let buySig: string | undefined;
  try {
    const vtx = VersionedTransaction.deserialize(Buffer.from(swapTransaction, "base64"));
    buySig = await sendVersionedOnce(vtx, [payer], lastValidBlockHeight, (s) => claimBuySig(db, id, s));
    const barOut = await actualReceived(getConnection(), buySig, getAssociatedTokenAddressSync(bar.mint, payer.publicKey, false, bar.program).toBase58());
    if (barOut <= 0n) throw new Error(`swap ${buySig}: no $HIGHER received`);
    await markBought(db, id, barOut);
    const burnSig = await burn(id, bar, payer, barOut, period);
    return { id, mode: "jupiter", solIn, barOut, buySig, burnSig, status: "burned" };
  } catch (e) { return { id, mode: "jupiter", solIn, barOut: 0n, buySig, status: "failed", note: (e as Error).message }; }
}

async function burn(id: number, bar: Bar, payer: Keypair, amount: bigint, period: string) {
  const ata = getAssociatedTokenAddressSync(bar.mint, payer.publicKey, false, bar.program);
  const t = new Transaction().add(createBurnCheckedInstruction(ata, bar.mint, payer.publicKey, amount, bar.decimals, [], bar.program), memoIx(`highbar burn ${period} #${id}`));
  const sig = await sendOnce(t, [payer], async (s) => { if (!(await setBurnSig(db, id, s))) throw new Error(`buyback #${id} is not awaiting a burn; not sending`); });
  await markBurned(db, id);
  return sig;
}

/** Finish orders an earlier run left half-done (services/buybackLedger.ts reconcileOrders). */
async function reconcile(bar: Bar, payer: Keypair, log: (m: string) => void) {
  const ata = getAssociatedTokenAddressSync(bar.mint, payer.publicKey, false, bar.program).toBase58();
  await reconcileOrders(db, bar.mint.toBase58(), {
    sigState,
    received: async (r) => (r.mode === "mock" ? r.barBought : actualReceived(getConnection(), r.buySig, ata)),
    burn: (id, amount, period) => burn(id, bar, payer, amount, period),
  }, log);
}

/** Actual token amount received by `ata` in tx `sig` (post - pre balance), not the quote's outAmount. */
export async function actualReceived(conn: Connection, sig: string, ata: string): Promise<bigint> {
  const tx = await conn.getTransaction(sig, { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
  if (!tx?.meta) throw new Error(`tx ${sig} not found`);
  const keys = tx.transaction.message.getAccountKeys({ accountKeysFromLookups: tx.meta.loadedAddresses }).staticAccountKeys
    .concat(tx.meta.loadedAddresses?.writable ?? [], tx.meta.loadedAddresses?.readonly ?? []).map((k) => k.toBase58());
  return balanceDelta(tx.meta.preTokenBalances ?? [], tx.meta.postTokenBalances ?? [], keys.indexOf(ata));
}
export function balanceDelta(pre: { accountIndex: number; uiTokenAmount: { amount: string } }[], post: typeof pre, idx: number) {
  const get = (l: typeof pre) => BigInt(l.find((b) => b.accountIndex === idx)?.uiTokenAmount.amount ?? "0");
  return idx < 0 ? 0n : get(post) - get(pre);
}
