/** Priority fee on the extension's transactions: ComputeBudget setComputeUnitLimit + setComputeUnitPrice, replacing any compute
 *  budget instruction the builder put there (never two of a kind). Guards read them back. Math in ./priomath.ts. */
import { ComputeBudgetProgram, Transaction, type TransactionInstruction } from "@solana/web3.js";
import { TX_MAX_BYTES as TX_MAX } from "./feemath";
import { cuPrice, CU_MAX, PRIORITY_MAX_LAMPORTS } from "./priomath";
export * from "./priomath";

export const COMPUTE_BUDGET_ID = ComputeBudgetProgram.programId.toBase58();

export function budgetIxs(limit: number, lamports: bigint): TransactionInstruction[] {
  const units = Math.max(1, Math.min(CU_MAX, Math.floor(limit)));
  const price = cuPrice(lamports, units);
  return [ComputeBudgetProgram.setComputeUnitLimit({ units }), ...(price > 0n ? [ComputeBudgetProgram.setComputeUnitPrice({ microLamports: price })] : [])];
}

const legacySize = (tx: Transaction) => { try { return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).length; } catch { return Infinity; } };

/** Puts the priority fee first in an unsigned legacy tx (any builder compute budget instruction removed). false and the tx
 *  unchanged when it is already signed or would pass 1232 bytes. */
export function setLegacyBudget(tx: Transaction, limit: number, lamports: bigint): boolean {
  if (tx.signatures.some((s) => s.signature)) return false;
  const before = tx.instructions;
  tx.instructions = [...budgetIxs(limit, lamports), ...before.filter((ix) => ix.programId.toBase58() !== COMPUTE_BUDGET_ID)];
  if (legacySize(tx) > TX_MAX) { tx.instructions = before; return false; }
  return true;
}

const u32 = (d: Uint8Array, at: number) => (d[at] | (d[at + 1] << 8) | (d[at + 2] << 16)) + d[at + 3] * 0x1000000;
const u64 = (d: Uint8Array, at: number) => { let v = 0n; for (let i = 7; i >= 0; i--) v = (v << 8n) | BigInt(d[at + i] ?? 0); return v; };

/** Reads a tx's compute budget instructions: SetComputeUnitLimit (2) and SetComputeUnitPrice (3) only, at most one of each, no
 *  accounts. `lamports` is what the priority fee can cost (price x limit, the runtime's 200k-per-instruction default when no
 *  limit is set). Throws a short reason on anything else or above the hard max (0.1 SOL), or above `maxLamports`. */
export function readBudget(ixs: { program: string | null; data: Uint8Array; keys: number }[], maxLamports: bigint = PRIORITY_MAX_LAMPORTS, nIxs = ixs.length) {
  let limit: number | null = null, price = 0n, priced = false;
  for (const ix of ixs) {
    if (ix.program !== COMPUTE_BUDGET_ID) continue;
    const d = ix.data;
    if (ix.keys) throw new Error("compute budget instruction with accounts");
    if (d[0] === 2 && d.length === 5) { if (limit !== null) throw new Error("two compute unit limits"); limit = u32(d, 1); if (limit > CU_MAX) throw new Error("compute unit limit too high"); }
    else if (d[0] === 3 && d.length === 9) { if (priced) throw new Error("two compute unit prices"); priced = true; price = u64(d, 1); }
    else throw new Error("unknown compute budget instruction");
  }
  const eff = limit ?? Math.min(CU_MAX, 200_000 * nIxs);
  const lamports = (price * BigInt(eff) + 999_999n) / 1_000_000n;
  if (lamports > PRIORITY_MAX_LAMPORTS) throw new Error(`priority fee above the ${Number(PRIORITY_MAX_LAMPORTS) / 1e9} SOL max`);
  if (lamports > maxLamports) throw new Error("priority fee above your setting");
  return { limit, price, lamports };
}
