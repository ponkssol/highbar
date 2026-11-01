/** Buy and sell any Solana token from the CA popup through Jupiter's Metis swap API (api.jup.ag/swap/v1, keyless; the older
 *  lite-api.jup.ag host as a fallback). Runs in the background worker only. Jupiter only builds the transaction: it is checked
 *  here, signed by the owning wallet, simulated through the configured RPC (the highbar /rpc proxy by default) and sent through
 *  the same RPC, never through Jupiter. Order: quote, check the quote, build, check the tx, sign, simulate, send. */
import { PublicKey, VersionedTransaction, type AddressLookupTableAccount, type Keypair } from "@solana/web3.js";
import { addV0Fee, asTransfer, extFeeLamports, feeLeg, type ExtFee } from "./fee";
import { PRIORITY_MAX_LAMPORTS, priorityLamports, readBudget } from "./priority";
import { sellRaw, slippageBps as toBps } from "./holding";
import { TOKEN_2022, TOKEN_PROGRAM } from "./rpc";
import { ATA_PROGRAM, BUY_MAX_SOL, BUY_RESERVE_SOL, SellAborted, simReason, WSOL_MINT, ata, type SellStep } from "./sell";

export const JUP_PROGRAM = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
export const JUP_BASES = ["https://api.jup.ag/swap/v1", "https://lite-api.jup.ag/swap/v1"] as const;
const SYSTEM = "11111111111111111111111111111111";
const COMPUTE_BUDGET = "ComputeBudget111111111111111111111111111111";
/** Programs a Jupiter swap tx may call at the top level. The route's DEX programs run inside Jupiter's instruction. */
const ALLOWED = new Set([JUP_PROGRAM, COMPUTE_BUDGET, SYSTEM, TOKEN_PROGRAM, TOKEN_2022, ATA_PROGRAM]);
/** Jupiter may round the compute unit price up: the built tx may cost this much more than the picked priority fee. */
const JUP_PRIORITY_ROUNDING = 1_000n;
/** SOL a swap may cost beyond the amount itself in the simulation: fees, priority fee, token account rent. */
export const JUP_SIM_SLACK_LAMPORTS = 20_000_000;

export interface JupQuote {
  inputMint: string; outputMint: string; inAmount: string; outAmount: string; otherAmountThreshold: string;
  swapMode: string; slippageBps: number; routePlan?: { swapInfo?: { label?: string } }[]; [k: string]: unknown;
}
export const quotePath = (input: string, output: string, amount: bigint, bps: number) =>
  `/quote?inputMint=${input}&outputMint=${output}&amount=${amount}&slippageBps=${bps}&swapMode=ExactIn&restrictIntermediateTokens=true`;
/** The priority fee the user picked, as an exact amount: Jupiter simulates the swap for its compute unit limit
 *  (dynamicComputeUnitLimit) and sets the price to fit that amount. */
export const swapBody = (quote: JupQuote, owner: string, priority: bigint = priorityLamports(NaN), dynamic = true) => ({
  // fast mode passes dynamic = false: no simulation on Jupiter's side, its static limit (CU_LIMIT.jupiter) instead
  quoteResponse: quote, userPublicKey: owner, wrapAndUnwrapSol: true, dynamicComputeUnitLimit: dynamic,
  prioritizationFeeLamports: Number(priority > PRIORITY_MAX_LAMPORTS ? PRIORITY_MAX_LAMPORTS : priority),
});
/** Route labels for the UI ("Meteora DAMM v2", "Raydium", ...). */
export const routeLabel = (q: JupQuote) => [...new Set((q.routePlan ?? []).map((r) => r.swapInfo?.label).filter((x): x is string => !!x))].join(" > ") || "Jupiter";

/** The quote must be the swap that was asked: same mints, exact amount in, the asked slippage and a minimum out above zero. */
export function checkQuote(q: JupQuote, x: { input: string; output: string; amount: bigint; bps: number }) {
  const no = (m: string) => { throw new SellAborted(`${m} Nothing was signed.`, "JUP_QUOTE"); };
  if (!q || typeof q !== "object") no("Jupiter sent no quote.");
  if (q.inputMint !== x.input || q.outputMint !== x.output) no("The Jupiter quote is for other tokens.");
  if (q.swapMode !== "ExactIn") no("The Jupiter quote is not an exact amount in swap.");
  let inAmt: bigint, min: bigint;
  try { inAmt = BigInt(q.inAmount); min = BigInt(q.otherAmountThreshold); } catch { return no("The Jupiter quote has bad amounts."); }
  if (inAmt !== x.amount) no("The Jupiter quote amount is not what you picked.");
  if (min <= 0n) no("The Jupiter quote has no minimum out.");
  if (q.slippageBps !== x.bps) no("The Jupiter quote uses another slippage.");
  return { inAmount: inAmt, minOut: min };
}

