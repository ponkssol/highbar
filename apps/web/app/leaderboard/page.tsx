"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { normalizeLeaderboard, type LbCreatorRow, type LbMigrationRow, type LbScoreRow, type LbSurvivorRow, type LbTokenBase, type LbTokenRow, type LbTraderRow, type LeaderboardKind } from "@hb/shared";
import { TopBlock } from "@/components/TopBar";
import { NA, ProgressBar, TierBadge } from "@/components/ui";
import { InfoTip } from "@/components/InfoTip";
import { SolAmt } from "@/components/Sol";
import { TableCard } from "@/components/ui/TableCard";
import { ScrollRow, TableScroll } from "@/components/ui/Scroll";
import { Stacked, StackedItem } from "@/components/ui/Stacked";
import { Empty, Loading, OfflineNote, Tabs, TD, TH } from "@/components/PageStates";
import { DevLockedBadge } from "@/components/DevLockedBadge";
import { OfficialBadge } from "@/components/OfficialBadge";
import { ScoreBadge } from "@/components/ScoreBadge";
import { useApiData } from "@/lib/pagesData";
import { TabPanels, useUrlTab } from "@/components/TabBar";
import { ChampionsHeader, RomanRank } from "@/components/arena";
import { fmtAge, fmtSol, fmtUsd, shortAddr } from "@/lib/format";

// Row shapes + normalizer live in @hb/shared (leaderboard.ts) next to the API contract; normalizeLeaderboard turns any payload
// (error body, wrong shape, stale rows of another tab, partial rows) into well-formed rows with safe defaults, so no tab can crash.
type Kind = LeaderboardKind;
type Win = "24h" | "7d" | "week" | "all";
type Base = LbTokenBase;
type TokRow = LbTokenRow;
type ScoRow = LbScoreRow;
type MigRow = LbMigrationRow;
type SurRow = LbSurvivorRow;
type CreRow = LbCreatorRow;
type TraRow = LbTraderRow;
type SortTok = "volumeSol" | "mcapUsd" | "progress";

const dur = (ms: number) => { const h = ms / 3600_000; return h < 1 ? `${Math.max(1, Math.round(ms / 60_000))}m` : h < 48 ? `${h.toFixed(1)}h` : `${(h / 24).toFixed(1)}d`; };
const HINT: Record<Kind, string> = {
  tokens: "Top tokens by curve volume.", scores: "highbar score: tier, anti-sniper, dev lock and holder spread, 0 to 100.", creators: "Creators by volume on their tokens.",
  traders: "Traders by curve volume.", migrations: "Tokens that migrated in the window, fastest first.", survivors: "Migrated tokens ranked by days their DAMM v2 market cap held above the floor.",
};

const KINDS: Kind[] = ["tokens", "scores", "creators", "traders", "migrations", "survivors"];
const KIND_LABEL: Record<Kind, string> = { tokens: "Tokens", scores: "highbar", creators: "Creators", traders: "Traders", migrations: "Migrations", survivors: "Survivors" };
type Cell = [ReactNode, string];
type Def = { cols: [string, "left" | "right"][]; items: { key: string; cells: Cell[]; title: ReactNode; value: ReactNode; rows: [string, ReactNode][] }[] };
const ROW = "border-b border-border last:border-0 hover:bg-muted";

