"use client";
import { useMemo, useState } from "react";
import type { TierId } from "@hb/shared";
import { fmtAge, fmtUsd, shortAddr } from "@/lib/format";
import { useLocks } from "@/lib/lock";
import { explorerAddr, explorerTx } from "@/lib/settings";
import { DevLock, DevLockButton } from "@/components/DevLock";
import { ScoreCard } from "@/components/ScoreCard";
import { FeeBreakdown } from "@/components/FeeBreakdown";
import { OpenBookTab } from "@/components/openbook/OpenBookTab";
import { CandleChart } from "./charts";
import { TradeBox } from "./TradeBox";
import { Href, PriceText, SolNum, Tier, Tw, addr } from "./ui";

const TFS = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;
type Tab = "trades" | "holders" | "score" | "fees" | "lock" | "book" | "info";

export type V2Token = {
  mint: string; pool?: string; name: string; ticker: string; image: string | null; tier: TierId; antiSniper: boolean;
  creator: string; createdAt: number; mcapUsd: number; raisedSol: number; thresholdSol?: number; volume24hSol: number;
  priceSol: number; priceUsd?: number; change24h: number; holders: number; devLocked: boolean; isMigrated: boolean;
  description: string; links: { website?: string; twitter?: string; telegram?: string };
  score: number | null;
  trades: { sig: string; side: "buy" | "sell"; sol: number; tokens: number; wallet: string; ts: number; devBuy?: boolean }[];
};

