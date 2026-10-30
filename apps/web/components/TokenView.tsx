"use client";
import { TopBar } from "./TopBar";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowLeft, Check, Copy, ExternalLink, Globe, Send, ShieldCheck, X as XIcon } from "lucide-react";
import { TIERS, type TierId } from "@hb/shared";
import { FeeBreakdown } from "./FeeBreakdown";
import dynamic from "next/dynamic";
import { ChartSkeleton } from "./ui/Skeleton";
const PriceChart = dynamic(() => import("./PriceChart").then((m) => m.PriceChart), { ssr: false, loading: () => <ChartSkeleton /> });
import { TradePanel } from "./TradePanel";
import { TokenLogo } from "./TokenLogo";
import { Price, TierBadge } from "./ui";
import { DeltaPill } from "./StatsPanel";
import { DevLock, LockedBadge } from "./DevLock";
import { DevLockedBadge } from "./DevLockedBadge";
import { ScoreBadge } from "./ScoreBadge";
import { ScoreCard } from "./ScoreCard";
import { explorerTx } from "@/lib/settings";
import { useLocks, type LocksResp } from "@/lib/lock";
import { fmtAge, fmtSol, fmtUsd, shortAddr } from "@/lib/format";

export interface TokenViewData {
  mint: string; name: string; ticker: string; tier: TierId; antiSniper: boolean; creator: string; createdAt: number;
  mcapUsd: number; raisedSol: number; volume24hSol: number; priceSol: number; priceUsd?: number; image?: string | null; change24h: number; holders: number; now: number; devLocked?: boolean; unlockAt?: number | null; score?: number | null;
  trades: { sig: string; side: "buy" | "sell"; sol: number; tokens: number; wallet: string; ts: number; devBuy?: boolean }[];
}


