import { notFound } from "next/navigation";
import { TokenView } from "@/components/TokenView";
import { api } from "@/lib/api";
import { NOW_TS, findToken, pricesFor, tradesFor } from "@/lib/mock";

export const dynamic = "force-dynamic";

export default async function TokenPage({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  // Real data from the API (server-side, API_URL); fall back to mock tokens if the API is down or mint unknown.
  const live = await api.token(mint).catch(() => null);
  if (live) {
    const trades = await api.trades(mint).catch(() => []);
    const holders = new Set(trades.map((x) => x.wallet)).size;
    const prevPrice = trades.length > 1 ? trades[trades.length - 1].sol / Math.max(1e-9, trades[trades.length - 1].tokens) : live.priceSol;
    return (
      <TokenView t={{
        mint: live.mint, name: live.name || live.mint.slice(0, 6), ticker: live.symbol || "?", tier: live.tier, antiSniper: live.antiSniper,
        creator: live.creator, createdAt: live.createdAt, mcapUsd: live.mcapUsd, raisedSol: live.quoteReserveSol, volume24hSol: live.volume24hSol,
        priceSol: live.priceSol, change24h: prevPrice ? ((live.priceSol - prevPrice) / prevPrice) * 100 : 0,
        holders, now: Date.now(), trades: trades.map(({ sig, side, sol, tokens, wallet, ts, devBuy }) => ({ sig, side, sol, tokens, wallet, ts, devBuy: !!devBuy })),
      }} />
    );
  }
  const t = findToken(mint);
  if (!t) notFound();
  const prices = pricesFor(t.mint);
  const last = prices[prices.length - 1], prev = prices[Math.max(0, prices.length - 25)];
  const holders = 40 + ([...t.mint].reduce((a, c) => a + c.charCodeAt(0), 0) % 900);
  return (
    <TokenView t={{
      mint: t.mint, name: t.name, ticker: t.ticker, tier: t.tier, antiSniper: t.antiSniper, creator: t.creator, createdAt: t.createdAt,
      mcapUsd: t.mcapUsd, raisedSol: t.raisedSol, volume24hSol: t.volume24hSol, priceSol: last, change24h: ((last - prev) / prev) * 100,
      holders, now: NOW_TS, trades: tradesFor(t.mint),
    }} />
  );
}