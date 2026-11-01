/** Side panel trade box (v0.4.0): pure helpers, tested. The panel trades through the same worker "sell" port as the CA popup
 *  and the Holding panel (the worker builds, checks the highbar fee and priority fee, signs, simulates and sends). */
import { caFromUrl, isPubkey, NOT_TOKENS } from "./ca";
import { BUY_MAX_SOL } from "./limits";

/** Quick buy chips in SOL (one row of four) and the quick sell percents. */
export const PANEL_BUY_SOL = [0.1, 0.25, 0.5, 1] as const;
export const PANEL_SELL_PCT = [10, 25, 50, 100] as const;
/** Toast timing, the same as the x.com toasts: 1.5 s, errors 2 s. */
export const TOAST_MS = 1500, TOAST_ERR_MS = 2000;
export const toastMs = (kind: "ok" | "err" | "info") => (kind === "err" ? TOAST_ERR_MS : TOAST_MS);

/** The token mint in what the user pasted: a bare contract address, or a token page link (pump.fun, DexScreener, GMGN, …).
 *  null for anything else, and for system programs and wrapped SOL. */
export function parseCaInput(raw: string): string | null {
  const t = (raw ?? "").trim();
  if (!t) return null;
  if (isPubkey(t)) return NOT_TOKENS.has(t) ? null : t;
  return caFromUrl(t);
}

/** A typed buy amount: above 0, at most BUY_MAX_SOL, up to 4 decimals (comma works as the decimal mark). */
export function parseSolAmount(v: string): number | null {
  const t = (v ?? "").trim().replace(",", ".");
  if (!/^\d{0,4}(\.\d{0,4})?$/.test(t) || t === "" || t === ".") return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 && n <= BUY_MAX_SOL ? n : null;
}

/** "Buy 0.25 SOL" / "Sell 50%" / "Sell all". */
export function tradeLabel(side: "buy" | "sell", amt: number): string {
  if (side === "buy") return `Buy ${amt} SOL`;
  return amt >= 100 ? "Sell all" : `Sell ${amt}%`;
}

/** Positions list order: valued tokens first (largest value), then the rest by amount. */
export function sortPositions<T extends { valueSol: number | null; amount: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (b.valueSol ?? -1) - (a.valueSol ?? -1) || b.amount - a.amount);
}

/** Up, down or flat, for the green and red text classes. */
export const trend = (n: number | null | undefined): "up" | "dn" | "flat" => (n == null || !Number.isFinite(n) || n === 0 ? "flat" : n > 0 ? "up" : "dn");
