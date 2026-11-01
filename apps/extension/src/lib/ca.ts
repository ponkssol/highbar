/** Token detection on x.com (pure, shared by the content script and the worker; no web3.js so the content bundle stays small).
 *  A tweet can name a Solana token three ways: a contract address (CA) in the text, a link to a token page (pump.fun,
 *  DexScreener, GMGN, Birdeye, Solscan, Jupiter) or a $TICKER cashtag. CAs and links give base58 32 byte candidates that the
 *  worker confirms are mints (one getMultipleAccounts per batch); a cashtag resolves only when that is unambiguous. */
import bs58 from "bs58";

export interface CaHit { mint: string; symbol?: string; via: "text" | "link" | "cashtag" }
/** The popup data, one shape for every source. USD numbers are null when no source had them. */
export interface CaInfo {
  mint: string; name: string; symbol: string; image: string | null;
  priceUsd: number | null; change24h: number | null; mcapUsd: number | null; volume24hUsd: number | null; liquidityUsd: number | null;
  verified: boolean; decimals: number | null; tokenProgram: "spl" | "t22" | null;
  /** A highbar token (the api knows it): swaps use its DBC or DAMM v2 pool, everything else goes through Jupiter. */
  highbar: boolean; migrated: boolean;
  /** Pool for the chart embed, null when no indexer knows one yet. */
  pool: string | null; dex: string | null;
  tokenUrl: string | null;
  sources: string[]; updatedAt: number;
  /** Some sources had not answered within 1.5 s: ask again shortly. */
  partial?: boolean;
  /** pump.fun refused the coin lookup ("HTTP 403 (Cloudflare challenge)"): the chart still tries it and shows why not. */
  pumpBlocked?: string;
}

const B58 = "1-9A-HJ-NP-Za-km-z";
const CA_RE = new RegExp(`(?<![${B58}])[${B58}]{32,44}(?![${B58}])`, "g");
const CASHTAG_RE = /(?:^|[^\w$])\$([A-Za-z][A-Za-z0-9_]{0,11})(?![\w$])/g;
/** Never a token you can buy: system programs, the token programs and wrapped SOL itself. */
export const NOT_TOKENS = new Set([
  "11111111111111111111111111111111", "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL", "ComputeBudget111111111111111111111111111111", "So11111111111111111111111111111111111111112",
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", "SysvarRent111111111111111111111111111111111", "SysvarC1ock11111111111111111111111111111111",
]);
/** Cashtags that name chains, fiat or SOL itself: never a token button. */
export const SKIP_TICKERS = new Set(["SOL", "WSOL", "USD", "EUR", "BTC", "ETH"]);

/** A base58 string that decodes to exactly 32 bytes (a Solana public key, on or off curve). */
export function isPubkey(s: string): boolean {
  if (typeof s !== "string" || s.length < 32 || s.length > 44) return false;
  try { return bs58.decode(s).length === 32; } catch { return false; }
}

/** CA candidates in the text, in order, without repeats. A word that only looks like base58 (an English word of 32+ letters
 *  does not exist, but a long handle or a hash might) still has to decode to 32 bytes, and the worker checks it is a mint. */
export function casInText(text: string): string[] {
  const out: string[] = [];
  for (const m of (text ?? "").matchAll(CA_RE)) { const s = m[0]; if (!out.includes(s) && !NOT_TOKENS.has(s) && isPubkey(s)) out.push(s); }
  return out;
}

const LINK_HOSTS = /(^|\.)(pump\.fun|dexscreener\.com|gmgn\.ai|birdeye\.so|solscan\.io|jup\.ag|photon-sol\.tinyastro\.io|axiom\.trade|highbar\.capital)$/i;
/** The token (or pool) address in a token page link, or null. Accepts a full URL or X's display text ("dexscreener.com/solana/7x…"
 *  is cut, so only a complete address counts). GMGN prefixes some paths ("sol/token/abc_<mint>"), Jupiter uses "SOL-<mint>". */
