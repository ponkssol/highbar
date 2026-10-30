/**
 * Strict allowlist for the launch tx the API co-signs with a vanity mint keypair (services/mintPool).
 *
 * The only shapes accepted are what DBC SDK 2.0.0 `creator.createPoolWithFirstBuy` emits for our configs
 * (dist/index.js: createPoolTx -> initializeSplPool | initializeToken2022Pool, appendFirstBuys -> buildSwapBuyTx ->
 * prepareSwapAccounts), optionally preceded by ComputeBudget instructions a wallet may prepend:
 *
 *   wallet-added, anywhere: ComputeBudget SetComputeUnitLimit / SetComputeUnitPrice (at most one of each) and
 *   Lighthouse assertions (never referencing the mint, no signer but the creator); the rest must be exactly:
 *   DBC initialize_virtual_pool_with_spl_token | initialize_virtual_pool_with_token2022   (exactly one, first)
 *   -- only with a dev buy (firstBuyParam.buyAmount > 0), in this order:
 *   [ATA create_idempotent(WSOL, creator)]?    (SDK omits it when the creator's WSOL ATA exists)
 *   [ATA create_idempotent(baseMint, creator)]? (always emitted for a fresh mint; optional here)
 *   System transfer(creator -> creator's WSOL ATA)   (wrap SOL)
 *   SPL Token sync_native(creator's WSOL ATA)
 *   DBC swap (base_mint = the vanity mint, payer = creator, same config and pool)
 *   SPL Token close_account(creator's WSOL ATA -> creator, owner creator)   (unwrap)
 *
 * Anything else (SetAuthority, transfers or mint-to's using the mint, a durable-nonce advance, lookup tables, a second
 * pool, a different program) is rejected. Signers must be exactly [creator (fee payer), mint].
 */
import { PublicKey, SystemProgram, Transaction, VersionedTransaction, type TransactionInstruction } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, NATIVE_MINT, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { deriveDbcPoolAddress, DYNAMIC_BONDING_CURVE_PROGRAM_ID, DynamicBondingCurveIdl } from "@meteora-ag/dynamic-bonding-curve-sdk";

export class LaunchTxRejected extends Error {
  constructor(msg: string) { super(`launch tx rejected: ${msg}`); this.name = "LaunchTxRejected"; }
}

export const COMPUTE_BUDGET_PROGRAM_ID = new PublicKey("ComputeBudget111111111111111111111111111111");
/** Lighthouse (assertion program Phantom and other wallets inject to guard against drainers) */
export const LIGHTHOUSE_PROGRAM_ID = new PublicKey("L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95");
const DBC = DYNAMIC_BONDING_CURVE_PROGRAM_ID;
const EVENT_AUTHORITY = PublicKey.findProgramAddressSync([Buffer.from("__event_authority")], DBC)[0];

type IdlIx = { name: string; discriminator: number[]; accounts: { name: string; address?: string }[] };
function ixDef(name: string) {
  const i = (DynamicBondingCurveIdl as unknown as { instructions: IdlIx[] }).instructions.find((x) => x.name === name);
  if (!i) throw new Error(`DBC IDL has no ${name}`);
  const idx: Record<string, number> = Object.fromEntries(i.accounts.map((a, k) => [a.name, k]));
  const fixed = i.accounts.map((a, k) => [k, a.address] as const).filter((e): e is readonly [number, string] => !!e[1]);
  return { name, disc: Buffer.from(i.discriminator), idx, n: i.accounts.length, fixed };
}
const INIT_SPL = ixDef("initialize_virtual_pool_with_spl_token");
const INIT_T22 = ixDef("initialize_virtual_pool_with_token2022");
const SWAP = ixDef("swap");

export interface LaunchTxExpect {
  /** the reserved vanity mint (base mint of the new pool) */
  mint: string;
  /** the wallet that reserved it: fee payer, pool creator, payer and (with a dev buy) buyer/receiver */
  creator: string;
  /** allowed DBC configs: the 6 tier configs of the active cluster */
  configs: readonly string[];
  /** allowed swap referral token accounts besides "none" (the DBC program id): the platform referral WSOL ATA */
  referrals?: readonly string[];
  /** default true: the creator's signature must be present and valid (wallet signs first, then the API) */
  requireCreatorSignature?: boolean;
}
export interface LaunchTxInfo { tx: Transaction; config: string; pool: string; devBuy: boolean; tokenProgram: "spl" | "token2022" }

