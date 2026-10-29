import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { TIERS } from "@hb/shared";
import { TopBlock } from "@/components/TopBar";
import { ArcGauge, LineChart } from "@/components/charts";
import { FeeBreakdown } from "@/components/FeeBreakdown";
import { TradePanel } from "@/components/TradePanel";
import { Avatar, Card, TierBadge, TierDot } from "@/components/ui";
import { NOW_TS, TOKENS, findToken, pricesFor, progressOf, tradesFor } from "@/lib/mock";
import { fmtAge, fmtSol, fmtUsd, shortAddr } from "@/lib/format";

export function generateStaticParams() {
  return TOKENS.map((t) => ({ mint: t.mint }));
}

export default async function TokenPage({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  const t = findToken(mint);
  if (!t) notFound();
  const p = progressOf(t);
  const target = TIERS[t.tier].migrationQuoteThresholdSol;
  const prices = pricesFor(t.mint);
  const trades = tradesFor(t.mint);
  return (
    <div className="flex flex-col gap-4">
      <TopBlock>
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ArrowLeft size={14} />All tokens</Link>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <Avatar name={t.name} size={56} />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{t.name}</h1>
              <span className="num text-ink-3">${t.ticker}</span>
              <TierBadge tier={t.tier} />
              {t.antiSniper && <span className="inline-flex items-center gap-1 text-xs text-ink-2"><ShieldCheck size={14} strokeWidth={1.5} />anti-sniper</span>}
            </div>
            <div className="num mt-1 text-sm text-ink-3">{shortAddr(t.mint, 6)} · creator {shortAddr(t.creator)} · {fmtAge(t.createdAt, NOW_TS)} ago</div>
          </div>
          <div className="ml-auto flex gap-10">
            <div><div className="num text-xl font-semibold">{fmtUsd(t.mcapUsd)}</div><div className="text-[13px] text-ink-3">Market cap</div></div>
            <div><div className="num text-xl font-semibold">{fmtSol(t.volume24hSol, 1)} SOL</div><div className="text-[13px] text-ink-3">Volume 24h</div></div>
          </div>
        </div>
      </TopBlock>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <Card>
            <div className="mb-2 flex justify-between"><h3 className="font-semibold">Price</h3><span className="num text-sm text-ink-3">{prices[prices.length - 1].toExponential(3)} SOL</span></div>
            <LineChart values={prices} />
          </Card>
          <Card className="p-0">
            <h3 className="border-b border-border px-4 py-3 font-semibold">Recent trades</h3>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-xs text-ink-3">
                <th className="px-4 py-2 text-left font-medium">Side</th><th className="px-4 py-2 text-right font-medium">SOL</th>
                <th className="px-4 py-2 text-right font-medium">{t.ticker}</th><th className="px-4 py-2 text-left font-medium">Wallet</th>
                <th className="px-4 py-2 text-right font-medium">Time</th><th className="px-4 py-2" /></tr></thead>
              <tbody>
                {trades.map((tr) => (
                  <tr key={tr.sig} className="border-b border-border last:border-0 hover:bg-muted">
                    <td className={`px-4 py-2 font-medium capitalize ${tr.side === "buy" ? "text-buy" : "text-sell"}`}>{tr.side}</td>
                    <td className="num px-4 py-2 text-right">{tr.sol}</td>
                    <td className="num px-4 py-2 text-right">{tr.tokens.toLocaleString("en-US")}</td>
                    <td className="num px-4 py-2 text-ink-2">{shortAddr(tr.wallet)}</td>
                    <td className="num px-4 py-2 text-right text-ink-3">{fmtAge(tr.ts, NOW_TS)}</td>
                    <td className="px-4 py-2 text-right"><a href={`https://explorer.solana.com/tx/${tr.sig}?cluster=devnet`} target="_blank" rel="noreferrer" className="text-ink-3 hover:text-ink"><ExternalLink size={14} /></a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          <TradePanel ticker={t.ticker} tier={t.tier} antiSniper={t.antiSniper} />
          <Card className="flex flex-col items-center">
            <h3 className="mb-2 self-start font-semibold">Bonding progress</h3>
            <ArcGauge value={p} />
            <div className="num -mt-6 text-kpi">{Math.round(p * 100)}%</div>
            <div className="num mt-1 flex items-center gap-2 text-sm text-ink-3"><TierDot tier={t.tier} />{fmtSol(t.raisedSol, 1)} / {target} SOL</div>
          </Card>
          <FeeBreakdown tier={t.tier} />
        </div>
      </div>
    </div>
  );
}