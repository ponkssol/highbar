/** Buyback ledger: the $HIGHER buyback budget is DB state, never memory.
 *    budget  = sum(treasury_splits.buyback_lamports) over every closed period on or after GO_PUBLIC_DATE (all periods while it is
 *              unset; pre-launch periods included: they accrue only)
 *    spent   = sum(buybacks.sol_spent_lamports) over every order that is not 'failed' (pending = reserved, bought, burned) and not
 *              mode 'mock' (mock rows only count for the devnet mock drain itself, so it does not rebuy the same backlog)
 *    backlog = max(0, budget - spent)
 *  Every live order is RESERVED (a 'pending' row with its amount) inside one transaction holding pg_advisory_xact_lock(LOCK_KEY)
 *  before anything is signed, so concurrent job instances, retries and crashed runs can never spend the same lamports twice.
 *  A reservation only becomes spendable again once it is provably 'failed' (never signed, or its buy tx did not land).
 *  Pure SQL + injected chain calls (tests run it on PGlite with a fake chain). */
import { notMock, periodOnOrAfter, type GoPublic } from "../jobs/goPublic.js";

/** Minimal query surface: pg.Pool / pg.PoolClient / PGlite all fit. */
export interface Sql { query(text: string, params?: unknown[]): Promise<{ rows: any[] }> }
/** Sql plus a transaction runner (one connection, BEGIN/COMMIT). */
export interface LedgerDb extends Sql { tx<T>(fn: (q: Sql) => Promise<T>): Promise<T> }

export interface Order { id?: number; mode: "jupiter" | "mock"; solIn: bigint; barOut: bigint; buySig?: string; burnSig?: string; status: "burned" | "would-buy" | "failed" | "bought"; note?: string }
export type OrderSource = "ledger" | "manual";

/** Transaction-scoped advisory lock key for buyback reservations (727001 = migrations). PgBouncer transaction mode safe. */
export const LOCK_KEY = 727002;
/** 0.001 SOL: smaller leftovers wait for the next run. */
export const MIN_ORDER = 1_000_000n;
/** A reservation / unconfirmed buy is only settled as failed after this long (blockhash lifetime is ~1-2 min). */
export const STALE_MS = 5 * 60_000;

const big = (v: unknown) => BigInt(String(v ?? "0").split(".")[0] || "0");
const min = (...v: bigint[]) => v.reduce((a, b) => (b < a ? b : a));

export interface Totals { budget: bigint; spent: bigint; inflight: bigint; backlog: bigint }
/** Which rows count: goPublic = GO_PUBLIC_DATE (splits of earlier periods are ignored; null = all), countMock = also count mode 'mock'
 *  orders (only the devnet mock drain sets it; everything else ignores mock rows). */
export interface LedgerFilter { goPublic?: GoPublic | null; countMock?: boolean }
/** Ledger totals (failed orders never count). inflight = reserved/unconfirmed (status 'pending'). */
export async function ledgerTotals(q: Sql, f: LedgerFilter = {}): Promise<Totals> {
  const mock = f.countMock ? "" : ` AND ${notMock()}`;
  const r = (await q.query(`SELECT (SELECT coalesce(sum(buyback_lamports), 0) FROM treasury_splits WHERE ${periodOnOrAfter("period", f.goPublic ?? null)})::text AS budget,
      (SELECT coalesce(sum(sol_spent_lamports), 0) FROM buybacks WHERE status <> 'failed'${mock})::text AS spent,
      (SELECT coalesce(sum(sol_spent_lamports), 0) FROM buybacks WHERE status = 'pending'${mock})::text AS inflight`)).rows[0];
  const budget = big(r.budget), spent = big(r.spent);
  return { budget, spent, inflight: big(r.inflight), backlog: budget > spent ? budget - spent : 0n };
}

