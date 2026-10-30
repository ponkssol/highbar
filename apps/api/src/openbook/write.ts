import type { Q } from "../db/pool.js";
import type { TxCosts } from "../indexer/txCosts.js";
import { splitSig, type TradeRow } from "../store.js";
import { isSniperTx, type FeeSplit } from "./math.js";

/** Open Book write path (indexer + backfill). Every insert is ON CONFLICT DO NOTHING and the running aggregates are bumped ONLY when
 *  that insert added a row, inside the caller's transaction and under pg_advisory_xact_lock(AGG_LOCK, hashtext(mint)), so re-indexing a
 *  signature never double-counts and a concurrent rebuild (rebuildAgg) never loses an increment. */
export const AGG_LOCK = 727012;
export const lockMint = (q: Q, mint: string) => q.query("SELECT pg_advisory_xact_lock($1, hashtext($2))", [AGG_LOCK, mint]);

const TABLES = ["trade_costs", "failed_attempts", "token_openbook_agg", "token_tip_agg", "token_openbook_daily", "wallet_snapshots"] as const;
let tablesCache: { at: number; ok: boolean } | null = null;
/** true once migration 0012 is applied (cached 60 s; a missing table means the API serves derived values with costsAvailable:false). */
export async function openbookTables(q: Q, now = Date.now()): Promise<boolean> {
  if (tablesCache && now - tablesCache.at < 60_000) return tablesCache.ok;
  const r = await q.query<{ n: number }>(`SELECT count(*)::int AS n FROM unnest($1::text[]) t WHERE to_regclass('public.' || t) IS NOT NULL`, [TABLES as unknown as string[]]);
  const ok = Number(r.rows[0]?.n) === TABLES.length;
  tablesCache = { at: now, ok };
  return ok;
}
export const resetOpenbookTablesCache = () => { tablesCache = null; };

export interface SwapExtra { slot: number | null; txIdx: number | null; split: FeeSplit; exactParts: boolean; pricePre: number | null; pricePost: number | null; minOutRaw: bigint | null }
export const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const s = (v: bigint | number | null | undefined) => (v == null ? null : v.toString());

/** Insert one swap with its 0012 columns; bump agg + daily when it was new. Returns whether the row was added. */
export async function addTradeWithAgg(q: Q, t: TradeRow, x: SwapExtra, solLamports: bigint): Promise<boolean> {
  const { sig, ixIdx } = splitSig(t.sig);
  const r = await q.query(
    `INSERT INTO trades (sig,ix_idx,pool,mint,side,sol,tokens,fee_sol,wallet,via_ui,dev_buy,ts,referral_fee_lamports,
       slot,tx_idx,fee_lamports,trading_fee_lamports,protocol_fee_lamports,anti_sniper_fee_lamports,price_pre_sol,price_post_sol,min_out_raw)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) ON CONFLICT DO NOTHING`,
    [sig, ixIdx, t.pool, t.mint, t.side, t.sol, t.tokens, t.feeSol, t.wallet, t.viaUi, !!t.devBuy, Math.round(t.ts), s(t.referralFeeLamports),
      x.slot, x.txIdx, s(x.split.total), x.exactParts ? s(x.split.trading) : null, x.exactParts ? s(x.split.protocol) : null, s(x.split.antiSniper),
      x.pricePre, x.pricePost, s(x.minOutRaw)]);
  if (!r.rowCount) return false;
  if (x.slot != null) await markDuplicatesNear(q, t.mint, t.wallet, x.slot, sig);
  await bumpTradeAgg(q, { mint: t.mint, side: t.side, viaUi: t.viaUi, ts: Math.round(t.ts), slot: x.slot, solLamports, split: x.split, exact: x.exactParts });
  return true;
}