const u32 = (d: Uint8Array, at: number) => (d[at] | (d[at + 1] << 8) | (d[at + 2] << 16)) + d[at + 3] * 0x1000000;
const u64 = (d: Uint8Array, at: number) => { let v = 0n; for (let i = 7; i >= 0; i--) v = (v << 8n) | BigInt(d[at + i] ?? 0); return v; };

/** Checks a Jupiter swap tx before signing. The owner is the fee payer and the only signer, only Jupiter, compute budget,
 *  System, SPL Token, Token-2022 and the ATA program are called, at least one Jupiter instruction, a buy moves SOL only into
 *  the owner's own wrapped SOL account (at most the amount) and a sell moves none, token accounts close only back to the
 *  owner, token accounts are created only for the owner, and the priority fee is at most the picked one (never above 0.1 SOL). Accounts behind address
 *  lookup tables can not be read here, so any check that needs one refuses when it is not a static key. */
export function checkJupTx(tx: VersionedTransaction, owner: PublicKey, x: { side: "buy" | "sell"; lamports?: bigint; minOut?: bigint; feeReceiver?: string | null; maxPriority?: bigint }) {
  const no = (m: string): never => { throw new SellAborted(`${m} Nothing was signed.`, "JUP_CHECK"); };
  const msg = tx.message;
  const keys = msg.staticAccountKeys;
  if (msg.header.numRequiredSignatures !== 1 || !keys[0]?.equals(owner)) no("The swap must be paid and signed by this wallet only.");
  const me = owner.toBase58(), wsolAta = ata(owner, new PublicKey(WSOL_MINT)).toBase58();
  const key = (i: number | undefined) => (i !== undefined && i < keys.length ? keys[i].toBase58() : null);
  let jup = 0, moved = 0n, fee = 0n;
  const ixs = msg.compiledInstructions;
  // highbar fee basis: the SOL in for a buy, the quoted minimum SOL out for a sell
  const basis = x.side === "buy" ? x.lamports : x.minOut;
  for (const [n, ix] of ixs.entries()) {
    const p = key(ix.programIdIndex);
    if (!p || !ALLOWED.has(p)) no("The swap calls a program it should not.");
    const d = ix.data, a = ix.accountKeyIndexes;
    if (p === JUP_PROGRAM) { jup++; continue; }
    if (p === COMPUTE_BUDGET) continue; // read as a whole below
    if (p === SYSTEM) {
      const kind = d.length >= 4 ? u32(d, 0) : -1;
      const t = asTransfer(p, d, [...a].map((i) => key(i)));
      if (x.feeReceiver && t && t.to === x.feeReceiver) {
        // the one highbar fee transfer: last, from this wallet, exactly 0.02% of the basis
        if (fee > 0n) no("The swap has more than one highbar fee transfer.");
        if (n !== ixs.length - 1) no("The highbar fee transfer is not the last instruction.");
        if (t.from !== me) no("The highbar fee is not paid by this wallet.");
        if (basis === undefined || t.lamports <= 0n || t.lamports !== extFeeLamports(basis)) no("The highbar fee amount is wrong.");
        fee = t.lamports;
        continue;
      }
      if (kind !== 2 || d.length < 12) no("The swap has a System instruction it should not.");
      if (x.side !== "buy") no("The sell moves SOL out of the wallet.");
      if (key(a[0]) !== me || key(a[1]) !== wsolAta) no("The swap moves SOL to another account.");
      moved += u64(d, 4);
      continue;
    }
    if (p === TOKEN_PROGRAM || p === TOKEN_2022) {
      if (d[0] === 17) continue; // SyncNative
      if (d[0] === 9) { if (key(a[1]) !== me || key(a[2]) !== me) no("The swap closes a token account to someone else."); continue; } // CloseAccount
      no("The swap has a token instruction it should not.");
    }
    if (p === ATA_PROGRAM) {
      if (!(d.length === 0 || (d.length === 1 && (d[0] === 0 || d[0] === 1)))) no("The swap has an unknown token account instruction.");
      if (key(a[0]) !== me || key(a[2]) !== me) no("The swap creates a token account for someone else.");
    }
  }
  if (jup < 1) no("The swap has no Jupiter instruction.");
  if (x.side === "buy" && x.lamports !== undefined && moved > x.lamports) no("The swap wraps more SOL than you picked.");
  let priority = 0n, cuLimit: number | null = null;
  const max = x.maxPriority === undefined ? PRIORITY_MAX_LAMPORTS : x.maxPriority + JUP_PRIORITY_ROUNDING;
  try { const b = readBudget(ixs.map((ix) => ({ program: key(ix.programIdIndex), data: ix.data, keys: ix.accountKeyIndexes.length })), max > PRIORITY_MAX_LAMPORTS ? PRIORITY_MAX_LAMPORTS : max); priority = b.lamports; cuLimit = b.limit; }
  catch (e) { no(/above/.test((e as Error).message) ? `The swap priority fee is too high (${(e as Error).message}).` : `The swap has a bad compute budget (${(e as Error).message}).`); }
  return { jup, moved, priority, fee, cuLimit };
}