/** SOL the buyback wallet (= platform keypair) still owes from the same balance: unpaid cashback, creator LP rebates, holder fee share. */
export async function walletLiabilities(q: Sql): Promise<bigint> {
  const t = (await q.query(`SELECT to_regclass('public.cashback_ledger') IS NOT NULL AS c, to_regclass('public.creator_lp_rebates') IS NOT NULL AS r,
      to_regclass('public.bar_fee_share_ledger') IS NOT NULL AS f`)).rows[0];
  const parts = [
    t.c && "SELECT amount_lamports AS a FROM cashback_ledger WHERE paid_sig IS NULL",
    t.r && "SELECT rebate_lamports AS a FROM creator_lp_rebates WHERE paid_sig IS NULL AND skip_reason IS NULL",
    t.f && "SELECT amount_lamports AS a FROM bar_fee_share_ledger WHERE paid_sig IS NULL",
  ].filter(Boolean);
  if (!parts.length) return 0n;
  return big((await q.query(`SELECT coalesce(sum(a), 0)::text AS s FROM (${parts.join(" UNION ALL ")}) x`)).rows[0].s);
}

export interface Cap { totals: Totals; want: bigint; balance: bigint; reserve: bigint; liabilities: bigint; available: bigint; amount: bigint }
/** Size the next order: min(want, BUYBACK_MAX_ORDER_SOL, wallet balance - reserve - liabilities - in-flight reservations). */
async function capOrder(q: Sql, o: { source: OrderSource; period: string; mode: "jupiter" | "mock"; goPublic?: GoPublic | null; manualBudget?: bigint; previewExtra?: bigint; maxOrder: bigint; reserve: bigint; balance: () => Promise<bigint> }): Promise<Cap> {
  const countMock = o.mode === "mock"; // mainnet refuses mock mode, so there mock rows never count
  const totals = await ledgerTotals(q, { goPublic: o.goPublic, countMock });
  let want: bigint;
  if (o.source === "manual") {
    const s = big((await q.query(`SELECT coalesce(sum(sol_spent_lamports), 0)::text AS s FROM buybacks WHERE period = $1 AND source = 'manual' AND status <> 'failed'${countMock ? "" : ` AND ${notMock()}`}`, [o.period])).rows[0].s);
    want = (o.manualBudget ?? 0n) - s;
  } else want = totals.backlog + (o.previewExtra ?? 0n);
  const balance = await o.balance(), liabilities = await walletLiabilities(q);
  const available = balance - o.reserve - liabilities - totals.inflight;
  const amount = min(want, o.maxOrder, available);
  return { totals, want, balance, reserve: o.reserve, liabilities, available, amount: amount > 0n ? amount : 0n };
}

export interface ReserveOpts { period: string; mode: "jupiter" | "mock"; barMint: string; decimals: number; source: OrderSource; goPublic?: GoPublic | null; manualBudget?: bigint; maxOrder: bigint; minOrder?: bigint; reserve: bigint; balance: () => Promise<bigint> }
/** Atomically size + reserve one order under the advisory lock. null = nothing (more) to spend; cap explains why. */
export async function reserveOrder(db: LedgerDb, o: ReserveOpts): Promise<{ id: number | null; amount: bigint; cap: Cap }> {
  return db.tx(async (q) => {
    await q.query("SELECT pg_advisory_xact_lock($1)", [LOCK_KEY]);
    const cap = await capOrder(q, o);
    if (cap.amount < (o.minOrder ?? MIN_ORDER)) return { id: null, amount: 0n, cap };
    const now = Date.now();
    const id = Number((await q.query(`INSERT INTO buybacks (period, mode, bar_mint, bar_decimals, sol_spent_lamports, bar_bought, status, source, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,'0','pending',$6,$7,$7) RETURNING id`, [o.period, o.mode, o.barMint, o.decimals, cap.amount.toString(), o.source, now])).rows[0].id);
    return { id, amount: cap.amount, cap };
  });
}

const one = async (q: Sql, text: string, params: unknown[]) => (await q.query(`${text} RETURNING id`, params)).rows.length === 1;

/** onSigned hook: record the buy signature BEFORE sending. Only a still-pending, never-signed reservation may be signed;
 *  otherwise (reconciled as failed meanwhile, or already signed) this throws and the tx is never sent. */
export async function claimBuySig(q: Sql, id: number, sig: string, barBought?: bigint) {
  const ok = await one(q, "UPDATE buybacks SET buy_sig = $2, bar_bought = coalesce($3, bar_bought), updated_at = $4 WHERE id = $1 AND status = 'pending' AND buy_sig IS NULL",
    [id, sig, barBought === undefined ? null : barBought.toString(), Date.now()]);
  if (!ok) throw new Error(`buyback #${id} is no longer an unsigned pending reservation; not sending`);
}
export const markBought = (q: Sql, id: number, barOut: bigint) =>
  one(q, "UPDATE buybacks SET status = 'bought', bar_bought = $2, updated_at = $3 WHERE id = $1 AND status = 'pending'", [id, barOut.toString(), Date.now()]);
