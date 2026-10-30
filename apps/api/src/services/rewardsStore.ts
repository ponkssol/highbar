import { db } from "../db/pool.js";

/** Read side of the fee / cashback / buyback tables (0002) for the API. Lamports come back as text and are converted once here. */
const sol = (v: string | number | null | undefined) => Number(v ?? 0) / 1e9;

export interface LedgerRow { period: string; trades: number; volumeSol: number; amountSol: number; paidSig: string | null; paidAt: number | null; pending: boolean }
export interface BuybackRow { id: number; period: string; mode: "jupiter" | "mock"; barMint: string; solSpent: number; barBought: number; buySig: string | null; burnSig: string | null; status: string; error: string | null; ts: number }

export const rewardsStore = {
  /** Last cashback period end written by the job (ms), 0 if the job never ran. Trades after it are still estimates. */
  async cashbackClosedThrough(): Promise<number> {
    return Number((await db.query("SELECT coalesce(max(period_end), 0) AS t FROM cashback_ledger")).rows[0].t);
  },
  async cashbackLedger(wallet: string, limit = 60): Promise<LedgerRow[]> {
    const { rows } = await db.query(
      `SELECT period, trades, volume_lamports::text AS v, amount_lamports::text AS a, paid_sig, paid_at, pending_sig IS NOT NULL AS pending
         FROM cashback_ledger WHERE wallet = $1 ORDER BY period DESC LIMIT $2`, [wallet, limit]);
    return rows.map((r) => ({ period: r.period, trades: r.trades, volumeSol: sol(r.v), amountSol: sol(r.a), paidSig: r.paid_sig, paidAt: r.paid_at, pending: r.pending }));
  },
  async cashbackTotals(wallet: string) {
    const r = (await db.query(
      `SELECT coalesce(sum(amount_lamports) FILTER (WHERE paid_sig IS NOT NULL), 0)::text AS paid, coalesce(sum(amount_lamports) FILTER (WHERE paid_sig IS NULL), 0)::text AS unpaid
         FROM cashback_ledger WHERE wallet = $1`, [wallet])).rows[0];
    return { paidSol: sol(r.paid), unpaidSol: sol(r.unpaid) };
  },
  /** via_ui trade stats for a wallet; `fromTs` = start of the not-yet-ledgered window. */
  async walletPlatformTrades(wallet: string, fromTs: number, limit = 20) {
    const agg = (await db.query(
      `SELECT count(*) FILTER (WHERE via_ui)::int AS via, count(*) FILTER (WHERE NOT via_ui)::int AS other,
              coalesce(sum(round(sol * 1e9)) FILTER (WHERE via_ui), 0)::bigint::text AS vol,
              coalesce(sum(round(sol * 1e9)) FILTER (WHERE via_ui AND ts >= $2), 0)::bigint::text AS open_vol
         FROM trades WHERE wallet = $1`, [wallet, fromTs])).rows[0];
    const rows = (await db.query(
      `SELECT t.sig, t.mint, t.side, t.sol, t.ts, coalesce(k.name, '') AS name, coalesce(k.symbol, '') AS symbol
         FROM trades t LEFT JOIN tokens k ON k.mint = t.mint WHERE t.wallet = $1 AND t.via_ui ORDER BY t.ts DESC, t.sig DESC LIMIT $2`, [wallet, limit])).rows;
    return { via: agg.via as number, other: agg.other as number, volumeLamports: BigInt(agg.vol), openVolumeLamports: BigInt(agg.open_vol), rows: rows as { sig: string; mint: string; side: "buy" | "sell"; sol: number; ts: number; name: string; symbol: string }[] };
  },

  async buybacks(limit = 50, offset = 0): Promise<BuybackRow[]> {
    const { rows } = await db.query(
      `SELECT id, period, mode, bar_mint, sol_spent_lamports::text AS s, (bar_bought::numeric / power(10, bar_decimals))::float8 AS b, buy_sig, burn_sig, status, error, created_at
         FROM buybacks WHERE status <> 'failed' OR buy_sig IS NOT NULL ORDER BY created_at DESC, id DESC LIMIT $1 OFFSET $2`, [limit, offset]);
    return rows.map((r) => ({ id: Number(r.id), period: r.period, mode: r.mode, barMint: r.bar_mint, solSpent: sol(r.s), barBought: r.b, buySig: r.buy_sig, burnSig: r.burn_sig, status: r.status, error: r.error, ts: r.created_at }));
  },
  async buybackTotals(barMint?: string | null) {
    const r = (await db.query(
      `SELECT count(*) FILTER (WHERE status = 'burned')::int AS n,
              coalesce(sum(sol_spent_lamports) FILTER (WHERE status <> 'failed'), 0)::text AS spent,
              coalesce(sum(bar_bought::numeric / power(10, bar_decimals)) FILTER (WHERE status = 'burned'), 0)::float8 AS burned
         FROM buybacks WHERE $1::text IS NULL OR bar_mint = $1`, [barMint ?? null])).rows[0];
    return { orders: r.n as number, solSpent: sol(r.spent), barBurned: r.burned as number };
  },
  /** Sum of all closed-period splits + claimed fees (null when the jobs never wrote anything). */
  async splitTotals() {
    const s = (await db.query(
      `SELECT count(*)::int AS n, coalesce(sum(gross_lamports),0)::text AS g, coalesce(sum(cashback_lamports),0)::text AS c, coalesce(sum(buyback_lamports),0)::text AS b,
              coalesce(sum(ops_lamports),0)::text AS o, coalesce(sum(treasury_lamports),0)::text AS t, coalesce(sum(creator_rebate_lamports),0)::text AS r FROM treasury_splits`)).rows[0];
    const f = (await db.query("SELECT count(*)::int AS n, coalesce(sum(lamports),0)::text AS l, coalesce(sum(lamports) FILTER (WHERE period IS NULL),0)::text AS u FROM fee_claims")).rows[0];
    return { periods: s.n as number, grossSol: sol(s.g), creatorRebateSol: sol(s.r), cashbackSol: sol(s.c), buybackSol: sol(s.b), opsSol: sol(s.o), treasurySol: sol(s.t), claims: f.n as number, claimedSol: sol(f.l), unsplitSol: sol(f.u) };
  },
};