export interface JupSim { err: unknown; logs?: string[] | null; lamportsAfter?: number | null }
export interface JupDeps {
  owner(walletId: string): Promise<{ address: string; label: string }>;
  keypair(walletId: string): Promise<Keypair>;
  solLamports(owner: string): Promise<number>;
  /** The owner's balance of the token (its associated account under the given program). */
  tokenBalance(owner: string, mint: string): Promise<{ raw: bigint; decimals: number }>;
  quote(input: string, output: string, amount: bigint, bps: number): Promise<JupQuote>;
  /** Unsigned base64 v0 transaction from Jupiter's /swap. */
  swapTx(quote: JupQuote, owner: string, priorityLamports: bigint): Promise<string>;
  /** Simulates the signed bytes; lamportsAfter is the owner's SOL after the simulated swap when the RPC returns it. */
  simulate(raw: Uint8Array, owner: string): Promise<JupSim>;
  send(raw: Uint8Array, onSent: (sig: string) => void): Promise<string>;
  step?(s: SellStep): void;
  /** Fast mode: no simulation before sending (see SellDeps.fast). The static checks of the tx still run. */
  fast?: boolean;
  /** highbar fee config from the API (GET /config extFee), null = no fee. */
  fee?(): Promise<ExtFee | null>;
  /** The swap tx's address lookup tables (needed to append the fee transfer to a v0 tx). */
  lookupTables?(keys: PublicKey[]): Promise<AddressLookupTableAccount[]>;
}
export interface JupDone { signature: string; amountRaw: string; wallet: string; route: string; feeLamports?: string; priorityLamports?: string; cuLimit?: number }

/** Appends the highbar fee (a System transfer, last) to Jupiter's v0 tx. Done locally rather than with Jupiter's platformFeeBps,
 *  which needs a fee token account owned by the receiver. Skipped (no fee) when the lookup tables can not be read or the tx
 *  would pass 1232 bytes. */
async function withFee(d: JupDeps, tx: VersionedTransaction, owner: PublicKey, ext: ExtFee | null, basis: bigint): Promise<VersionedTransaction> {
  const leg = feeLeg(ext, basis);
  if (!leg) return tx;
  const keys = tx.message.addressTableLookups.map((l) => l.accountKey);
  let tables: AddressLookupTableAccount[] = [];
  if (keys.length) { if (!d.lookupTables) return tx; try { tables = await d.lookupTables(keys); } catch { return tx; } }
  return addV0Fee(tx, owner, leg, tables) ?? tx;
}

async function signSimSend(d: JupDeps, kp: Keypair, b64tx: string, side: "buy" | "sell", lamports: bigint | undefined, before: number, step: (s: SellStep) => void, ext: ExtFee | null = null, minOut?: bigint, prio: bigint = priorityLamports(NaN)) {
  let tx: VersionedTransaction;
  try { tx = VersionedTransaction.deserialize(Uint8Array.from(atob(b64tx), (c) => c.charCodeAt(0))); } catch { throw new SellAborted("Jupiter sent a transaction that does not decode. Nothing was signed.", "JUP_CHECK"); }
  // Jupiter's tx alone first (no transfer to the fee receiver allowed from Jupiter), then with the highbar fee appended
  checkJupTx(tx, kp.publicKey, { side, lamports, minOut, maxPriority: prio });
  const basis = side === "buy" ? lamports ?? 0n : minOut ?? 0n;
  tx = await withFee(d, tx, kp.publicKey, ext, basis);
  const { fee, priority, cuLimit } = checkJupTx(tx, kp.publicKey, { side, lamports, minOut, feeReceiver: ext?.receiver ?? null, maxPriority: prio });
  step("sign");
  tx.sign([kp]);
  const raw = tx.serialize();
  if (!d.fast) {
    step("simulate");
    let sim: JupSim;
    try { sim = await d.simulate(raw, kp.publicKey.toBase58()); }
    catch (e) { throw new SellAborted(`Could not run the safety simulation (${(e as Error)?.message || "RPC error"}). Nothing was sent.`, "SELL_SIM"); }
    if (sim.err) throw new SellAborted(`The ${side} would fail: ${simReason(sim.err, sim.logs)}. Nothing was sent.`, "SELL_SIM_FAILED");
    if (typeof sim.lamportsAfter === "number") {
      const spent = before - sim.lamportsAfter;
      const max = (side === "buy" ? Number(lamports ?? 0n) : 0) + Number(fee) + Number(priority) + JUP_SIM_SLACK_LAMPORTS;
      if (spent > max) throw new SellAborted(`The ${side} would take more SOL than expected. Nothing was sent.`, "JUP_SIM_SOL");
    }
  }
  step("send");
  return { signature: await d.send(raw, () => step("confirm")), fee, priority, cuLimit };
}

