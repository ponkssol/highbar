/** Text for /llms.txt (llmstxt.org format) and /tokens.md. Facts come from @hb/shared and the API only. */
import { ANTI_SNIPER_SCHEDULE, MAINNET_THRESHOLD_SOL, TIERS, scheduleDurationSeconds, scheduleEndFeeBps, type TierId } from "@hb/shared";
import type { ApiToken } from "./api";
import { X_URL } from "./seo";
import { bondingPct, migrationStatus, pct1, targetSolOf, tierLabel, tokenName, tokenTicker } from "./tokenSeo";

const IDS = Object.keys(TIERS) as TierId[];
const pct = (bps: number) => `${(bps / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
export const TEXT_HEADERS = (type: string) => ({ "content-type": `${type}; charset=utf-8`, "cache-control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300" });

export function llmsTxt(site: string) {
  const u = (p: string) => `${site}${p}`;
  const S = ANTI_SNIPER_SCHEDULE;
  return `# highbar

> highbar is a Solana token launchpad built on Meteora. Every token launches on a Meteora DBC (Dynamic Bonding Curve) and graduates to a Meteora DAMM v2 pool with permanently locked liquidity once the curve reaches its tier target.

Mint addresses of tokens launched on highbar end in "high". Every token has a fixed supply of 1,000,000,000, 6 decimals, mint authority off and immutable metadata.

## Features

- Tiers: ${IDS.map((id) => `${TIERS[id].label} graduates at ${MAINNET_THRESHOLD_SOL[id]} SOL`).join(", ")}.
- Bonding curve: Meteora DBC, migrating to Meteora DAMM v2 at the tier target.
- Anti-sniper fee (optional, off by default): the trading fee starts at ${pct(S.cliffFeeBps)} and falls to about ${pct(scheduleEndFeeBps(S))} within ${scheduleDurationSeconds(S)} seconds.
- Dev Lock: creators can lock their own tokens with Jupiter Lock; locks cannot be cancelled and every lock has a public page.
- Creator LP rebate: after migration the platform forwards part of its DAMM v2 LP fees to the token's creator.
- $HIGHER cashback: traders earn cashback on trades made on highbar (paid in SOL until $HIGHER launches).
- $HIGHER buyback and burn (soon): part of the platform's net income will buy $HIGHER and burn it on-chain. No returns are promised.

## Key pages

- [Home: all tokens](${u("/")}): live token list and platform stats
- [Launch a token](${u("/launch")}): create a token on a Meteora DBC bonding curve
- [Leaderboard](${u("/leaderboard")}): top tokens, creators and traders
- [Dev token locks](${u("/locks")}): every creator Dev Lock (Jupiter Lock)
- [Token list (Markdown)](${u("/tokens.md")}): every token with mint, tier, status and launch date
- Token pages: ${u("/token/<mint>")}

## Docs

- [How highbar works](${u("/docs")}): tiers and fees, the bonding curve and migration, anti-sniper fee, Dev Lock, creator fees, LP rebate, cashback, buyback and burn, referrals, token supply, FAQ
- [Full docs as Markdown](${u("/llms-full.txt")})
- [API docs](${u("/docs/api")}): coming soon

## Optional

- [Terms and Conditions](${u("/terms")})
- [highbar on X](${X_URL})
`;
}

const cell = (s: string) => s.replace(/[|\r\n]+/g, " ").trim();
export function tokensMd(site: string, tokens: ApiToken[] | null) {
  const head = `# Tokens on highbar\n\nEvery token launched on highbar, a Solana token launchpad built on Meteora. Newest first. Updated about every minute.\n\n`;
  if (!tokens) return `${head}The token list is unavailable right now. Try again in a minute.\n`;
  const rows = tokens.map((t) => `| ${cell(tokenName(t))} | $${cell(tokenTicker(t))} | \`${t.mint}\` | ${site}/token/${t.mint} | ${tierLabel(t.tier)} (${targetSolOf(t)} SOL) | ${t.isMigrated ? migrationStatus(t) : `Bonding curve, ${pct1(bondingPct(t))}%`} | ${t.createdAt ? new Date(t.createdAt).toISOString().slice(0, 10) : "-"} |`);
  return `${head}${tokens.length} token${tokens.length === 1 ? "" : "s"}.\n\n| Name | Ticker | Mint | URL | Tier | Status | Created (UTC) |\n| --- | --- | --- | --- | --- | --- | --- |\n${rows.join("\n")}\n`;
}
