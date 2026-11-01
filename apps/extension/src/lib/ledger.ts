/** The extension's own trade ledger per wallet and token (chrome.storage.local), filled after each confirmed CA popup trade
 *  from the wallet's SOL and token balance before and after it. The popup's PnL card reads the average cost from it. */
export interface LedgerEntry { sig: string; side: "buy" | "sell"; /** SOL spent (buy) or received (sell), fees included. */ sol: number; /** token amount moved, raw units */ raw: string; decimals: number; at: number }
export type Ledger = Record<string, Record<string, LedgerEntry[]>>; // wallet address -> mint -> entries
export const LEDGER_KEY = "hb.ledger";
const MAX_PER_TOKEN = 100, MAX_TOKENS = 200;

export function readLedger(v: unknown): Ledger {
  const out: Ledger = {};
  if (!v || typeof v !== "object") return out;
  for (const [w, mints] of Object.entries(v as Record<string, unknown>)) {
    if (!mints || typeof mints !== "object") continue;
    for (const [m, list] of Object.entries(mints as Record<string, unknown>)) {
      if (!Array.isArray(list)) continue;
      const ok = list.filter((e): e is LedgerEntry => !!e && typeof e === "object" && (e.side === "buy" || e.side === "sell") && Number.isFinite(e.sol) && e.sol >= 0 && typeof e.raw === "string" && /^\d+$/.test(e.raw) && Number.isInteger(e.decimals) && typeof e.sig === "string");
      if (ok.length) (out[w] ??= {})[m] = ok;
    }
  }
  return out;
}
/** Adds one entry (a signature only once), newest last, bounded. */
export function addEntry(l: Ledger, wallet: string, mint: string, e: LedgerEntry): Ledger {
  const w = (l[wallet] ??= {});
  const list = (w[mint] ??= []);
  if (list.some((x) => x.sig === e.sig)) return l;
  list.push(e);
  if (list.length > MAX_PER_TOKEN) list.splice(0, list.length - MAX_PER_TOKEN);
  const mints = Object.keys(w);
  if (mints.length > MAX_TOKENS) for (const m of mints.sort((a, b) => (w[a].at(-1)?.at ?? 0) - (w[b].at(-1)?.at ?? 0)).slice(0, mints.length - MAX_TOKENS)) delete w[m];
  return l;
}

/** Average cost: a buy adds its tokens and SOL; a sell removes the same share of the cost as of the tokens. */
export function position(entries: LedgerEntry[]): { raw: bigint; costSol: number; realizedSol: number } | null {
  let raw = 0n, cost = 0, realized = 0, bought = false;
  for (const e of [...entries].sort((a, b) => a.at - b.at)) {
    const amt = BigInt(e.raw);
    if (e.side === "buy") { raw += amt; cost += e.sol; bought = true; continue; }
    if (raw <= 0n) continue;
    const take = amt > raw ? raw : amt;
    const frac = Number((take * 1_000_000n) / raw) / 1_000_000;
    const part = cost * frac;
    cost -= part; raw -= take; realized += e.sol - part;
  }
  return bought ? { raw, costSol: cost, realizedSol: realized } : null;
}

export interface Pnl { valueSol: number | null; investedSol: number | null; avgSol: number | null; pnlSol: number | null; pnlPct: number | null }
/** PnL of what the wallet holds now. The cost basis only counts when the ledger explains the balance (within 2 %); tokens
 *  bought elsewhere leave it unknown (value only). `priceSol` is SOL per whole token. */
export function pnl(balanceRaw: bigint, decimals: number, priceSol: number | null, entries: LedgerEntry[]): Pnl {
  const amount = Number(balanceRaw) / 10 ** decimals;
  const valueSol = priceSol !== null && Number.isFinite(priceSol) ? amount * priceSol : null;
  const p = position(entries);
  const none = { valueSol, investedSol: null, avgSol: null, pnlSol: null, pnlPct: null };
  if (!p || p.raw <= 0n || balanceRaw <= 0n) return none;
  const ratio = Number(balanceRaw) / Number(p.raw);
  if (ratio > 1.02) return none;
  const avgSol = p.costSol / (Number(p.raw) / 10 ** decimals);
  const investedSol = avgSol * amount;
  const pnlSol = valueSol === null ? null : valueSol - investedSol;
  return { valueSol, investedSol, avgSol, pnlSol, pnlPct: pnlSol === null || investedSol <= 0 ? null : (pnlSol / investedSol) * 100 };
}
