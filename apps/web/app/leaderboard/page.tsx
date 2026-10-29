"use client";
import Link from "next/link";
import { useState } from "react";
import type { TierId } from "@hb/shared";
import { TopBlock } from "@/components/TopBar";
import { Card, ProgressBar, TierBadge } from "@/components/ui";
import { Empty, Loading, OfflineNote, Tabs, TD, TH } from "@/components/PageStates";
import { useApiData } from "@/lib/pagesData";
import { fmtAge, fmtSol, fmtUsd, shortAddr } from "@/lib/format";

type Kind = "tokens" | "creators" | "traders";
type Win = "24h" | "7d" | "all";
type TokRow = { mint: string; name: string; symbol: string; tier: TierId; mcapUsd: number; progress: number; isMigrated: boolean; volumeSol: number; trades: number };
type CreRow = { creator: string; tokens: number; graduated: number; volumeSol: number; feesEarnedSol: number };
type TraRow = { wallet: string; volumeSol: number; trades: number; buys: number; sells: number; lastTs: number };

/** No mock rows: empty until the API answers. */
const EMPTY: { tokens: TokRow[]; creators: CreRow[]; traders: TraRow[] } = { tokens: [], creators: [], traders: [] };
type SortTok = "volumeSol" | "mcapUsd" | "progress";

export default function LeaderboardPage() {
  const [kind, setKind] = useState<Kind>("tokens");
  const [win, setWin] = useState<Win>("24h");
  const [sortTok, setSortTok] = useState<SortTok>("volumeSol");
  const { data, loading, error } = useApiData<unknown[]>(`/leaderboard/${kind}?window=${win}&limit=100`, EMPTY[kind] as unknown[]);
  const rows = data ?? [];
  const rank = (i: number) => <span className={`num inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${i < 3 ? "bg-ink text-on-ink" : "bg-muted text-ink-2"}`}>{i + 1}</span>;

  return (
    <div className="flex flex-col gap-4">
      <TopBlock title="Leaderboard">
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <Tabs value={kind} onChange={setKind} options={[{ id: "tokens", label: "Tokens" }, { id: "creators", label: "Creators" }, { id: "traders", label: "Traders" }]} />
          <div className="flex flex-wrap items-center gap-2">
            {kind === "tokens" && <Tabs value={sortTok} onChange={setSortTok} options={[{ id: "volumeSol", label: "Volume" }, { id: "mcapUsd", label: "Mcap" }, { id: "progress", label: "Progress" }]} />}
            <Tabs value={win} onChange={setWin} options={[{ id: "24h", label: "24h" }, { id: "7d", label: "7d" }, { id: "all", label: "All" }]} />
          </div>
        </div>
      </TopBlock>
      <OfflineNote error={error} />
      <Card className="overflow-x-auto p-0">
        {loading && !data ? <Loading /> : rows.length === 0 ? (
          <Empty title="No data yet" hint={`No ${kind} activity in the ${win} window. Try "All".`} />
        ) : kind === "tokens" ? (
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b border-border text-xs text-ink-3"><th className={`${TH} w-12 text-left`}>#</th><th className={`${TH} text-left`}>Token</th><th className={`${TH} text-left`}>Tier</th><th className={`${TH} text-right`}>Volume</th><th className={`${TH} text-right`}>Mcap</th><th className={`${TH} w-48 text-left`}>Progress</th></tr></thead>
            <tbody>{[...(rows as TokRow[])].sort((a, b) => b[sortTok] - a[sortTok]).map((t, i) => (
              <tr key={t.mint} className="border-b border-border last:border-0 hover:bg-muted">
                <td className={TD}>{rank(i)}</td>
                <td className={TD}><Link href={`/token/${t.mint}`} className="font-medium hover:underline">{t.name || shortAddr(t.mint)}</Link> <span className="num text-ink-3">${t.symbol}</span></td>
                <td className={TD}><TierBadge tier={t.tier} /></td>
                <td className={`${TD} num text-right`}>{fmtSol(t.volumeSol, 3)} SOL</td>
                <td className={`${TD} num text-right`}>{fmtUsd(t.mcapUsd)}</td>
                <td className={TD}><div className="flex items-center gap-2"><div className="flex-1"><ProgressBar value={t.progress} tier={t.tier} /></div><span className="num w-10 text-right text-xs text-ink-3">{t.isMigrated ? "✓" : `${Math.round(t.progress * 100)}%`}</span></div></td>
              </tr>))}</tbody>
          </table>
        ) : kind === "creators" ? (
          <table className="w-full min-w-[600px] text-sm">
            <thead><tr className="border-b border-border text-xs text-ink-3"><th className={`${TH} w-12 text-left`}>#</th><th className={`${TH} text-left`}>Creator</th><th className={`${TH} text-right`}>Tokens</th><th className={`${TH} text-right`}>Graduated</th><th className={`${TH} text-right`}>Volume</th><th className={`${TH} text-right`}>Fees earned (est.)</th></tr></thead>
            <tbody>{(rows as CreRow[]).map((c, i) => (
              <tr key={c.creator} className="border-b border-border last:border-0 hover:bg-muted">
                <td className={TD}>{rank(i)}</td><td className={`${TD} num`}>{shortAddr(c.creator, 6)}</td>
                <td className={`${TD} num text-right`}>{c.tokens}</td><td className={`${TD} num text-right`}>{c.graduated}</td>
                <td className={`${TD} num text-right`}>{fmtSol(c.volumeSol, 3)} SOL</td><td className={`${TD} num text-right text-buy`}>{c.feesEarnedSol.toFixed(4)} SOL</td>
              </tr>))}</tbody>
          </table>
        ) : (
          <table className="w-full min-w-[600px] text-sm">
            <thead><tr className="border-b border-border text-xs text-ink-3"><th className={`${TH} w-12 text-left`}>#</th><th className={`${TH} text-left`}>Trader</th><th className={`${TH} text-right`}>Volume</th><th className={`${TH} text-right`}>Trades</th><th className={`${TH} text-right`}>Buy / Sell</th><th className={`${TH} text-right`}>Last trade</th></tr></thead>
            <tbody>{(rows as TraRow[]).map((t, i) => (
              <tr key={t.wallet} className="border-b border-border last:border-0 hover:bg-muted">
                <td className={TD}>{rank(i)}</td><td className={`${TD} num`}>{shortAddr(t.wallet, 6)}</td>
                <td className={`${TD} num text-right`}>{fmtSol(t.volumeSol, 3)} SOL</td><td className={`${TD} num text-right`}>{t.trades}</td>
                <td className={`${TD} num text-right`}><span className="text-buy">{t.buys}</span> / <span className="text-sell">{t.sells}</span></td>
                <td className={`${TD} num text-right text-ink-3`}>{fmtAge(t.lastTs)} ago</td>
              </tr>))}</tbody>
          </table>
        )}
      </Card>
    </div>
  );
}