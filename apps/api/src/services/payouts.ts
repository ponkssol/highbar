import { PublicKey, SystemProgram, Transaction, type Keypair } from "@solana/web3.js";
import { getConnection } from "@hb/onchain";
import { memoIx, sendOnce, sigState, simulate } from "../jobs/chain.js";
import { db } from "../db/pool.js";

/** Generic SOL payout batching shared by the referral and milestone jobs (same safety as cashback: simulate in dry-run,
 *  live = sign once, persist the signature as pending BEFORE sending, confirm, then mark paid; reconcile settles crashes). */
export interface Due { wallet: string; lamports: bigint; ref: string[] }
export interface PayoutResult { wallets: string[]; refs: string[]; lamports: bigint; sig?: string; status: "paid" | "would-pay" | "failed"; note?: string }

export const isKey = (w: string) => { try { return PublicKey.isOnCurve(new PublicKey(w).toBytes()); } catch { return false; } };

export async function payBatches(o: {
  payer: Keypair; live: boolean; due: Due[]; batch: number; memo: (b: Due[]) => string;
  markPending: (sig: string, b: Due[]) => Promise<void>; markPaid: (sig: string) => Promise<void>;
}): Promise<PayoutResult[]> {
  const due = o.due.filter((d) => d.lamports > 0n && d.wallet !== o.payer.publicKey.toBase58() && isKey(d.wallet));
  if (!due.length) return [];
  const conn = getConnection(), out: PayoutResult[] = [];
  const total = due.reduce((a, d) => a + d.lamports, 0n);
  const bal = BigInt(await conn.getBalance(o.payer.publicKey, "confirmed"));
  if (bal < total + 10_000_000n) {
    const note = `payer ${o.payer.publicKey.toBase58()} has ${bal} lamports, needs ${total} + 0.01 SOL buffer`;
    if (o.live) throw new Error(note);
    out.push({ wallets: [], refs: [], lamports: 0n, status: "failed", note });
  }
  for (let i = 0; i < due.length; i += o.batch) {
    const b = due.slice(i, i + o.batch);
    const tx = new Transaction();
    for (const d of b) tx.add(SystemProgram.transfer({ fromPubkey: o.payer.publicKey, toPubkey: new PublicKey(d.wallet), lamports: d.lamports }));
    tx.add(memoIx(o.memo(b)));
    const base = { wallets: b.map((d) => d.wallet), refs: b.flatMap((d) => d.ref), lamports: b.reduce((a, d) => a + d.lamports, 0n) };
    if (!o.live) { const sim = await simulate(tx, o.payer.publicKey); out.push({ ...base, status: sim.ok ? "would-pay" : "failed", note: sim.err }); continue; }
    // pre-flight simulation before the one and only signature
    const sim = await simulate(tx, o.payer.publicKey);
    if (!sim.ok) { out.push({ ...base, status: "failed", note: `simulation failed: ${sim.err}` }); continue; }
    try {
      const sig = await sendOnce(tx, [o.payer], (s) => o.markPending(s, b));
      await o.markPaid(sig);
      out.push({ ...base, sig, status: "paid" });
    } catch (e) { out.push({ ...base, status: "failed", note: (e as Error).message }); } // stays pending; reconcile settles it next run
  }
  return out;
}

/** Pending payouts of `table` from an earlier (crashed / timed-out) run: landed -> paid, failed or expired -> unpaid again. */
export async function reconcile(table: "referral_rewards" | "milestone_bonuses") {
  const { rows } = await db.query<{ pending_sig: string; pending_at: number }>(`SELECT DISTINCT pending_sig, pending_at FROM ${table} WHERE pending_sig IS NOT NULL AND paid_sig IS NULL`);
  for (const r of rows) {
    const s = await sigState(r.pending_sig);
    if (s === "landed") await db.query(`UPDATE ${table} SET paid_sig = pending_sig, paid_at = $2 WHERE pending_sig = $1`, [r.pending_sig, Date.now()]);
    else if (s === "failed" || Date.now() - r.pending_at > 5 * 60_000)
      await db.query(`UPDATE ${table} SET pending_sig = NULL, pending_at = NULL WHERE pending_sig = $1 AND paid_sig IS NULL`, [r.pending_sig]);
  }
}
