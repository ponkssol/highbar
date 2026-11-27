"use client";
import { useMemo, useState } from "react";
import { normalizeLeaderboard, type LbCreatorRow, type LbMigrationRow, type LbScoreRow, type LbSurvivorRow, type LbTokenRow, type LbTraderRow, type LeaderboardKind, type LeaderboardWindow } from "@hb/shared";
import { fmtSol, fmtUsd, shortAddr } from "@/lib/format";
import { useApiData } from "@/lib/pagesData";
import { Href, SolNum, Tier, TokenCell, Tw, roman } from "./ui";

const TABS: { id: LeaderboardKind; label: string }[] = [
  { id: "tokens", label: "Tokens" },
  { id: "scores", label: "highbar" },
  { id: "creators", label: "Creators" },
  { id: "traders", label: "Traders" },
  { id: "migrations", label: "Migrations" },
  { id: "survivors", label: "Survivors" },
];
const WINS: { id: LeaderboardWindow; label: string }[] = [
  { id: "24h", label: "24h" }, { id: "7d", label: "7d" }, { id: "week", label: "This week" }, { id: "all", label: "All" },
];
type Sort = "volumeSol" | "mcapUsd" | "progress";

export function V2Leaderboard() {
  const [kind, setKind] = useState<LeaderboardKind>("tokens");
  const [win, setWin] = useState<LeaderboardWindow>("week");
  const [sort, setSort] = useState<Sort>("volumeSol");
  const { data, loading, error } = useApiData<unknown>(`/leaderboard/${kind}?window=${win}&limit=100`, []);
  const tokens = useMemo(() => {
    const rows = normalizeLeaderboard("tokens", kind === "tokens" ? data : []);
    const key = sort === "mcapUsd" ? "mcapUsd" : sort === "progress" ? "progress" : "volumeSol";
    return [...rows].sort((a, b) => (b[key] as number) - (a[key] as number));
  }, [data, kind, sort]);

  return (
    <div className="frame">
      <div className="phead">
        <div><div className="bul">Leaderboard</div><h1 className="h1">Champions. <span>The arena&apos;s best.</span></h1></div>
        <div className="ctrls">
          <div className="tabs seg">{(["volumeSol", "mcapUsd", "progress"] as const).map((id) => (
            <button type="button" key={id} className={sort === id ? "on" : ""} onClick={() => setSort(id)}>{id === "volumeSol" ? "Volume" : id === "mcapUsd" ? "Mcap" : "Progress"}</button>
          ))}</div>
          <div className="tabs seg">{WINS.map((w) => <button type="button" key={w.id} className={win === w.id ? "on" : ""} onClick={() => setWin(w.id)}>{w.label}</button>)}</div>
        </div>
      </div>
      <div className="ttabs">{TABS.map((t) => <button type="button" key={t.id} className={kind === t.id ? "on" : ""} onClick={() => setKind(t.id)}>{t.label}</button>)}</div>
      {error && <p className="note">Could not load the leaderboard.</p>}
      {loading && !data && <p className="note">Loading…</p>}
      {kind === "tokens" && <TokenBoard rows={tokens} />}
      {kind === "scores" && <ScoreBoard rows={normalizeLeaderboard("scores", data)} />}
      {kind === "creators" && <CreatorBoard rows={normalizeLeaderboard("creators", data)} />}
      {kind === "traders" && <TraderBoard rows={normalizeLeaderboard("traders", data)} />}
      {kind === "migrations" && <MigrationBoard rows={normalizeLeaderboard("migrations", data)} />}
      {kind === "survivors" && <SurvivorBoard rows={normalizeLeaderboard("survivors", data)} />}
      <p className="dim mono" style={{ fontSize: 12, margin: "0 0 24px", padding: "0 clamp(16px, 4vw, 56px)" }}>Weeks run Monday to Sunday, UTC.</p>
    </div>
  );
}

function TokenBoard({ rows }: { rows: LbTokenRow[] }) {
  const top = rows.slice(0, 3);
  return (
    <>
      <div className="sec" style={{ border: 0, paddingBottom: 0 }}>
        <div className="pod">
          {top.map((t, i) => (
            <Href key={t.mint} canonical={`/token/${t.mint}`}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span className="rk">{roman(i + 1)}</span><Tier tier={t.tier} /></div>
              <TokenCell name={t.name} symbol={t.symbol} extra={t.score != null ? ` · HB ${t.score}` : ""} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div><div className="lbl">Volume</div><div className="v"><SolNum v={t.volumeSol} digits={3} /></div></div>
                <div style={{ textAlign: "right" }}><div className="lbl">Mcap</div><div className="v">{fmtUsd(t.mcapUsd)}</div></div>
              </div>
            </Href>
          ))}
        </div>
      </div>
      <div className="sec"><RankTable rows={rows.slice(3)} /></div>
    </>
  );
}