export async function bumpTradeAgg(q: Q, a: { mint: string; side: "buy" | "sell"; viaUi: boolean; ts: number; slot: number | null; solLamports: bigint; split: FeeSplit; exact: boolean }, now = Date.now()) {
  const buy = a.side === "buy", v = a.solLamports, f = a.split;
  await q.query(
    `INSERT INTO token_openbook_agg (mint, trades, buys, sells, volume_lamports, buy_volume_lamports, sell_volume_lamports, ui_trades, ui_volume_lamports,
       fee_total_lamports, fee_protocol_lamports, fee_referral_lamports, fee_trading_lamports, fee_creator_lamports, fee_platform_lamports, fee_anti_sniper_lamports,
       fee_exact_trades, first_ts, last_ts, last_slot, updated_at)
     VALUES ($1,1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$17,$18,$19)
     ON CONFLICT (mint) DO UPDATE SET trades = token_openbook_agg.trades + 1, buys = token_openbook_agg.buys + EXCLUDED.buys, sells = token_openbook_agg.sells + EXCLUDED.sells,
       volume_lamports = token_openbook_agg.volume_lamports + EXCLUDED.volume_lamports,
       buy_volume_lamports = token_openbook_agg.buy_volume_lamports + EXCLUDED.buy_volume_lamports,
       sell_volume_lamports = token_openbook_agg.sell_volume_lamports + EXCLUDED.sell_volume_lamports,
       ui_trades = token_openbook_agg.ui_trades + EXCLUDED.ui_trades, ui_volume_lamports = token_openbook_agg.ui_volume_lamports + EXCLUDED.ui_volume_lamports,
       fee_total_lamports = token_openbook_agg.fee_total_lamports + EXCLUDED.fee_total_lamports,
       fee_protocol_lamports = token_openbook_agg.fee_protocol_lamports + EXCLUDED.fee_protocol_lamports,
       fee_referral_lamports = token_openbook_agg.fee_referral_lamports + EXCLUDED.fee_referral_lamports,
       fee_trading_lamports = token_openbook_agg.fee_trading_lamports + EXCLUDED.fee_trading_lamports,
       fee_creator_lamports = token_openbook_agg.fee_creator_lamports + EXCLUDED.fee_creator_lamports,
       fee_platform_lamports = token_openbook_agg.fee_platform_lamports + EXCLUDED.fee_platform_lamports,
       fee_anti_sniper_lamports = token_openbook_agg.fee_anti_sniper_lamports + EXCLUDED.fee_anti_sniper_lamports,
       fee_exact_trades = token_openbook_agg.fee_exact_trades + EXCLUDED.fee_exact_trades,
       first_ts = LEAST(token_openbook_agg.first_ts, EXCLUDED.first_ts), last_ts = GREATEST(token_openbook_agg.last_ts, EXCLUDED.last_ts),
       last_slot = GREATEST(token_openbook_agg.last_slot, EXCLUDED.last_slot), updated_at = EXCLUDED.updated_at`,
    [a.mint, buy ? 1 : 0, buy ? 0 : 1, v.toString(), buy ? v.toString() : "0", buy ? "0" : v.toString(), a.viaUi ? 1 : 0, a.viaUi ? v.toString() : "0",
      f.total.toString(), f.protocol.toString(), f.referral.toString(), f.trading.toString(), f.creator.toString(), f.platform.toString(), f.antiSniper.toString(),
      a.exact ? 1 : 0, a.ts, a.slot, now]);
  await q.query(
    `INSERT INTO token_openbook_daily (mint, day, trades, volume_lamports, buy_volume_lamports, sell_volume_lamports, ui_trades, ui_volume_lamports, fee_lamports,
       fee_protocol_lamports, fee_referral_lamports, fee_creator_lamports, fee_platform_lamports, fee_anti_sniper_lamports) VALUES ($1,$2,1,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (mint, day) DO UPDATE SET trades = token_openbook_daily.trades + 1, volume_lamports = token_openbook_daily.volume_lamports + EXCLUDED.volume_lamports,
       buy_volume_lamports = token_openbook_daily.buy_volume_lamports + EXCLUDED.buy_volume_lamports,
       sell_volume_lamports = token_openbook_daily.sell_volume_lamports + EXCLUDED.sell_volume_lamports,
       ui_trades = token_openbook_daily.ui_trades + EXCLUDED.ui_trades, ui_volume_lamports = token_openbook_daily.ui_volume_lamports + EXCLUDED.ui_volume_lamports,
       fee_lamports = token_openbook_daily.fee_lamports + EXCLUDED.fee_lamports,
       fee_protocol_lamports = token_openbook_daily.fee_protocol_lamports + EXCLUDED.fee_protocol_lamports,
       fee_referral_lamports = token_openbook_daily.fee_referral_lamports + EXCLUDED.fee_referral_lamports,
       fee_creator_lamports = token_openbook_daily.fee_creator_lamports + EXCLUDED.fee_creator_lamports,
       fee_platform_lamports = token_openbook_daily.fee_platform_lamports + EXCLUDED.fee_platform_lamports,
       fee_anti_sniper_lamports = token_openbook_daily.fee_anti_sniper_lamports + EXCLUDED.fee_anti_sniper_lamports`,
    [a.mint, dayOf(a.ts), v.toString(), buy ? v.toString() : "0", buy ? "0" : v.toString(), a.viaUi ? 1 : 0, a.viaUi ? v.toString() : "0", f.total.toString(),
      f.protocol.toString(), f.referral.toString(), f.creator.toString(), f.platform.toString(), f.antiSniper.toString()]);
}

