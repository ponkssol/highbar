/** Holding panel data: the tokens the drawer's wallets launched (GET /wallet/:a/created) or hold, their SPL balances and
 *  their trades, merged into one row per wallet and token. Pure, no chrome and no network, so it is unit tested. */
import type { CreatedToken, TokenView, TradeLite } from "./api";
import type { HistoryItem } from "./messages";

export interface WalletLite { id: string; label: string; address: string }
/** One SPL token account balance: `raw` is the integer amount (string so it survives messaging), `decimals` from the mint. */
export interface Bal { mint: string; raw: string; decimals: number }
export interface HoldRow {
  key: string; walletId: string; walletLabel: string; walletAddress: string;
  mint: string; name: string; symbol: string; image: string | null; tokenUrl: string;
  /** created: this wallet launched it. migrated: trading moved to the DAMM v2 pool. */
  created: boolean; migrated: boolean;
  mcapSol: number | null; mcapUsd: number | null; priceSol: number | null;
  raw: string; decimals: number; amount: number;
  /** SOL spent on buys of this token by this wallet (the dev buy included) and SOL received from sells. */
  boughtSol: number; soldSol: number;
  /** Mark to market: amount times the api price, before fees and slippage. */
  valueSol: number | null; pnlSol: number | null; pnlPct: number | null;
}
export interface HoldInput {
  wallets: WalletLite[];
  created: Record<string, CreatedToken[]>;
  balances: Record<string, Bal[]>;
  /** null when the trades could not be read: the local dev buy is the cost then. */
  trades: Record<string, TradeLite[] | null>;
  history: Record<string, HistoryItem[]>;
  /** GET /tokens/:mint for held tokens this wallet did not create. null = not a highbar token. */
  info: Record<string, TokenView | null>;
  siteUrl: string;
}

export const HOLD_POLL_MS = 15_000;
/** Poll slower with more wallets so balance reads stay well under the server RPC limit (60 per minute per IP). */
export function pollMs(wallets: number): number { return Math.min(60_000, Math.max(HOLD_POLL_MS, wallets * 4_000)); }

export const SLIPPAGE_DEFAULT = 10;
export const SLIPPAGE_MIN = 0.1, SLIPPAGE_MAX = 50;
/** Sell slippage in percent, one decimal, 0.1 to 50 (the api caps slippageBps at 5000). Anything else is the default 10. */
export function cleanSlippage(v: unknown): number {
  const n = typeof v === "string" ? Number(v.replace(/%/g, "").trim()) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n) || n < SLIPPAGE_MIN || n > SLIPPAGE_MAX) return SLIPPAGE_DEFAULT;
  return Math.round(n * 10) / 10;
}
export const slippageBps = (pct: number) => Math.round(cleanSlippage(pct) * 100);

/** pnlSol = value now + SOL already received from sells - SOL spent. pnlPct is against the SOL spent (null when nothing was spent). */
export function pnl(boughtSol: number, soldSol: number, valueSol: number | null): { pnlSol: number | null; pnlPct: number | null } {
  if (valueSol === null || !Number.isFinite(valueSol)) return { pnlSol: null, pnlPct: null };
  const pnlSol = valueSol + soldSol - boughtSol;
  return { pnlSol, pnlPct: boughtSol > 0 ? (pnlSol / boughtSol) * 100 : null };
}

/** Exact decimal string of a raw token amount ("18250000.5"), no float rounding. */
export function rawToUi(raw: bigint, decimals: number): string {
  if (raw < 0n) throw new RangeError("negative amount");
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) throw new RangeError("bad decimals");
  if (decimals === 0) return raw.toString();
  const s = raw.toString().padStart(decimals + 1, "0");
  const int = s.slice(0, -decimals), frac = s.slice(-decimals).replace(/0+$/, "");
  return frac ? `${int}.${frac}` : int;
}
export const uiAmount = (raw: bigint, decimals: number) => Number(rawToUi(raw, decimals));

