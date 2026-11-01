/** Sell from the Holding panel, run in the background worker only. The content script sends { walletId, mint, pct, slippage }
 *  and gets steps back, never a key. Order: read the balance, pick the route (Meteora DBC before migration, DAMM v2 after),
 *  build, check the built tx, sign with the owning wallet only, simulate, and send only when the simulation passed. */
import { PublicKey, SystemProgram, type Keypair, type Transaction, type TransactionInstruction } from "@solana/web3.js";
import { sellRaw, slippageBps as toBps } from "./holding";
import { TOKEN_2022, TOKEN_PROGRAM } from "./rpc";

export const DBC_PROGRAM = "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN";
export const DAMM_V2_PROGRAM = "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG";
export const ATA_PROGRAM = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
export const WSOL_MINT = "So11111111111111111111111111111111111111112";
const COMPUTE_BUDGET = "ComputeBudget111111111111111111111111111111";
/** Programs a sell may call. Anything else in the tx means nothing is signed. */
const ALLOWED = new Set([DBC_PROGRAM, DAMM_V2_PROGRAM, TOKEN_PROGRAM, TOKEN_2022, ATA_PROGRAM, COMPUTE_BUDGET, SystemProgram.programId.toBase58()]);
/** Anchor discriminators: DBC swap2 { amount_0, amount_1, swap_mode } and DAMM v2 swap { amount_in, minimum_amount_out }. */
const SWAP2 = [65, 75, 63, 76, 235, 91, 91, 136], DAMM_SWAP = [248, 198, 158, 145, 225, 117, 135, 200];

export type SellRoute = "dbc" | "damm";
export type SellStep = "build" | "sign" | "simulate" | "send" | "confirm";
export interface SellReq { walletId: string; mint: string; pct: number; slippagePct: number }
export interface SellTarget { route: SellRoute; pool: string }
/** amountRaw is the token amount for a sell and the lamports for a buy. */
export interface BuildArgs { owner: PublicKey; pool: string; mint: string; amountRaw: bigint; decimals: number; slippageBps: number; side?: "buy" | "sell" }
export interface SellDeps {
  /** The wallet's public info (no key). */
  owner(walletId: string): Promise<{ address: string; label: string }>;
  keypair(walletId: string): Promise<Keypair>;
  balance(owner: string, mint: string): Promise<{ raw: bigint; decimals: number }>;
  /** Fresh read: migrated tokens sell on their DAMM v2 pool, the rest on the DBC pool. */
  target(mint: string): Promise<SellTarget>;
  buildDbc(a: BuildArgs): Promise<Transaction>;
  buildDamm(a: BuildArgs): Promise<Transaction>;
  simulate(raw: Uint8Array): Promise<{ err: unknown; logs?: string[] | null }>;
  /** Send and confirm. Returns the signature. */
  send(raw: Uint8Array, onSent: (sig: string) => void): Promise<string>;
  step?(s: SellStep): void;
}
export interface SellDone { signature: string; amountRaw: string; route: SellRoute; wallet: string }

export class SellAborted extends Error { constructor(message: string, readonly code = "SELL_ABORTED") { super(message); this.name = "SellAborted"; } }
export function ata(owner: PublicKey, mint: PublicKey, tokenProgram = TOKEN_PROGRAM): PublicKey {
  return PublicKey.findProgramAddressSync([owner.toBuffer(), new PublicKey(tokenProgram).toBuffer(), mint.toBuffer()], new PublicKey(ATA_PROGRAM))[0];
}