/** Duplicate window: a failed tx of a wallet within this many slots of a landed trade of the same wallet on the same mint. */
export const DUPLICATE_SLOTS = 2;
/** Flip failed attempts of `wallet` near `slot` to 'duplicate' (after a landed trade was added) and bump agg.duplicate_attempts. */
export async function markDuplicatesNear(q: Q, mint: string, wallet: string, slot: number, landedSig: string, now = Date.now()) {
  const r = await q.query(`UPDATE failed_attempts SET status = 'duplicate', duplicate_of = $4 WHERE mint = $1 AND wallet = $2 AND status = 'failed'
    AND slot BETWEEN $3::bigint - ${DUPLICATE_SLOTS} AND $3::bigint + ${DUPLICATE_SLOTS}`, [mint, wallet, slot, landedSig]);
  if (r.rowCount) await q.query("UPDATE token_openbook_agg SET duplicate_attempts = duplicate_attempts + $2, updated_at = $3 WHERE mint = $1", [mint, r.rowCount, now]);
  return r.rowCount ?? 0;
}
/** Flip one failed attempt (wallet now known) to 'duplicate' when that wallet has a landed trade within DUPLICATE_SLOTS. */
async function markDuplicateSelf(q: Q, sig: string, mint: string, now: number) {
  const r = await q.query(`UPDATE failed_attempts f SET status = 'duplicate', duplicate_of = d.sig
    FROM (SELECT t.sig FROM failed_attempts x JOIN trades t ON t.mint = x.mint AND t.wallet = x.wallet AND t.slot BETWEEN x.slot - ${DUPLICATE_SLOTS} AND x.slot + ${DUPLICATE_SLOTS}
          WHERE x.sig = $1 ORDER BY abs(t.slot - x.slot), t.sig LIMIT 1) d
    WHERE f.sig = $1 AND f.status = 'failed' AND f.wallet IS NOT NULL`, [sig]);
  if (r.rowCount) await q.query("UPDATE token_openbook_agg SET duplicate_attempts = duplicate_attempts + 1, updated_at = $2 WHERE mint = $1", [mint, now]);
}

export type CostKind = "swap" | "create" | "create_swap";
const big2s = (k: string, v: unknown) => (typeof v === "bigint" ? v.toString() : v);

/** Insert the tx cost row; bump agg (+ tip agg, daily) when it was new. The caller holds lockMint(mint).
 *  kind create / create_swap sets agg.create_slot; later swap txs within OPENBOOK_SNIPER_SLOTS of it (not paid by the creator) count as sniper txs. */
export async function addCostWithAgg(q: Q, c: { sig: string; mint: string; pool: string; kind: CostKind; slot: number; txIdx: number | null; blockTime: number | null; costs: TxCosts; creator: string }, now = Date.now()): Promise<boolean> {
  const k = c.costs;
  const r = await q.query(
    `INSERT INTO trade_costs (sig, mint, pool, kind, slot, tx_idx, block_time, fee_payer, signatures, fee_lamports, base_fee_lamports, priority_fee_lamports,
       priority_fee_budget_lamports, cu_limit, cu_price_micro_lamports, cu_consumed, tips_lamports, tips, other_transfer_lamports, other_transfers, setup_lamports,
       signer_sol_delta_lamports, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) ON CONFLICT (sig) DO NOTHING`,
    [c.sig, c.mint, c.pool, c.kind, c.slot, c.txIdx, c.blockTime, k.feePayer, k.signatures, s(k.feeLamports), s(k.baseFeeLamports), s(k.priorityFeeLamports),
      s(k.priorityFeeFromBudgetLamports), k.computeUnitLimit, s(k.computeUnitPriceMicroLamports), k.computeUnitsConsumed, s(k.tipsLamports),
      JSON.stringify(k.tips, big2s), s(k.otherLamports), JSON.stringify(k.other, big2s), s(k.setupLamports), s(k.signerSolDeltaLamports), now]);
  if (!r.rowCount) return false;
  const isCreate = c.kind !== "swap";
  const createSlot = isCreate ? c.slot
    : Number((await q.query<{ s: number | null }>("SELECT create_slot AS s FROM token_openbook_agg WHERE mint = $1", [c.mint])).rows[0]?.s ?? NaN);
  const sniper = !isCreate && isSniperTx(c.slot, Number.isFinite(createSlot) ? createSlot : null, k.feePayer, c.creator);
  await bumpCostAgg(q, { mint: c.mint, sig: c.sig, slot: c.slot, blockTime: c.blockTime, costs: k, sniper, create: isCreate ? { slot: c.slot, sig: c.sig } : null }, now);
  return true;
}

