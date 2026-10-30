import { Connection, PublicKey, SystemProgram, Transaction, VersionedTransaction, type Keypair } from "@solana/web3.js";
import {
  NATIVE_MINT, createAssociatedTokenAccountIdempotentInstruction, createBurnCheckedInstruction, createMintToInstruction,
  getAssociatedTokenAddressSync, getMint,
} from "@solana/spl-token";
import { getConnection, referralWallet } from "@hb/onchain";
import { db } from "../db/pool.js";
import { buybackMode, jobs } from "../jobs/config.js";
import { memoIx, sendOnce, sendVersionedOnce, sigState, simulate, sleep } from "../jobs/chain.js";

export interface Order { id?: number; mode: "jupiter" | "mock"; solIn: bigint; barOut: bigint; buySig?: string; burnSig?: string; status: "burned" | "would-buy" | "failed" | "bought"; note?: string }
const MIN_ORDER = 1_000_000n; // 0.001 SOL: smaller leftovers wait for the next period

interface Bar { mint: PublicKey; decimals: number; program: PublicKey; authority: PublicKey | null }
async function loadBar(): Promise<Bar> {
  if (!jobs.barMint) throw new Error("$HIGHER has not launched yet (BAR_MINT unset, no official launch detected; devnet: pnpm --filter @hb/api bar:mock-mint)");
  const conn = getConnection(), mint = new PublicKey(jobs.barMint);
  const info = await conn.getAccountInfo(mint);
  if (!info) throw new Error(`$HIGHER mint ${mint.toBase58()} not found on ${jobs.network}`);
  const m = await getMint(conn, mint, "confirmed", info.owner);
  return { mint, decimals: m.decimals, program: info.owner, authority: m.mintAuthority };
}

/** Spend up to `budget` lamports for `period` on $HIGHER in capped orders (BUYBACK_MAX_ORDER_SOL, at most BUYBACK_MAX_ORDERS_PER_RUN per run), burn every buy.
 *  Already-spent SOL for the period is subtracted, so re-runs continue where the last run stopped.
 *  mode "jupiter": Jupiter Swap API quote (slippage + price-impact caps) -> /swap -> actual received via balance delta -> burnChecked.
 *  mode "mock" (devnet only; Jupiter has no devnet): platform keypair is the mock BAR mint authority, "buys" by minting at BAR_MOCK_PRICE_SOL, then burns. */
export async function runBuyback(o: { period: string; budget: bigint; payer: Keypair; live: boolean; log?: (m: string) => void }): Promise<Order[]> {
  const log = o.log ?? console.log, mode = buybackMode();
  if (mode === "mock" && jobs.network !== "devnet") throw new Error("BUYBACK_MODE=mock is devnet only");
  if (mode === "jupiter" && jobs.network === "devnet") throw new Error("Jupiter does not route devnet; use BUYBACK_MODE=mock");
  if (mode === "jupiter" && referralWallet()?.equals(o.payer.publicKey)) throw new Error("buyback wallet is the referral wallet: Jupiter wrapAndUnwrapSol would close its WSOL ATA; use a separate PLATFORM_KEYPAIR_PATH");
  const bar = await loadBar();
  if (mode === "mock" && !bar.authority?.equals(o.payer.publicKey)) throw new Error(`mock BAR ${bar.mint.toBase58()} mint authority is ${bar.authority?.toBase58() ?? "none"}, not the platform keypair`);
  if (o.live) await reconcile(bar, o.payer, log);

  const spent = BigInt((await db.query<{ s: string }>("SELECT coalesce(sum(sol_spent_lamports),0)::text AS s FROM buybacks WHERE period = $1 AND status <> 'failed'", [o.period])).rows[0].s);
  let left = o.budget - spent;
  const out: Order[] = [];
  if (left < MIN_ORDER) { log(`[buyback] ${o.period}: nothing to spend (budget ${o.budget}, spent ${spent})`); return out; }
  for (let n = 0; n < jobs.maxOrdersPerRun && left >= MIN_ORDER; n++) {
    const amount = left < jobs.maxOrder ? left : jobs.maxOrder;
    const r = await (mode === "mock" ? mockOrder : jupiterOrder)(bar, o.payer, o.period, amount, o.live);
    out.push(r);
    log(`[buyback] ${r.status} ${mode} ${amount} lamports -> ${r.barOut} raw BAR${r.buySig ? ` buy ${r.buySig}` : ""}${r.burnSig ? ` burn ${r.burnSig}` : ""}${r.note ? ` (${r.note})` : ""}`);
    if (r.status === "failed") break;
    left -= amount;
    if (o.live && mode === "jupiter" && left >= MIN_ORDER && n + 1 < jobs.maxOrdersPerRun) await sleep(jobs.orderDelayMs + Math.random() * jobs.orderDelayMs); // spread orders
  }
  return out;
}