export const setBurnSig = (q: Sql, id: number, sig: string) => one(q, "UPDATE buybacks SET burn_sig = $2, updated_at = $3 WHERE id = $1 AND status = 'bought'", [id, sig, Date.now()]);
export const markBurned = (q: Sql, id: number) => one(q, "UPDATE buybacks SET status = 'burned', updated_at = $2 WHERE id = $1 AND status = 'bought'", [id, Date.now()]);
/** Release a reservation that was never signed (quote / swap / build failed): it stops counting as spent. */
export const releaseUnsigned = (q: Sql, id: number, error: string) =>
  one(q, "UPDATE buybacks SET status = 'failed', error = $2, updated_at = $3 WHERE id = $1 AND status = 'pending' AND buy_sig IS NULL", [id, error.slice(0, 500), Date.now()]);
const markFailed = (q: Sql, id: number, error: string) =>
  one(q, "UPDATE buybacks SET status = 'failed', error = $2, updated_at = $3 WHERE id = $1 AND status = 'pending'", [id, error.slice(0, 500), Date.now()]);

export interface ChainOps {
  sigState(sig: string): Promise<"landed" | "failed" | "unknown">;
  /** $HIGHER actually received by the buy tx (mock mode: the stored amount). */
  received(row: { id: number; mode: string; buySig: string; barBought: bigint }): Promise<bigint>;
  /** Burn `amount` for order `id` (records burn_sig via setBurnSig before sending, then markBurned). */
  burn(id: number, amount: bigint, period: string): Promise<string>;
}

/** Settle orders an earlier (crashed / concurrent / timed-out) run left open, for `mint`:
 *  pending + never signed: failed once stale (a live signer would be refused by claimBuySig anyway);
 *  pending + signed: landed -> bought (actual received), failed / stale-unknown -> failed, fresh-unknown -> left reserved;
 *  bought: burn landed -> burned; otherwise (re-)burn once the old burn can no longer land. */
export async function reconcileOrders(q: Sql, mint: string, ops: ChainOps, log: (m: string) => void = () => {}, now = Date.now()) {
  const { rows } = await q.query("SELECT id, period, mode, bar_mint, bar_bought, buy_sig, burn_sig, status, updated_at FROM buybacks WHERE status IN ('pending','bought') AND bar_mint = $1 ORDER BY id", [mint]);
  const stale = (r: { updated_at: unknown }) => now - Number(r.updated_at) > STALE_MS;
  for (const r of rows) {
    const id = Number(r.id);
    let bought = big(r.bar_bought), burnSig: string | null = r.burn_sig;
    if (r.status === "pending") {
      if (!r.buy_sig) {
        if (stale(r) && await releaseUnsigned(q, id, "reservation never signed")) log(`[buyback] #${id} unsigned reservation released`);
        continue;
      }
      const s = await ops.sigState(r.buy_sig);
      if (s === "unknown" && !stale(r)) continue;
      if (s !== "landed") { await markFailed(q, id, `buy ${r.buy_sig} did not land`); log(`[buyback] #${id} marked failed`); continue; }
      bought = await ops.received({ id, mode: r.mode, buySig: r.buy_sig, barBought: bought });
      if (bought <= 0n) { log(`[buyback] #${id} buy landed but no $HIGHER received; left pending for review`); continue; }
      await markBought(q, id, bought);
      burnSig = null;
    }
    if (burnSig) {
      const s = await ops.sigState(burnSig);
      if (s === "landed") { await markBurned(q, id); continue; }
      if (s === "unknown" && !stale(r)) continue;
    }
    const sig = await ops.burn(id, bought, r.period).catch((e: Error) => { log(`[buyback] #${id} burn failed: ${e.message}`); return null; });
    if (sig) log(`[buyback] #${id} burned ${bought} raw ${sig}`);
  }
}