/** Cost-side increments (shared with the rebuild so both use one rule). */
export async function bumpCostAgg(q: Q, a: { mint: string; sig: string; slot: number; blockTime: number | null; costs: TxCosts; sniper: boolean; create: { slot: number; sig: string } | null }, now = Date.now()) {
  const k = a.costs, tipped = k.tipsLamports > 0n;
  await q.query(
    `INSERT INTO token_openbook_agg (mint, cost_txs, tx_fee_lamports, base_fee_lamports, priority_fee_lamports, tips_lamports, other_transfer_lamports,
       tip_txs, max_tip_lamports, max_tip_sig, sniper_txs, sniper_tip_txs, sniper_tips_lamports, create_slot, create_sig, last_slot, updated_at)
     VALUES ($1,1,$2,$3,$4,$5,$6,$7,$5,$8,$9,$10,$11,$12,$13,$14,$15)
     ON CONFLICT (mint) DO UPDATE SET cost_txs = token_openbook_agg.cost_txs + 1, tx_fee_lamports = token_openbook_agg.tx_fee_lamports + EXCLUDED.tx_fee_lamports,
       base_fee_lamports = token_openbook_agg.base_fee_lamports + EXCLUDED.base_fee_lamports,
       priority_fee_lamports = token_openbook_agg.priority_fee_lamports + EXCLUDED.priority_fee_lamports,
       tips_lamports = token_openbook_agg.tips_lamports + EXCLUDED.tips_lamports,
       other_transfer_lamports = token_openbook_agg.other_transfer_lamports + EXCLUDED.other_transfer_lamports,
       tip_txs = token_openbook_agg.tip_txs + EXCLUDED.tip_txs,
       max_tip_sig = CASE WHEN EXCLUDED.max_tip_lamports > token_openbook_agg.max_tip_lamports THEN EXCLUDED.max_tip_sig ELSE token_openbook_agg.max_tip_sig END,
       max_tip_lamports = GREATEST(token_openbook_agg.max_tip_lamports, EXCLUDED.max_tip_lamports),
       sniper_txs = token_openbook_agg.sniper_txs + EXCLUDED.sniper_txs, sniper_tip_txs = token_openbook_agg.sniper_tip_txs + EXCLUDED.sniper_tip_txs,
       sniper_tips_lamports = token_openbook_agg.sniper_tips_lamports + EXCLUDED.sniper_tips_lamports,
       create_slot = coalesce(EXCLUDED.create_slot, token_openbook_agg.create_slot), create_sig = coalesce(EXCLUDED.create_sig, token_openbook_agg.create_sig),
       last_slot = GREATEST(token_openbook_agg.last_slot, EXCLUDED.last_slot), updated_at = EXCLUDED.updated_at`,
    [a.mint, s(k.feeLamports), s(k.baseFeeLamports), s(k.priorityFeeLamports), s(k.tipsLamports), s(k.otherLamports), tipped ? 1 : 0, tipped ? a.sig : null,
      a.sniper ? 1 : 0, a.sniper && tipped ? 1 : 0, a.sniper ? s(k.tipsLamports) : "0", a.create?.slot ?? null, a.create?.sig ?? null, a.slot, now]);
  for (const [provider, lamports] of Object.entries(k.tipsByProvider))
    await q.query(`INSERT INTO token_tip_agg (mint, provider, lamports, txs, sniper_lamports, sniper_txs) VALUES ($1,$2,$3,1,$4,$5)
      ON CONFLICT (mint, provider) DO UPDATE SET lamports = token_tip_agg.lamports + EXCLUDED.lamports, txs = token_tip_agg.txs + 1,
        sniper_lamports = token_tip_agg.sniper_lamports + EXCLUDED.sniper_lamports, sniper_txs = token_tip_agg.sniper_txs + EXCLUDED.sniper_txs`,
      [a.mint, provider, lamports.toString(), a.sniper ? lamports.toString() : "0", a.sniper ? 1 : 0]);
  if (a.blockTime != null)
    await q.query(`INSERT INTO token_openbook_daily (mint, day, cost_txs, base_fee_lamports, priority_fee_lamports, tips_lamports, sniper_tips_lamports) VALUES ($1,$2,1,$3,$4,$5,$6)
      ON CONFLICT (mint, day) DO UPDATE SET cost_txs = token_openbook_daily.cost_txs + 1, base_fee_lamports = token_openbook_daily.base_fee_lamports + EXCLUDED.base_fee_lamports,
        priority_fee_lamports = token_openbook_daily.priority_fee_lamports + EXCLUDED.priority_fee_lamports, tips_lamports = token_openbook_daily.tips_lamports + EXCLUDED.tips_lamports,
        sniper_tips_lamports = token_openbook_daily.sniper_tips_lamports + EXCLUDED.sniper_tips_lamports`,
      [a.mint, dayOf(a.blockTime * 1000), s(k.baseFeeLamports), s(k.priorityFeeLamports), s(k.tipsLamports), a.sniper ? s(k.tipsLamports) : "0"]);
}