async function insertOrder(period: string, mode: string, bar: Bar, solIn: bigint, barOut: bigint) {
  const now = Date.now();
  return (await db.query<{ id: number }>("INSERT INTO buybacks (period, mode, bar_mint, bar_decimals, sol_spent_lamports, bar_bought, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING id",
    [period, mode, bar.mint.toBase58(), bar.decimals, solIn.toString(), barOut.toString(), now])).rows[0].id;
}
const setOrder = (id: number, f: Record<string, string | null>) => {
  const keys = Object.keys(f);
  return db.query(`UPDATE buybacks SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(", ")}, updated_at = $${keys.length + 2} WHERE id = $1`, [id, ...keys.map((k) => f[k]), Date.now()]);
};

async function mockOrder(bar: Bar, payer: Keypair, period: string, solIn: bigint, live: boolean): Promise<Order> {
  const price = BigInt(Math.round(jobs.mockPriceSol * 1e9)); // lamports per whole BAR
  if (price <= 0n) throw new Error("BAR_MOCK_PRICE_SOL must be > 0");
  const barOut = (solIn * 10n ** BigInt(bar.decimals)) / price;
  const ata = getAssociatedTokenAddressSync(bar.mint, payer.publicKey, false, bar.program);
  const sink = jobs.mockSolSink ? new PublicKey(jobs.mockSolSink) : null;
  const buy = new Transaction().add(createAssociatedTokenAccountIdempotentInstruction(payer.publicKey, ata, payer.publicKey, bar.mint, bar.program));
  if (sink && !sink.equals(payer.publicKey)) buy.add(SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: sink, lamports: solIn }));
  buy.add(createMintToInstruction(bar.mint, ata, payer.publicKey, barOut, [], bar.program), memoIx(`highbar mock buyback ${period}`));
  if (!live) { const s = await simulate(buy, payer.publicKey); return { mode: "mock", solIn, barOut, status: s.ok ? "would-buy" : "failed", note: s.err }; }
  const id = await insertOrder(period, "mock", bar, solIn, barOut);
  try {
    const buySig = await sendOnce(buy, [payer], (s) => setOrder(id, { buy_sig: s }).then(() => {}));
    await setOrder(id, { status: "bought" });
    const burnSig = await burn(id, bar, payer, barOut, period);
    return { id, mode: "mock", solIn, barOut, buySig, burnSig, status: "burned" };
  } catch (e) { return { id, mode: "mock", solIn, barOut, status: "failed", note: (e as Error).message }; } // reconcile() settles it next live run
}

