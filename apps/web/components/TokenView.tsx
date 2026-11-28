"use client";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ExternalLink, Globe, Send, X as XIcon } from "lucide-react";
import { TIERS, thresholdSolFor, type TierId } from "@hb/shared";
import { FeeBreakdown } from "./FeeBreakdown";
import dynamic from "next/dynamic";
import { ChartSkeleton } from "./ui/Skeleton";
const PriceChart = dynamic(() => import("./PriceChart").then((m) => m.PriceChart), { ssr: false, loading: () => <ChartSkeleton /> });
import { TradePanel } from "./TradePanel";
import { Price } from "./ui";
import { InfoTip } from "./InfoTip";
import { SolAmt, SolHead } from "./Sol";
import { Stacked, StackedItem } from "./ui/Stacked";
import { DevLock, DevLockButton } from "./DevLock";
import { TabPanels, useUrlTab } from "./TabBar";
import { OfficialBadge } from "./OfficialBadge";
import { ScoreCard } from "./ScoreCard";
import { NETWORK, explorerTx } from "@/lib/settings";
import { useLocks, type LocksResp } from "@/lib/lock";
import { fmtAge, fmtSol, fmtUsd, shortAddr } from "@/lib/format";
import { pushHistory } from "@/lib/searchHistory";
import { OpenBookTab } from "./openbook/OpenBookTab";
import { NewBadge } from "./openbook/ObUi";

export interface TokenViewData {
  mint: string; name: string; ticker: string; tier: TierId; antiSniper: boolean; creator: string; createdAt: number;
  /** DBC pool address: the trade panel reads the pool's activation point from it for the anti-sniper timer. */
  pool?: string;
  /** Migration target in SOL from the live pool config; missing -> thresholdSolFor(tier, NETWORK). */
  thresholdSol?: number;
  /** Pool migrated to DAMM v2: bonding shows 100% / Migrated. */
  isMigrated?: boolean;
  /** http(s) social links from the token metadata; a missing link is not shown. */
  links?: { website?: string; twitter?: string; telegram?: string };
  mcapUsd: number; raisedSol: number; volume24hSol: number; priceSol: number; priceUsd?: number; image?: string | null; change24h: number; holders: number; now: number; devLocked?: boolean; unlockAt?: number | null; official?: boolean; score?: number | null;
  trades: { sig: string; side: "buy" | "sell"; sol: number; tokens: number; wallet: string; ts: number; devBuy?: boolean }[];
}


const targetSol = (t: TokenViewData) => t.thresholdSol || thresholdSolFor(t.tier, NETWORK);
const bondingOf = (t: TokenViewData) => { const target = targetSol(t); return { target, p: t.isMigrated ? 1 : target > 0 ? Math.min(1, t.raisedSol / target) : 0 }; };

