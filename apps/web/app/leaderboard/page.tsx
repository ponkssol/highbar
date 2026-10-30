"use client";
import Link from "next/link";
import { useState } from "react";
import type { TierId } from "@hb/shared";
import { TopBlock } from "@/components/TopBar";
import { Card, ProgressBar, TierBadge } from "@/components/ui";
import { Empty, Loading, OfflineNote, Tabs, TD, TH } from "@/components/PageStates";
import { DevLockedBadge } from "@/components/DevLockedBadge";
import { OfficialBadge } from "@/components/OfficialBadge";
import { ScoreBadge } from "@/components/ScoreBadge";
import { useApiData } from "@/lib/pagesData";
import { fmtAge, fmtSol, fmtUsd, shortAddr } from "@/lib/format";

type Kind = "tokens" | "scores" | "creators" | "traders" | "migrations" | "survivors";
type Win = "24h" | "7d" | "week" | "all";
type Base = { mint: string; name: string; symbol: string; tier: TierId; mcapUsd: number; progress: number; isMigrated: boolean; score: number | null; devLocked: boolean; unlockAt: number | null; official?: boolean };
type TokRow = Base & { volumeSol: number; trades: number };
type ScoRow = Base & { label: string; volumeSol: number; breakdown: { tier: number; antiSniper: number; devLock: number; spread: number; holders: number; top10Pct: number } };
type MigRow = Base & { migratedAt: number; createdAt: number; timeToMigrateMs: number; raisedSol: number; volumeSol: number };
type SurRow = Base & { migratedAt: number; daysSinceMigration: number; survivedDays: number; ratioNow: number | null; nowMcapUsd: number | null; alive: boolean | null; minRatio: number };
type CreRow = { creator: string; tokens: number; graduated: number; volumeSol: number; feesEarnedSol: number; avgScore: number | null };
type TraRow = { wallet: string; volumeSol: number; trades: number; buys: number; sells: number; lastTs: number };
type SortTok = "volumeSol" | "mcapUsd" | "progress";

const dur = (ms: number) => { const h = ms / 3600_000; return h < 1 ? `${Math.max(1, Math.round(ms / 60_000))}m` : h < 48 ? `${h.toFixed(1)}h` : `${(h / 24).toFixed(1)}d`; };
const HINT: Record<Kind, string> = {
  tokens: "Top tokens by curve volume.", scores: "Higher Bar score: tier, anti-sniper, dev lock and holder spread (0-100).", creators: "Creators by volume on their tokens.",
  traders: "Traders by curve volume.", migrations: "Tokens that graduated in the window, fastest first.", survivors: "Graduated tokens ranked by days their DAMM v2 market cap held above the floor.",
};