const u64 = (d: Uint8Array, at: number) => { let v = 0n; for (let i = 7; i >= 0; i--) v = (v << 8n) | BigInt(d[at + i]); return v; };
const isDisc = (d: Uint8Array, disc: number[]) => d.length >= 8 && disc.every((b, i) => d[i] === b);
export interface SwapIx { program: SellRoute; pool: string; input: string; output: string; amountIn: bigint; minOut: bigint; mode: number }
export function decodeSwap(ix: TransactionInstruction): SwapIx | null {
  const p = ix.programId.toBase58(), d = ix.data;
  if (p === DBC_PROGRAM && isDisc(d, SWAP2) && d.length >= 25 && ix.keys.length > 4)
    return { program: "dbc", pool: ix.keys[2].pubkey.toBase58(), input: ix.keys[3].pubkey.toBase58(), output: ix.keys[4].pubkey.toBase58(), amountIn: u64(d, 8), minOut: u64(d, 16), mode: d[24] };
  if (p === DAMM_V2_PROGRAM && isDisc(d, DAMM_SWAP) && d.length >= 24 && ix.keys.length > 3)
    return { program: "damm", pool: ix.keys[1].pubkey.toBase58(), input: ix.keys[2].pubkey.toBase58(), output: ix.keys[3].pubkey.toBase58(), amountIn: u64(d, 8), minOut: u64(d, 16), mode: 0 };
  return null;
}

/** Checks a built sell before signing. Fee payer and the only signer is the owner, only known programs, no SOL transfer,
 *  exactly one swap on the expected pool and program, token in from the owner's account, SOL out to the owner's account,
 *  amount in at most what was asked (the api's decimal parsing may round down one unit), and a minimum out above zero. */
export function checkSellTx(tx: Transaction, owner: PublicKey, x: { mint: string; pool: string; route: SellRoute; amountRaw: bigint }) {
  const no = (m: string) => { throw new SellAborted(`${m} Nothing was signed.`, "SELL_CHECK"); };
  if (!tx.feePayer || !tx.feePayer.equals(owner)) no("The fee payer is not this wallet.");
  const msg = tx.compileMessage();
  if (msg.header.numRequiredSignatures !== 1 || !msg.accountKeys[0].equals(owner)) no("The sell must be signed by this wallet only.");
  const swaps: SwapIx[] = [];
  for (const ix of tx.instructions) {
    const p = ix.programId.toBase58();
    if (!ALLOWED.has(p)) no("The sell calls a program it should not.");
    if (p === SystemProgram.programId.toBase58()) { const k = ix.data.length >= 4 ? ix.data[0] | (ix.data[1] << 8) : -1; if (k === 2 || k === 11) no("The sell moves SOL out of the wallet."); }
    if (p === DBC_PROGRAM || p === DAMM_V2_PROGRAM) { const s = decodeSwap(ix); if (!s) no("The sell has an unknown pool instruction."); swaps.push(s!); }
  }
  if (swaps.length !== 1) no("The sell must have exactly one swap.");
  const s = swaps[0], mint = new PublicKey(x.mint);
  if (s.program !== x.route) no(`The sell uses the wrong pool type (${s.program === "dbc" ? "bonding curve" : "DAMM v2"}).`);
  if (s.pool !== x.pool) no("The sell uses a different pool.");
  if (s.mode !== 0) no("The sell is not an exact amount in swap.");
  if (s.input !== ata(owner, mint).toBase58()) no("The sell does not take the token from this wallet.");
  if (s.output !== ata(owner, new PublicKey(WSOL_MINT)).toBase58()) no("The sell does not pay SOL to this wallet.");
  if (s.amountIn > x.amountRaw || s.amountIn < x.amountRaw - 1n || s.amountIn <= 0n) no("The sell amount is not what you picked.");
  if (s.minOut <= 0n) no("The sell has no minimum SOL out.");
  return s;
}

/** Short reason from a failed simulation. */
export function simReason(err: unknown, logs?: string[] | null): string {
  const l = (logs ?? []).join("\n");
  if (/slippage|ExceededSlippage|0x1771|exceeded/i.test(l)) return "the price moved past your slippage";
  if (/insufficient funds|0x1\b/i.test(l)) return "not enough balance";
  const m = l.match(/Error Message: ([^.\n]+)/);
  if (m) return m[1].trim();
  const code = (err as { InstructionError?: [number, { Custom?: number }] })?.InstructionError?.[1]?.Custom;
  if (typeof code === "number") return `the pool refused it (error ${code})`;
  return typeof err === "string" ? err : (() => { try { return JSON.stringify(err).slice(0, 120); } catch { return "simulation error"; } })();
}