/** Record a failed tx (from the signature list); bump agg.failed_attempts when new. wallet / fee only when the tx was fetched. */
export async function addFailedWithAgg(q: Q, f: { sig: string; mint: string; pool: string; slot: number; err: unknown; ts: number; wallet?: string | null; feeLamports?: bigint | null }, now = Date.now()): Promise<boolean> {
  const r = await q.query(`INSERT INTO failed_attempts (sig, mint, pool, slot, wallet, err, fee_lamports, ts, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (sig) DO NOTHING`,
    [f.sig, f.mint, f.pool, f.slot, f.wallet ?? null, JSON.stringify(f.err ?? null), s(f.feeLamports), f.ts, now]);
  if (!r.rowCount) {
    // fetched later (backfill / launch window): fill wallet / fee on the existing row, agg fee only for the first fill
    if (f.wallet || f.feeLamports != null) {
      const u = await q.query(`UPDATE failed_attempts SET wallet = coalesce(wallet, $2), fee_lamports = coalesce(fee_lamports, $3) WHERE sig = $1 AND fee_lamports IS NULL AND $3::bigint IS NOT NULL`, [f.sig, f.wallet ?? null, s(f.feeLamports)]);
      if (u.rowCount) await q.query(`UPDATE token_openbook_agg SET failed_fee_lamports = failed_fee_lamports + $2, updated_at = $3 WHERE mint = $1`, [f.mint, s(f.feeLamports), now]);
      if (u.rowCount && f.wallet) await markDuplicateSelf(q, f.sig, f.mint, now);
    }
    return false;
  }
  await bumpFailedAgg(q, { mint: f.mint, slot: f.slot, feeLamports: f.feeLamports ?? null }, now);
  if (f.wallet) await markDuplicateSelf(q, f.sig, f.mint, now);
  return true;
}

/** Failed-attempt increments (shared with the rebuild). */
export async function bumpFailedAgg(q: Q, f: { mint: string; slot: number; feeLamports: bigint | null }, now = Date.now()) {
  await q.query(`INSERT INTO token_openbook_agg (mint, failed_attempts, failed_fee_lamports, last_slot, updated_at) VALUES ($1,1,$2,$3,$4)
     ON CONFLICT (mint) DO UPDATE SET failed_attempts = token_openbook_agg.failed_attempts + 1, failed_fee_lamports = token_openbook_agg.failed_fee_lamports + EXCLUDED.failed_fee_lamports,
       last_slot = GREATEST(token_openbook_agg.last_slot, EXCLUDED.last_slot), updated_at = EXCLUDED.updated_at`, [f.mint, s(f.feeLamports ?? 0n), f.slot, now]);
}