export default function LeaderboardPage() {
  const [kind, setKind] = useUrlTab<Kind>(KINDS, "tokens");
  const [win, setWin] = useState<Win>("week");
  const [sortTok, setSortTok] = useState<SortTok>("volumeSol");
  const { data, loading, error } = useApiData<unknown>(`/leaderboard/${kind}?window=${win}&limit=100`, []);
  const rows: unknown[] = normalizeLeaderboard(kind, data);
  const rank = (i: number) => <RomanRank i={i} />;
  const name = (t: Base) => (
    <span className="inline-flex min-w-0 items-baseline gap-1.5 whitespace-nowrap">
      <Link href={`/token/${t.mint}`} className="truncate font-medium hover:underline">{t.name || shortAddr(t.mint)}</Link><span className="num text-xs text-ink-3">${t.symbol}</span>
    </span>
  );
  const badges = (t: Base) => <><OfficialBadge official={t.official} /><ScoreBadge score={t.score} /><DevLockedBadge devLocked={t.devLocked} unlockAt={t.unlockAt} /></>;
  const tok = (t: Base): Cell => [<span key="t" className="flex flex-wrap items-center gap-x-2 gap-y-1">{name(t)}<span className="inline-flex items-center gap-1.5">{badges(t)}</span></span>, ""];
  const tokTitle = (t: Base) => <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">{name(t)}<TierBadge tier={t.tier} />{badges(t)}</span>;
  const R = "num text-right";
  const sorted = kind === "tokens" ? [...(rows as TokRow[])].sort((a, b) => b[sortTok] - a[sortTok]) : rows;

  const def: Def = kind === "tokens" ? {
    cols: [["Token", "left"], ["Tier", "left"], ["Volume", "right"], ["Mcap", "right"], ["Progress", "left"]],
    items: (sorted as TokRow[]).map((t) => {
      const prog = <div className="flex w-full items-center gap-2"><div className="flex-1"><ProgressBar value={t.isMigrated ? 1 : t.progress} tier={t.tier} /></div><span className="num w-10 text-right text-xs text-ink-3">{t.isMigrated ? "✓" : `${Math.round(t.progress * 100)}%`}</span></div>;
      return { key: t.mint, cells: [tok(t), [<TierBadge key="r" tier={t.tier} />, ""], [<SolAmt key="v">{fmtSol(t.volumeSol, 3)}</SolAmt>, R], [fmtUsd(t.mcapUsd), R], [prog, "w-48"]],
        title: tokTitle(t), value: <SolAmt>{fmtSol(t.volumeSol, 3)}</SolAmt>, rows: [["Mcap", fmtUsd(t.mcapUsd)], ["Progress", <span key="p" className="block w-32">{prog}</span>]] };
    }),
  } : kind === "scores" ? {
    cols: [["Token", "left"], ["Tier", "left"], ["Score", "right"], ["Tier pts", "right"], ["Anti-sniper", "right"], ["Dev lock", "right"], ["Spread", "right"], ["Holders", "right"]],
    items: (rows as ScoRow[]).map((t) => {
      const score = <>{t.score}<span className="ml-1 text-xs font-normal text-ink-3">{t.label}</span></>;
      const hold = t.breakdown ? <>{t.breakdown.holders} holders, top 10 hold {t.breakdown.top10Pct}%</> : NA;
      return { key: t.mint, cells: [tok(t), [<TierBadge key="r" tier={t.tier} />, ""], [score, `${R} font-semibold`], [t.breakdown?.tier ?? NA, R], [t.breakdown?.antiSniper ?? NA, R],
          [t.breakdown?.devLock ?? NA, R], [t.breakdown?.spread ?? NA, R], [hold, `${R} text-ink-3`]],
        title: tokTitle(t), value: <span className="font-semibold">{score}</span>,
        rows: [["Tier pts", t.breakdown?.tier ?? NA], ["Anti-sniper", t.breakdown?.antiSniper ?? NA], ["Dev lock", t.breakdown?.devLock ?? NA], ["Spread", t.breakdown?.spread ?? NA], ["Holders", hold]] };
    }),
  } : kind === "migrations" ? {
    cols: [["Token", "left"], ["Tier", "left"], ["Time to migrate", "right"], ["Raised", "right"], ["Volume", "right"], ["Migrated", "right"]],
    items: (rows as MigRow[]).map((t) => ({ key: t.mint,
      cells: [tok(t), [<TierBadge key="r" tier={t.tier} />, ""], [dur(t.timeToMigrateMs), R], [<SolAmt key="a">{fmtSol(t.raisedSol, 2)}</SolAmt>, R], [<SolAmt key="v">{fmtSol(t.volumeSol, 2)}</SolAmt>, R], [`${fmtAge(t.migratedAt)} ago`, `${R} text-ink-3`]],
      title: tokTitle(t), value: dur(t.timeToMigrateMs),
      rows: [["Raised", <SolAmt key="a">{fmtSol(t.raisedSol, 2)}</SolAmt>], ["Volume", <SolAmt key="v">{fmtSol(t.volumeSol, 2)}</SolAmt>], ["Migrated", `${fmtAge(t.migratedAt)} ago`]] })),
  } : kind === "survivors" ? {
    cols: [["Token", "left"], ["Tier", "left"], ["Days held", "right"], ["Since migration", "right"], ["Mcap now", "right"], ["vs migration", "right"]],
    items: (rows as SurRow[]).map((t) => {
      const vs = <span className={t.alive == null ? "text-ink-3" : t.alive ? "text-buy" : "text-sell"}>{t.ratioNow == null ? "no DAMM data" : `${(t.ratioNow * 100).toFixed(0)}%`}</span>;
      const mcap = t.nowMcapUsd == null ? NA : fmtUsd(t.nowMcapUsd);
      return { key: t.mint, cells: [tok(t), [<TierBadge key="r" tier={t.tier} />, ""], [`${t.survivedDays}d`, `${R} font-semibold`], [`${t.daysSinceMigration}d`, `${R} text-ink-3`], [mcap, R], [vs, R]],
        title: tokTitle(t), value: <span className="font-semibold">{t.survivedDays}d</span>,
        rows: [["Since migration", `${t.daysSinceMigration}d`], ["Mcap now", mcap], ["vs migration", vs]] };
    }),
  } : kind === "creators" ? {
    cols: [["Creator", "left"], ["Tokens", "right"], ["Migrated", "right"], ["Avg score", "right"], ["Volume", "right"], ["Fees earned (est.)", "right"]],
    items: (rows as CreRow[]).map((c) => {
      const fees = <span className="text-buy"><SolAmt>{c.feesEarnedSol.toFixed(4)}</SolAmt></span>;
      return { key: c.creator, cells: [[shortAddr(c.creator, 6), "num"], [c.tokens, R], [c.graduated, R], [c.avgScore ?? NA, R], [<SolAmt key="v">{fmtSol(c.volumeSol, 3)}</SolAmt>, R], [fees, R]],
        title: <span className="num">{shortAddr(c.creator, 6)}</span>, value: <SolAmt>{fmtSol(c.volumeSol, 3)}</SolAmt>,
        rows: [["Tokens", c.tokens], ["Migrated", c.graduated], ["Avg score", c.avgScore ?? NA], ["Fees earned (est.)", fees]] };
    }),
  } : {
    cols: [["Trader", "left"], ["Volume", "right"], ["Trades", "right"], ["Buys and sells", "right"], ["Last trade", "right"]],
    items: (rows as TraRow[]).map((t) => {
      const bs = <><span className="text-buy">{t.buys}</span> and <span className="text-sell">{t.sells}</span></>;
      return { key: t.wallet, cells: [[shortAddr(t.wallet, 6), "num"], [<SolAmt key="v">{fmtSol(t.volumeSol, 3)}</SolAmt>, R], [t.trades, R], [bs, R], [`${fmtAge(t.lastTs)} ago`, `${R} text-ink-3`]],
        title: <span className="num">{shortAddr(t.wallet, 6)}</span>, value: <SolAmt>{fmtSol(t.volumeSol, 3)}</SolAmt>,
        rows: [["Trades", t.trades], ["Buys and sells", bs], ["Last trade", `${fmtAge(t.lastTs)} ago`]] };
    }),
  };
  const label = KIND_LABEL[kind];

  return (
    <div className="flex flex-col gap-4">
      <TopBlock>
        <ChampionsHeader><p className="mt-1.5 max-w-xl font-serif text-[15px] leading-snug text-ink-2 md:mt-2 md:text-[17px]">The arena&apos;s best tokens, creators and traders.</p></ChampionsHeader>
        <div className="mt-3 flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-3">
          <ScrollRow active={kind} className="-mx-[14px] md:mx-0 md:max-w-full" innerClassName="px-[14px] md:px-0">
            <Tabs label="Leaderboard" value={kind} onChange={setKind} options={KINDS.map((k) => ({ id: k, label: KIND_LABEL[k] }))} />
          </ScrollRow>
          <div className="flex flex-wrap items-center gap-2">
            {kind === "tokens" && <Tabs label="Sort by" value={sortTok} onChange={setSortTok} options={[{ id: "volumeSol", label: "Volume" }, { id: "mcapUsd", label: "Mcap" }, { id: "progress", label: "Progress" }]} />}
            <Tabs label="Time window" value={win} onChange={setWin} options={[{ id: "24h", label: "24h" }, { id: "7d", label: "7d" }, { id: "week", label: "This week" }, { id: "all", label: "All" }]} />
            {win === "week" && <InfoTip label="About the weekly window">Weeks run Monday to Sunday, UTC.</InfoTip>}
          </div>
        </div>
      </TopBlock>
      <OfflineNote error={error} />
      <TableCard title={label} info={<InfoTip label={`About ${label}`}>{HINT[kind]}</InfoTip>} testId="leaderboard-card">
        <TabPanels k={kind}>
        {loading && !data ? <Loading rows={8} /> : rows.length === 0 ? (
          error ? <Empty title="Leaderboard unavailable" hint="The API did not answer. It refreshes automatically. Try again in a moment." /> : <Empty title="No data yet" hint={`No ${kind} in this window. Try "All".`} />
        ) : (
          <>
            <Stacked className="sm:hidden" label={label}>
              {def.items.map((it, i) => (
                <StackedItem key={it.key} title={<span className="flex min-w-0 items-center gap-2.5"><span className="shrink-0">{rank(i)}</span>{it.title}</span>} value={it.value} rows={it.rows} />
              ))}
            </Stacked>
            <TableScroll className="hidden sm:block" label={label}>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-xs text-ink-3"><th className={`${TH} w-14 text-left`}>Rank</th>{def.cols.map(([c, a]) => <th key={c} className={`${TH} whitespace-nowrap ${a === "right" ? "text-right" : "text-left"}`}>{c}</th>)}</tr></thead>
                <tbody>{def.items.map((it, i) => (
                  <tr key={it.key} className={ROW}>
                    <td className={TD}>{rank(i)}</td>
                    {it.cells.map(([v, c], j) => <td key={j} className={`${TD} ${c}`}>{v}</td>)}
                  </tr>))}</tbody>
              </table>
            </TableScroll>
          </>
        )}
        </TabPanels>
      </TableCard>
    </div>
  );
}
