/** Plain-language token facts for the SSR "About" block, meta description, JSON-LD and tokens.md. Built only from API data:
 *  a clause is left out when its number is missing, and nothing here predicts anything. */
import { fmtDateUS } from "@/lib/date";
import { TIERS, thresholdSolFor, type TierId } from "@hb/shared";
import type { ApiToken } from "./api";
import { fmtUsd, shortAddr } from "./format";
import { visibleOnly } from "./hiddenTokens";
import { SITE_NAME } from "./seo";

const net = () => (process.env.NETWORK === "mainnet" || process.env.NETWORK === "mainnet-beta" ? "mainnet" : "devnet");
export const tierLabel = (t: TierId) => TIERS[t]?.label ?? t;
export const targetSolOf = (t: ApiToken) => t.thresholdSol || thresholdSolFor(t.tier, net());
export const bondingPct = (t: ApiToken) => (t.isMigrated ? 100 : Math.max(0, Math.min(100, (t.progress || 0) * 100)));
/** Bonding progress for text: one decimal, two below 0.1%, never rounded up to 100 or down to 0 while trading. */
export const pct1 = (v: number) => (v >= 99.95 && v < 100 ? "99.9" : v > 0 && v < 0.01 ? "under 0.01" : v > 0 && v < 0.1 ? v.toFixed(2) : v.toFixed(1));
/** "November 30, 2026", US month first in UTC (lib/date), so server HTML reads the same for everyone. */
export const fmtDateUtc = (ms: number) => fmtDateUS(ms, { month: "long", timeZone: "UTC" });
export const tokenName = (t: ApiToken) => t.name || t.mint.slice(0, 6);
export const tokenTicker = (t: ApiToken) => t.symbol || "?";
export const migrationStatus = (t: ApiToken) => (t.isMigrated ? "Graduated to Meteora DAMM v2" : "Trading on the Meteora DBC bonding curve");
export const devLockStatus = (t: ApiToken) => (t.devLocked ? (t.unlockAt ? `Locked with Jupiter Lock until ${fmtDateUtc(t.unlockAt * 1000)}` : "Locked with Jupiter Lock") : "No Dev Lock");

/** Creator metadata we will not repeat on the page. Their words, not ours, but the page must not say these. */
const BANNED_COPY = /anti-bundle|bundle-proof|rug-proof|guaranteed safe/i;

/** Plain description text from a metadata JSON object. Blank and non-strings are omitted. */
export function descriptionFromMeta(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const raw = (json as { description?: unknown }).description;
  if (typeof raw !== "string") return null;
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text || BANNED_COPY.test(text)) return null;
  return text.length > 1000 ? `${text.slice(0, 999).trimEnd()}…` : text;
}