export async function runJupBuy(req: { walletId: string; mint: string; sol: number; slippagePct: number; prioritySol?: number }, d: JupDeps): Promise<JupDone> {
  const step = d.step ?? (() => {});
  if (typeof req.walletId !== "string" || !req.walletId) throw new SellAborted("Pick a wallet");
  try { new PublicKey(req.mint); } catch { throw new SellAborted("That is not a token address"); }
  if (req.mint === WSOL_MINT) throw new SellAborted("That is SOL itself");
  const sol = Number(req.sol);
  if (!Number.isFinite(sol) || sol <= 0 || sol > BUY_MAX_SOL) throw new SellAborted(`Pick an amount above 0 and up to ${BUY_MAX_SOL} SOL`);
  const lamports = BigInt(Math.round(sol * 1e9)), bps = toBps(req.slippagePct);
  step("build");
  // the quote does not depend on the wallet: asked at once, in parallel with the wallet, key, fee config and balance
  const qP = d.quote(WSOL_MINT, req.mint, lamports, bps); qP.catch(() => {});
  const [w, kp] = await Promise.all([d.owner(req.walletId), d.keypair(req.walletId)]);
  if (kp.publicKey.toBase58() !== w.address) throw new SellAborted("The key does not match this wallet. Nothing was signed.");
  const [ext, have] = await Promise.all([d.fee ? d.fee().catch(() => null) : Promise.resolve(null), d.solLamports(w.address)]);
  const prio = priorityLamports(req.prioritySol ?? NaN);
  const feeN = Number((feeLeg(ext, lamports)?.lamports ?? 0n) + prio) / 1e9;
  if (!(have / 1e9 >= sol + feeN + BUY_RESERVE_SOL)) throw new SellAborted(`Not enough SOL in ${w.label} (has ${Math.floor((have / 1e9) * 1e4) / 1e4}, needs about ${Math.ceil((sol + feeN + BUY_RESERVE_SOL) * 1e4) / 1e4})`, "BUY_FUNDS");
  const q = await qP;
  checkQuote(q, { input: WSOL_MINT, output: req.mint, amount: lamports, bps });
  const r = await signSimSend(d, kp, await d.swapTx(q, w.address, prio), "buy", lamports, have, step, ext, undefined, prio);
  return { signature: r.signature, amountRaw: lamports.toString(), wallet: w.address, route: routeLabel(q), feeLamports: r.fee.toString(), priorityLamports: r.priority.toString(), cuLimit: r.cuLimit ?? undefined };
}

export async function runJupSell(req: { walletId: string; mint: string; pct: number; slippagePct: number; prioritySol?: number }, d: JupDeps): Promise<JupDone> {
  const step = d.step ?? (() => {});
  if (typeof req.walletId !== "string" || !req.walletId) throw new SellAborted("Pick a wallet");
  try { new PublicKey(req.mint); } catch { throw new SellAborted("That is not a token address"); }
  if (req.mint === WSOL_MINT) throw new SellAborted("That is SOL itself");
  const bps = toBps(req.slippagePct);
  step("build");
  const [w, kp] = await Promise.all([d.owner(req.walletId), d.keypair(req.walletId)]);
  if (kp.publicKey.toBase58() !== w.address) throw new SellAborted("The key does not match this wallet. Nothing was signed.");
  const extP = d.fee ? d.fee().catch(() => null) : Promise.resolve(null), haveP = d.solLamports(w.address);
  haveP.catch(() => {});
  const bal = await d.tokenBalance(w.address, req.mint);
  let amountRaw: bigint;
  try { amountRaw = sellRaw(bal.raw, req.pct); } catch (e) { throw new SellAborted((e as Error).message); }
  const [q, have] = await Promise.all([d.quote(req.mint, WSOL_MINT, amountRaw, bps), haveP]);
  const { minOut } = checkQuote(q, { input: req.mint, output: WSOL_MINT, amount: amountRaw, bps });
  const ext = await extP;
  const prio = priorityLamports(req.prioritySol ?? NaN);
  const r = await signSimSend(d, kp, await d.swapTx(q, w.address, prio), "sell", undefined, have, step, ext, minOut, prio);
  return { signature: r.signature, amountRaw: amountRaw.toString(), wallet: w.address, route: routeLabel(q), feeLamports: r.fee.toString(), priorityLamports: r.priority.toString(), cuLimit: r.cuLimit ?? undefined };
}