async function jupiterOrder(bar: Bar, payer: Keypair, period: string, solIn: bigint, live: boolean): Promise<Order> {
  const headers: Record<string, string> = jobs.jupiterKey ? { "x-api-key": jobs.jupiterKey } : {};
  const qs = new URLSearchParams({ inputMint: NATIVE_MINT.toBase58(), outputMint: bar.mint.toBase58(), amount: solIn.toString(), slippageBps: String(jobs.maxSlippageBps), restrictIntermediateTokens: "true" });
  const qr = await fetch(`${jobs.jupiterUrl}/quote?${qs}`, { headers });
  if (!qr.ok) return { mode: "jupiter", solIn, barOut: 0n, status: "failed", note: `quote ${qr.status}: ${(await qr.text()).slice(0, 200)}` };
  const quote = await qr.json() as { outAmount: string; otherAmountThreshold: string; priceImpactPct: string };
  const impactBps = Number(quote.priceImpactPct) * 10_000;
  if (!(impactBps <= jobs.maxPriceImpactBps)) return { mode: "jupiter", solIn, barOut: BigInt(quote.outAmount), status: "failed", note: `price impact ${impactBps.toFixed(1)} bps > ${jobs.maxPriceImpactBps}` };
  if (!live) return { mode: "jupiter", solIn, barOut: BigInt(quote.outAmount), status: "would-buy", note: `min out ${quote.otherAmountThreshold}, impact ${impactBps.toFixed(1)} bps` };
  const sr = await fetch(`${jobs.jupiterUrl}/swap`, { method: "POST", headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ quoteResponse: quote, userPublicKey: payer.publicKey.toBase58(), wrapAndUnwrapSol: true, dynamicComputeUnitLimit: true, prioritizationFeeLamports: "auto" }) });
  if (!sr.ok) return { mode: "jupiter", solIn, barOut: 0n, status: "failed", note: `swap ${sr.status}: ${(await sr.text()).slice(0, 200)}` };
  const { swapTransaction, lastValidBlockHeight } = await sr.json() as { swapTransaction: string; lastValidBlockHeight: number };
  const id = await insertOrder(period, "jupiter", bar, solIn, 0n);
  try {
    const vtx = VersionedTransaction.deserialize(Buffer.from(swapTransaction, "base64"));
    const buySig = await sendVersionedOnce(vtx, [payer], lastValidBlockHeight, (s) => setOrder(id, { buy_sig: s }).then(() => {}));
    const barOut = await actualReceived(getConnection(), buySig, getAssociatedTokenAddressSync(bar.mint, payer.publicKey, false, bar.program).toBase58());
    if (barOut <= 0n) throw new Error(`swap ${buySig}: no $HIGHER received`);
    await setOrder(id, { status: "bought", bar_bought: barOut.toString() });
    const burnSig = await burn(id, bar, payer, barOut, period);
    return { id, mode: "jupiter", solIn, barOut, buySig, burnSig, status: "burned" };
  } catch (e) { return { id, mode: "jupiter", solIn, barOut: 0n, status: "failed", note: (e as Error).message }; }
}

async function burn(id: number, bar: Bar, payer: Keypair, amount: bigint, period: string) {
  const ata = getAssociatedTokenAddressSync(bar.mint, payer.publicKey, false, bar.program);
  const t = new Transaction().add(createBurnCheckedInstruction(ata, bar.mint, payer.publicKey, amount, bar.decimals, [], bar.program), memoIx(`highbar burn ${period} #${id}`));
  const sig = await sendOnce(t, [payer], (s) => setOrder(id, { burn_sig: s }).then(() => {}));
  await setOrder(id, { status: "burned" });
  return sig;
}

/** Finish orders an earlier run left half-done: pending buy landed -> bought; bought -> burn (re-sent only once the old burn can no longer land). */
async function reconcile(bar: Bar, payer: Keypair, log: (m: string) => void) {
  const { rows } = await db.query<{ id: number; period: string; mode: string; bar_mint: string; bar_bought: string; buy_sig: string | null; burn_sig: string | null; status: string; updated_at: number }>(
    "SELECT id, period, mode, bar_mint, bar_bought, buy_sig, burn_sig, status, updated_at FROM buybacks WHERE status IN ('pending','bought') ORDER BY id");
  const old = (r: { updated_at: number }) => Date.now() - r.updated_at > 5 * 60_000;
  for (const r of rows) {
    if (r.bar_mint !== bar.mint.toBase58()) continue;
    if (r.status === "pending") {
      const s = r.buy_sig ? await sigState(r.buy_sig) : "failed";
      if (s === "unknown" && !old(r)) continue;
      if (s !== "landed") { await setOrder(r.id, { status: "failed", error: `buy ${r.buy_sig ?? "never sent"} did not land` }); log(`[buyback] #${r.id} marked failed`); continue; }
      const got = r.mode === "mock" ? BigInt(r.bar_bought) : await actualReceived(getConnection(), r.buy_sig!, getAssociatedTokenAddressSync(bar.mint, payer.publicKey, false, bar.program).toBase58());
      await setOrder(r.id, { status: "bought", bar_bought: got.toString() });
      r.bar_bought = got.toString(); r.burn_sig = null;
    }
    if (r.burn_sig) {
      const s = await sigState(r.burn_sig);
      if (s === "landed") { await setOrder(r.id, { status: "burned" }); continue; }
      if (s === "unknown" && !old(r)) continue;
    }
    const sig = await burn(r.id, bar, payer, BigInt(r.bar_bought), r.period).catch((e: Error) => { log(`[buyback] #${r.id} burn failed: ${e.message}`); return null; });
    if (sig) log(`[buyback] #${r.id} burned ${r.bar_bought} raw BAR ${sig}`);
  }
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