/** Raw amount to sell for a percent of the raw balance. 100 sells everything (no rounding left behind). Percent has
 *  two decimals at most (basis points), and the result is floored, never more than the balance. */
export function sellRaw(raw: bigint, pct: number): bigint {
  if (raw <= 0n) throw new RangeError("Nothing to sell in this wallet");
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100) throw new RangeError("Pick a percent above 0 and up to 100");
  if (pct === 100) return raw;
  const bps = BigInt(Math.round(pct * 100));
  if (bps <= 0n) throw new RangeError("Pick a percent above 0 and up to 100");
  if (bps >= 10_000n) return raw;
  const out = (raw * bps) / 10_000n;
  if (out <= 0n) throw new RangeError("That percent is less than one token unit");
  return out;
}
/** The custom percent box: "33", "33.5", "40%". null when it is not a percent above 0 and up to 100. */
export function parsePct(s: string): number | null {
  const t = s.replace(/%/g, "").trim();
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(t)) return null;
  const n = Number(t);
  return n > 0 && n <= 100 ? n : null;
}

/** SOL bought and sold per mint from the wallet's trades. Falls back to the local dev buy when there are no trades for it. */
export function costBasis(mint: string, trades: TradeLite[] | null, local: HistoryItem[]): { boughtSol: number; soldSol: number } {
  const mine = (trades ?? []).filter((t) => t.mint === mint);
  if (mine.length) {
    let boughtSol = 0, soldSol = 0;
    for (const t of mine) { const v = Number(t.sol); if (!Number.isFinite(v) || v < 0) continue; if (t.side === "buy") boughtSol += v; else if (t.side === "sell") soldSol += v; }
    return { boughtSol, soldSol };
  }
  const h = local.find((x) => x.mint === mint && x.status === "confirmed");
  return { boughtSol: h && Number.isFinite(h.devBuySol) && h.devBuySol > 0 ? h.devBuySol : 0, soldSol: 0 };
}

/** One row per wallet and token: every token the wallet launched (kept while it still holds some or ever spent SOL on it)
 *  and every highbar token it holds. Rows with a balance come first, then by value. */
export function buildRows(i: HoldInput): HoldRow[] {
  const rows: HoldRow[] = [];
  for (const w of i.wallets) {
    const created = i.created[w.address] ?? [], bals = i.balances[w.address] ?? [], local = i.history[w.address] ?? [];
    const byMint = new Map<string, Bal>();
    for (const b of bals) { try { if (BigInt(b.raw) > 0n) byMint.set(b.mint, b); } catch { /* not an integer */ } }
    const mints = [...new Set([...created.map((c) => c.mint), ...byMint.keys()])];
    for (const mint of mints) {
      const c = created.find((x) => x.mint === mint) ?? null, t = c ? null : i.info[mint] ?? null;
      if (!c && !t) continue; // not a highbar token
      const b = byMint.get(mint), raw = b ? BigInt(b.raw) : 0n, decimals = b?.decimals ?? 6;
      const { boughtSol, soldSol } = costBasis(mint, i.trades[w.address] ?? null, local);
      if (raw === 0n && boughtSol === 0) continue;
      const priceSol = num(c?.priceSol ?? t?.priceSol), amount = uiAmount(raw, decimals);
      const valueSol = priceSol === null ? null : amount * priceSol;
      const h = local.find((x) => x.mint === mint);
      rows.push({ key: `${w.id}:${mint}`, walletId: w.id, walletLabel: w.label, walletAddress: w.address, mint,
        name: (c?.name ?? t?.name ?? h?.name ?? "").trim() || "Unknown", symbol: (c?.symbol ?? t?.symbol ?? h?.ticker ?? "").trim(),
        image: h?.image && /^data:image\//.test(h.image) ? h.image : null, tokenUrl: `${i.siteUrl.replace(/\/$/, "")}/token/${mint}`,
        created: !!c, migrated: !!(c?.isMigrated ?? t?.isMigrated), mcapSol: num(c?.mcapSol ?? t?.mcapSol), mcapUsd: num(c?.mcapUsd ?? t?.mcapUsd), priceSol,
        raw: raw.toString(), decimals, amount, boughtSol, soldSol, valueSol, ...pnl(boughtSol, soldSol, valueSol) });
    }
  }
  return rows.sort((a, b) => Number(b.raw !== "0") - Number(a.raw !== "0") || (b.valueSol ?? -1) - (a.valueSol ?? -1));
}
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

