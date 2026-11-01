/** highbar extension platform fee: 0.02% (2 bps) of every extension trade's SOL amount, paid by the trading wallet to the
 *  receiver the highbar API names (GET /config extFee, and the launch responses for a dev buy). Never hardcoded: with no
 *  receiver from the API (or extFee.enabled false) no fee is charged and nothing is shown.
 *  extFeeLamports is an exact copy of @hb/shared extFeeLamports so the extension and the API round identically.
 *  Basis: a buy pays 0.02% of the SOL in; a sell pays 0.02% of the quoted minimum SOL out (known before signing, never more
 *  than what the sell returns); a launch pays 0.02% of the dev buy's amount_in. The fee is ONE System transfer
 *  wallet -> receiver, appended as the last instruction. When it would push the tx past 1232 bytes it is skipped. */
import { PublicKey, SystemProgram, TransactionMessage, VersionedTransaction, type AddressLookupTableAccount, type Transaction, type TransactionInstruction } from "@solana/web3.js";

import { EXT_FEE_BPS, TX_MAX_BYTES, extFeeLamports, type FeeInfo } from "./feemath";
export * from "./feemath";

/** The fee config the worker trades with: present only when the API enables it with a valid receiver at the same rate. */
export interface ExtFee { receiver: string; bps: number }

const isKey = (v: unknown): v is string => {
  if (typeof v !== "string" || v.length < 32 || v.length > 44) return false;
  try { return new PublicKey(v).toBase58() === v; } catch { return false; }
};
/** GET /config extFee -> ExtFee or null. Anything unexpected (missing, disabled, bad key, another rate) = no fee. */
export function readExtFee(v: unknown): ExtFee | null {
  if (!v || typeof v !== "object") return null;
  const o = v as { bps?: unknown; receiver?: unknown; enabled?: unknown };
  if (o.enabled !== true || o.bps !== EXT_FEE_BPS || !isKey(o.receiver)) return null;
  return { receiver: o.receiver, bps: EXT_FEE_BPS };
}
/** What the worker caches from GET /config: the checked fee config in the API's own shape, so reading the cache back with
 *  readExtFee gives the same answer (null stays null). */
export const cacheExtFee = (v: unknown) => { const f = readExtFee(v); return f ? { bps: f.bps, receiver: f.receiver, enabled: true as const } : null; };
export const feeInfo = (f: ExtFee | null): FeeInfo => ({ enabled: !!f, bps: EXT_FEE_BPS });

/** The launch responses' extFee { bps, lamports, sol, receiver, allowed }: the fee to append to a dev buy, or null. The
 *  receiver must be the one GET /config names, and the amount must be the local copy of the API's math on the tx's dev buy. */
export function launchFee(v: unknown, cfg: ExtFee | null, devBuyLamports: bigint | null): FeeLeg | null {
  if (!cfg || devBuyLamports === null || !v || typeof v !== "object") return null;
  const o = v as { bps?: unknown; lamports?: unknown; receiver?: unknown; allowed?: unknown };
  if (o.allowed !== true || o.bps !== EXT_FEE_BPS || o.receiver !== cfg.receiver) return null;
  const want = extFeeLamports(devBuyLamports);
  if (want <= 0n || typeof o.lamports !== "string" || o.lamports !== want.toString()) return null;
  return { receiver: new PublicKey(cfg.receiver), lamports: want };
}

export interface FeeLeg { receiver: PublicKey; lamports: bigint }
/** Fee for a trade of `amount` lamports, or null when off or when it rounds to 0. */
export function feeLeg(f: ExtFee | null, amount: bigint): FeeLeg | null {
  if (!f || amount <= 0n) return null;
  const lamports = extFeeLamports(amount);
  return lamports > 0n ? { receiver: new PublicKey(f.receiver), lamports } : null;
}
export const feeIx = (from: PublicKey, leg: FeeLeg): TransactionInstruction =>
  SystemProgram.transfer({ fromPubkey: from, toPubkey: leg.receiver, lamports: leg.lamports });

// ---- recognizing the one fee transfer in a built tx ----
const SYSTEM = SystemProgram.programId.toBase58();
const u64 = (d: Uint8Array, at: number) => { let v = 0n; for (let i = 7; i >= 0; i--) v = (v << 8n) | BigInt(d[at + i] ?? 0); return v; };
/** System transfer { from, to, lamports } or null (only kind 2 with exactly 12 data bytes and 2 accounts). */
export function asTransfer(programId: string, data: Uint8Array, keys: (string | null)[]): { from: string | null; to: string | null; lamports: bigint } | null {
  if (programId !== SYSTEM || data.length !== 12 || (data[0] | (data[1] << 8) | (data[2] << 16) | (data[3] << 24)) !== 2 || keys.length !== 2) return null;
  return { from: keys[0], to: keys[1], lamports: u64(data, 4) };
}

// ---- appending ----
const legacySize = (tx: Transaction) => { try { return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).length; } catch { return Infinity; } };
/** Appends the fee transfer to an unsigned legacy tx when it still fits in 1232 bytes. Returns whether it was added. */
export function addLegacyFee(tx: Transaction, from: PublicKey, leg: FeeLeg | null): boolean {
  if (!leg || tx.signatures.some((s) => s.signature)) return false;
  tx.add(feeIx(from, leg));
  if (legacySize(tx) <= TX_MAX_BYTES) return true;
  tx.instructions.pop();
  return false;
}

/** Rebuilds an unsigned v0 tx (Jupiter's) with the fee transfer appended last, resolving its lookup tables so every account
 *  keeps its place (static or table). Returns null when it can not be done safely: other signers, a table missing, or the
 *  result over 1232 bytes. */
export function addV0Fee(tx: VersionedTransaction, from: PublicKey, leg: FeeLeg | null, tables: AddressLookupTableAccount[]): VersionedTransaction | null {
  if (!leg || tx.message.version !== 0) return null;
  const m = tx.message;
  if (m.header.numRequiredSignatures !== 1 || !m.staticAccountKeys[0]?.equals(from)) return null;
  const need = m.addressTableLookups.map((l) => l.accountKey.toBase58());
  const have = new Map(tables.map((t) => [t.key.toBase58(), t]));
  if (need.some((k) => !have.has(k))) return null;
  const alts = need.map((k) => have.get(k)!);
  let ixs: TransactionInstruction[];
  try { ixs = TransactionMessage.decompile(m, { addressLookupTableAccounts: alts }).instructions; } catch { return null; }
  ixs.push(feeIx(from, leg));
  let out: VersionedTransaction;
  try { out = new VersionedTransaction(new TransactionMessage({ payerKey: from, recentBlockhash: m.recentBlockhash, instructions: ixs }).compileToV0Message(alts)); }
  catch { return null; }
  try { if (out.serialize().length > TX_MAX_BYTES) return null; } catch { return null; }
  return out;
}
