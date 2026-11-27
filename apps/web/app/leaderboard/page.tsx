"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { normalizeLeaderboard, type LbCreatorRow, type LbMigrationRow, type LbScoreRow, type LbSurvivorRow, type LbTokenBase, type LbTokenRow, type LbTraderRow, type LeaderboardKind } from "@hb/shared";
import { NA } from "@/components/ui";
import { SolAmt } from "@/components/Sol";
import { Empty, Loading, OfflineNote } from "@/components/PageStates";
import { DevLockedBadge } from "@/components/DevLockedBadge";
import { OfficialBadge } from "@/components/OfficialBadge";
import { ScoreBadge } from "@/components/ScoreBadge";
import { useApiData } from "@/lib/pagesData";
import { TabPanels, useUrlTab } from "@/components/TabBar";
import { JtxSeg } from "@/components/JtxSeg";
import { toRoman } from "@/components/arena";
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
// cols: [label, class] (class: "r" right aligned, w1..w5 widths from the mockup, h-sm hidden on narrow screens)
type Def = { cols: [string, string][]; items: { key: string; cells: Cell[] }[] };

const TOK_COLS = (rest: [string, string][]): [string, string][] => [["Token", ""], ["Tier", "w3"], ...rest];

export default function LeaderboardPage() {
  const [kind, setKind] = useUrlTab<Kind>(KINDS, "tokens");
  const [win, setWin] = useState<Win>("week");
  const [sortTok, setSortTok] = useState<SortTok>("volumeSol");
  const { data, loading, error } = useApiData<unknown>(`/leaderboard/${kind}?window=${win}&limit=100`, []);
  const rows: unknown[] = normalizeLeaderboard(kind, data);
  const initials = (t: Base) => (t.symbol || t.name || "?").slice(0, 2).toUpperCase();
  const tk = (t: Base) => (
    <div className="tk">
      <div className="av">{initials(t)}</div>
      <div>
        <b><Link href={`/token/${t.mint}`} className="hover:underline">{t.name || shortAddr(t.mint)}</Link></b>
        <small>${t.symbol} · HB {t.score ?? NA}</small>
      </div>
    </div>
  );
  const tierChip = (t: Base) => <span className={`tier ${t.tier}`}>{t.tier}</span>;
  const tok = (t: Base): Cell[] => [[tk(t), "tkc"], [tierChip(t), ""]];
  const R = "r num";
  const sorted = kind === "tokens" ? [...(rows as TokRow[])].sort((a, b) => b[sortTok] - a[sortTok]) : rows;

  const def: Def = kind === "tokens" ? {
    cols: TOK_COLS([["Volume", "r w3"], ["Mcap", "r w3"], ["Progress", "w5 h-sm"]]),
    items: (sorted as TokRow[]).map((t) => {
      const pct = t.isMigrated ? 100 : Math.round(t.progress * 100);
      const prog = <div className="prog"><div className="bar"><i style={{ width: `${Math.max(1, pct)}%` }} /></div>{t.isMigrated ? "✓" : `${pct}%`}</div>;
      return { key: t.mint, cells: [...tok(t), [<SolAmt key="v">{fmtSol(t.volumeSol, 3)}</SolAmt>, R], [fmtUsd(t.mcapUsd), R], [prog, "h-sm"]] };
    }),
  } : kind === "scores" ? {
    cols: TOK_COLS([["Score", "r w2"], ["Tier pts", "r w2 h-md"], ["Anti-sniper", "r w3 h-md"], ["Dev lock", "r w2 h-md"], ["Spread", "r w2 h-sm"], ["Holders", "r w5 h-sm"]]),
    items: (rows as ScoRow[]).map((t) => {
      const score = <>{t.score}<span className="dim"> {t.label}</span></>;
      const hold = t.breakdown ? <>{t.breakdown.holders} holders, top 10 hold {t.breakdown.top10Pct}%</> : NA;
      return { key: t.mint, cells: [...tok(t), [score, R], [t.breakdown?.tier ?? NA, `${R} h-md`], [t.breakdown?.antiSniper ?? NA, `${R} h-md`],
        [t.breakdown?.devLock ?? NA, `${R} h-md`], [t.breakdown?.spread ?? NA, `${R} h-sm`], [hold, `${R} dim h-sm`]] };
    }),
  } : kind === "migrations" ? {
    cols: TOK_COLS([["Time to migrate", "r w4"], ["Raised", "r w3"], ["Volume", "r w3 h-md"], ["Migrated", "r w3 h-sm"]]),
    items: (rows as MigRow[]).map((t) => ({ key: t.mint,
      cells: [...tok(t), [dur(t.timeToMigrateMs), R], [<SolAmt key="a">{fmtSol(t.raisedSol, 2)}</SolAmt>, R], [<SolAmt key="v">{fmtSol(t.volumeSol, 2)}</SolAmt>, `${R} h-md`], [`${fmtAge(t.migratedAt)} ago`, `${R} dim h-sm`]] })),
  } : kind === "survivors" ? {
    cols: TOK_COLS([["Days held", "r w3"], ["Since migration", "r w4 h-md"], ["Mcap now", "r w3"], ["vs migration", "r w3 h-sm"]]),
    items: (rows as SurRow[]).map((t) => {
      const vs = <span className={t.alive == null ? "dim" : t.alive ? "text-buy" : "text-sell"}>{t.ratioNow == null ? "no DAMM data" : `${(t.ratioNow * 100).toFixed(0)}%`}</span>;
      const mcap = t.nowMcapUsd == null ? NA : fmtUsd(t.nowMcapUsd);
      return { key: t.mint, cells: [...tok(t), [`${t.survivedDays}d`, R], [`${t.daysSinceMigration}d`, `${R} dim h-md`], [mcap, R], [vs, `${R} h-sm`]] };
    }),
  } : kind === "creators" ? {
    cols: [["Creator", ""], ["Tokens", "r w3"], ["Migrated", "r w3"], ["Avg score", "r w3 h-md"], ["Volume", "r w4"], ["Fees earned (est.)", "r w5 h-sm"]],
    items: (rows as CreRow[]).map((c) => {
      const fees = <span className="text-buy"><SolAmt>{c.feesEarnedSol.toFixed(4)}</SolAmt></span>;
      return { key: c.creator, cells: [[shortAddr(c.creator, 6), "num"], [c.tokens, R], [c.graduated, R], [c.avgScore ?? NA, `${R} h-md`], [<SolAmt key="v">{fmtSol(c.volumeSol, 3)}</SolAmt>, R], [fees, `${R} h-sm`]] };
    }),
  } : {
    cols: [["Trader", ""], ["Volume", "r w4"], ["Trades", "r w3"], ["Buys and sells", "r w4 h-md"], ["Last trade", "r w4 h-sm"]],
    items: (rows as TraRow[]).map((t) => {
      const bs = <><span className="text-buy">{t.buys}</span> and <span className="text-sell">{t.sells}</span></>;
      return { key: t.wallet, cells: [[shortAddr(t.wallet, 6), "num"], [<SolAmt key="v">{fmtSol(t.volumeSol, 3)}</SolAmt>, R], [t.trades, R], [bs, `${R} h-md`], [`${fmtAge(t.lastTs)} ago`, `${R} dim h-sm`]] };
    }),
  };
  const label = KIND_LABEL[kind];
  const podium = kind === "tokens" && (sorted as TokRow[]).length >= 3 ? (sorted as TokRow[]).slice(0, 3) : [];
  const listItems = podium.length ? def.items.slice(3) : def.items;
  const firstRank = podium.length ? 3 : 0;
  const hasRows = rows.length > 0;

  return (
    <div className="jtx">
      <div className="phead">
        <div>
          <div className="bul">Leaderboard</div>
          <h1 className="h1">Champions. <span>The arena&apos;s best.</span></h1>
        </div>
        <div className="ctrls">
          {kind === "tokens" && <JtxSeg label="Sort by" value={sortTok} onChange={setSortTok} options={[{ id: "volumeSol", label: "Volume" }, { id: "mcapUsd", label: "Mcap" }, { id: "progress", label: "Progress" }]} />}
          <JtxSeg label="Time window" value={win} onChange={setWin} options={[{ id: "24h", label: "24h" }, { id: "7d", label: "7d" }, { id: "week", label: "This week" }, { id: "all", label: "All" }]} />
        </div>
      </div>
      <JtxSeg line label="Leaderboard" value={kind} onChange={setKind} options={KINDS.map((k) => ({ id: k, label: KIND_LABEL[k] }))} />
      <OfflineNote error={error} />
      <TabPanels k={`${kind}:${win}`}>
        {loading && !data ? <div className="sec"><Loading rows={8} /></div> : !hasRows ? (
          <div className="sec">{error ? <Empty title="Leaderboard unavailable" hint="The API did not answer. It refreshes automatically. Try again in a moment." /> : <Empty title="No data yet" hint={`No ${kind} in this window. Try "All".`} />}</div>
        ) : (
          <>
            {podium.length > 0 && (
              <div className="sec msec" style={{ borderBottom: 0, paddingBottom: 0 }}>
                <div className="pod" data-testid="leaderboard-podium">
                  {podium.map((t, i) => (
                    <Link key={t.mint} href={`/token/${t.mint}`}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}><span className="rk">{toRoman(i + 1)}</span>{tierChip(t)}</div>
                      {tk(t)}
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div><div className="lbl">Volume</div><div className="v"><SolAmt>{fmtSol(t.volumeSol, 3)}</SolAmt></div></div>
                        <div style={{ textAlign: "right" }}><div className="lbl">Mcap</div><div className="v">{fmtUsd(t.mcapUsd)}</div></div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div className="sec msec">
              <div className="tw" data-testid="leaderboard-card">
                <table>
                  <thead><tr><th className="w1">Rank</th>{def.cols.map(([c, cl]) => <th key={c} className={cl}>{c}</th>)}</tr></thead>
                  <tbody>{listItems.map((it, i) => (
                    <tr key={it.key}>
                      <td className="rom" data-l="Rank">{toRoman(firstRank + i + 1)}</td>
                      {it.cells.map(([v, c], j) => <td key={j} className={c} data-l={j === 0 && kind !== "creators" && kind !== "traders" ? undefined : def.cols[j][0]}>{v}</td>)}
                    </tr>))}</tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </TabPanels>
    </div>
  );
}