export function caFromUrl(raw: string): string | null {
  let t = (raw ?? "").trim().replace(/…$/, "");
  if (!t) return null;
  if (!/^https?:\/\//i.test(t)) t = `https://${t}`;
  let u: URL;
  try { u = new URL(t); } catch { return null; }
  if (!LINK_HOSTS.test(u.hostname)) return null;
  const parts = [...u.pathname.split(/[/_-]/), ...[...u.searchParams.values()].flatMap((v) => v.split(/[/_-]/))];
  for (const p of parts) if (p.length >= 32 && p.length <= 44 && !NOT_TOKENS.has(p) && isPubkey(p)) return p;
  return null;
}

/** $TICKER cashtags in the text, upper case, in order, without repeats (skips $SOL and other non tokens). */
export function cashtags(text: string): string[] {
  const out: string[] = [];
  for (const m of (text ?? "").matchAll(CASHTAG_RE)) { const s = m[1].toUpperCase(); if (!out.includes(s) && !SKIP_TICKERS.has(s) && !/^\d/.test(s)) out.push(s); }
  return out;
}

/** What a getMultipleAccounts answer (base64, dataSlice offset 165 length 1) says about one address: a mint of SPL Token
 *  (82 bytes) or Token-2022 (82 bytes, or longer with account type 1 at byte 165). */
export function isMintAccount(acc: { owner?: string; space?: number; data?: [string, string] | unknown } | null | undefined): boolean {
  if (!acc || typeof acc !== "object") return false;
  const owner = acc.owner, space = Number(acc.space);
  if (owner === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") return space === 82;
  if (owner !== "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb") return false;
  if (space === 82) return true;
  if (!(space > 165)) return false;
  const d = Array.isArray(acc.data) && typeof acc.data[0] === "string" ? acc.data[0] : "";
  try { return atob(d).charCodeAt(0) === 1; } catch { return false; }
}

export interface TickerCandidate { id: string; symbol: string; isVerified?: boolean; liquidity?: number | null }
/** Picks one token for a $TICKER from search results, or null when that is not clear: an exact symbol match, the verified one
 *  with the most liquidity, else the most liquid one when it has at least $10k and five times the next one. */
export function pickTicker(symbol: string, list: TickerCandidate[]): string | null {
  const sym = symbol.toUpperCase();
  const same = (list ?? []).filter((t) => typeof t?.id === "string" && isPubkey(t.id) && String(t.symbol ?? "").toUpperCase() === sym && !NOT_TOKENS.has(t.id));
  const liq = (t: TickerCandidate) => (Number.isFinite(Number(t.liquidity)) ? Number(t.liquidity) : 0);
  const byLiq = [...same].sort((a, b) => liq(b) - liq(a));
  const ver = byLiq.filter((t) => t.isVerified === true);
  if (ver.length) return ver[0].id;
  if (!byLiq.length) return null;
  const [a, b] = byLiq;
  if (liq(a) >= 10_000 && (!b || liq(a) >= 5 * liq(b))) return a.id;
  return null;
}

/** Order of resolution for one tweet: CAs in the text, then token links, then cashtags (resolved by the worker). */
export function tweetCandidates(text: string, links: string[]): { text: string[]; links: string[]; tags: string[] } {
  const t = casInText(text);
  const l: string[] = [];
  for (const x of links) { const c = caFromUrl(x); if (c && !t.includes(c) && !l.includes(c)) l.push(c); }
  return { text: t, links: l, tags: cashtags(text) };
}

/** GeckoTerminal chart embed for a Solana pool (chart only, no info or trades panel; params from their embed wizard). */
export const chartEmbedUrl = (pool: string, theme: "dark" | "light" = "dark", resolution = "15m") =>
  `https://www.geckoterminal.com/solana/pools/${pool}?embed=1&info=0&swaps=0&grayscale=0&light_chart=${theme === "light" ? 1 : 0}&chart_type=price&resolution=${resolution}${theme === "dark" ? "&bg_color=111111" : ""}`;

export const fmtUsdPrice = (n: number | null): string => {
  if (n === null || !Number.isFinite(n)) return "–";
  if (n >= 1) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (n === 0) return "$0";
  // small prices: $0.0₅123 style (count of zeros after the point as subscript)
  const s = n.toFixed(20).replace(/^0\./, "");
  const z = s.match(/^0*/)?.[0].length ?? 0;
  if (z >= 4) { const digits = s.slice(z, z + 4).replace(/0+$/, ""); return `$0.0${String(z).split("").map((c) => "₀₁₂₃₄₅₆₇₈₉"[Number(c)]).join("")}${digits}`; }
  return `$${n.toLocaleString("en-US", { maximumSignificantDigits: 4 })}`;
};
export const fmtUsdCompact = (n: number | null): string => {
  if (n === null || !Number.isFinite(n)) return "–";
  const a = Math.abs(n);
  const f = (v: number, u: string) => `$${v.toLocaleString("en-US", { maximumFractionDigits: v >= 100 ? 0 : v >= 10 ? 1 : 2 })}${u}`;
  return a >= 1e9 ? f(n / 1e9, "B") : a >= 1e6 ? f(n / 1e6, "M") : a >= 1e3 ? f(n / 1e3, "K") : `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
};
/** 24h change: +12.35%, -3%; from 10 000% compact (+535.3M%) so a moonshot never widens the header. */
export const fmtChange = (n: number | null): string => {
  if (n === null || !Number.isFinite(n)) return "–";
  const a = Math.abs(n), sg = n > 0 ? "+" : n < 0 ? "-" : "";
  if (a < 10_000) return `${n > 0 ? "+" : ""}${n.toLocaleString("en-US", { maximumFractionDigits: a >= 1000 ? 0 : 2 })}%`;
  const [v, u] = a >= 1e12 ? [a / 1e12, "T"] : a >= 1e9 ? [a / 1e9, "B"] : a >= 1e6 ? [a / 1e6, "M"] : [a / 1e3, "K"];
  return `${sg}${v.toLocaleString("en-US", { maximumFractionDigits: 1 })}${u}%`;
};

/** A token pill's compact market numbers (ca:stats). */
export interface PillStats { mint: string; mcapUsd: number | null; volume24hUsd: number | null; liquidityUsd: number | null }
