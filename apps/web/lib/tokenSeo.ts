/** Plain-language token facts for the SSR "About" block, meta description, JSON-LD and tokens.md. Built only from API data:
 *  a clause is left out when its number is missing, and nothing here predicts anything. */
import { fmtDateUS } from "@/lib/date";
import { TIERS, thresholdSolFor, type TierId } from "@hb/shared";
import type { ApiToken } from "./api";
import { fmtUsd } from "./format";

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

export function tokenSummary(t: ApiToken, holders: number | null): string {
  const name = tokenName(t), tic = tokenTicker(t), target = targetSolOf(t);
  const s: string[] = [`${name} ($${tic}) is a Solana memecoin launched on highbar, a Solana launchpad built on Meteora.`];
  if (t.isMigrated) s.push("It graduated from its Meteora DBC bonding curve and now trades in a Meteora DAMM v2 pool with locked liquidity.");
  else if (target > 0) s.push(`It trades on a Meteora DBC bonding curve and is ${pct1(bondingPct(t))}% of the way to graduating at ${target} SOL, when it migrates to Meteora DAMM v2.`);
  else s.push("It trades on a Meteora DBC bonding curve.");
  s.push(`It uses the ${tierLabel(t.tier)} tier${t.antiSniper ? " with the anti-sniper fee on" : ""}.`);
  const stats = [t.mcapUsd > 0 ? `a market cap of about ${fmtUsd(t.mcapUsd)}` : null, holders != null && holders > 0 ? `${holders.toLocaleString("en-US")} holder${holders === 1 ? "" : "s"}` : null].filter(Boolean);
  if (stats.length) s.push(`It has ${stats.join(" and ")}.`);
  if (t.devLocked) s.push(`The creator's tokens are in a Dev Lock (Jupiter Lock)${t.unlockAt ? ` until ${fmtDateUtc(t.unlockAt * 1000)}` : ""}.`);
  if (t.createdAt > 0) s.push(`It was created on ${fmtDateUtc(t.createdAt)}.`);
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
  const tic = tokenTicker(t), suffix = ` ($${tic}) | highbar`;
  let name = tokenName(t);
  if (name.length + suffix.length > 60) name = `${name.slice(0, Math.max(8, 59 - suffix.length))}…`;
  return `${name}${suffix}`;
}