function SideChip({ side }: { side: "buy" | "sell" }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize text-on-ink ${side === "buy" ? "bg-buy" : "bg-sell"}`}>{side}</span>;
}
function DevChip() {
  return <span title="Creator buy in the launch transaction (Block 0)" className="ml-1.5 rounded-full border border-ink px-2 py-0.5 text-xs font-medium">Dev</span>;
}

function holderRows(trades: TokenViewData["trades"]) {
  const net = new Map<string, number>();
  for (const tr of trades) net.set(tr.wallet, (net.get(tr.wallet) ?? 0) + (tr.side === "buy" ? tr.tokens : -tr.tokens));
  const rows = [...net].filter(([, n]) => n > 1e-6).sort((a, b) => b[1] - a[1]);
  const total = rows.reduce((s, [, n]) => s + n, 0);
  return rows.map(([wallet, tokens]) => ({ wallet, tokens, pct: total ? (tokens / total) * 100 : 0 }));
}


type TabId = "trades" | "holders" | "score" | "fees" | "lock" | "openbook" | "info";
const TAB_LABEL: Record<TabId, string> = { trades: "Trades", holders: "Holders", score: "Score", fees: "Fees", lock: "Dev lock", openbook: "Open Book", info: "Info" };
const TAB_IDS = Object.keys(TAB_LABEL) as TabId[];

/** Secondary info lives in tabs under the chart instead of a stack of side cards. The open tab is kept in ?tab= (replaceState). */
function DetailTabs({ t, locks, reloadLocks }: { t: TokenViewData; locks: LocksResp | null; reloadLocks: () => void }) {
  const holders = holderRows(t.trades);
  // t.holders is the API's live count; the list is rebuilt from the last trades, so it can be shorter.
  const partial = holders.length < t.holders;
  const [tab, setTab] = useUrlTab(TAB_IDS, "trades");
  const panel = (k: TabId) => {
    if (k === "trades") return t.trades.length === 0 ? <p className="py-6 text-sm text-ink-3">No trades yet.</p> : (
      <>
        <Stacked className="-mx-3.5 border-y border-border sm:hidden" label="Trades">
          {t.trades.map((tr) => (
            <StackedItem key={tr.sig} title={<><SideChip side={tr.side} />{tr.devBuy && <DevChip />}<span className="num truncate font-normal text-ink-2">{tr.tokens.toLocaleString("en-US")} ${t.ticker}</span></>}
              value={<SolAmt>{tr.sol}</SolAmt>}
              meta={[shortAddr(tr.wallet), <a key="t" href={explorerTx(tr.sig.split(":")[0])} target="_blank" rel="noreferrer" aria-label={`${fmtAge(tr.ts, t.now)} ago, view transaction on Solscan`} className="inline-flex items-center gap-1 hover:text-ink">{fmtAge(tr.ts, t.now)} ago<ExternalLink size={12} aria-hidden /></a>]} />
          ))}
        </Stacked>
        <div className="tw flat hidden sm:block"><table>
          <thead><tr><th className="w3">Time</th><th className="w2">Type</th><th className="r">SOL</th><th className="r">${t.ticker}</th><th className="w4 h-sm">Wallet</th><th className="w1"><span className="sr-only">Transaction</span></th></tr></thead>
          <tbody>
            {t.trades.map((tr) => (
              <tr key={tr.sig}>
                <td className="num dim">{fmtAge(tr.ts, t.now)} ago</td>
                <td><span className={tr.side === "buy" ? "pos" : "neg"}>{tr.side === "buy" ? "Buy" : "Sell"}</span>{tr.devBuy && <span className="tier" style={{ marginLeft: 8 }}>Dev</span>}</td>
                <td className="r num">{tr.sol}</td>
                <td className="r num">{tr.tokens.toLocaleString("en-US")}</td>
                <td className="num dim h-sm">{shortAddr(tr.wallet)}</td>
                <td className="r"><a href={explorerTx(tr.sig.split(":")[0])} target="_blank" rel="noreferrer" aria-label="View transaction on Solscan" className="dim"><ExternalLink size={14} aria-hidden /></a></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </>
    );
    if (k === "holders") return (
      <div>
        <div data-testid="holders-head" className="flex items-baseline justify-between pb-2 text-xs text-ink-3"><span className="flex items-center gap-1.5">Holders{partial && <InfoTip label="About this list">Top holders from recent trades.</InfoTip>}</span><span className="num">{t.holders.toLocaleString("en-US")} holder{t.holders === 1 ? "" : "s"}</span></div>
        {holders.length === 0 ? <p className="px-4 py-6 text-sm text-ink-3">No holders yet.</p> : (
          <table className="w-full text-sm"><tbody>
            {holders.map((h, i) => (
              <tr key={h.wallet} className="h-11 border-t border-border first:border-0"><td className="num pl-0 pr-4 text-ink-3">#{i + 1}</td><td className="num px-4">{shortAddr(h.wallet)}</td><td className="num px-4 text-right">{h.tokens.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td><td className="num px-4 text-right text-ink-3">{h.pct.toFixed(1)}%</td></tr>
            ))}
          </tbody></table>)}
      </div>
    );
    if (k === "score") return <ScoreCard mint={t.mint} />;
    if (k === "fees") return <FeeBreakdown tier={t.tier} />;
    if (k === "lock") return <DevLock mint={t.mint} ticker={t.ticker} creator={t.creator} data={locks} reload={reloadLocks} mode="view" />;
    if (k === "openbook") return <OpenBookTab mint={t.mint} ticker={t.ticker} onLockTab={() => setTab("lock")} />;
    return (
      <dl className="py-2 text-sm">
        {[["Mint", t.mint], ["Creator", t.creator], ["Tier", TIERS[t.tier].label], ["Anti-sniper", t.antiSniper ? "On (25% to 1% in 60s, exponential decay)" : "Off"], ["Migration", t.isMigrated ? `Migrated to Meteora DAMM v2 (target ${targetSol(t)} SOL)` : `${targetSol(t)} SOL, then Meteora DAMM v2`]].map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5 border-b border-border py-2 last:border-0 sm:flex-row sm:justify-between sm:gap-4"><dt className="shrink-0 text-ink-3">{k}</dt><dd className={`num min-w-0 sm:text-right ${k === "Mint" || k === "Creator" ? "break-all" : ""}`}>{v}</dd></div>
        ))}
      </dl>
    );
  };
  return (
    <section data-testid="token-tabs">
      <div className="ttabs" role="tablist" aria-label="Token details">
        {TAB_IDS.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
            {TAB_LABEL[k]}
            {k === "holders" && <span data-testid="holders-tab-count" className="num" style={{ marginLeft: 6, color: "var(--tx3)" }}>{t.holders.toLocaleString("en-US")}</span>}
            {k === "openbook" && <NewBadge className="ml-1.5" />}
          </button>
        ))}
      </div>
      <div style={{ padding: tab === "trades" ? "0 0 28px" : "8px clamp(16px,3vw,32px) 28px" }}>
        <TabPanels k={tab}>{panel(tab)}</TabPanels>
      </div>
    </section>
  );
}

export function TokenView({ t, about }: { t: TokenViewData; /** server-rendered About block (token facts) */ about?: ReactNode }) {
  const [sheet, setSheet] = useState<null | "buy" | "sell">(null);
  const locks = useLocks(t.mint);
  // Search modal "Recently viewed": remember this token (localStorage only).
  useEffect(() => { pushHistory("viewed", { mint: t.mint, name: t.name, symbol: t.ticker, image: t.image ?? null, marketCapSol: null, marketCapUsd: t.mcapUsd, createdAt: t.createdAt }); }, [t.mint]); // eslint-disable-line react-hooks/exhaustive-deps
  const panel = (side: "buy" | "sell" = "buy", bare = false) => <TradePanel skin="jtx" mint={t.mint} ticker={t.ticker} tier={t.tier} antiSniper={t.antiSniper} priceSol={t.priceSol} initialSide={side} bare={bare} pool={t.pool} createdAt={t.createdAt} isMigrated={!!t.isMigrated} thresholdSol={targetSol(t)} quoteReserveSol={t.raisedSol} />;
  const tierName = TIERS[t.tier].label;
  const { target, p } = bondingOf(t);
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(t.mint); setCopied(true); setTimeout(() => setCopied(false), 1200); };
  return (
    <div className="tok">
      <div className="cover art">{/* eslint-disable-next-line @next/next/no-img-element */}<img className="sc" src="/brand/arena-bg-c.webp" alt="" /></div>
      <div className="crumb">
        <div className="th">
          <div className="av" style={t.image ? { backgroundImage: `url(${t.image})`, color: "transparent" } : undefined}>{(t.ticker || "HB").slice(0, 2)}</div>
          <div>
            <Link href="/" className="dim mono" style={{ fontSize: 12 }}>← All tokens</Link>
            <h1>{t.name} <span className="dim mono" style={{ fontSize: ".5em" }}>${t.ticker}</span></h1>
            <div className="meta">
              <span className={`tier ${tierName}`}>{tierName}</span>
              <OfficialBadge official={t.official} />
              {t.score != null && <span>HB {t.score}</span>}
              <button type="button" onClick={copy}>{shortAddr(t.mint, 5)} {copied ? "✓" : "⧉"}</button>
              {([[Globe, "Website", t.links?.website], [XIcon, "X", t.links?.twitter], [Send, "Telegram", t.links?.telegram]] as const)
                .filter(([, , href]) => !!href && /^https?:\/\//i.test(href))
                .map(([I, l, href]) => <a key={l} href={href} target="_blank" rel="noopener noreferrer nofollow" aria-label={l} title={l} className="inline-flex items-center"><I size={13} strokeWidth={1.5} /></a>)}
            </div>
          </div>
        </div>
        <div className="px">
          <div className="v"><SolAmt><Price v={t.priceSol} /></SolAmt></div>
          <div className="mono" style={{ fontSize: 12, marginTop: 8 }}>
            {t.priceUsd != null && <span className="dim"><Price v={t.priceUsd} prefix="$" /></span>}{" "}
            <span className={t.change24h < 0 ? "neg" : t.change24h > 0 ? "pos" : "dim"}>{t.change24h > 0 ? "+" : ""}{t.change24h.toFixed(1)}%</span> <span className="dim">24h</span>
          </div>
        </div>
      </div>
      <div className="strip" data-testid="token-stats">
        <div><div className="lbl">Market cap</div><div className="v">{fmtUsd(t.mcapUsd)}</div></div>
        <div><div className="lbl">Volume 24h</div><div className="v"><SolAmt>{fmtSol(t.volume24hSol, 1)}</SolAmt></div></div>
        <div><div className="lbl">Holders</div><div className="v">{t.holders.toLocaleString("en-US")}</div></div>
        <div><div className="lbl">Age</div><div className="v">{t.createdAt ? fmtAge(t.createdAt, t.now) : "—"}</div></div>
        <div><div className="lbl">Creator</div><div className="v">{t.creator ? shortAddr(t.creator) : "—"}</div></div>
        <div><div className="lbl">Bonding</div><div className="v">{t.isMigrated ? "Migrated" : `${(p * 100).toFixed(1)}%`}</div></div>
      </div>
      <div className="tg">
        <div className="cp">
          <PriceChart mint={t.mint} className="chart" />
        </div>
        <aside className="side">
          <DevLockButton mint={t.mint} ticker={t.ticker} creator={t.creator} devLocked={t.devLocked} unlockAt={t.unlockAt} data={locks.data} reload={locks.reload} badge={false} />
          {panel()}
          <div className="bond" data-testid="bonding-card">
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Bonding progress</span><span className="mono dim" style={{ fontSize: 13 }}>{t.raisedSol.toFixed(1)} of <SolAmt>{target}</SolAmt></span></div>
            <div className="bar"><i style={{ width: `${Math.max(p * 100, 1)}%` }} /></div>
            <div className="dim mono" style={{ fontSize: 12 }}>Graduates to DAMM v2 at {target} SOL</div>
          </div>
        </aside>
      </div>
      <DetailTabs t={t} locks={locks.data} reloadLocks={locks.reload} />
      {about}
      {/* mobile sticky actions + bottom sheet */}
      {/* docked to the bottom nav as one surface: one row, one hairline, the creator's Dev Lock as an icon instead of a second row */}
      <div data-testid="trade-dock" className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-border bg-surface px-3 pb-[max(4px,env(safe-area-inset-bottom))] pt-2 md:hidden">
        <DevLockButton mint={t.mint} ticker={t.ticker} creator={t.creator} devLocked={t.devLocked} unlockAt={t.unlockAt} data={locks.data} reload={locks.reload} badge={false} compact />
        <button type="button" onClick={() => setSheet("buy")} className="h-10 flex-1 rounded bg-buy text-sm font-semibold text-on-ink transition-opacity hover:opacity-90">Buy</button>
        <button type="button" onClick={() => setSheet("sell")} className="h-10 flex-1 rounded bg-sell text-sm font-semibold text-on-ink transition-opacity hover:opacity-90">Sell</button>
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