/** Id of a highbar-hosted metadata file (`…/hb-api/meta/<24 hex>.json`). Other URIs are ignored. */
export function ownMetaId(uri: string | null | undefined): string | null {
  if (!uri) return null;
  const m = /\/hb-api\/meta\/([a-f0-9]{24})\.json(?:\?[^#]*)?$/.exec(uri.trim());
  return m ? m[1] : null;
}

/** Link text from a token's own name and symbol. A missing name falls back to the symbol, then the mint. */
export function tokenLinkLabel(t: { mint: string; name?: string | null; symbol?: string | null }): string {
  const name = t.name?.trim() ?? "";
  const symbol = t.symbol?.trim() ?? "";
  if (name && symbol) return `${name} ($${symbol})`;
  if (name) return name;
  if (symbol) return `$${symbol}`;
  return shortAddr(t.mint, 4);
}

/** Other listed tokens: same creator, then same tier, then the rest of the list. Hidden mints and this mint are left out. */
export function pickRelatedTokens(self: { mint: string; tier?: string; creator?: string }, rows: readonly ApiToken[], limit = 4): ApiToken[] {
  const pool = visibleOnly(rows).filter((t) => t.mint !== self.mint);
  const rank = (t: ApiToken) => (self.creator && t.creator === self.creator ? 0 : t.tier === self.tier ? 1 : 2);
  return pool
    .map((t, i) => ({ t, i, rank: rank(t) }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.t);
}

/** Guides that match this token's curve, fee and lock. Callers drop any that are not published yet. */
export function tokenGuideSlugs(t: { isMigrated?: boolean; antiSniper?: boolean; devLocked?: boolean }): string[] {
  const slugs = [
    t.isMigrated ? "meteora-damm-v2-explained-token-graduation" : "meteora-dynamic-bonding-curve-explained",
    "how-to-check-a-solana-token-before-buying",
  ];
  if (t.antiSniper) slugs.push("anti-sniper-fee-solana-token-launch");
  if (t.devLocked) slugs.push("dev-lock-token-lock-solana-explained");
  slugs.push("memecoin-creator-fees-solana-launchpad");
  return slugs;
}

/** Factual sentences for the token page. A sentence is left out when its field is missing. */
export function tokenFactSentences(t: ApiToken, description?: string | null): string[] {
  const name = t.name?.trim() ?? "";
  const symbol = t.symbol?.trim() ?? "";
  const who = name && symbol ? `${name} ($${symbol})` : name || (symbol ? `$${symbol}` : t.mint);
  const s = [`${who} launched on highbar.`];
  const desc = description?.replace(/\s+/g, " ").trim();
  if (desc && !BANNED_COPY.test(desc)) s.push(/[.!?]$/.test(desc) ? desc : `${desc}.`);
  if (t.creator?.trim()) s.push(`Creator ${shortAddr(t.creator.trim())}.`);
  if (t.createdAt > 0) s.push(`Launched ${fmtDateUtc(t.createdAt)} (UTC).`);
  if (t.isMigrated) s.push("Graduated from the Meteora DBC bonding curve to Meteora DAMM v2.");
  else if (typeof t.progress === "number" && Number.isFinite(t.progress)) {
    const pct = `${pct1(bondingPct(t))}%`;
    s.push(t.thresholdSol > 0
      ? `Trading on a Meteora DBC bonding curve, ${pct} of the way to ${t.thresholdSol} SOL.`
      : `Trading on a Meteora DBC bonding curve, ${pct} bonded.`);
  }
  if (t.tier) s.push(`Config tier: ${TIERS[t.tier]?.label ?? t.tier}.`);
  if (typeof t.antiSniper === "boolean") s.push(t.antiSniper ? "Anti-sniper fee: on." : "Anti-sniper fee: off.");
  if (t.devLocked) s.push(`${devLockStatus(t)}.`);
  if (t.mcapUsd > 0) s.push(`Market cap about ${fmtUsd(t.mcapUsd)}.`);
  return s;
}

export function tokenSummary(t: ApiToken, holders: number | null, description?: string | null): string {
  const s = tokenFactSentences(t, description);
  if (holders != null && holders > 0) s.push(`${holders.toLocaleString("en-US")} holder${holders === 1 ? "" : "s"}.`);
  return s.join(" ");
}

/** "<Name> ($TICKER) launched on highbar, a Solana launchpad built on Meteora." + short real stats, under ~155 characters. */
export function tokenDescription(t: ApiToken, holders: number | null): string {
  const head = `${tokenName(t)} ($${tokenTicker(t)}) launched on highbar, a Solana launchpad built on Meteora.`;
  const bits = [t.isMigrated ? "Graduated to DAMM v2" : `${pct1(bondingPct(t))}% bonded to ${targetSolOf(t)} SOL`, holders ? `${holders.toLocaleString("en-US")} holder${holders === 1 ? "" : "s"}` : null, t.mcapUsd > 0 ? `mcap ${fmtUsd(t.mcapUsd)}` : null].filter(Boolean) as string[];
  let out = head;
  for (const b of bits) { const next = `${out}${out === head ? " " : ", "}${b}`; if (next.length + 1 > 155) break; out = next; }
  return out === head ? out : `${out}.`;
}
export function tokenTitle(t: ApiToken) {
  // "<Name> ($TIC) | highbar Meteora Launchpad", the name cut with "…" so the whole title stays near 60 characters.
  const tic = tokenTicker(t), suffix = ` ($${tic}) | ${SITE_NAME}`;
  let name = tokenName(t);
  if (name.length + suffix.length > 60) name = `${name.slice(0, Math.max(8, 59 - suffix.length)).trimEnd()}…`;
  return `${name}${suffix}`;
}
