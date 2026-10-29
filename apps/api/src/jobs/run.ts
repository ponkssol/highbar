// Fee claims: new FeeClaimer(keypair).runAll() on a cron before closing the epoch.
// Epoch close: claim -> cashback -> split -> buyback. Payouts stay 'accrued' until admin approves.
import { db } from "../db/pool.js";
import { accrueCashback } from "../services/cashback.js";
import { splitEpoch } from "../services/split.js";
export async function closeEpoch(epochId: number) {
  const { rows: [g] } = await db.query(
    "SELECT coalesce(sum(amount_lamports),0)::bigint gross FROM fee_claims f, epochs e WHERE e.id=$1 AND f.claimed_at>=e.starts_at AND f.claimed_at<e.ends_at", [epochId]);
  const cashback = await accrueCashback(epochId);
  const s = splitEpoch(BigInt(g.gross), cashback);
  await db.query("INSERT INTO treasury_splits (epoch_id,gross,cashback,buyback,ops,treasury) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING",
    [epochId, s.gross, s.cashback, s.buyback, s.ops, s.treasury]);
  await db.query("UPDATE epochs SET status='closed' WHERE id=$1", [epochId]);
  return s; // buyback + transfers to ops/treasury wallets executed separately after multisig approval
}