export async function runSell(req: SellReq, d: SellDeps): Promise<SellDone> {
  const step = d.step ?? (() => {});
  if (typeof req.walletId !== "string" || !req.walletId) throw new SellAborted("Pick a wallet");
  try { new PublicKey(req.mint); } catch { throw new SellAborted("That is not a token address"); }
  const bps = toBps(req.slippagePct);
  step("build");
  const w = await d.owner(req.walletId);
  const kp = await d.keypair(req.walletId);
  if (kp.publicKey.toBase58() !== w.address) throw new SellAborted("The key does not match this wallet. Nothing was signed.");
  const bal = await d.balance(w.address, req.mint);
  let amountRaw: bigint;
  try { amountRaw = sellRaw(bal.raw, req.pct); } catch (e) { throw new SellAborted((e as Error).message); }
  const t = await d.target(req.mint);
  const args: BuildArgs = { owner: kp.publicKey, pool: t.pool, mint: req.mint, amountRaw, decimals: bal.decimals, slippageBps: bps };
  const tx = t.route === "damm" ? await d.buildDamm(args) : await d.buildDbc(args);
  checkSellTx(tx, kp.publicKey, { mint: req.mint, pool: t.pool, route: t.route, amountRaw });
  step("sign");
  tx.partialSign(kp);
  const raw = tx.serialize({ requireAllSignatures: true, verifySignatures: true });
  step("simulate");
  let sim: { err: unknown; logs?: string[] | null };
  try { sim = await d.simulate(raw); }
  catch (e) { throw new SellAborted(`Could not run the safety simulation (${(e as Error)?.message || "RPC error"}). Nothing was sent.`, "SELL_SIM"); }
  if (sim.err) throw new SellAborted(`The sell would fail: ${simReason(sim.err, sim.logs)}. Nothing was sent.`, "SELL_SIM_FAILED");
  step("send");
  const signature = await d.send(raw, () => step("confirm"));
  return { signature, amountRaw: amountRaw.toString(), route: t.route, wallet: w.address };
}

// ---- buy (Holding panel): SOL in, the token out, same order as a sell: build, check, sign with the owning wallet, simulate, send ----
export interface BuyReq { walletId: string; mint: string; sol: number; slippagePct: number }
export interface BuyDeps extends Omit<SellDeps, "balance"> {
  /** SOL balance of the owner, in SOL. */
  solBalance(owner: string): Promise<number>;
  /** Token decimals (6 for highbar tokens). */
  decimals?(mint: string): Promise<number>;
}
export interface BuyDone { signature: string; lamports: string; route: SellRoute; wallet: string }
/** SOL a buy keeps back for the token account rent and fees. */
export const BUY_RESERVE_SOL = 0.003;
import { BUY_MAX_SOL } from "./limits";
export { BUY_MAX_SOL };

/** Checks a built buy before signing: owner pays and signs alone, known programs only, the only SOL that moves goes into the
 *  owner's own wrapped SOL account (at most the amount), one swap on the expected pool, SOL in from the owner, the token out
 *  to the owner, the amount in is what was asked, and a minimum out above zero. */