/** run.ts gate: before the official mint is known nothing is read, reserved or sent; the split keeps accruing the budget. */
export async function whenLaunched<T>(barMint: string | null | undefined, run: () => Promise<T>): Promise<T | string> {
  return barMint ? run() : "$HIGHER not launched yet: buyback budget accrues only";
}

export interface DrainOpts {
  db: LedgerDb; period: string; live: boolean; mode: "jupiter" | "mock"; barMint: string; decimals: number;
  /** GO_PUBLIC_DATE: splits of earlier periods are not in the budget (null / unset = every period). */
  goPublic?: GoPublic | null;
  /** manual (--budget-sol): spend up to manualBudget for `period` (minus earlier manual orders of that period); default: the ledger backlog. */
  source?: OrderSource; manualBudget?: bigint;
  /** dry-run only: budget not written yet (this run's unclosed split). */
  previewExtra?: bigint;
  maxOrder: bigint; maxOrdersPerRun: number; minOrder?: bigint; reserve: bigint;
  balance: () => Promise<bigint>;
  /** Execute one order. live: `id` is the reserved row; sign with claimBuySig as onSigned. dry-run: id undefined, write nothing. */
  exec: (id: number | undefined, amount: bigint) => Promise<Order>;
  /** Pause between live orders (spread Jupiter orders). */
  between?: () => Promise<unknown>;
  log?: (m: string) => void;
}
export interface DrainResult { source: OrderSource; budget: bigint; spentBefore: bigint; backlog: bigint; available: bigint; orders: Order[]; stop?: string }

/** Drain the buyback budget in capped orders (at most maxOrdersPerRun per run); a failed order stops the run. */
export async function drainBuyback(o: DrainOpts): Promise<DrainResult> {
  const log = o.log ?? (() => {}), source = o.source ?? "ledger", minOrder = o.minOrder ?? MIN_ORDER;
  const orders: Order[] = [];
  let spentRun = 0n;
  const head = await capOrder(o.db, { ...o, source, maxOrder: 1n << 62n });
  const res: DrainResult = { source, budget: head.totals.budget, spentBefore: head.totals.spent, backlog: source === "manual" ? head.want : head.totals.backlog + (o.previewExtra ?? 0n), available: head.available, orders };
  log(`[buyback] ${source}: budget ${head.totals.budget}, spent ${head.totals.spent} (in flight ${head.totals.inflight}), to spend ${res.backlog}; wallet ${head.balance} - reserve ${head.reserve} - owed ${head.liabilities} = ${head.available} available`);
  if (!o.live) {
    let left = min(res.backlog, head.available);
    for (let n = 0; n < o.maxOrdersPerRun && left >= minOrder; n++) {
      const amount = min(left, o.maxOrder), r = await o.exec(undefined, amount);
      orders.push(r);
      if (r.status === "failed") break;
      left -= amount;
    }
    return res;
  }
  for (let n = 0; n < o.maxOrdersPerRun; n++) {
    const r = await reserveOrder(o.db, { period: o.period, mode: o.mode, barMint: o.barMint, decimals: o.decimals, source, goPublic: o.goPublic, manualBudget: o.manualBudget, maxOrder: o.maxOrder, minOrder, reserve: o.reserve, balance: o.balance });
    if (r.id === null) {
      res.stop = r.cap.want < minOrder ? "nothing to spend" : `wallet available ${r.cap.available} below the next order (to spend ${r.cap.want})`;
      log(`[buyback] stop: ${res.stop}`);
      break;
    }
    let order: Order;
    try { order = await o.exec(r.id, r.amount); }
    catch (e) { order = { id: r.id, mode: o.mode, solIn: r.amount, barOut: 0n, status: "failed", note: (e as Error).message }; }
    if (order.status === "failed") await releaseUnsigned(o.db, r.id, order.note ?? "failed before signing"); // signed ones stay reserved until reconciled
    orders.push(order);
    log(`[buyback] #${r.id} ${order.status} ${o.mode} ${r.amount} lamports -> ${order.barOut} raw${order.buySig ? ` buy ${order.buySig}` : ""}${order.burnSig ? ` burn ${order.burnSig}` : ""}${order.note ? ` (${order.note})` : ""}`);
    if (order.status === "failed") break;
    spentRun += r.amount;
    if (n + 1 < o.maxOrdersPerRun && res.backlog - spentRun >= minOrder) await o.between?.();
  }
  return res;
}