function RankTable({ rows }: { rows: LbTokenRow[] }) {
  return (
    <Tw>
      <table>
        <thead><tr><th className="w1">Rank</th><th>Token</th><th className="w3">Tier</th><th className="r w3">Volume</th><th className="r w3">Mcap</th><th className="w5 h-sm">Progress</th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={6} className="dim empty-row">No tokens in this window.</td></tr>}
          {rows.map((t, i) => (
            <tr key={t.mint}>
              <td className="rom">{roman(i + 4)}</td>
              <td><TokenCell name={t.name} symbol={t.symbol} href={`/token/${t.mint}`} /></td>
              <td><Tier tier={t.tier} /></td>
              <td className="r num"><SolNum v={t.volumeSol} digits={3} /></td>
              <td className="r num">{fmtUsd(t.mcapUsd)}</td>
              <td><div className="prog"><div className="bar"><i style={{ width: `${Math.min(100, t.progress * 100)}%` }} /></div>{(t.progress * 100).toFixed(0)}%</div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Tw>
  );
}

function ScoreBoard({ rows }: { rows: LbScoreRow[] }) {
  return <div className="sec"><Tw><table><thead><tr><th className="w1">Rank</th><th>Token</th><th className="w2">Score</th><th className="w3 h-sm">Label</th><th className="r w3 h-md">Volume</th></tr></thead><tbody>
    {rows.length === 0 && <tr><td colSpan={5} className="dim empty-row">No scores in this window.</td></tr>}
    {rows.map((r, i) => <tr key={r.mint}><td className="rom">{roman(i + 1)}</td><td><TokenCell name={r.name} symbol={r.symbol} href={`/token/${r.mint}`} /></td><td className="num">{r.score ?? "—"}</td><td className="h-sm">{r.label || "—"}</td><td className="r num h-md"><SolNum v={r.volumeSol} /></td></tr>)}
  </tbody></table></Tw></div>;
}
function CreatorBoard({ rows }: { rows: LbCreatorRow[] }) {
  return <div className="sec"><Tw><table><thead><tr><th className="w1">Rank</th><th>Creator</th><th className="r w3">Tokens</th><th className="r w4">Volume</th><th className="r w3 h-sm">Graduated</th></tr></thead><tbody>
    {rows.length === 0 && <tr><td colSpan={5} className="dim empty-row">No creators in this window.</td></tr>}
    {rows.map((r, i) => <tr key={r.creator}><td className="rom">{roman(i + 1)}</td><td className="num">{shortAddr(r.creator)}</td><td className="r num">{r.tokens}</td><td className="r num"><SolNum v={r.volumeSol} /></td><td className="r num h-sm">{r.graduated}</td></tr>)}
  </tbody></table></Tw></div>;
}
function TraderBoard({ rows }: { rows: LbTraderRow[] }) {
  return <div className="sec"><Tw><table><thead><tr><th className="w1">Rank</th><th>Trader</th><th className="r w3">Trades</th><th className="r w4">Volume</th></tr></thead><tbody>
    {rows.length === 0 && <tr><td colSpan={4} className="dim empty-row">No traders in this window.</td></tr>}
    {rows.map((r, i) => <tr key={r.wallet}><td className="rom">{roman(i + 1)}</td><td className="num">{shortAddr(r.wallet)}</td><td className="r num">{r.trades}</td><td className="r num"><SolNum v={r.volumeSol} /></td></tr>)}
  </tbody></table></Tw></div>;
}
function MigrationBoard({ rows }: { rows: LbMigrationRow[] }) {
  return <div className="sec"><Tw><table><thead><tr><th className="w1">Rank</th><th>Token</th><th className="w3">Tier</th><th className="r w4">Raised</th><th className="r w3 h-sm">Volume</th></tr></thead><tbody>
    {rows.length === 0 && <tr><td colSpan={5} className="dim empty-row">No migrations in this window.</td></tr>}
    {rows.map((r, i) => <tr key={r.mint}><td className="rom">{roman(i + 1)}</td><td><TokenCell name={r.name} symbol={r.symbol} href={`/token/${r.mint}`} /></td><td><Tier tier={r.tier} /></td><td className="r num"><SolNum v={r.raisedSol} /></td><td className="r num h-sm"><SolNum v={r.volumeSol} /></td></tr>)}
  </tbody></table></Tw></div>;
}
function SurvivorBoard({ rows }: { rows: LbSurvivorRow[] }) {
  return <div className="sec"><Tw><table><thead><tr><th className="w1">Rank</th><th>Token</th><th className="r w3">Days</th><th className="r w3">Mcap</th><th className="w3 h-sm">Alive</th></tr></thead><tbody>
    {rows.length === 0 && <tr><td colSpan={5} className="dim empty-row">No survivors in this window.</td></tr>}
    {rows.map((r, i) => <tr key={r.mint}><td className="rom">{roman(i + 1)}</td><td><TokenCell name={r.name} symbol={r.symbol} href={`/token/${r.mint}`} /></td><td className="r num">{r.survivedDays}</td><td className="r num">{r.nowMcapUsd != null ? fmtUsd(r.nowMcapUsd) : "—"}</td><td className="h-sm">{r.alive == null ? "—" : r.alive ? "Yes" : "No"}</td></tr>)}
  </tbody></table></Tw></div>;
}

void fmtSol;
