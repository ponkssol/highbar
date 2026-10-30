import type { LedgerFilter, LedgerParams } from "./read.js";

/** Query-param parsing for the Open Book routes (pure; tested without a server). */
export const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export class BadRequest extends Error {}
export const int = (v: unknown, def: number, min: number, max: number, name: string) => {
  if (v === undefined || v === "") return def;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new BadRequest(`${name} must be an integer ${min}..${max}`);
  return n;
};
export const oneOf = <T extends string>(v: unknown, allowed: readonly T[], def: T, name: string): T => {
  if (v === undefined || v === "") return def;
  if (!allowed.includes(v as T)) throw new BadRequest(`${name} must be one of ${allowed.join("|")}`);
  return v as T;
};
/** Ledger query params -> filter. `filter=all|buys|sells|snipers|failed` (mock chips) is an alias that only fills unset fields. */
export function parseLedgerQuery(q: Record<string, string | undefined>, maxLimit = 100): LedgerParams {
  let side = oneOf(q.side, ["buy", "sell"] as const, "" as any, "side") || null;
  let status: LedgerFilter["status"] = null;
  const st = oneOf(q.status, ["ok", "success", "failed", "duplicate", "all"] as const, "all", "status");
  status = st === "all" ? null : st === "ok" ? "success" : st;
  let sniper = q.sniper === undefined || q.sniper === "" ? false : q.sniper === "1" || q.sniper === "true" ? true : q.sniper === "0" || q.sniper === "false" ? false : (() => { throw new BadRequest("sniper must be 1|0"); })();
  const f = oneOf(q.filter, ["all", "buys", "sells", "snipers", "failed"] as const, "all", "filter");
  if (f === "buys") side ??= "buy";
  if (f === "sells") side ??= "sell";
  if (f === "snipers") sniper = true;
  if (f === "failed") status ??= "notok";
  if (side && status && status !== "success") throw new BadRequest("side applies to landed trades only; drop side or use status=ok");
  const wallet = q.wallet ? q.wallet.trim() : null;
  if (wallet && !BASE58.test(wallet)) throw new BadRequest("wallet must be a base58 address");
  return { wallet, side, status, sniper, windowSec: int(q.window, 60, 1, 600, "window"), order: oneOf(q.order, ["desc", "asc"] as const, "desc", "order"),
    limit: int(q.limit, 25, 1, maxLimit, "limit"), cursor: q.cursor || null };
}