const reject = (m: string): never => { throw new LaunchTxRejected(m); };
const same = (a: PublicKey, b: PublicKey) => a.equals(b);
const startsWith = (data: Buffer, disc: Buffer) => data.length >= disc.length && data.subarray(0, disc.length).equals(disc);

/** Parse + validate a base64 / raw legacy tx. Throws LaunchTxRejected (a short, secret-free reason) on anything unexpected. */
export function validateLaunchTx(raw: string | Uint8Array, exp: LaunchTxExpect): LaunchTxInfo {
  const bytes = typeof raw === "string" ? Buffer.from(raw, "base64") : Buffer.from(raw);
  if (bytes.length < 100 || bytes.length > 1232) reject("bad size");
  let vt: VersionedTransaction;
  try { vt = VersionedTransaction.deserialize(bytes); } catch { return reject("not a transaction"); }
  if (vt.version !== "legacy") reject("versioned transactions / lookup tables are not allowed");
  let tx: Transaction;
  try { tx = Transaction.from(bytes); } catch { return reject("not a legacy transaction"); }

  const mint = new PublicKey(exp.mint), creator = new PublicKey(exp.creator);
  const configs = new Set(exp.configs);
  const msg = vt.message;
  // signers: exactly [creator (fee payer), mint]
  const h = msg.header;
  if (h.numRequiredSignatures !== 2) reject("expected exactly 2 signers (creator, mint)");
  const keys = msg.staticAccountKeys;
  if (!same(keys[0], creator)) reject("fee payer must be the creator");
  if (!same(keys[1], mint)) reject("second signer must be the reserved mint");
  if (!tx.feePayer || !same(tx.feePayer, creator)) reject("fee payer must be the creator");
  if (!tx.recentBlockhash) reject("missing blockhash");

  // Wallet-added instructions (wallet signs first, so Phantom & co may add them): ComputeBudget and Lighthouse
  // assertions, anywhere in the tx. They are split off here and checked on their own below; the SDK shape is checked
  // on what remains, so their position never matters.
  const all = tx.instructions;
  const isWalletIx = (ix: TransactionInstruction) => same(ix.programId, COMPUTE_BUDGET_PROGRAM_ID) || same(ix.programId, LIGHTHOUSE_PROGRAM_ID);
  const seenCb = new Set<number>();
  for (const ix of all) {
    if (same(ix.programId, COMPUTE_BUDGET_PROGRAM_ID)) {
      const d = ix.data;
      if (ix.keys.length) reject("compute budget instruction with accounts");
      if (!((d[0] === 2 && d.length === 5) || (d[0] === 3 && d.length === 9))) reject("only SetComputeUnitLimit / SetComputeUnitPrice are allowed");
      if (d[0] === 2 && d.readUInt32LE(1) > 1_400_000) reject("compute unit limit too high");
      if (seenCb.has(d[0])) reject("duplicate compute budget instruction");
      seenCb.add(d[0]);
    } else if (same(ix.programId, LIGHTHOUSE_PROGRAM_ID)) {
      // Assertions only. In a legacy tx signer / writable are per ACCOUNT, not per instruction: any reference to the
      // mint (a writable signer of the init) would hand Lighthouse the mint's signer + writable privileges, so the mint
      // may not appear at all. The creator may (Phantom asserts on the payer's own balance); it is the fee payer and
      // the only other signer anyway (signer set = exactly [creator, mint], checked above), so no new signer can appear.
      for (const m of ix.keys) {
        if (same(m.pubkey, mint)) reject("wallet guard (Lighthouse) instruction may not reference the mint");
        if (m.isSigner && !same(m.pubkey, creator)) reject("wallet guard (Lighthouse) instruction with an extra signer");
      }
    }
  }
  const ixs = all.filter((ix) => !isWalletIx(ix));
  let i = 0;
  const allowedMintRefs = new Set<string>(); // "ix:key" positions (in ixs, wallet instructions removed) where the mint may appear
  // 2) exactly one DBC initialize pool
  const init = ixs[i];
  if (!init) reject("missing initialize pool instruction");
  if (!same(init.programId, DBC)) reject("first instruction must be the DBC initialize pool (wrong program)");
  const def = startsWith(init.data, INIT_SPL.disc) ? INIT_SPL : startsWith(init.data, INIT_T22.disc) ? INIT_T22 : reject("first DBC instruction must be initialize_virtual_pool_with_spl_token / _token2022");
  const tokenProgram = def === INIT_SPL ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID;
  checkFixed(init, def);
  const a = (n: string) => init.keys[def.idx[n]].pubkey;
  const config = a("config");
  if (!configs.has(config.toBase58())) reject("config is not one of the highbar tier configs");
  if (!same(a("base_mint"), mint)) reject("base mint is not the reserved mint");
  if (!same(a("creator"), creator) || !same(a("payer"), creator)) reject("creator / payer must be the reserving wallet");
  if (!same(a("quote_mint"), NATIVE_MINT)) reject("quote mint must be WSOL");
  const pool = deriveDbcPoolAddress(NATIVE_MINT, mint, config);
  if (!same(a("pool"), pool)) reject("pool is not the DBC pool PDA of (WSOL, mint, config)");
  allowedMintRefs.add(`${i}:${def.idx.base_mint}`);
  i++;

  // 3) optional first buy, exact SDK order
  let devBuy = false;
  if (i < ixs.length) {
    devBuy = true;
    const wsolAta = getAssociatedTokenAddressSync(NATIVE_MINT, creator, true, TOKEN_PROGRAM_ID);
    const baseAta = getAssociatedTokenAddressSync(mint, creator, true, tokenProgram);
    const isAta = (ix: TransactionInstruction | undefined, m: PublicKey) => !!ix && same(ix.programId, ASSOCIATED_TOKEN_PROGRAM_ID) && same(ix.keys[3]?.pubkey ?? PublicKey.default, m);
    if (isAta(ixs[i], NATIVE_MINT)) { checkAta(ixs[i], creator, NATIVE_MINT, wsolAta, TOKEN_PROGRAM_ID); i++; }
    if (isAta(ixs[i], mint)) { checkAta(ixs[i], creator, mint, baseAta, tokenProgram); allowedMintRefs.add(`${i}:3`); i++; }
    // wrap: System transfer creator -> WSOL ATA
    const t = ixs[i] ?? reject("dev buy: missing SOL wrap transfer");
    if (!same(t.programId, SystemProgram.programId) || t.data.length !== 12 || t.data.readUInt32LE(0) !== 2) reject("dev buy: only a System transfer may wrap SOL");
    if (t.keys.length !== 2 || !same(t.keys[0].pubkey, creator) || !same(t.keys[1].pubkey, wsolAta)) reject("dev buy: the wrap transfer must go from the creator to its WSOL account");
    i++;
    const s = ixs[i] ?? reject("dev buy: missing sync_native");
    if (!same(s.programId, TOKEN_PROGRAM_ID) || s.data.length !== 1 || s.data[0] !== 17 || s.keys.length !== 1 || !same(s.keys[0].pubkey, wsolAta)) reject("dev buy: expected sync_native on the creator's WSOL account");
    i++;
    const sw = ixs[i] ?? reject("dev buy: missing swap");
    if (!same(sw.programId, DBC) || !startsWith(sw.data, SWAP.disc)) reject("dev buy: expected the DBC swap instruction");
    checkFixed(sw, SWAP);
    const b = (n: string) => sw.keys[SWAP.idx[n]].pubkey;
    if (!same(b("config"), config) || !same(b("pool"), pool)) reject("dev buy: swap must target the new pool");
    if (!same(b("base_mint"), mint) || !same(b("quote_mint"), NATIVE_MINT)) reject("dev buy: swap mints mismatch");
    if (!same(b("payer"), creator)) reject("dev buy: swap payer must be the creator");
    if (!same(b("input_token_account"), wsolAta) || !same(b("output_token_account"), baseAta)) reject("dev buy: swap token accounts must be the creator's WSOL / token accounts");
    if (!same(b("token_base_program"), tokenProgram) || !same(b("token_quote_program"), TOKEN_PROGRAM_ID)) reject("dev buy: swap token programs mismatch");
    const ref = b("referral_token_account");
    if (!same(ref, DBC) && !(exp.referrals ?? []).includes(ref.toBase58())) reject("dev buy: referral account must be the platform referral or none");
    allowedMintRefs.add(`${i}:${SWAP.idx.base_mint}`);
    i++;
    const c = ixs[i] ?? reject("dev buy: missing WSOL unwrap");
    if (!same(c.programId, TOKEN_PROGRAM_ID) || c.data.length !== 1 || c.data[0] !== 9 || c.keys.length !== 3) reject("dev buy: expected close_account (unwrap) last");
    if (!same(c.keys[0].pubkey, wsolAta) || !same(c.keys[1].pubkey, creator) || !same(c.keys[2].pubkey, creator)) reject("dev buy: unwrap must close the creator's WSOL account to the creator");
    i++;
  }
  if (i !== ixs.length) reject("unexpected extra instructions");

  // the mint may only appear where the SDK puts it (init base_mint, base ATA mint, swap base_mint) and never as a program
  // (wallet instructions were checked above: Lighthouse never references the mint)
  ixs.forEach((ix, k) => {
    if (same(ix.programId, mint)) reject("mint used as a program");
    ix.keys.forEach((m, j) => { if (same(m.pubkey, mint) && !allowedMintRefs.has(`${k}:${j}`)) reject("mint referenced outside the pool creation"); });
  });

  // signatures: the mint slot must be empty (the API adds it), the creator's present and valid when required
  const sigOf = (pk: PublicKey) => tx.signatures.find((s) => same(s.publicKey, pk))?.signature ?? null;
  const mintSig = sigOf(mint);
  if (mintSig && mintSig.some((x) => x !== 0)) reject("mint signature already present");
  if (exp.requireCreatorSignature !== false) {
    const cs = sigOf(creator);
    if (!cs || cs.every((x) => x === 0)) reject("creator signature missing (sign with the wallet first)");
    if (!tx.verifySignatures(false)) reject("creator signature invalid");
  }
  return { tx, config: config.toBase58(), pool: pool.toBase58(), devBuy, tokenProgram: def === INIT_SPL ? "spl" : "token2022" };
}

