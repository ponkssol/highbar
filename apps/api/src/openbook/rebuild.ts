import type { Q } from "../db/pool.js";
import type { TxCosts } from "../indexer/txCosts.js";
import type { TipProvider } from "../indexer/tipAccounts.js";
import { isSniperTx } from "./math.js";
import { splitOfRow } from "./read.js";
import { bumpCostAgg, bumpFailedAgg, bumpTradeAgg, DUPLICATE_SLOTS, lockMint } from "./write.js";

const B = (v: unknown) => (v == null ? 0n : BigInt(String(v)));
const tierOf = (t: string) => (t === "higher" || t === "max" ? t : "standard") as "standard" | "higher" | "max";
const BATCH = 1000;

/** trade_costs row -> the TxCosts the incremental path bumped with. */
export function costsFromRow(r: any): TxCosts {
  const tipsRaw = (typeof r.tips === "string" ? JSON.parse(r.tips) : r.tips) ?? [];
  const otherRaw = (typeof r.other_transfers === "string" ? JSON.parse(r.other_transfers) : r.other_transfers) ?? [];
  const tips = tipsRaw.map((t: any) => ({ to: t.to, lamports: B(t.lamports), kind: t.kind ?? "transfer", inner: !!t.inner, provider: t.provider as TipProvider }));
  const tipsByProvider: Record<string, bigint> = {};
  for (const t of tips) tipsByProvider[t.provider] = (tipsByProvider[t.provider] ?? 0n) + t.lamports;
  return { feePayer: r.fee_payer, signatures: Number(r.signatures), feeLamports: B(r.fee_lamports), baseFeeLamports: B(r.base_fee_lamports), priorityFeeLamports: B(r.priority_fee_lamports),
    computeUnitLimit: r.cu_limit == null ? null : Number(r.cu_limit), computeUnitPriceMicroLamports: r.cu_price_micro_lamports == null ? null : B(r.cu_price_micro_lamports),
    computeUnitsConsumed: r.cu_consumed == null ? null : Number(r.cu_consumed), priorityFeeFromBudgetLamports: B(r.priority_fee_budget_lamports),
    tips, tipsLamports: B(r.tips_lamports), tipsByProvider,
    other: otherRaw.map((o: any) => ({ to: o.to, lamports: B(o.lamports), kind: o.kind ?? "transfer", inner: !!o.inner })), otherLamports: B(r.other_transfer_lamports),
    setupLamports: B(r.setup_lamports), signerSolDeltaLamports: r.signer_sol_delta_lamports == null ? null : B(r.signer_sol_delta_lamports) };
}

/** Recompute one mint's aggregates (agg, daily, tip agg) and duplicate flags from the stored rows with the SAME bump functions the
 *  indexer uses, so rebuild == incremental. Run inside a db transaction (takes the per-mint advisory lock). Keyset batches, no OFFSET. */