export function V2TokenPage({ t }: { t: V2Token }) {
  const [tf, setTf] = useState<(typeof TFS)[number]>("15m");
  const [tab, setTab] = useState<Tab>("trades");
  const [copied, setCopied] = useState(false);
  const locks = useLocks(t.mint);
  const progress = t.isMigrated || !t.thresholdSol ? (t.isMigrated ? 1 : 0) : Math.min(1, t.raisedSol / t.thresholdSol);
  const holders = useMemo(() => {
    const net = new Map<string, number>();
    for (const tr of t.trades) net.set(tr.wallet, (net.get(tr.wallet) ?? 0) + (tr.side === "buy" ? tr.tokens : -tr.tokens));
    const rows = [...net].filter(([, n]) => n > 1e-6).sort((a, b) => b[1] - a[1]);
    const total = rows.reduce((s, [, n]) => s + n, 0);
    return rows.map(([wallet, tokens]) => ({ wallet, tokens, pct: total ? (tokens / total) * 100 : 0 }));
  }, [t.trades]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(t.mint); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch { /* ignore */ }
  };

  return (
    <div className="frame">
      <div className="cover art"><img className="sc" src="/v2/arena-bg-c.webp" alt="" style={{ objectPosition: "70% 30%" }} /></div>
      <div className="crumb">
        <div className="th">
          <div className="av" style={t.image ? { backgroundImage: `url(${t.image})` } : undefined}>{t.image ? "" : t.ticker.slice(0, 2)}</div>
          <div>
            <Href canonical="/" className="dim mono" >← All tokens</Href>
            <h1>{t.name} <span className="dim mono" style={{ fontSize: ".5em" }}>${t.ticker}</span></h1>
            <div className="meta">
              <Tier tier={t.tier} />
              {t.score != null && <span>HB {t.score}</span>}
              <button type="button" className="mono" onClick={copy} aria-label="Copy mint">{addr(t.mint)} {copied ? "copied" : "⧉"}</button>
            </div>
          </div>
        </div>
        <div className="px">
          <div className="v"><i className="sol" /><PriceText v={t.priceSol} /></div>
          <div className="mono" style={{ fontSize: 12, marginTop: 8 }}>
            {t.priceUsd != null && <span className="dim"><PriceText v={t.priceUsd} prefix="$" /></span>}{" "}
            <span className={t.change24h < 0 ? "neg" : t.change24h > 0 ? "pos" : "dim"}>{t.change24h > 0 ? "+" : ""}{t.change24h.toFixed(1)}%</span>{" "}
            <span className="dim">24h</span>
          </div>
        </div>
      </div>
      <div className="strip">
        <div><div className="lbl">Market cap</div><div className="v">{fmtUsd(t.mcapUsd)}</div></div>
        <div><div className="lbl">Volume 24h</div><div className="v"><SolNum v={t.volume24hSol} digits={2} /></div></div>
        <div><div className="lbl">Holders</div><div className="v">{t.holders}</div></div>
        <div><div className="lbl">Age</div><div className="v">{t.createdAt ? fmtAge(t.createdAt) : "—"}</div></div>
        <div><div className="lbl">Creator</div><div className="v">{shortAddr(t.creator)}</div></div>
        <div><div className="lbl">Bonding</div><div className="v">{t.isMigrated ? "Migrated" : `${(progress * 100).toFixed(1)}%`}</div></div>
      </div>
      <div className="tg">
        <div className="cp">
          <div className="top">
            <div className="mono"><i className="sol" /><PriceText v={t.priceSol} /></div>
            <div className="tf">
              {TFS.map((id) => <button type="button" key={id} className={tf === id ? "on" : ""} onClick={() => setTf(id)}>{id}</button>)}
            </div>
          </div>
          <CandleChart mint={t.mint} tf={tf} />
        </div>
        <TradeBox mint={t.mint} ticker={t.ticker} tier={t.tier} antiSniper={t.antiSniper} priceSol={t.priceSol} pool={t.pool} createdAt={t.createdAt} isMigrated={t.isMigrated} thresholdSol={t.thresholdSol} quoteReserveSol={t.raisedSol} />
      </div>
      <div className="ttabs" role="tablist">
        {([["trades", "Trades"], ["holders", `Holders ${t.holders}`], ["score", "Score"], ["fees", "Fees"], ["lock", "Dev lock"], ["book", "Open Book"], ["info", "Info"]] as const).map(([id, label]) => (
          <button type="button" key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {tab === "trades" && (
        <Tw flat>
          <table>
            <thead><tr><th className="w3">Time</th><th className="w2">Type</th><th className="r">SOL</th><th className="r">${t.ticker}</th><th className="w4 h-sm">Wallet</th></tr></thead>
            <tbody>
              {t.trades.length === 0 && <tr><td colSpan={5} className="dim empty-row">No trades yet.</td></tr>}
              {t.trades.map((tr) => (
                <tr key={tr.sig + tr.ts}>
                  <td className="num dim">{fmtAge(tr.ts)}</td>
                  <td><span className={`badge ${tr.side}`}>{tr.side === "buy" ? "Buy" : "Sell"}</span></td>
                  <td className="r num">{tr.sol.toLocaleString("en-US", { maximumFractionDigits: 6 })}</td>
                  <td className="r num">{tr.tokens.toLocaleString("en-US", { maximumFractionDigits: 3 })}</td>
                  <td className="num dim"><a href={explorerAddr(tr.wallet)} target="_blank" rel="noopener">{shortAddr(tr.wallet)}</a> {tr.devBuy ? "dev" : ""} <a href={explorerTx(tr.sig.split(":")[0])} target="_blank" rel="noopener">↗</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Tw>
      )}
      {tab === "holders" && (
        <Tw flat>
          <table>
            <thead><tr><th className="w1">#</th><th>Wallet</th><th className="r w3">% supply</th><th className="r w4 h-sm">Tokens</th><th className="w3 h-sm">Tag</th></tr></thead>
            <tbody>
              {holders.length === 0 && <tr><td colSpan={5} className="dim empty-row">No holders in the loaded trades yet. The count above is the live holder total.</td></tr>}
              {holders.map((h, i) => (
                <tr key={h.wallet}>
                  <td className="num dim">{i + 1}</td>
                  <td className="num"><a href={explorerAddr(h.wallet)} target="_blank" rel="noopener">{shortAddr(h.wallet)}</a></td>
                  <td className="r num">{h.pct.toFixed(1)}%</td>
                  <td className="r num h-sm">{h.tokens.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                  <td className="h-sm dim">{h.wallet === t.creator ? "Creator" : "Trader"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Tw>
      )}
      {tab === "score" && <div className="pn"><ScoreCard mint={t.mint} /></div>}
      {tab === "fees" && <div className="pn"><FeeBreakdown tier={t.tier} /></div>}
      {tab === "lock" && (
        <div className="pn">
          <DevLockButton mint={t.mint} ticker={t.ticker} creator={t.creator} data={locks.data} reload={locks.reload} devLocked={t.devLocked} />
          <DevLock mint={t.mint} ticker={t.ticker} creator={t.creator} data={locks.data} reload={locks.reload} mode="view" />
        </div>
      )}
      {tab === "book" && <div className="pn"><OpenBookTab mint={t.mint} ticker={t.ticker} onLockTab={() => setTab("lock")} /></div>}
      {tab === "info" && (
        <div className="pn">
          <p className="muted" style={{ maxWidth: "48em", margin: "0 0 24px" }}>{t.description || `${t.name} is a ${tierName(t.tier)} tier token on a Meteora Dynamic Bonding Curve.`}</p>
          <div className="kvl">
            <div><span>Mint</span><b className="mono">{shortAddr(t.mint, 6)}</b></div>
            <div><span>Tier</span><b>{tierName(t.tier)} · {t.thresholdSol ?? "—"} SOL</b></div>
            <div><span>Created</span><b>{t.createdAt ? fmtAge(t.createdAt) : "—"}</b></div>
            <div><span>Creator</span><b className="mono">{shortAddr(t.creator)}</b></div>
            <div><span>Links</span><b>{[t.links.website && "Website", t.links.twitter && "X", t.links.telegram && "Telegram"].filter(Boolean).join(" · ") || "—"}</b></div>
          </div>
        </div>
      )}
    </div>
  );
}

function tierName(t: TierId) {
  return t === "higher" ? "Higher" : t === "max" ? "Max" : "Standard";
}
