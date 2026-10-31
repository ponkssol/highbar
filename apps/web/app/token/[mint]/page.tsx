import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { cache } from "react";
import { TokenView } from "@/components/TokenView";
import { TokenAbout } from "@/components/TokenAbout";
import { JsonLd } from "@/components/JsonLd";
import { getScore, getToken, getTrades, REVALIDATE_S } from "@/lib/seoData";
import { absUrl, breadcrumbJsonLd, pageMeta } from "@/lib/seo";
import { tokenDescription, tokenName, tokenSummary, tokenTicker, tokenTitle } from "@/lib/tokenSeo";
import { fetchPending, visitorIp } from "@/lib/pendingToken";
import { TokenPending } from "./TokenPending";
import { isHiddenToken } from "@/lib/hiddenTokens";

// API reads are cached for REVALIDATE_S (lib/seoData); the root layout renders per request (runtime env), so this is ISR at the data layer.
export const revalidate = 60;

type Params = { params: Promise<{ mint: string }>; searchParams: Promise<{ new?: string | string[] }> };
/** An address the API has no token row for gets the TokenPending state (noindex, polls until the row lands) instead of a 404 when
 *  - it is /token/<mint>?new=1, the launch page's redirect right after the tx confirms, or
 *  - GET /tokens/:mint/pending (server-side, short timeout) says our pool for it is on-chain ("pending"), or cannot tell right now
 *    ("retry": timeout / rate limit), so a fresh mint never 404s on a shared link, a refresh or another visitor's first load.
 *  Only "unknown" (no pool of ours on-chain) is a 404. middleware.ts makes the same call first (the API caches the answer per mint). */
const isAddress = (s: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
/** One pending check per request, shared by generateMetadata and the page. */
const pendingState = cache(async (mint: string) => fetchPending(mint, visitorIp(await headers())));
const showPending = async (mint: string, sp: Params["searchParams"]) =>
  isAddress(mint) && ((await sp).new === "1" || (await pendingState(mint)) !== "unknown");

/** Holder count: the API's live count (GET /tokens/:mint/score breakdown.holders); unique net-positive wallets in the last trades as a fallback. */
function tradeHolders(trades: { wallet: string; side: "buy" | "sell"; tokens: number }[]) {
  const net = new Map<string, number>();
  for (const tr of trades) net.set(tr.wallet, (net.get(tr.wallet) ?? 0) + (tr.side === "buy" ? tr.tokens : -tr.tokens));
  return [...net.values()].filter((n) => n > 1e-6).length;
}
async function load(mint: string) {
  const live = await getToken(mint);
  if (!live) return null;
  const [trades, score] = await Promise.all([getTrades(mint), getScore(mint)]);
  const tr = trades ?? [];
  const apiHolders = score?.breakdown?.holders;
  return { live, trades: tr, holders: typeof apiHolders === "number" ? apiHolders : tradeHolders(tr), holdersFromApi: typeof apiHolders === "number" };
}

export async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
  const { mint } = await params;
  const d = await load(mint);
  if (!d) return { title: { absolute: (await showPending(mint, searchParams)) ? "Indexing token | highbar" : "Token not found | highbar" }, robots: { index: false, follow: true } };
  const t = d.live;
  return pageMeta({
    absoluteTitle: tokenTitle(t), description: tokenDescription(t, d.holders), path: `/token/${t.mint}`, images: false,
    keywords: [`${tokenName(t)} token`, `$${tokenTicker(t)}`, `${tokenTicker(t)} Solana`, t.mint],
    noindex: isHiddenToken(t), // hidden test token: the page works by direct link but stays out of search engines
  });
}

export default async function TokenPage({ params, searchParams }: Params) {
  const { mint } = await params;
  // Real data from the API (server-side, API_URL); unknown mint -> 404 (middleware.ts sets the status before streaming),
  // except a fresh on-chain mint the indexer is still catching up on (?new=1 or the pending check), see showPending.
  const d = await load(mint);
  if (!d) {
    if (await showPending(mint, searchParams)) return <TokenPending mint={mint} fresh={(await searchParams).new === "1"} />;
    notFound();
  }
  const { live, trades } = d;
  const name = tokenName(live), ticker = tokenTicker(live);
  const prevPrice = trades.length > 1 ? trades[trades.length - 1].sol / Math.max(1e-9, trades[trades.length - 1].tokens) : live.priceSol;
  // Header price = the last trade's price, the same number the chart's last candle closes at.
  const lastTrade = trades.length ? trades[0] : null;
  const lastPrice = lastTrade && lastTrade.tokens > 0 ? lastTrade.sol / lastTrade.tokens : null;
  const shownPrice = lastPrice ?? live.priceSol;
  const summary = tokenSummary(live, d.holders);
  const url = absUrl(`/token/${live.mint}`);
  const ld = [
    { "@context": "https://schema.org", "@type": "WebPage", "@id": url, url, name: `${name} ($${ticker})`, description: tokenDescription(live, d.holders),
      ...(live.createdAt > 0 ? { dateCreated: new Date(live.createdAt).toISOString() } : {}), isPartOf: { "@id": absUrl("/#website") },
      about: { "@type": "Thing", name, alternateName: `$${ticker}`, identifier: live.mint, url, ...(live.image ? { image: live.image } : {}), description: summary } },
    breadcrumbJsonLd([["Home", "/"], ["Tokens", "/leaderboard"], [`${name} ($${ticker})`, `/token/${live.mint}`]]),
  ];
  return (
    <>
      <JsonLd data={ld} />
      <TokenView about={<TokenAbout t={live} holders={d.holders} summary={summary} />} t={{
        mint: live.mint, pool: live.pool || undefined, name, ticker, image: live.image ?? null, tier: live.tier, antiSniper: live.antiSniper,
        creator: live.creator, createdAt: live.createdAt, mcapUsd: live.mcapUsd, raisedSol: live.quoteReserveSol, thresholdSol: live.thresholdSol || undefined, volume24hSol: live.volume24hSol,
        priceSol: shownPrice, priceUsd: live.mcapSol > 0 ? (shownPrice * live.mcapUsd) / live.mcapSol : undefined, change24h: prevPrice ? ((shownPrice - prevPrice) / prevPrice) * 100 : 0,
        holders: d.holders, now: Date.now(), devLocked: !!live.devLocked, unlockAt: live.unlockAt ?? null, official: !!live.official, isMigrated: !!live.isMigrated, links: live.links ?? {}, score: live.score ?? null,
        trades: trades.map(({ sig, side, sol, tokens, wallet, ts, devBuy }) => ({ sig, side, sol, tokens, wallet, ts, devBuy: !!devBuy })),
      }} />
    </>
  );
}