export async function rebuildAgg(q: Q, mint: string, now = Date.now()) {
  await lockMint(q, mint);
  const tok = (await q.query("SELECT tier, anti_sniper, creator FROM tokens WHERE mint = $1", [mint])).rows[0];
  if (!tok) return null;
  const tier = tierOf(tok.tier), anti = !!tok.anti_sniper, creator: string = tok.creator;
  for (const t of ["token_openbook_agg", "token_openbook_daily", "token_tip_agg"]) await q.query(`DELETE FROM ${t} WHERE mint = $1`, [mint]);
  await q.query("UPDATE failed_attempts SET status = 'failed', duplicate_of = NULL WHERE mint = $1 AND status <> 'failed'", [mint]);

  const create = (await q.query("SELECT slot, sig FROM trade_costs WHERE mint = $1 AND kind <> 'swap' ORDER BY slot, sig LIMIT 1", [mint])).rows[0];
  const createSlot = create ? Number(create.slot) : null;
  let n = { trades: 0, costs: 0, failed: 0, duplicates: 0 };
  // costs (slot, sig) keyset
  for (let k: [number, string] = [-1, ""]; ;) {
    const rows = (await q.query(`SELECT * FROM trade_costs WHERE mint = $1 AND (slot, sig) > ($2::bigint, $3::text) ORDER BY slot, sig LIMIT ${BATCH}`, [mint, k[0], k[1]])).rows;
    for (const r of rows) {
      const isCreate = r.kind !== "swap", costs = costsFromRow(r);
      await bumpCostAgg(q, { mint, sig: r.sig, slot: Number(r.slot), blockTime: r.block_time == null ? null : Number(r.block_time), costs,
        sniper: !isCreate && isSniperTx(Number(r.slot), createSlot, costs.feePayer, creator),
        create: isCreate && create && r.sig === create.sig ? { slot: Number(r.slot), sig: r.sig } : null }, now);
      n.costs++;
    }
    if (rows.length < BATCH) break;
    const last = rows[rows.length - 1]; k = [Number(last.slot), last.sig];
  }
  // trades (ts, sig, ix_idx) keyset
  for (let k: [number, string, number] = [-1, "", -1]; ;) {
    const rows = (await q.query(`SELECT * FROM trades WHERE mint = $1 AND (ts, sig, ix_idx) > ($2::bigint, $3::text, $4::int) ORDER BY ts, sig, ix_idx LIMIT ${BATCH}`, [mint, ...k])).rows;
    for (const r of rows) {
      const split = splitOfRow(r, tier, anti);
      await bumpTradeAgg(q, { mint, side: r.side, viaUi: !!r.via_ui, ts: Number(r.ts), slot: r.slot == null ? null : Number(r.slot),
        solLamports: BigInt(Math.round(Number(r.sol) * 1e9)), split, exact: r.trading_fee_lamports != null && r.protocol_fee_lamports != null }, now);
      n.trades++;
    }
    if (rows.length < BATCH) break;
    const last = rows[rows.length - 1]; k = [Number(last.ts), last.sig, Number(last.ix_idx)];
  }
  // failed attempts
  for (let k: [number, string] = [-1, ""]; ;) {
    const rows = (await q.query(`SELECT sig, slot, ts, fee_lamports FROM failed_attempts WHERE mint = $1 AND (ts, sig) > ($2::bigint, $3::text) ORDER BY ts, sig LIMIT ${BATCH}`, [mint, ...k])).rows;
    for (const r of rows) { await bumpFailedAgg(q, { mint, slot: Number(r.slot), feeLamports: r.fee_lamports == null ? null : B(r.fee_lamports) }, now); n.failed++; }
    if (rows.length < BATCH) break;
    const last = rows[rows.length - 1]; k = [Number(last.ts), last.sig];
  }
  // duplicates: a failed tx of a wallet with a landed trade of that wallet within DUPLICATE_SLOTS (nearest landed trade)
  const d = await q.query(`UPDATE failed_attempts f SET status = 'duplicate', duplicate_of = x.tsig FROM (
      SELECT DISTINCT ON (fa.sig) fa.sig AS fsig, t.sig AS tsig FROM failed_attempts fa
      JOIN trades t ON t.mint = fa.mint AND t.wallet = fa.wallet AND t.slot BETWEEN fa.slot - ${DUPLICATE_SLOTS} AND fa.slot + ${DUPLICATE_SLOTS}
      WHERE fa.mint = $1 AND fa.wallet IS NOT NULL ORDER BY fa.sig, abs(t.slot - fa.slot), t.sig) x
    WHERE f.sig = x.fsig`, [mint]);
  n.duplicates = d.rowCount ?? 0;
  if (n.trades + n.costs + n.failed > 0)
    await q.query(`INSERT INTO token_openbook_agg (mint, duplicate_attempts, rebuilt_at, updated_at) VALUES ($1,$2,$3,$3)
      ON CONFLICT (mint) DO UPDATE SET duplicate_attempts = EXCLUDED.duplicate_attempts, rebuilt_at = EXCLUDED.rebuilt_at, updated_at = EXCLUDED.updated_at`, [mint, n.duplicates, now]);
  return n;
}
