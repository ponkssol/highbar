/** Toast rules, no DOM (tested): how long a toast stays and what happens when several arrive. */
export type ToastKind = "info" | "ok" | "err";
export interface ToastItem { id: number; kind: ToastKind; text: string; href?: string; key: string }
/** On screen: info and success 1.5 s, errors 2 s (hover pauses the timer). */
export const toastMs = (k: ToastKind) => (k === "err" ? 2000 : 1500);
export const TOAST_MAX = 3;
/** Only explorer and highbar links get a "View tx" (anything else is shown without one). */
export const safeTxHref = (u: string | undefined): string | undefined => {
  try { const x = new URL(u ?? ""); return x.protocol === "https:" && /(^|\.)(solscan\.io|highbar\.fun|explorer\.solana\.com)$/.test(x.hostname) ? x.href : undefined; } catch { return undefined; }
};
/** Adds a toast: the same message replaces its older copy (moved to the newest place), and only the newest TOAST_MAX stay.
 *  Returns the new list and the ids that leave. */
export function pushToast(list: ToastItem[], t: ToastItem, max = TOAST_MAX): { list: ToastItem[]; drop: number[] } {
  const same = list.filter((x) => x.key === t.key).map((x) => x.id);
  const rest = list.filter((x) => x.key !== t.key);
  const next = [...rest, t];
  const over = next.length > max ? next.slice(0, next.length - max).map((x) => x.id) : [];
  return { list: next.slice(-max), drop: [...same, ...over] };
}
