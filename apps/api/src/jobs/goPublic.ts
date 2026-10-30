/** Go-public cut-off (GO_PUBLIC_DATE, UTC 'YYYY-MM-DD'). Everything before it was the dry-run, so it is never paid or counted:
 *  - cashback: accrues and pays only periods on or after the date. Unset = nothing accrues or pays (safer default) and the API
 *    shows zero awaiting (accrualStart null).
 *  - ledger totals: treasury_splits of earlier periods and fee_claims claimed before the date are ignored. Unset = no date filter.
 *  - buybacks with mode 'mock' never count in totals or stats (the devnet mock drain itself still counts its own rows).
 *  Pure helpers (no db / env import) so the date math, the guard and the SQL fragments are unit tested. */
import { REWARD_PERIOD_MS } from "@hb/shared";

export interface GoPublic { /** 'YYYY-MM-DD' */ id: string; /** UTC midnight of that day, epoch ms */ ms: number }
export interface PeriodLike { id: string; start: number; end: number }
export interface Sql { query(text: string, params?: unknown[]): Promise<{ rows: any[] }> }

/** Parse GO_PUBLIC_DATE. Empty / unset = null. Anything but a real UTC calendar day throws (the config refuses to load). */
export function parseGoPublic(v: string | undefined | null, name = "GO_PUBLIC_DATE"): GoPublic | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  const ms = Date.parse(`${s}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== s) throw new Error(`${name} must be a UTC date YYYY-MM-DD (got "${s}")`);
  return { id: s, ms };
}

export type Gate = { ok: true } | { ok: false; reason: string };
/** Cashback guard for one period (accrual and payment). Refuses every period that starts before the cut-off (UTC days, so that is
 *  every period that ends on or before it), and every period while the cut-off is unset. */
export function cashbackGate(p: PeriodLike, g: GoPublic | null): Gate {
  if (!g) return { ok: false, reason: `GO_PUBLIC_DATE unset: cashback for ${p.id} not accrued or paid (set it to the go-public day)` };
  if (p.start < g.ms) return { ok: false, reason: `period ${p.id} is before GO_PUBLIC_DATE ${g.id}: dry-run days are never accrued or paid` };
  return { ok: true };
}
/** Same rule on a ledger period id ('YYYY-MM-DD' compares as text). */
export const cashbackPeriodOk = (period: string, g: GoPublic | null) => !!g && period >= g.id;

/** Start of the window the API may still show as an awaiting cashback estimate: trades the live job has not closed yet AND will still
 *  accrue on its own (the default run accrues 'yesterday', so older un-ledgered days are never picked up), never before the cut-off.
 *  null = nothing is awaiting (cut-off unset). */
export function pendingFrom(g: GoPublic | null, closedThrough: number, now = Date.now()): number | null {
  if (!g) return null;
  const yesterday = Math.floor(now / REWARD_PERIOD_MS) * REWARD_PERIOD_MS - REWARD_PERIOD_MS;
  return Math.max(g.ms, closedThrough, yesterday);
}

/** SQL conditions. `col` is trusted code, never user input. Unset cut-off = always true (no-op). */
export const periodOnOrAfter = (col: string, g: GoPublic | null) => (g ? `${col} >= '${g.id}'` : "true");
export const claimedOnOrAfter = (col: string, g: GoPublic | null) => (g ? `${col} >= ${g.ms}` : "true");
export const notMock = (col = "mode") => `${col} <> 'mock'`;

export interface SummaryRow { table: string; measure: string; includedCount: number; includedLamports: bigint; excludedCount: number; excludedLamports: bigint; note: string }
/** Read-only SELECTs for the dry-run summary: per table, rows and lamports kept vs dropped by the cut-off and the mock filter. */
export function summaryQueries(g: GoPublic | null): { table: string; measure: string; note: string; sql: string }[] {
  const q = (table: string, measure: string, keep: string, where = "true") =>
    `SELECT count(*) FILTER (WHERE ${keep})::int AS ic, coalesce(sum(${measure}) FILTER (WHERE ${keep}), 0)::text AS il,
            count(*) FILTER (WHERE NOT (${keep}))::int AS ec, coalesce(sum(${measure}) FILTER (WHERE NOT (${keep})), 0)::text AS el
       FROM ${table} WHERE ${where}`;
  const cut = g ? `before ${g.id}` : "GO_PUBLIC_DATE unset";
  return [
    { table: "fee_claims", measure: "lamports", note: g ? `excluded = claimed ${cut}` : "no date filter", sql: q("fee_claims", "lamports", claimedOnOrAfter("claimed_at", g)) },
    { table: "treasury_splits", measure: "buyback_lamports", note: g ? `excluded = period ${cut}` : "no date filter", sql: q("treasury_splits", "buyback_lamports", periodOnOrAfter("period", g)) },
    { table: "buybacks", measure: "sol_spent_lamports", note: "non-failed only, excluded = mode mock", sql: q("buybacks", "sol_spent_lamports", notMock(), "status <> 'failed'") },
    { table: "cashback_ledger", measure: "amount_lamports", note: g ? `excluded = period ${cut} (never paid)` : "GO_PUBLIC_DATE unset: nothing is paid", sql: q("cashback_ledger", "amount_lamports", g ? periodOnOrAfter("period", g) : "false") },
  ];
}
export async function cutoffSummary(db: Sql, g: GoPublic | null): Promise<SummaryRow[]> {
  const out: SummaryRow[] = [];
  for (const s of summaryQueries(g)) {
    const r = (await db.query(s.sql)).rows[0];
    out.push({ table: s.table, measure: s.measure, note: s.note, includedCount: Number(r.ic), includedLamports: BigInt(r.il), excludedCount: Number(r.ec), excludedLamports: BigInt(r.el) });
  }
  return out;
}
const sol = (l: bigint) => { const neg = l < 0n, a = neg ? -l : l; return `${neg ? "-" : ""}${a / 1_000_000_000n}.${(a % 1_000_000_000n).toString().padStart(9, "0")}`; };
export function formatSummary(rows: SummaryRow[], g: GoPublic | null): string {
  const head = `[cutoff] GO_PUBLIC_DATE ${g ? g.id : "unset"} (read-only summary)`;
  return [head, ...rows.map((r) => `[cutoff] ${r.table}.${r.measure}: included ${r.includedCount} rows ${sol(r.includedLamports)} SOL, excluded ${r.excludedCount} rows ${sol(r.excludedLamports)} SOL (${r.note})`)].join("\n");
}
