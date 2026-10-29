"use client";
import { TopBar } from "./TopBar";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Check, Copy, ExternalLink, Globe, Send, ShieldCheck, X as XIcon } from "lucide-react";
import { TIERS, type TierId } from "@hb/shared";
import { ArcGauge } from "./charts";
import { FeeBreakdown } from "./FeeBreakdown";
import { PriceChart } from "./PriceChart";
import { TradePanel } from "./TradePanel";
import { TierBadge, TierDot } from "./ui";
import { DevLock, LockedBadge } from "./DevLock";
import { useLocks, type LocksResp } from "@/lib/lock";
import { fmtAge, fmtSol, fmtUsd, shortAddr } from "@/lib/format";

export interface TokenViewData {
  mint: string; name: string; ticker: string; tier: TierId; antiSniper: boolean; creator: string; createdAt: number;
  mcapUsd: number; raisedSol: number; volume24hSol: number; priceSol: number; change24h: number; holders: number; now: number;
  trades: { sig: string; side: "buy" | "sell"; sol: number; tokens: number; wallet: string; ts: number; devBuy?: boolean }[];
}

function Header({ t, locks }: { t: TokenViewData; locks: LocksResp | null }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(t.mint); setCopied(true); setTimeout(() => setCopied(false), 1200); };
  return (
    <div className="col-span-12 rounded-lg border border-border bg-bg p-4">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ArrowLeft size={14} />All tokens</Link>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-ink text-sm font-semibold text-on-ink">{t.ticker.slice(0, 2)}</span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{t.name}</h1>
            <span className="num text-ink-3">${t.ticker}</span>
            <TierBadge tier={t.tier} />
            {t.antiSniper && <span title="Anti-sniper" className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-ink-2"><ShieldCheck size={13} strokeWidth={1.5} />anti-sniper</span>}
            <LockedBadge data={locks} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-ink-3">
            <button onClick={copy} className="num inline-flex items-center gap-1 hover:text-ink">{shortAddr(t.mint, 5)}{copied ? <Check size={13} /> : <Copy size={13} />}</button>
            <span className="flex items-center gap-2">
              {[Globe, XIcon, Send].map((I, i) => <a key={i} href="#" className="rounded-md border border-border p-1 hover:text-ink"><I size={13} strokeWidth={1.5} /></a>)}
            </span>
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="num text-[32px] font-semibold leading-tight">{t.priceSol.toExponential(3)}<span className="ml-1 text-sm text-ink-3">SOL</span></div>
          <div className={`num text-sm ${t.change24h >= 0 ? "text-buy" : "text-sell"}`}>{t.change24h >= 0 ? "+" : ""}{t.change24h.toFixed(2)}% 24h</div>
        </div>
      </div>
    </div>
  );
}

function Bonding({ t }: { t: TokenViewData }) {
  const target = TIERS[t.tier].migrationQuoteThresholdSol;
  const p = Math.min(1, t.raisedSol / target);
  return (
    <div className="flex flex-col items-center rounded-lg border border-border bg-surface p-4">
      <div className="mb-2 flex w-full items-center justify-between">
        <h3 className="font-semibold">Bonding progress</h3>
        {p >= 0.8 && <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-medium text-on-ink">Almost there</span>}
      </div>
      <ArcGauge value={p} />
      <div className="num -mt-6 text-kpi">{(p * 100).toFixed(1)}%</div>
      <div className="num mt-1 flex items-center gap-2 text-sm text-ink-3"><TierDot tier={t.tier} />{t.raisedSol.toFixed(1)} / {target} SOL</div>
      <div className="relative mt-4 h-1.5 w-full rounded-full bg-border">
        <div className="h-1.5 rounded-full bg-ink" style={{ width: `${p * 100}%` }} />
        {[25, 50, 75].map((m) => <span key={m} className={`absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 rounded ${p * 100 >= m ? "bg-surface" : "bg-border-strong"}`} style={{ left: `${m}%` }} />)}
      </div>
      <div className="num mt-1 flex w-full justify-between text-[10px] text-ink-3"><span>0</span><span>25</span><span>50</span><span>75</span><span>100%</span></div>
      <div className="mt-3 text-xs text-ink-3">Graduates to Meteora DAMM when full</div>
    </div>
  );
}

function Stats({ t }: { t: TokenViewData }) {
  const rows: [string, string][] = [["Market cap", fmtUsd(t.mcapUsd)], ["Holders", t.holders.toLocaleString("en-US")], ["Age", fmtAge(t.createdAt, t.now)], ["Creator", shortAddr(t.creator)], ["Volume 24h", `${fmtSol(t.volume24hSol, 1)} SOL`]];
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="mb-2 font-semibold">Stats</h3>
      <dl className="text-sm">
        {rows.map(([k, v]) => <div key={k} className="flex justify-between border-b border-border py-2 last:border-0"><dt className="text-ink-3">{k}</dt><dd className="num">{v}</dd></div>)}
      </dl>
    </div>
  );
}

