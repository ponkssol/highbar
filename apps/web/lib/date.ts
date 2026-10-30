/** Shared date and time formatting for the web app. Always US style, month first ("Nov 2, 2026", "Nov 2, 2026, 2:35 PM", "11/02/2026"),
 *  with an explicit locale so the browser language (for example an Indonesian browser) never switches it to day first.
 *  Pass `{ timeZone: "UTC" }` where a value must read the same for everyone, otherwise the viewer's local time zone is used. */
export const DATE_LOCALE = "en-US";
type Opts = Intl.DateTimeFormatOptions;
const toDate = (d: Date | number) => (d instanceof Date ? d : new Date(d));

/** "Nov 2, 2026" */
export const fmtDateUS = (d: Date | number, o: Opts = {}) => toDate(d).toLocaleDateString(DATE_LOCALE, { month: "short", day: "numeric", year: "numeric", ...o });
/** "Nov 2, 2026, 2:35 PM" */
export const fmtDateTimeUS = (d: Date | number, o: Opts = {}) =>
  toDate(d).toLocaleString(DATE_LOCALE, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", ...o });
/** "2:35 PM" (pass second: "2-digit" for "2:35:10 PM") */
export const fmtTimeUS = (d: Date | number, o: Opts = {}) => toDate(d).toLocaleTimeString(DATE_LOCALE, { hour: "numeric", minute: "2-digit", ...o });
/** "11/02/2026" */
export const fmtDateNumericUS = (d: Date | number, o: Opts = {}) => toDate(d).toLocaleDateString(DATE_LOCALE, { month: "2-digit", day: "2-digit", year: "numeric", ...o });
/** lightweight-charts localization: month first crosshair dates in en-US. */
export const CHART_LOCALIZATION = { locale: DATE_LOCALE, dateFormat: "MMM dd, yyyy" } as const;
