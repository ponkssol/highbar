import { notFound } from "next/navigation";
import { TokenView } from "@/components/TokenView";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function TokenPage({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  // Real data from the API (server-side, API_URL); unknown mint -> 404.
  const live = await api.token(mint).catch(() => null);
  if (live) {
    const trades = await api.trades(mint).catch(() => []);
    const holders = new Set(trades.map((x) => x.wallet)).size;
    const prevPrice = trades.length > 1 ? trades[trades.length - 1].sol / Math.max(1e-9, trades[trades.length - 1].tokens) : live.priceSol;
    return (
      <TokenView t={{
        mint: live.mint, pool: live.pool || undefined, name: live.name || live.mint.slice(0, 6), ticker: live.symbol || "?", image: live.image ?? null, tier: live.tier, antiSniper: live.antiSniper,
        creator: live.creator, createdAt: live.createdAt, mcapUsd: live.mcapUsd, raisedSol: live.quoteReserveSol, thresholdSol: live.thresholdSol || undefined, volume24hSol: live.volume24hSol,
        priceSol: live.priceSol, priceUsd: live.mcapSol > 0 ? (live.priceSol * live.mcapUsd) / live.mcapSol : undefined, change24h: prevPrice ? ((live.priceSol - prevPrice) / prevPrice) * 100 : 0,
        holders, now: Date.now(), devLocked: !!live.devLocked, unlockAt: live.unlockAt ?? null, official: !!live.official, isMigrated: !!live.isMigrated, links: live.links ?? {}, score: live.score ?? null, trades: trades.map(({ sig, side, sol, tokens, wallet, ts, devBuy }) => ({ sig, side, sol, tokens, wallet, ts, devBuy: !!devBuy })),
      }} />
    );
  }
  notFound();
}