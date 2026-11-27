"use client";
import { useEffect, useMemo, useState } from "react";
import { feeSplitPct } from "@/lib/fees";
import { fmtAge, fmtSol, fmtUsd } from "@/lib/format";
import { progressOf } from "@/lib/mock";
import { useActivity } from "@/lib/activity";
import { statsView, toRow, type ApiStats, type ApiToken } from "@/lib/api";
import { useStats, useTokens } from "@/lib/useApi";
import { hotCoins, type HotCoin } from "@/lib/search";
import { NETWORK } from "@/lib/settings";
import { migrationMcapSol, thresholdSolFor, type TierId } from "@hb/shared";
import { BondingCurve, MigrationGauge } from "./charts";
import { MeteoraMark } from "./mlogo";
import { Btn, Href, SolNum, Tier, TokenCell, Tw, tierLabel } from "./ui";

const TIERS: TierId[] = ["standard", "higher", "max"];
const PAGE = 8;
type Filter = "all" | "bonding" | "almost" | "migrated";

const FEATS: [string, string, string][] = [
  ["Meteora DBC → DAMM v2", "Tokens trade on a Dynamic Bonding Curve, then migrate to a DAMM v2 pool with locked liquidity.", ""],
  ["Three tiers", "Standard, Higher and Max. Vanity mints end in “high”.", ""],
  ["Anti-sniper fee", "When enabled, the fee starts at 25% and decays to about 1% within 60 seconds.", ""],
  ["Dev Lock", "Creators lock their tokens with Jupiter Lock. Locks and unlock dates are public.", ""],
  ["Private launch", "Launch from a hidden creator wallet, pay privately and claim fees to stealth addresses.", "New"],
  ["$HIGHER buyback and burn", "Part of platform fees is planned to buy and burn $HIGHER. $HIGHER is not an investment.", "Soon"],
];

