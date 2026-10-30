import bs58 from "bs58";
import type { RawIx, RawTx } from "./decode.js";
import { tipProvider, type TipProvider } from "./tipAccounts.js";

/** Per-transaction cost breakdown computed from the getTransaction response the indexer ALREADY fetched (zero extra RPC).
 *  Pure: no db / env / network. Amounts are lamports (bigint).
 *
 *  - base fee     = signatures x 5000 (Solana base fee per signature)
 *  - priority fee = meta.fee - base fee (what the fee payer actually paid on top; exact). The ComputeBudget view
 *                   (ceil(CU price [micro-lamports] x CU limit / 1e6), limit = SetComputeUnitLimit or the 200k-per-ix default)
 *                   is kept next to it for cross-checking.
 *  - tips         = System transfers (top-level and inner) from a signer to a known tip account (indexer/tipAccounts.ts), by provider
 *  - setup        = System transfers / account creations from a signer into an account that another program of the tx uses
 *                   (ATA / WSOL rent, wrap amount, launch accounts): part of the swap / launch, not a cost to anyone else
 *  - other        = any other System transfer / account creation from a signer ('other transfer')
 *  - signerSolDelta = post - pre lamports of the fee payer (everything the trader's SOL balance moved by in this tx) */
export const LAMPORTS_PER_SIGNATURE = 5000n;
const SYSTEM = "11111111111111111111111111111111";
const COMPUTE_BUDGET = "ComputeBudget111111111111111111111111111111";
const DEFAULT_CU_PER_IX = 200_000, MAX_CU = 1_400_000;

export interface SolMove { to: string; lamports: bigint; kind: "transfer" | "createAccount"; inner: boolean }
export interface TipMove extends SolMove { provider: TipProvider }
export interface TxCosts {
  feePayer: string; signatures: number;
  /** meta.fee as charged */ feeLamports: bigint;
  baseFeeLamports: bigint; priorityFeeLamports: bigint;
  computeUnitLimit: number | null; computeUnitPriceMicroLamports: bigint | null; computeUnitsConsumed: number | null;
  /** ComputeBudget view of the priority fee (ceil(price x effective limit / 1e6)) */ priorityFeeFromBudgetLamports: bigint;
  tips: TipMove[]; tipsLamports: bigint; tipsByProvider: Record<string, bigint>;
  other: SolMove[]; otherLamports: bigint; setupLamports: bigint;
  signerSolDeltaLamports: bigint | null;
}

const u32 = (b: Uint8Array, o: number) => (b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16)) + b[o + 3]! * 0x1000000;
const u64 = (b: Uint8Array, o: number) => { let v = 0n; for (let i = 7; i >= 0; i--) v = (v << 8n) | BigInt(b[o + i]!); return v; };

/** System program lamport movement of one ix (from = accounts[0]), or null when it moves no lamports to another account. */
export function systemMove(data: Uint8Array, accts: string[]): { from: string; to: string; lamports: bigint; kind: SolMove["kind"] } | null {
  if (data.length < 12) return null;
  const tag = u32(data, 0);
  try {
    switch (tag) {
      case 0: return { from: accts[0]!, to: accts[1]!, lamports: u64(data, 4), kind: "createAccount" }; // CreateAccount
      case 2: return { from: accts[0]!, to: accts[1]!, lamports: u64(data, 4), kind: "transfer" }; // Transfer
      case 3: { // CreateAccountWithSeed: base(32) | seed(u64 len + bytes) | lamports | space | owner
        const len = Number(u64(data, 36)); return { from: accts[0]!, to: accts[1]!, lamports: u64(data, 44 + len), kind: "createAccount" };
      }
      case 11: return { from: accts[0]!, to: accts[2]!, lamports: u64(data, 4), kind: "transfer" }; // TransferWithSeed (from, base, to)
      default: return null;
    }
  } catch { return null; }
}

export function txCosts(tx: RawTx): TxCosts | null {
  const meta = tx.meta;
  if (!meta || meta.fee == null) return null;
  const keys = [...tx.transaction.message.accountKeys, ...(meta.loadedAddresses?.writable ?? []), ...(meta.loadedAddresses?.readonly ?? [])];
  const nsig = tx.transaction.signatures.length;
  const signers = new Set(keys.slice(0, nsig));
  const inner = new Map((meta.innerInstructions ?? []).map((g) => [g.index, g.instructions]));
  const flat: { ix: RawIx; inner: boolean }[] = [];
  tx.transaction.message.instructions.forEach((ix, i) => { flat.push({ ix, inner: false }); for (const x of inner.get(i) ?? []) flat.push({ ix: x, inner: true }); });

  // accounts used by any non-System / non-ComputeBudget instruction: lamports sent there are swap / launch setup
  const used = new Set<string>();
  for (const { ix } of flat) { const p = keys[ix.programIdIndex]; if (p !== SYSTEM && p !== COMPUTE_BUDGET) for (const a of ix.accounts) used.add(keys[a]!); }

  let cuLimit: number | null = null, cuPrice: bigint | null = null, nonBudgetTop = 0;
  const tips: TipMove[] = [], other: SolMove[] = [];
  let setup = 0n;
  for (const { ix, inner: isInner } of flat) {
    const prog = keys[ix.programIdIndex];
    if (prog === COMPUTE_BUDGET && !isInner) {
      const d = bs58.decode(ix.data);
      if (d[0] === 2 && d.length >= 5) cuLimit = u32(d, 1);
      else if (d[0] === 3 && d.length >= 9) cuPrice = u64(d, 1);
      continue;
    }
    if (!isInner) nonBudgetTop++;
    if (prog !== SYSTEM) continue;
    const m = systemMove(bs58.decode(ix.data), ix.accounts.map((a) => keys[a]!));
    if (!m || m.lamports <= 0n || !signers.has(m.from) || m.to === m.from) continue;
    const provider = tipProvider(m.to);
    if (provider) tips.push({ to: m.to, lamports: m.lamports, kind: m.kind, inner: isInner, provider });
    else if (used.has(m.to)) setup += m.lamports;
    else other.push({ to: m.to, lamports: m.lamports, kind: m.kind, inner: isInner });
  }
  const fee = BigInt(meta.fee), base = BigInt(nsig) * LAMPORTS_PER_SIGNATURE;
  const effLimit = cuLimit ?? Math.min(MAX_CU, DEFAULT_CU_PER_IX * nonBudgetTop);
  const budget = cuPrice ? (cuPrice * BigInt(effLimit) + 999_999n) / 1_000_000n : 0n;
  const tipsByProvider: Record<string, bigint> = {};
  for (const t of tips) tipsByProvider[t.provider] = (tipsByProvider[t.provider] ?? 0n) + t.lamports;
  const pre = meta.preBalances?.[0], post = meta.postBalances?.[0];
  return {
    feePayer: keys[0]!, signatures: nsig, feeLamports: fee, baseFeeLamports: base, priorityFeeLamports: fee > base ? fee - base : 0n,
    computeUnitLimit: cuLimit, computeUnitPriceMicroLamports: cuPrice, computeUnitsConsumed: meta.computeUnitsConsumed ?? null,
    priorityFeeFromBudgetLamports: budget,
    tips, tipsLamports: tips.reduce((a, t) => a + t.lamports, 0n), tipsByProvider,
    other, otherLamports: other.reduce((a, t) => a + t.lamports, 0n), setupLamports: setup,
    signerSolDeltaLamports: pre == null || post == null ? null : BigInt(post) - BigInt(pre),
  };
}
