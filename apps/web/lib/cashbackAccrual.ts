/** Go-public cut-off fields on GET /cashback/:wallet (api GO_PUBLIC_DATE). Cashback before the cut-off is not paid.
 *  Optional here so an older api response without them reads as "no cut-off". Keep every read of them in this file. */
export type CashbackAccrualFields = {
  /** Cut-off UTC day, YYYY-MM-DD. null while GO_PUBLIC_DATE is unset. */
  accrualStart?: string | null;
  /** Same cut-off in unix ms. */
  accrualStartMs?: number | null;
  /** True once the cut-off is set and has passed. */
  accruing?: boolean;
  /** First UTC day (unix ms) still awaiting payout, null when nothing is awaiting. */
  pendingFrom?: number | null;
};
/** Per trade row flag: false for trades before the cut-off (they earn nothing). */
export type CashbackRowFields = { eligible?: boolean };

export type CashbackAccrual = {
  /** Cut-off date, null when none is set (show Soon instead of amounts). */
  since: Date | null;
  /** Cut-off set and reached. */
  accruing: boolean;
};

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Reads the cut-off, preferring accruing and accrualStart, with accrualStartMs as a fallback for the date. */
export function cashbackAccrual(d: CashbackAccrualFields | null | undefined): CashbackAccrual {
  const day = typeof d?.accrualStart === "string" ? DAY.exec(d.accrualStart) : null;
  const ms = day ? Date.UTC(+day[1], +day[2] - 1, +day[3]) : typeof d?.accrualStartMs === "number" && Number.isFinite(d.accrualStartMs) ? d.accrualStartMs : null;
  const since = ms !== null && Number.isFinite(ms) ? new Date(ms) : null;
  return { since, accruing: !!since && (typeof d?.accruing === "boolean" ? d.accruing : Date.now() >= since.getTime()) };
}

/** Whether a trade row earns cashback: needs a cut-off and the api's eligible flag (missing counts as eligible once accruing). */
export const rowEligible = (r: CashbackRowFields, a: CashbackAccrual) => !!a.since && r.eligible !== false;

export const fmtAccrualDate = (t: Date) => t.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