function checkFixed(ix: TransactionInstruction, def: ReturnType<typeof ixDef>) {
  if (ix.keys.length < def.n) reject(`${def.name}: missing accounts`);
  for (const [k, addr] of def.fixed) if (ix.keys[k].pubkey.toBase58() !== addr) reject(`${def.name}: unexpected fixed account`);
  if (!same(ix.keys[def.idx.event_authority].pubkey, EVENT_AUTHORITY) || !same(ix.keys[def.idx.program].pubkey, DBC)) reject(`${def.name}: unexpected event authority`);
  // remaining accounts (token badge for init, instructions sysvar for a min-fee first swap) are read-only and never the mint (checked by the caller)
  for (const extra of ix.keys.slice(def.n)) if (extra.isWritable || extra.isSigner) reject(`${def.name}: unexpected writable / signer remaining account`);
}

function checkAta(ix: TransactionInstruction, owner: PublicKey, mint: PublicKey, ata: PublicKey, tokenProgram: PublicKey) {
  if (ix.data.length !== 1 || ix.data[0] !== 1) reject("only idempotent ATA creation is allowed");
  const k = ix.keys.map((m) => m.pubkey);
  if (k.length !== 6 || !same(k[0], owner) || !same(k[1], ata) || !same(k[2], owner) || !same(k[3], mint) || !same(k[4], SystemProgram.programId) || !same(k[5], tokenProgram))
    reject("ATA creation must be the creator's own token account");
}