function Tabs({ t }: { t: TokenViewData }) {
  const [tab, setTab] = useState<"trades" | "holders" | "info">("trades");
  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex gap-1 border-b border-border px-2">
        {(["trades", "holders", "info"] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`-mb-px border-b-2 px-3 py-3 text-sm font-medium capitalize ${tab === k ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink"}`}>{k}</button>
        ))}
      </div>
      {tab === "trades" && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="h-10 bg-muted text-xs text-ink-3">
              <th className="px-4 text-left font-medium">Time</th><th className="px-4 text-left font-medium">Type</th><th className="px-4 text-right font-medium">SOL</th>
              <th className="px-4 text-right font-medium">${t.ticker}</th><th className="px-4 text-left font-medium">Wallet</th><th className="px-4" /></tr></thead>
            <tbody>
              {t.trades.map((tr) => (
                <tr key={tr.sig} className="h-11 border-t border-border hover:bg-muted">
                  <td className="num px-4 text-ink-3">{fmtAge(tr.ts, t.now)} ago</td>
                  <td className="px-4"><span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize text-white ${tr.side === "buy" ? "bg-buy" : "bg-sell"}`}>{tr.side}</span>{tr.devBuy && <span title="Creator buy in the launch transaction (Block 0)" className="ml-1.5 rounded-full border border-ink px-2 py-0.5 text-xs font-medium">Dev</span>}</td>
                  <td className="num px-4 text-right">{tr.sol}</td>
                  <td className="num px-4 text-right">{tr.tokens.toLocaleString("en-US")}</td>
                  <td className="num px-4 text-ink-2">{shortAddr(tr.wallet)}</td>
                  <td className="px-4 text-right"><a href={`https://solscan.io/tx/${tr.sig}?cluster=devnet`} target="_blank" rel="noreferrer" className="text-ink-3 hover:text-ink"><ExternalLink size={14} /></a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === "holders" && (
        <table className="w-full text-sm"><tbody>
          {t.trades.slice(0, 8).map((tr, i) => (
            <tr key={tr.sig} className="h-11 border-t border-border first:border-0"><td className="num px-4 text-ink-3">#{i + 1}</td><td className="num px-4">{shortAddr(tr.wallet)}</td><td className="num px-4 text-right">{(12 - i * 1.3).toFixed(2)}%</td></tr>
          ))}
        </tbody></table>
      )}
      {tab === "info" && (
        <dl className="p-4 text-sm">
          {[["Mint", t.mint], ["Creator", t.creator], ["Tier", TIERS[t.tier].label], ["Anti-sniper", t.antiSniper ? "On (25% to 1% in 60s)" : "Off"], ["Graduation", `${TIERS[t.tier].migrationQuoteThresholdSol} SOL, then Meteora DAMM v2`]].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-border py-2 last:border-0"><dt className="text-ink-3">{k}</dt><dd className="num truncate">{v}</dd></div>
          ))}
        </dl>
      )}
    </div>
  );
}

export function TokenView({ t }: { t: TokenViewData }) {
  const [sheet, setSheet] = useState<null | "buy" | "sell">(null);
  const locks = useLocks(t.mint);
  const panel = (side: "buy" | "sell" = "buy", bare = false) => <TradePanel mint={t.mint} ticker={t.ticker} tier={t.tier} antiSniper={t.antiSniper} priceSol={t.priceSol} initialSide={side} bare={bare} />;
  return (
    <div className="grid grid-cols-12 gap-4 pb-20 md:pb-0">
      <div className="col-span-12"><TopBar /></div>
      <Header t={t} locks={locks.data} />
      {/* tablet: right column under header (trade first); desktop: right 4 cols sticky */}
      <aside className="col-span-12 lg:order-last lg:col-span-4 lg:min-w-[360px]">
        <div className="grid gap-4 md:grid-cols-2 lg:sticky lg:top-20 lg:grid-cols-1">
          <div className="hidden md:block">{panel()}</div>
          <DevLock mint={t.mint} ticker={t.ticker} creator={t.creator} data={locks.data} reload={locks.reload} />
          <Bonding t={t} />
          <FeeBreakdown tier={t.tier} />
          <Stats t={t} />
        </div>
      </aside>
      <section className="col-span-12 flex flex-col gap-4 lg:col-span-8">
        <PriceChart mint={t.mint} className="h-[300px] md:h-[420px]" />
        <Tabs t={t} />
      </section>
      {/* mobile sticky actions + bottom sheet */}
      <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 gap-2 border-t border-border bg-surface p-3 md:hidden">
        <button onClick={() => setSheet("buy")} className="h-12 rounded-md bg-buy font-semibold text-white">Buy</button>
        <button onClick={() => setSheet("sell")} className="h-12 rounded-md bg-sell font-semibold text-white">Sell</button>
      </div>
      {sheet && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSheet(null)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-4">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border-strong" />
            {panel(sheet, true)}
          </div>
        </div>
      )}
    </div>
  );
}