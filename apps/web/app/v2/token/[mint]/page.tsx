import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { V2TokenPage } from "@/components/v2/TokenPage";
import { getScore, getToken, getTrades } from "@/lib/seoData";
import { fetchPending, visitorIp } from "@/lib/pendingToken";
import { tokenMetadataDescription } from "@/lib/tokenMeta";
import { tokenName, tokenTicker } from "@/lib/tokenSeo";

type Params = { params: Promise<{ mint: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { mint } = await params;
  const t = await getToken(mint);
  return { title: t ? `${tokenName(t)} ($${tokenTicker(t)})` : "Token" };
}

export default async function Page({ params }: Params) {
  const { mint } = await params;
  const live = await getToken(mint);
  if (!live) {
    const pending = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint) && (await fetchPending(mint, visitorIp(await headers()))) !== "unknown";
    if (pending) return <div className="frame"><div className="phead"><div><div className="bul">Indexing</div><h1 className="h1">This token is <span>still landing.</span></h1><p className="muted">The launch is on-chain. The index has not written the row yet. Refresh in a moment.</p></div></div></div>;
    notFound();
  }
  const [trades, score, description] = await Promise.all([getTrades(mint), getScore(mint), tokenMetadataDescription(live.uri)]);
  const tr = trades ?? [];
  const last = tr[0];
  const prev = tr.length > 1 ? tr[tr.length - 1] : null;
  const shown = last && last.tokens > 0 ? last.sol / last.tokens : live.priceSol;
  const prevPrice = prev && prev.tokens > 0 ? prev.sol / prev.tokens : shown;
  const holders = typeof score?.breakdown?.holders === "number" ? score.breakdown.holders : 0;
  return (
    <V2TokenPage t={{
      mint: live.mint, pool: live.pool || undefined, name: tokenName(live), ticker: tokenTicker(live), image: live.image ?? null,
      tier: live.tier, antiSniper: live.antiSniper, creator: live.creator, createdAt: live.createdAt, mcapUsd: live.mcapUsd,
      raisedSol: live.quoteReserveSol, thresholdSol: live.thresholdSol || undefined, volume24hSol: live.volume24hSol,
      priceSol: shown, priceUsd: live.mcapSol > 0 ? (shown * live.mcapUsd) / live.mcapSol : undefined,
      change24h: prevPrice ? ((shown - prevPrice) / prevPrice) * 100 : 0, holders, devLocked: !!live.devLocked,
      isMigrated: !!live.isMigrated, description: description || "", links: live.links ?? {}, score: live.score ?? score?.score ?? null,
      trades: tr.map(({ sig, side, sol, tokens, wallet, ts, devBuy }) => ({ sig, side, sol, tokens, wallet, ts, devBuy: !!devBuy })),
    }} />
  );
}
