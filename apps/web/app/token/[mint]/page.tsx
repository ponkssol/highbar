import { notFound } from "next/navigation";
import { TokenView } from "@/components/TokenView";
import { NOW_TS, TOKENS, findToken, pricesFor, tradesFor } from "@/lib/mock";

export function generateStaticParams() {
  return TOKENS.map((t) => ({ mint: t.mint }));
}

export default async function TokenPage({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
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