/** Identity on the left (logo, name, ticker, badges, mint), price + 24h change on the right. No card chrome. */
function Header({ t, locks }: { t: TokenViewData; locks: LocksResp | null }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(t.mint); setCopied(true); setTimeout(() => setCopied(false), 1200); };
  return (
    <header data-testid="token-header">
      <Link href="/" className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink"><ArrowLeft size={14} />All tokens</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          <TokenLogo src={t.image} name={t.ticker} size={48} radius={12} />
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight md:text-2xl">{t.name}</h1>
              <span className="num shrink-0 text-sm text-ink-3">${t.ticker}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-ink-3">
              <TierBadge tier={t.tier} />
              {t.antiSniper && <span title="Anti-sniper" className="inline-flex items-center gap-1"><ShieldCheck size={12} strokeWidth={1.75} />anti-sniper</span>}
              {t.devLocked ? <span data-testid="locked-badge"><DevLockedBadge devLocked unlockAt={t.unlockAt} /></span> : <LockedBadge data={locks} />}
              <ScoreBadge score={t.score} />
              <span className="flex items-center"><Addr t={t} copied={copied} copy={copy} /></span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <div data-testid="token-price" className="flex items-baseline gap-1.5"><span className="num text-2xl font-semibold leading-none tracking-tight md:text-3xl"><Price v={t.priceSol} /></span><span className="text-sm text-ink-3">SOL</span></div>
          <div className="flex items-center gap-2">
            {t.priceUsd != null && <span data-testid="token-price-usd" className="num text-xs text-ink-3"><Price v={t.priceUsd} prefix="$" /></span>}
            <DeltaPill v={t.change24h} />
            <span className="text-[11px] text-ink-3">24h</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function Addr({ t, copied, copy }: { t: TokenViewData; copied: boolean; copy: () => void }) {
  return (
    <>
      <button type="button" onClick={copy} aria-label="Copy address" className="num inline-flex h-7 items-center gap-1 rounded-md pr-1.5 hover:bg-muted hover:text-ink">{shortAddr(t.mint, 5)}{copied ? <Check size={12} /> : <Copy size={12} />}</button>
      {([[Globe, "Website"], [XIcon, "X"], [Send, "Telegram"]] as const).map(([I, l]) => <a key={l} href="#" aria-label={l} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-3 hover:bg-muted hover:text-ink"><I size={13} strokeWidth={1.5} /></a>)}
    </>
  );
}

const bondingOf = (t: TokenViewData) => { const target = TIERS[t.tier].migrationQuoteThresholdSol; return { target, p: target > 0 ? Math.min(1, t.raisedSol / target) : 0 }; };
const dash = (v: number | null | undefined, f: (n: number) => string) => (v == null || !Number.isFinite(v) ? "–" : f(v));

/** One compact six-stat row (3 columns on mobile). Missing values show a dash. */
function StatRow({ t, holders }: { t: TokenViewData; holders: number }) {
  const { p } = bondingOf(t);
  const cells: [string, ReactNode][] = [
    ["Market cap", dash(t.mcapUsd, fmtUsd)],
    ["Volume 24h", dash(t.volume24hSol, (v) => `${fmtSol(v, 1)} SOL`)],
    ["Holders", holders.toLocaleString("en-US")],
    ["Age", t.createdAt ? fmtAge(t.createdAt, t.now) : "–"],
    ["Creator", t.creator ? shortAddr(t.creator) : "–"],
    ["Bonding", <><span key="v">{(p * 100).toFixed(1)}%</span><span key="b" className="mt-1.5 block h-1 rounded-full bg-border"><span className="block h-1 rounded-full bg-ink" style={{ width: `${p * 100}%` }} /></span></>],
  ];
  return (
    <dl data-testid="token-stats" className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-6">
      {cells.map(([k, v]) => (
        <div key={k} className="min-w-0 bg-surface px-3 py-2.5 md:px-4 md:py-3">
          <dt className="text-xs text-ink-3">{k}</dt>
          <dd className="num mt-0.5 truncate text-sm font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function BondingCard({ t }: { t: TokenViewData }) {
  const { target, p } = bondingOf(t);
  return (
    <div data-testid="bonding-card" className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Bonding progress</span>
        <span className="num text-ink-3">{t.raisedSol.toFixed(1)} / {target} SOL</span>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-border"><div className="h-1.5 rounded-full bg-ink" style={{ width: `${p * 100}%` }} /></div>
      <p className="mt-2 text-xs text-ink-3">{p >= 1 ? "Target reached: graduates to Meteora DAMM v2." : `Graduates to Meteora DAMM v2 at ${target} SOL.`}</p>
    </div>
  );
}

function holderRows(trades: TokenViewData["trades"]) {
  const net = new Map<string, number>();
  for (const tr of trades) net.set(tr.wallet, (net.get(tr.wallet) ?? 0) + (tr.side === "buy" ? tr.tokens : -tr.tokens));
  const rows = [...net].filter(([, n]) => n > 1e-6).sort((a, b) => b[1] - a[1]);
  const total = rows.reduce((s, [, n]) => s + n, 0);
  return rows.map(([wallet, tokens]) => ({ wallet, tokens, pct: total ? (tokens / total) * 100 : 0 }));
}


type TabId = "trades" | "holders" | "score" | "fees" | "lock" | "info";
const TAB_LABEL: Record<TabId, string> = { trades: "Trades", holders: "Holders", score: "Score", fees: "Fees", lock: "Dev lock", info: "Info" };

/** Secondary info lives in tabs under the chart instead of a stack of side cards. */
function DetailTabs({ t, locks, reloadLocks }: { t: TokenViewData; locks: LocksResp | null; reloadLocks: () => void }) {
  const holders = holderRows(t.trades);
  const [tab, setTab] = useState<TabId>("trades");
  return (
    <section data-testid="token-tabs">
      <div role="tablist" className="no-scrollbar flex gap-5 overflow-x-auto border-b border-border">
        {(Object.keys(TAB_LABEL) as TabId[]).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`-mb-px whitespace-nowrap border-b-2 pb-2.5 pt-1 text-sm transition-colors ${tab === k ? "border-ink font-medium text-ink" : "border-transparent text-ink-3 hover:text-ink"}`}>{TAB_LABEL[k]}</button>
        ))}
      </div>
      <div className="pt-3">
        {tab === "trades" && (t.trades.length === 0 ? <p className="py-6 text-sm text-ink-3">No trades yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="h-10 text-xs text-ink-3">
              <th className="pl-0 pr-4 text-left font-medium">Time</th><th className="px-4 text-left font-medium">Type</th><th className="px-4 text-right font-medium">SOL</th>
              <th className="px-4 text-right font-medium">${t.ticker}</th><th className="px-4 text-left font-medium">Wallet</th><th className="px-4" /></tr></thead>
            <tbody>
              {t.trades.map((tr) => (
                <tr key={tr.sig} className="h-11 border-t border-border hover:bg-muted">
                  <td className="num pl-0 pr-4 text-ink-3">{fmtAge(tr.ts, t.now)} ago</td>
                  <td className="px-4"><span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize text-white ${tr.side === "buy" ? "bg-buy" : "bg-sell"}`}>{tr.side}</span>{tr.devBuy && <span title="Creator buy in the launch transaction (Block 0)" className="ml-1.5 rounded-full border border-ink px-2 py-0.5 text-xs font-medium">Dev</span>}</td>
                  <td className="num px-4 text-right">{tr.sol}</td>
                  <td className="num px-4 text-right">{tr.tokens.toLocaleString("en-US")}</td>
                  <td className="num px-4 text-ink-2">{shortAddr(tr.wallet)}</td>
                  <td className="px-4 text-right"><a href={explorerTx(tr.sig.split(":")[0])} target="_blank" rel="noreferrer" className="text-ink-3 hover:text-ink"><ExternalLink size={14} /></a></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        ))}
        {tab === "holders" && (
          <div>
          {holders.length === 0 ? <p className="px-4 py-6 text-sm text-ink-3">No holders yet.</p> : (
        <table className="w-full text-sm"><tbody>
          {holders.map((h, i) => (
            <tr key={h.wallet} className="h-11 border-t border-border first:border-0"><td className="num pl-0 pr-4 text-ink-3">#{i + 1}</td><td className="num px-4">{shortAddr(h.wallet)}</td><td className="num px-4 text-right">{h.tokens.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td><td className="num px-4 text-right text-ink-3">{h.pct.toFixed(1)}%</td></tr>
          ))}
        </tbody></table>)}
          </div>
        )}
        {tab === "score" && <ScoreCard mint={t.mint} />}
        {tab === "fees" && <FeeBreakdown tier={t.tier} />}
        {tab === "lock" && <DevLock mint={t.mint} ticker={t.ticker} creator={t.creator} data={locks} reload={reloadLocks} />}
        {tab === "info" && (
          <dl className="py-2 text-sm">
          {[["Mint", t.mint], ["Creator", t.creator], ["Tier", TIERS[t.tier].label], ["Anti-sniper", t.antiSniper ? "On (25% to 1% in 60s)" : "Off"], ["Graduation", `${TIERS[t.tier].migrationQuoteThresholdSol} SOL, then Meteora DAMM v2`]].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-border py-2 last:border-0"><dt className="text-ink-3">{k}</dt><dd className="num truncate">{v}</dd></div>
          ))}
        </dl>
        )}
      </div>
    </section>
  );
}

export function TokenView({ t }: { t: TokenViewData }) {
  const [sheet, setSheet] = useState<null | "buy" | "sell">(null);
  const locks = useLocks(t.mint);
  const holderCount = holderRows(t.trades).length;
  const panel = (side: "buy" | "sell" = "buy", bare = false) => <TradePanel mint={t.mint} ticker={t.ticker} tier={t.tier} antiSniper={t.antiSniper} priceSol={t.priceSol} initialSide={side} bare={bare} />;
  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-0">
      <TopBar />
      <Header t={t} locks={locks.data} />
      <StatRow t={t} holders={holderCount} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <PriceChart mint={t.mint} className="h-[300px] min-w-0 md:h-[440px] lg:col-start-1 lg:row-start-1" />
        {/* trade panel + bonding: right column on lg, between chart and tabs on md, sticky Buy/Sell on mobile */}
        <aside className="hidden md:block lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="grid gap-4 md:grid-cols-2 lg:sticky lg:top-20 lg:grid-cols-1">
            {panel()}
            <BondingCard t={t} />
          </div>
        </aside>
        <div className="min-w-0 lg:col-start-1 lg:row-start-2"><DetailTabs t={t} locks={locks.data} reloadLocks={locks.reload} /></div>
      </div>
      {/* mobile sticky actions + bottom sheet */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 grid grid-cols-2 gap-2 border-t border-border bg-surface p-3 md:hidden">
        <button onClick={() => setSheet("buy")} className="h-12 rounded-md bg-buy font-semibold text-white">Buy</button>
        <button onClick={() => setSheet("sell")} className="h-12 rounded-md bg-sell font-semibold text-white">Sell</button>
      </div>
      {sheet && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="hb-scrim absolute inset-0" onClick={() => setSheet(null)} />
          <div className="absolute inset-x-0 bottom-0 hb-sheet max-h-[85vh] overflow-y-auto rounded-t-[20px] border-t border-border bg-surface p-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border-strong" />
            {panel(sheet, true)}
          </div>
        </div>
      )}
    </div>
  );
}