export function checkBuyTx(tx: Transaction, owner: PublicKey, x: { mint: string; pool: string; route: SellRoute; lamports: bigint }) {
  const no = (m: string) => { throw new SellAborted(`${m} Nothing was signed.`, "BUY_CHECK"); };
  if (!tx.feePayer || !tx.feePayer.equals(owner)) no("The fee payer is not this wallet.");
  const msg = tx.compileMessage();
  if (msg.header.numRequiredSignatures !== 1 || !msg.accountKeys[0].equals(owner)) no("The buy must be signed by this wallet only.");
  const wsolAta = ata(owner, new PublicKey(WSOL_MINT));
  const swaps: SwapIx[] = [];
  let moved = 0n;
  for (const ix of tx.instructions) {
    const p = ix.programId.toBase58();
    if (!ALLOWED.has(p)) no("The buy calls a program it should not.");
    if (p === SystemProgram.programId.toBase58()) {
      const k = ix.data.length >= 4 ? ix.data[0] | (ix.data[1] << 8) : -1;
      if (k === 11) no("The buy moves SOL out of the wallet.");
      if (k === 2) {
        if (ix.keys[1]?.pubkey.equals(wsolAta) !== true || ix.data.length < 12) no("The buy moves SOL to another account.");
        moved += u64(ix.data, 4);
      }
    }
    if (p === DBC_PROGRAM || p === DAMM_V2_PROGRAM) { const s = decodeSwap(ix); if (!s) no("The buy has an unknown pool instruction."); swaps.push(s!); }
  }
  if (moved > x.lamports) no("The buy wraps more SOL than you picked.");
  if (swaps.length !== 1) no("The buy must have exactly one swap.");
  const s = swaps[0];
  if (s.program !== x.route) no(`The buy uses the wrong pool type (${s.program === "dbc" ? "bonding curve" : "DAMM v2"}).`);
  if (s.pool !== x.pool) no("The buy uses a different pool.");
  if (s.mode !== 0) no("The buy is not an exact amount in swap.");
  if (s.input !== wsolAta.toBase58()) no("The buy does not pay from this wallet.");
  if (s.output !== ata(owner, new PublicKey(x.mint)).toBase58()) no("The buy does not send the token to this wallet.");
  if (s.amountIn > x.lamports || s.amountIn < x.lamports - 1n || s.amountIn <= 0n) no("The buy amount is not what you picked.");
  if (s.minOut <= 0n) no("The buy has no minimum out.");
  return s;
}

export async function runBuy(req: BuyReq, d: BuyDeps): Promise<BuyDone> {
  const step = d.step ?? (() => {});
  if (typeof req.walletId !== "string" || !req.walletId) throw new SellAborted("Pick a wallet");
  try { new PublicKey(req.mint); } catch { throw new SellAborted("That is not a token address"); }
  const sol = Number(req.sol);
  if (!Number.isFinite(sol) || sol <= 0 || sol > BUY_MAX_SOL) throw new SellAborted(`Pick an amount above 0 and up to ${BUY_MAX_SOL} SOL`);
  const lamports = BigInt(Math.round(sol * 1e9));
  const bps = toBps(req.slippagePct);
  step("build");
  const w = await d.owner(req.walletId);
  const kp = await d.keypair(req.walletId);
  if (kp.publicKey.toBase58() !== w.address) throw new SellAborted("The key does not match this wallet. Nothing was signed.");
  const have = await d.solBalance(w.address);
  if (!(have >= sol + BUY_RESERVE_SOL)) throw new SellAborted(`Not enough SOL in ${w.label} (has ${Math.floor(have * 1e4) / 1e4}, needs about ${Math.ceil((sol + BUY_RESERVE_SOL) * 1e4) / 1e4})`, "BUY_FUNDS");
  const t = await d.target(req.mint);
  const decimals = d.decimals ? await d.decimals(req.mint) : 6;
  const args: BuildArgs = { owner: kp.publicKey, pool: t.pool, mint: req.mint, amountRaw: lamports, decimals, slippageBps: bps, side: "buy" };
  const tx = t.route === "damm" ? await d.buildDamm(args) : await d.buildDbc(args);
  checkBuyTx(tx, kp.publicKey, { mint: req.mint, pool: t.pool, route: t.route, lamports });
  step("sign");
  tx.partialSign(kp);
  const raw = tx.serialize({ requireAllSignatures: true, verifySignatures: true });
  step("simulate");
  let sim: { err: unknown; logs?: string[] | null };
  try { sim = await d.simulate(raw); }
  catch (e) { throw new SellAborted(`Could not run the safety simulation (${(e as Error)?.message || "RPC error"}). Nothing was sent.`, "SELL_SIM"); }
  if (sim.err) throw new SellAborted(`The buy would fail: ${simReason(sim.err, sim.logs)}. Nothing was sent.`, "SELL_SIM_FAILED");
  step("send");
  const signature = await d.send(raw, () => step("confirm"));
  return { signature, lamports: lamports.toString(), route: t.route, wallet: w.address };
}
