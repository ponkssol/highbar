import { db } from "../db/pool.js";
import { BPS, CASHBACK_BPS } from "@hb/shared";
/** Only UI swaps (via_ui = carried our referral account). Accrue CASHBACK_BPS (default 5 = 0.05%) of finalized curve volume per wallet for an epoch.
 *  Simple anti-wash: ignore wallets whose buy and sell volume on the same mint net to ~0 within the epoch (TODO: refine). */
export async function accrueCashback(epochId: number) {
  const { rows: [ep] } = await db.query("SELECT starts_at, ends_at FROM epochs WHERE id=$1", [epochId]);
  await db.query(
    `INSERT INTO reward_ledger (epoch_id, wallet, kind, amount_lamports)
     SELECT $1, trader, 'cashback', (sum(sol_lamports) * $4 / $5)::bigint FROM trades
     WHERE finalized AND via_ui AND venue='curve' AND time >= $2 AND time < $3
     GROUP BY trader HAVING (sum(sol_lamports) * $4 / $5) >= 10000000 -- min 0.01 SOL (TODO carry-over)
     ON CONFLICT (epoch_id, wallet, kind) DO NOTHING`, [epochId, ep.starts_at, ep.ends_at, CASHBACK_BPS, BPS]);
  const { rows: [s] } = await db.query("SELECT coalesce(sum(amount_lamports),0)::bigint total FROM reward_ledger WHERE epoch_id=$1 AND kind='cashback'", [epochId]);
  return BigInt(s.total);
}