export default function LeaderboardPage() {
  const [kind, setKind] = useState<Kind>("tokens");
  const [win, setWin] = useState<Win>("week");
  const [sortTok, setSortTok] = useState<SortTok>("volumeSol");
  const { data, loading, error } = useApiData<unknown[]>(`/leaderboard/${kind}?window=${win}&limit=100`, []);
  const rows = data ?? [];
  const rank = (i: number) => <span className={`num inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${i < 3 ? "bg-ink text-on-ink" : "bg-muted text-ink-2"}`}>{i + 1}</span>;
  const tok = (t: Base) => (
    <td className={TD}>
      <span className="flex flex-wrap items-center gap-1.5">
        <Link href={`/token/${t.mint}`} className="font-medium hover:underline">{t.name || shortAddr(t.mint)}</Link> <span className="num text-ink-3">${t.symbol}</span>
        <OfficialBadge official={t.official} /><ScoreBadge score={t.score} /><DevLockedBadge devLocked={t.devLocked} unlockAt={t.unlockAt} />
      </span>
    </td>
  );
  const head = (cols: [string, "left" | "right"][]) => (
    <thead><tr className="border-b border-border text-xs text-ink-3"><th className={`${TH} w-12 text-left`}>#</th>{cols.map(([c, a]) => <th key={c} className={`${TH} text-${a}`}>{c}</th>)}</tr></thead>
  );
  const ROW = "border-b border-border last:border-0 hover:bg-muted";

  return (
    <div className="flex flex-col gap-4">
      <TopBlock title="Leaderboard">
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="max-w-full overflow-x-auto">
            <Tabs value={kind} onChange={setKind} options={[{ id: "tokens", label: "Tokens" }, { id: "scores", label: "Higher Bar" }, { id: "creators", label: "Creators" }, { id: "traders", label: "Traders" }, { id: "migrations", label: "Migrations" }, { id: "survivors", label: "Survivors" }]} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {kind === "tokens" && <Tabs value={sortTok} onChange={setSortTok} options={[{ id: "volumeSol", label: "Volume" }, { id: "mcapUsd", label: "Mcap" }, { id: "progress", label: "Progress" }]} />}
            <Tabs value={win} onChange={setWin} options={[{ id: "24h", label: "24h" }, { id: "7d", label: "7d" }, { id: "week", label: "This week" }, { id: "all", label: "All" }]} />
          </div>
        </div>
        <p className="mt-2 text-xs text-ink-3">{HINT[kind]}{win === "week" && " Weeks run Monday to Sunday, UTC."}</p>
      </TopBlock>
      <OfflineNote error={error} />
      <Card className="overflow-x-auto p-0">
        {loading && !data ? <Loading /> : rows.length === 0 ? (
          <Empty title="No data yet" hint={`No ${kind} in this window. Try "All".`} />
        ) : kind === "tokens" ? (
          <table className="w-full min-w-[640px] text-sm">
            {head([["Token", "left"], ["Tier", "left"], ["Volume", "right"], ["Mcap", "right"], ["Progress", "left"]])}
            <tbody>{[...(rows as TokRow[])].sort((a, b) => b[sortTok] - a[sortTok]).map((t, i) => (
              <tr key={t.mint} className={ROW}>
                <td className={TD}>{rank(i)}</td>{tok(t)}
                <td className={TD}><TierBadge tier={t.tier} /></td>
                <td className={`${TD} num text-right`}>{fmtSol(t.volumeSol, 3)} SOL</td>
                <td className={`${TD} num text-right`}>{fmtUsd(t.mcapUsd)}</td>
                <td className={`${TD} w-48`}><div className="flex items-center gap-2"><div className="flex-1"><ProgressBar value={t.isMigrated ? 1 : t.progress} tier={t.tier} /></div><span className="num w-10 text-right text-xs text-ink-3">{t.isMigrated ? "✓" : `${Math.round(t.progress * 100)}%`}</span></div></td>
              </tr>))}</tbody>
          </table>
        ) : kind === "scores" ? (
          <table className="w-full min-w-[720px] text-sm">
            {head([["Token", "left"], ["Tier", "left"], ["Score", "right"], ["Tier pts", "right"], ["Anti-sniper", "right"], ["Dev lock", "right"], ["Spread", "right"], ["Holders", "right"]])}
            <tbody>{(rows as ScoRow[]).map((t, i) => (
              <tr key={t.mint} className={ROW}>
                <td className={TD}>{rank(i)}</td>{tok(t)}
                <td className={TD}><TierBadge tier={t.tier} /></td>
                <td className={`${TD} num text-right font-semibold`}>{t.score}<span className="ml-1 text-xs font-normal text-ink-3">{t.label}</span></td>
                <td className={`${TD} num text-right`}>{t.breakdown.tier}</td><td className={`${TD} num text-right`}>{t.breakdown.antiSniper}</td>
                <td className={`${TD} num text-right`}>{t.breakdown.devLock}</td><td className={`${TD} num text-right`}>{t.breakdown.spread}</td>
                <td className={`${TD} num text-right text-ink-3`}>{t.breakdown.holders} · top10 {t.breakdown.top10Pct}%</td>
              </tr>))}</tbody>
          </table>
        ) : kind === "migrations" ? (
          <table className="w-full min-w-[640px] text-sm">
            {head([["Token", "left"], ["Tier", "left"], ["Time to graduate", "right"], ["Raised", "right"], ["Volume", "right"], ["Graduated", "right"]])}
            <tbody>{(rows as MigRow[]).map((t, i) => (
              <tr key={t.mint} className={ROW}>
                <td className={TD}>{rank(i)}</td>{tok(t)}
                <td className={TD}><TierBadge tier={t.tier} /></td>
                <td className={`${TD} num text-right`}>{dur(t.timeToMigrateMs)}</td>
                <td className={`${TD} num text-right`}>{fmtSol(t.raisedSol, 2)} SOL</td>
                <td className={`${TD} num text-right`}>{fmtSol(t.volumeSol, 2)} SOL</td>
                <td className={`${TD} num text-right text-ink-3`}>{fmtAge(t.migratedAt)} ago</td>
              </tr>))}</tbody>
          </table>
        ) : kind === "survivors" ? (
          <table className="w-full min-w-[680px] text-sm">
            {head([["Token", "left"], ["Tier", "left"], ["Days held", "right"], ["Since graduation", "right"], ["Mcap now", "right"], ["vs graduation", "right"]])}
            <tbody>{(rows as SurRow[]).map((t, i) => (
              <tr key={t.mint} className={ROW}>
                <td className={TD}>{rank(i)}</td>{tok(t)}
                <td className={TD}><TierBadge tier={t.tier} /></td>
                <td className={`${TD} num text-right font-semibold`}>{t.survivedDays}d</td>
                <td className={`${TD} num text-right text-ink-3`}>{t.daysSinceMigration}d</td>
                <td className={`${TD} num text-right`}>{t.nowMcapUsd == null ? "–" : fmtUsd(t.nowMcapUsd)}</td>
                <td className={`${TD} num text-right ${t.alive == null ? "text-ink-3" : t.alive ? "text-buy" : "text-sell"}`}>{t.ratioNow == null ? "no DAMM data" : `${(t.ratioNow * 100).toFixed(0)}%`}</td>
              </tr>))}</tbody>
          </table>
        ) : kind === "creators" ? (
          <table className="w-full min-w-[600px] text-sm">
            {head([["Creator", "left"], ["Tokens", "right"], ["Graduated", "right"], ["Avg score", "right"], ["Volume", "right"], ["Fees earned (est.)", "right"]])}
            <tbody>{(rows as CreRow[]).map((c, i) => (
              <tr key={c.creator} className={ROW}>
                <td className={TD}>{rank(i)}</td><td className={`${TD} num`}>{shortAddr(c.creator, 6)}</td>
                <td className={`${TD} num text-right`}>{c.tokens}</td><td className={`${TD} num text-right`}>{c.graduated}</td>
                <td className={`${TD} num text-right`}>{c.avgScore ?? "–"}</td>
                <td className={`${TD} num text-right`}>{fmtSol(c.volumeSol, 3)} SOL</td><td className={`${TD} num text-right text-buy`}>{c.feesEarnedSol.toFixed(4)} SOL</td>
              </tr>))}</tbody>
          </table>
        ) : (
          <table className="w-full min-w-[600px] text-sm">
            {head([["Trader", "left"], ["Volume", "right"], ["Trades", "right"], ["Buy / Sell", "right"], ["Last trade", "right"]])}
            <tbody>{(rows as TraRow[]).map((t, i) => (
              <tr key={t.wallet} className={ROW}>
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