export function V2Home({ initialStats, initialTokens, guides }: {
  initialStats: ApiStats | null;
  initialTokens: { total: number; items: ApiToken[] } | null;
  guides: { href: string; title: string }[];
}) {
  const stats = useStats(initialStats);
  const { tokens } = useTokens(initialTokens);
  const activity = useActivity();
  const realEvents = activity.source === "api" ? activity.events : [];
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<"new" | "volume" | "mcap" | "progress">("new");
  const [page, setPage] = useState(0);
  const [hot, setHot] = useState<HotCoin[]>([]);
  useEffect(() => { hotCoins(12).then(setHot).catch(() => {}); }, []);

  const rows = useMemo(() => tokens.map((t) => ({ t, p: progressOf(t, NETWORK) })), [tokens]);
  const counts = {
    all: rows.length,
    bonding: rows.filter((r) => r.p < 0.8).length,
    almost: rows.filter((r) => r.p >= 0.8 && r.p < 1).length,
    migrated: rows.filter((r) => r.p >= 1).length,
  };
  const shown = rows.filter((r) => filter === "all" || (filter === "bonding" && r.p < 0.8) || (filter === "almost" && r.p >= 0.8 && r.p < 1) || (filter === "migrated" && r.p >= 1))
    .sort((a, b) => sort === "volume" ? b.t.volume24hSol - a.t.volume24hSol : sort === "mcap" ? b.t.mcapUsd - a.t.mcapUsd : sort === "progress" ? b.p - a.p : b.t.createdAt - a.t.createdAt);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const slice = shown.slice(page * PAGE, page * PAGE + PAGE);
  useEffect(() => { setPage(0); }, [filter]);

  const view = statsView(initialStats);
  const live = stats.live ? stats : { ...view, ...stats };
  const launches = realEvents.filter((e) => e.type === "launch").length;
  const burns = realEvents.filter((e) => e.type === "burn").length;
  const migs = realEvents.filter((e) => e.type === "graduate").length;
  const trades = realEvents.filter((e) => e.type === "trade").length;
  const cells = Array.from({ length: 210 }, (_, i) => realEvents[realEvents.length - 210 + i]);
  const feed = [...realEvents].reverse().slice(0, 7);
  const curveTiers = TIERS.map((id) => ({ sol: thresholdSolFor(id, NETWORK), name: tierLabel(id) }));
  const tick = hot.length ? hot : tokens.slice(0, 8).map((t) => ({ symbol: t.ticker, change24hPct: null as number | null, mint: t.mint }));
  const tickHtml = [...tick, ...tick, ...tick, ...tick];

  return (
    <div className="frame">
      <section className="dtop">
        <div className="arena art">
          <img className="sc" src="/v2/arena-bg-c.webp" alt="" style={{ objectPosition: "50% 40%" }} />
          <div className="ov">
            <div>
              <div className="lbl" style={{ color: "#e9dcc0" }}>Meteora launchpad on Solana</div>
              <h2>Rise above the bar.</h2>
              <p>Tiered curves, dev locks and migrations to locked DAMM v2 liquidity.</p>
            </div>
            <div className="row">
              <Btn href="/launch" y icon="+">Launch token</Btn>
              <Btn href="/leaderboard">See the champions</Btn>
            </div>
          </div>
        </div>
        <div className="cv">
          <div className="ph2"><span className="lbl">Bonding curve</span><span className="lbl">{NETWORK === "devnet" ? "Devnet tiers" : "Mainnet tiers"}</span></div>
          <BondingCurve tiers={curveTiers} />
          <div className="cvl">
            {TIERS.map((id) => {
              const f = feeSplitPct(id);
              return <div key={id}><span className="lbl">{tierLabel(id)}</span><b>{thresholdSolFor(id, NETWORK)} SOL</b><small>{f.creator}% to creator</small></div>;
            })}
          </div>
        </div>
      </section>

      <section className="qa">
        <Href canonical="/launch"><span className="lbl">Create</span><b>Launch a token</b><span className="muted">Name it, pick a tier, go live.</span></Href>
        <Href canonical="/portfolio?tab=claim"><span className="lbl">Earn</span><b>Claim creator fees</b><span className="muted">Fees from your tokens, in one click.</span></Href>
        <Href canonical="/rewards"><span className="lbl">Rewards</span><b>Check cashback</b><span className="muted">0.05% of volume, accrued daily.</span></Href>
        <Href canonical="/open-book"><span className="lbl">Verify</span><b>Open Book</b><span className="muted">Every fee, reconciled against chain.</span></Href>
        <div className="slot"><span className="lbl">Module slot</span><b>+ Add your next feature</b><span className="muted">Reserved space in the grid.</span></div>
      </section>

      <section className="pbn">
        <div>
          <span className="lbl">New · Private launch</span>
          <h3>Launch without carrying your wallet.</h3>
          <p className="muted">A concept only. Paying privately, launching from a one-time wallet and stealth fee claims are not live.</p>
        </div>
        <div className="pbr">
          <Btn href="/launch?mode=private" y>Launch privately</Btn>
          <Btn href="/private">Private send</Btn>
        </div>
      </section>

      <section className="dpa">
        <div className="pa">
          <div className="pa-c">
            <div className="pa-h"><span className="lbl"><i className="live" />Protocol activity</span><span className="lbl">Recent</span></div>
            <div className="pa-cnt">
              <div><b>{launches}</b><span>Launches</span></div>
              <div><b>{burns}</b><span>Burns</span></div>
              <div><b>{migs}</b><span>Migrations</span></div>
              <div><b>{trades}</b><span>Trades</span></div>
            </div>
            <div className="feed" aria-hidden>
              {cells.map((e, i) => <i key={i} className={e ? (e.type === "launch" ? "l" : e.type === "burn" ? "b" : e.type === "graduate" ? "m" : "t") : ""} />)}
            </div>
            <div className="pa-lg">
              <span><i style={{ background: "var(--y)" }} />Launch</span>
              <span><i style={{ background: "var(--neg)" }} />Burn</span>
              <span><i style={{ background: "#9b8cff" }} />Migrated</span>
              <span><i style={{ background: "var(--pos)" }} />Trade</span>
            </div>
          </div>
          <div className="pa-c pa-log">
            <div className="pa-h"><span className="lbl">Live feed</span><span className="lbl">{activity.source === "api" ? "on-chain" : "waiting"}</span></div>
            <ul>
              {feed.length === 0 && <li><span className="dim">No activity yet</span></li>}
              {feed.map((e) => (
                <li key={e.id}>
                  <span className={`ev ${e.type === "launch" ? "l" : e.type === "burn" ? "b" : e.side === "sell" ? "s" : "t"}`}>{e.type === "launch" ? "Launch" : e.type === "burn" ? "Burn" : e.type === "graduate" ? "Migrate" : e.side === "sell" ? "Sell" : "Buy"}</span>
                  <b><Href canonical={e.mint.startsWith("Mock") ? "/" : `/token/${e.mint}`}>${e.symbol || "—"}</Href></b>
                  <em>{e.amount != null ? <SolNum v={e.amount} digits={2} /> : fmtAge(e.ts)}</em>
                </li>
              ))}
            </ul>
          </div>
          <div className="pa-c pa-gauge">
            <div className="pa-h" style={{ width: "100%" }}><span className="lbl">Migration</span><span className="bom">Built on <MeteoraMark /></span></div>
            <MigrationGauge graduated={live.graduated} total={live.totalTokens} />
          </div>
          <div className="pa-stats">
            <div><span className="lbl">Total volume</span><b><SolNum v={live.totalVolumeSol} digits={2} /></b><svg className="spk" viewBox="0 0 100 24"><path className="flat" d="M0 12 L100 12" /></svg></div>
            <div><span className="lbl">Fees to creators</span><b><SolNum v={live.creatorFeesSol} digits={2} /></b><svg className="spk" viewBox="0 0 100 24"><path className="flat" d="M0 12 L100 12" /></svg></div>
            <div><span className="lbl">$HIGHER burned</span><b className="yl">{live.barLaunched ? fmtSol(live.barBurned, 0) : "Soon"}</b><svg className="spk" viewBox="0 0 100 24"><path className="flat" d="M0 12 L100 12" /></svg></div>
            <div><span className="lbl">Active traders 24h</span><b>{live.activeTraders24h ?? 0}</b><svg className="spk" viewBox="0 0 100 24"><path className="flat" d="M0 12 L100 12" /></svg></div>
          </div>
        </div>
      </section>

      <div className="tick"><div className="tr">
        {tickHtml.map((t, i) => (
          <span key={i}><b>${t.symbol}</b>{"change24hPct" in t && t.change24hPct != null ? <span className={t.change24hPct > 0 ? "pos" : t.change24hPct < 0 ? "neg" : "dim"}>{t.change24hPct > 0 ? "+" : ""}{t.change24hPct.toFixed(1)}%</span> : <span className="dim">live</span>}</span>
        ))}
      </div></div>

      <section className="sec">
        <div className="head">
          <div><div className="bul">New <b>tokens</b></div><h2 className="h2">On the curve <span>right now.</span></h2></div>
          <div className="tabs" role="group" aria-label="Sort">
            {([["new", "Newest"], ["volume", "Volume"], ["mcap", "Mcap"], ["progress", "Progress"]] as const).map(([id, label]) => (
              <button key={id} type="button" className={sort === id ? "on" : ""} onClick={() => setSort(id)}>{label}</button>
            ))}
          </div>
          <div className="tabs" role="group" aria-label="Token filter">
            {([["all", "All"], ["bonding", "Bonding"], ["almost", "Almost there"], ["migrated", "Migrated"]] as const).map(([id, label]) => (
              <button key={id} type="button" className={filter === id ? "on" : ""} onClick={() => setFilter(id)}>{label}<span>{counts[id]}</span></button>
            ))}
          </div>
        </div>
        <Tw brk>
          <table>
            <thead><tr><th>Token</th><th className="w3">Tier</th><th className="r w3">Market cap</th><th className="w5 h-sm">Bonding</th><th className="r w3 h-md">Vol 24h</th><th className="r w1 h-md">Age</th><th className="w3 h-md">Creator</th><th className="w2 r" /></tr></thead>
            <tbody>
              {slice.length === 0 && <tr><td colSpan={8} className="dim empty-row">No tokens in this view yet.</td></tr>}
              {slice.map(({ t, p }) => (
                <tr key={t.mint}>
                  <td><TokenCell name={t.name} symbol={t.ticker} image={t.image} href={`/token/${t.mint}`} /></td>
                  <td><Tier tier={t.tier} /></td>
                  <td className="r num">{fmtUsd(t.mcapUsd)}</td>
                  <td><div className="prog"><div className="bar"><i style={{ width: `${Math.max(p * 100, p > 0 ? 1 : 0)}%` }} /></div>{(p * 100).toFixed(0)}% · {t.thresholdSol || thresholdSolFor(t.tier, NETWORK)}</div></td>
                  <td className="r num"><SolNum v={t.volume24hSol} digits={2} /></td>
                  <td className="r num dim">{fmtAge(t.createdAt)}</td>
                  <td className="num dim">{t.creator.slice(0, 4)}…{t.creator.slice(-4)}</td>
                  <td className="r"><Href className="rb" canonical={`/token/${t.mint}`}>Buy</Href></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pg">
            <span>{shown.length === 0 ? "Showing 0" : `Showing ${page * PAGE + 1}–${Math.min(shown.length, page * PAGE + PAGE)} of ${shown.length}`}</span>
            <div>
              <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))}>Prev</button>
              <button type="button" className="on">{page + 1}</button>
              {pages > 1 && <button type="button" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}>{Math.min(pages, page + 2)}</button>}
              <button type="button" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}>Next</button>
            </div>
          </div>
        </Tw>
      </section>

      <section className="sec feat">
        <div>
          <div className="bul">What a <b>higher bar</b> looks like</div>
          <h2 className="h2">A launchpad built on Meteora, <span>with guardrails.</span></h2>
          <p className="muted" style={{ maxWidth: "34em" }}>Every token trades on a Dynamic Bonding Curve, then graduates into a DAMM v2 pool with locked liquidity. Pick the bar you want to clear.</p>
          <div className="tiers">
            {TIERS.map((id) => (
              <div key={id}><div className={`lbl${id === "standard" ? "" : " yl"}`}>{tierLabel(id)}</div><div className={`v${id === "max" ? " yl" : ""}`}>{thresholdSolFor(id, NETWORK)}</div><div className="dim mono" style={{ fontSize: 12 }}>SOL to graduate · mcap ~{migrationMcapSol(id, NETWORK)} SOL</div></div>
            ))}
          </div>
        </div>
        <div className="fl">
          {FEATS.map((f, i) => (
            <div className="fi" key={f[0]}><div className="idx">{`{0${i + 1}}`}</div><div><h3>{f[0]}</h3><p>{f[1]}</p></div>{f[2] ? <span className="chip">{f[2]}</span> : <span />}</div>
          ))}
        </div>
      </section>

      <section className="sec">
        <div className="head"><div><div className="bul">Guides</div><h2 className="h2">Know the curve <span>before you climb.</span></h2></div><Btn href="/guides" sm>All guides</Btn></div>
        <div className="gd">
          {guides.map((g, i) => (
            <Href key={g.href} canonical={g.href}><span className="idx">{`{0${i + 1}}`}</span><h4>{g.title}</h4><span className="dim mono" style={{ fontSize: 12 }}>Read guide →</span></Href>
          ))}
        </div>
      </section>
    </div>
  );
}