// ---- panel formatting (en-US, no semicolons) ----
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 });
/** Token amounts and market caps: 1.23M, 456.7K, 12.5. */
export function fmtCompact(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "–";
  if (n !== 0 && Math.abs(n) < 1) return n.toLocaleString("en-US", { maximumSignificantDigits: 3 });
  return compact.format(n);
}
/** Market cap: USD when the api has it, else SOL. */
export function fmtMcap(r: Pick<HoldRow, "mcapUsd" | "mcapSol">): string {
  if (r.mcapUsd != null && Number.isFinite(r.mcapUsd)) return `$${fmtCompact(r.mcapUsd)}`;
  if (r.mcapSol != null && Number.isFinite(r.mcapSol)) return `${fmtCompact(r.mcapSol)} SOL`;
  return "–";
}
/** SOL with a sign for PnL (+0.0123, −0.45), 4 decimals at most, 6 below 0.001. */
export function fmtSigned(n: number | null, max = 4): string {
  if (n == null || !Number.isFinite(n)) return "–";
  const a = Math.abs(n), s = a.toLocaleString("en-US", { maximumFractionDigits: a !== 0 && a < 0.001 ? 6 : max });
  return n > 0 ? `+${s}` : n < 0 ? `−${s}` : s;
}
/** SOL for the narrow Holding cells: the same as fmtSigned up to 10, then fewer decimals as it grows (123.5, 1,496) and
 *  compact from 10,000 (98.77K), so a big number never runs into the next column. */
export function fmtSolFit(n: number | null, signed = false): string {
  if (n == null || !Number.isFinite(n)) return "–";
  const a = Math.abs(n);
  const s = a >= 10_000 ? compact.format(a) : a.toLocaleString("en-US", { maximumFractionDigits: a >= 1000 ? 0 : a >= 100 ? 1 : a >= 10 ? 2 : a !== 0 && a < 0.001 ? 6 : 4 });
  return !signed ? (n < 0 ? `−${s}` : s) : n > 0 ? `+${s}` : n < 0 ? `−${s}` : s;
}
export function fmtPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "–";
  const a = Math.abs(n), s = a >= 10_000 ? compact.format(a) : a.toLocaleString("en-US", { maximumFractionDigits: a >= 100 ? 0 : 1 });
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${s}%`;
}

/** "Sell All" in the Holding header: every row with a balance above zero (the rows already follow the checked wallets and the
 *  wallet filter), and the counts the confirm step shows. Busy rows (a trade running) are skipped. */
export function sellAllPlan<R extends Pick<HoldRow, "key" | "raw" | "mint" | "walletId">>(rows: readonly R[], busy: (key: string) => boolean = () => false): { rows: R[]; tokens: number; wallets: number } {
  const out = rows.filter((r) => { try { return BigInt(r.raw || "0") > 0n && !busy(r.key); } catch { return false; } });
  return { rows: out, tokens: new Set(out.map((r) => r.mint)).size, wallets: new Set(out.map((r) => r.walletId)).size };
}
/** "3 tokens in 2 wallets" (singular where it fits). */
export const planText = (p: { tokens: number; wallets: number }) => `${p.tokens} token${p.tokens === 1 ? "" : "s"} in ${p.wallets} wallet${p.wallets === 1 ? "" : "s"}`;
