"use client";
import Link from "next/link";
import { Suspense, memo, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { TIERS, curveFeeSplit, type TierId } from "@hb/shared";
import { useActivity, type ActivityType } from "@/lib/activity";
import type { ApiStats, ApiToken } from "@/lib/api";
import { useStats, useTokens } from "@/lib/useApi";
import { fmtAge, fmtSol, fmtUsd, shortAddr } from "@/lib/format";
import { useListQuery, type SortId, type StatusId } from "@/lib/listQuery";
import { progressOf as progressAt, type TokenRow } from "@/lib/mock";
import { NETWORK } from "@/lib/settings";
import { SolAmt } from "./Sol";
import { MeteoraMark } from "./MeteoraMark";

const progressOf = (t: TokenRow) => progressAt(t, NETWORK);
const PAGE = 8;
const TIER_IDS: TierId[] = ["standard", "higher", "max"];
const TIER_LABEL: Record<TierId, string> = { standard: "Standard", higher: "Higher", max: "Max" };
const FILTERS: { id: StatusId; label: string; test: (t: TokenRow) => boolean }[] = [
  { id: "all", label: "All", test: () => true },
  { id: "bonding", label: "Bonding", test: (t) => progressOf(t) < 0.8 },
  { id: "almost", label: "Almost there", test: (t) => progressOf(t) >= 0.8 && progressOf(t) < 1 },
  { id: "graduated", label: "Migrated", test: (t) => progressOf(t) >= 1 },
];
const SORT_KEY: Record<SortId, "age" | "mcap" | "volume" | "progress" | "near"> = { new: "age", mcap: "mcap", volume: "volume", progress: "progress", near: "near" };
const creatorPct = (id: TierId) => `${(curveFeeSplit(TIERS[id]).creator / 100).toFixed(1)}%`;

const FEATS: [string, string, string][] = [
  ["Meteora DBC → DAMM v2", "Tokens trade on a Dynamic Bonding Curve, then migrate to a DAMM v2 pool with locked liquidity.", ""],
  ["Three tiers", "Standard, Higher and Max graduate at 85, 150 and 250 SOL. Vanity mints end in “high”.", ""],
  ["Anti-sniper fee", "When enabled, the fee starts at 25% and decays to about 1% within 60 seconds.", ""],
  ["Dev Lock", "Creators lock their tokens with Jupiter Lock. Locks and unlock dates are public.", ""],
  ["Private launch", "Launch from a hidden creator wallet, pay privately and claim fees to stealth addresses.", "New"],
  ["$HIGHER buyback & burn", "Part of platform fees buys and burns $HIGHER. Not an investment.", "Soon"],
];

const CurveCard = memo(function CurveCard() {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    let run = 0;
    let frame = 0;
    const draw = () => {
      const id = ++run;
      cancelAnimationFrame(frame);
      const W = cv.clientWidth, H = cv.clientHeight;
      if (!W || !H) return;
      const L = 14, R = 14, T = 36, B = 40, x0 = L, x1 = W - R, y0 = H - B, y1 = T, pw = x1 - x0, ph = y0 - y1;
      const X = (q: number) => x0 + pw * q / 250;
      const f = (q: number) => y0 - ph * (0.03 + 0.97 * Math.pow(q / 250, 2.1));
      let d = "";
      for (let k = 0; k <= 120; k++) { const q = 250 * k / 120; d += (k ? "L" : "M") + X(q).toFixed(1) + " " + f(q).toFixed(1); }
      const tiers: [number, string, string][] = [[85, "Standard", "var(--tx2)"], [150, "Higher", "var(--yx)"], [250, "Max", "var(--y)"]];
      const mono = 'font-family="Geist Mono,ui-monospace,monospace"';
      let zones = "";
      const zs = [0, 85, 150, 250], zo = [0.03, 0.06, 0.1];
      for (let k = 0; k < 3; k++) zones += `<rect x="${X(zs[k])}" y="${y1}" width="${X(zs[k + 1]) - X(zs[k])}" height="${ph}" fill="#ffc72c" opacity="${zo[k]}"/>`;
      let grid = "";
      for (let k = 1; k < 4; k++) { const gy = y1 + ph * k / 4; grid += `<line x1="${x0}" y1="${gy}" x2="${x1}" y2="${gy}" stroke="var(--bd-s)"/>`; }
      let mk = "";
      tiers.forEach(([q, , c], k) => {
        const x = X(q), y = f(q), lab = `${q}`;
        mk += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y0}" stroke="${c}" stroke-dasharray="3 4" opacity=".6"/><rect id="mk${k}" x="${x - 5}" y="${y - 5}" width="10" height="10" fill="var(--bg)" stroke="${c}" stroke-width="1.5"/><text id="ml${k}" x="${x - 11}" y="${y - 12}" text-anchor="end" fill="${c}" font-size="11" ${mono}>${lab}</text>`;
        mk += `<text x="${k === 2 ? x1 : x}" y="${y0 + 18}" text-anchor="${k === 2 ? "end" : "middle"}" fill="var(--tx3)" font-size="11" ${mono}>${q}${k === 2 ? " SOL" : ""}</text>`;
      });
      cv.innerHTML = `<defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc72c" stop-opacity=".34"/><stop offset="1" stop-color="#ffc72c" stop-opacity="0"/></linearGradient><radialGradient id="hg"><stop offset="0" stop-color="#ffd65e" stop-opacity=".95"/><stop offset="1" stop-color="#ffc72c" stop-opacity="0"/></radialGradient><clipPath id="cclip"><rect id="cclipr" x="${x0}" y="0" width="0" height="${H}"/></clipPath></defs>${zones}${grid}<path d="${d}" fill="none" stroke="var(--bd-x)" stroke-width="1" stroke-dasharray="2 5" opacity=".55"/><g clip-path="url(#cclip)"><path d="${d} L${x1} ${y0} L${x0} ${y0}Z" fill="url(#cg)"/><path d="${d}" fill="none" stroke="#ffc72c" stroke-width="2.2" stroke-linejoin="round"/></g>${mk}<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}" stroke="var(--tx2)"/><line x1="${x0}" y1="${y1}" x2="${x0}" y2="${y0}" stroke="var(--bd-x)"/><text x="${x0}" y="${y0 + 18}" fill="var(--tx3)" font-size="11" ${mono}>0</text><text x="${x0 + 8}" y="${y1 - 12}" fill="var(--tx3)" font-size="11" ${mono}>PRICE ↑</text><g id="rp"></g><g id="sp"></g><g id="cdot"><circle r="18" fill="url(#hg)"/><circle r="5" fill="#fff6d6"/><circle r="2.6" fill="#ffc72c"/></g><g id="npill"><rect x="-32" y="-34" width="64" height="20" fill="var(--bg)" stroke="#ffc72c"/><text id="ntx" x="0" y="-20" text-anchor="middle" fill="var(--yx)" font-size="11" ${mono}>0 SOL</text></g>`;
      const NS = "http://www.w3.org/2000/svg";
      const $ = (sel: string) => cv.querySelector(sel);
      const clip = $("rect#cclipr") as SVGRectElement | null;
      const dot = $("#cdot") as SVGGElement | null;
      const pill = $("#npill") as SVGGElement | null;
      const ntx = $("#ntx") as SVGTextElement | null;
      const sp = $("#sp") as SVGGElement | null;
      const rp = $("#rp") as SVGGElement | null;
      const gb = $("#gb") as SVGGElement | null;
      const legs = cv.parentElement?.parentElement?.querySelectorAll(".cvl > div") ?? [];
      const place = (p: number) => {
        const q = p * 250, px = X(q), py = f(q);
        clip?.setAttribute("width", String(Math.max(0, px - x0)));
        dot?.setAttribute("transform", `translate(${px},${py})`);
        const cx = Math.min(x1 - 32, Math.max(x0 + 32, px));
        pill?.setAttribute("transform", `translate(${cx},${py})`);
        if (ntx) ntx.textContent = `${Math.round(q)} SOL`;
        const ml2 = $("#ml2");
        if (ml2) ml2.setAttribute("opacity", p > 0.84 ? "0" : "1");
        return [px, py] as const;
      };
      const hit = [false, false, false];
      const mark = (k: number, on: boolean) => {
        const m = $(`#mk${k}`);
        if (m) m.setAttribute("fill", on ? "#ffc72c" : "var(--bg)");
        legs[k]?.classList.toggle("hit", on);
      };
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) { place(0.6); mark(0, true); mark(1, true); return; }
      type Part = { el: SVGCircleElement; x: number; y: number; vx: number; vy: number; l: number; ml: number; g: number };
      type Rip = { el: SVGCircleElement; x: number; y: number; t: number; d: number; max: number };
      const parts: Part[] = [];
      const rips: Rip[] = [];
      const spawn = (x: number, y: number, vx: number, vy: number, life: number, r: number, g: number) => {
        if (!sp || parts.length > 140) return;
        const el = document.createElementNS(NS, "circle");
        el.setAttribute("r", String(r));
        el.setAttribute("fill", Math.random() < 0.3 ? "#fff6d6" : "#ffc72c");
        sp.appendChild(el);
        parts.push({ el, x, y, vx, vy, l: life, ml: life, g });
      };
      const ripple = (x: number, y: number, max: number) => {
        if (!rp) return;
        const el = document.createElementNS(NS, "circle");
        el.setAttribute("fill", "none");
        el.setAttribute("stroke", "#ffc72c");
        rp.appendChild(el);
        rips.push({ el, x, y, t: 0, d: 0.9, max });
      };
      const pOf = (t: number) => {
        const e = (u: number) => 1 - Math.pow(1 - u, 2.2);
        const io = (u: number) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
        if (t < 2.6) return 0.34 * e(t / 2.6);
        if (t < 3.1) return 0.34;
        if (t < 5.4) return 0.34 + 0.26 * io((t - 3.1) / 2.3);
        if (t < 5.9) return 0.6;
        if (t < 9) return 0.6 + 0.4 * io((t - 5.9) / 3.1);
        return 1;
      };
      const t0 = performance.now();
      let last = t0;
      let prevT = 0;
      let burst = false;
      const reset = () => {
        hit.fill(false); burst = false;
        parts.forEach((a) => a.el.remove()); rips.forEach((a) => a.el.remove());
        parts.length = 0; rips.length = 0;
        [0, 1, 2].forEach((k) => mark(k, false));
        gb?.setAttribute("opacity", "0");
      };
      const step = (n: number) => {
        if (id !== run || !cv.isConnected) return;
        const dt = Math.min(0.05, (n - last) / 1000); last = n;
        const tt = ((n - t0) / 1000) % 12.6;
        if (tt < prevT) reset();
        prevT = tt;
        const p = pOf(tt);
        const [px, py] = place(p);
        [85, 150, 250].forEach((q, k) => {
          if (!hit[k] && p >= q / 250 - 0.002) {
            hit[k] = true; mark(k, true); ripple(X(q), f(q), k === 2 ? 60 : 34);
            for (let a = 0; a < (k === 2 ? 0 : 16); a++) {
              const an = Math.random() * 6.283, sv = 40 + Math.random() * 90;
              spawn(X(q), f(q), Math.cos(an) * sv, Math.sin(an) * sv, 0.7 + Math.random() * 0.5, 1.6, 0);
            }
          }
        });
        if (p > 0 && p < 1 && tt < 9) {
          const mv = (tt > 2.6 && tt < 3.1) || (tt > 5.4 && tt < 5.9) ? 0 : 1;
          if (mv) for (let a = 0; a < 2; a++) spawn(px + (Math.random() - 0.5) * 4, py + (Math.random() - 0.5) * 4, -(20 + Math.random() * 50), (Math.random() - 0.3) * 40, 0.5 + Math.random() * 0.6, 1.2 + Math.random() * 1.2, 0);
        }
        if (tt >= 9 && !burst) {
          burst = true; ripple(px, py, 90); ripple(px, py, 50);
          for (let a = 0; a < 46; a++) {
            const an = Math.random() * 6.283, sv = 50 + Math.random() * 170;
            spawn(px, py, Math.cos(an) * sv, Math.sin(an) * sv - 30, 1 + Math.random() * 0.9, 1.4 + Math.random() * 1.8, 90);
          }
        }
        if (tt >= 9 && gb) {
          const bt = tt - 9;
          gb.setAttribute("opacity", String(Math.min(1, bt * 3) * (tt > 11.6 ? Math.max(0, 12.6 - tt) : 1)));
        }
        for (let i = parts.length - 1; i >= 0; i--) {
          const a = parts[i]; a.l -= dt;
          if (a.l <= 0) { a.el.remove(); parts.splice(i, 1); continue; }
          a.vy += a.g * dt; a.x += a.vx * dt; a.y += a.vy * dt;
          a.el.setAttribute("cx", a.x.toFixed(1)); a.el.setAttribute("cy", a.y.toFixed(1)); a.el.setAttribute("opacity", (a.l / a.ml).toFixed(2));
        }
        for (let i = rips.length - 1; i >= 0; i--) {
          const a = rips[i]; a.t += dt;
          if (a.t >= a.d) { a.el.remove(); rips.splice(i, 1); continue; }
          const u = a.t / a.d;
          a.el.setAttribute("cx", String(a.x)); a.el.setAttribute("cy", String(a.y));
          a.el.setAttribute("r", (a.max * u).toFixed(1)); a.el.setAttribute("opacity", (1 - u).toFixed(2));
          a.el.setAttribute("stroke-width", (2.2 * (1 - u) + 0.4).toFixed(1));
        }
        frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };
    const ro = new ResizeObserver(() => draw());
    ro.observe(cv);
    draw();
    return () => { run++; cancelAnimationFrame(frame); ro.disconnect(); };
  }, []);
  return (
    <div className="cv">
      <div className="ph2"><span className="lbl">Bonding curve</span><span className="lbl">Demo</span></div>
      <div className="fig"><svg ref={ref} aria-label="Bonding curve with three graduation tiers" /></div>
      <div className="cvl">
        {TIER_IDS.map((id) => (
          <div key={id}><span className="lbl">{TIER_LABEL[id]}</span><b>{TIERS[id].migrationQuoteThresholdSol} SOL</b><small>{creatorPct(id)} to creator</small></div>
        ))}
      </div>
    </div>
  );
});

function needle(pct: number) {
  const ticks = Array.from({ length: 21 }, (_, i) => {
    const a = Math.PI * (1 - i / 20), r1 = 88, r2 = i % 5 ? 93 : 97;
    return `<line x1="${(100 + r1 * Math.cos(a)).toFixed(1)}" y1="${(105 - r1 * Math.sin(a)).toFixed(1)}" x2="${(100 + r2 * Math.cos(a)).toFixed(1)}" y2="${(105 - r2 * Math.sin(a)).toFixed(1)}" stroke="var(--bd)"/>`;
  }).join("");
  const rot = -90 + Math.max(0, Math.min(1, pct)) * 180;
  return `${ticks}<path d="M20 105 A80 80 0 0 1 180 105" fill="none" stroke="var(--d3)" stroke-width="10"/><g transform="rotate(${rot} 100 105)"><line x1="100" y1="105" x2="100" y2="38" stroke="#ffc72c" stroke-width="1.5"/><circle cx="100" cy="105" r="4" fill="#ffc72c"/></g>`;
}

const FEED_CLASS: Record<ActivityType, string> = { launch: "l", burn: "b", graduate: "m", trade: "t" };

function demoGrid() {
  let s = 17;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const cells: string[] = [];
  const cnt = { l: 0, b: 0, t: 0 };
  for (let i = 0; i < 210; i++) {
    const r = rnd();
    const k = r < 0.09 ? "l" : r < 0.14 ? "b" : r < 0.9 ? "t" : "";
    cells.push(k);
    if (k === "l" || k === "b" || k === "t") cnt[k]++;
  }
  return { cells, cnt };
}
const DEMO_GRID = demoGrid();
const DEMO_TICKERS = ["SCOOBY", "KONGO", "WHITE", "BLOB", "FBI", "ABULL", "GLAD", "CCAT"];
const DEMO_WALLETS = ["43hp…Zz7k", "5gwC…P7Jp", "GMGN…knJK", "9xQe…Lk2a", "HbR4…m91P", "3vNp…aQ7s"];
type DemoRow = { id: number; kind: string; label: string; ticker: string; wallet: string; amt: string };
let demoSeq = 1;
function demoRow(): DemoRow {
  const r = Math.random();
  const kind = r < 0.12 ? "l" : r < 0.18 ? "b" : Math.random() < 0.4 ? "s" : "t";
  const label = kind === "l" ? "Launch" : kind === "b" ? "Burn" : kind === "s" ? "Sell" : "Buy";
  return {
    id: demoSeq++,
    kind,
    label,
    ticker: DEMO_TICKERS[Math.floor(Math.random() * DEMO_TICKERS.length)],
    wallet: DEMO_WALLETS[Math.floor(Math.random() * DEMO_WALLETS.length)],
    amt: (Math.random() * 1.4 + 0.05).toFixed(2),
  };
}
function DemoFeed() {
  const [rows, setRows] = useState<DemoRow[]>([]);
  useEffect(() => {
    setRows(Array.from({ length: 5 }, () => demoRow()));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setRows((list) => [demoRow(), ...list].slice(0, 7)), 1700);
    return () => window.clearInterval(id);
  }, []);
  return (
    <ul>
      {rows.map((e) => (
        <li key={e.id}>
          <span className={`ev ${e.kind}`}>{e.label}</span>
          <b>${e.ticker} <span className="dim mono" style={{ fontSize: 11 }}>{e.wallet}</span></b>
          <em>{e.kind === "l" ? "new" : <SolAmt>{e.amt}</SolAmt>}</em>
        </li>
      ))}
    </ul>
  );
}

function Activity({ pct, graduated, total, volume, fees, burned, launched, traders }: { pct: number; graduated: number; total: number; volume: number; fees: number; burned: number; launched?: boolean; traders: number }) {
  const { events, source } = useActivity();
  const real = source === "api" ? events : [];
  const since = Date.now() - 30 * 60_000;
  const recent = real.filter((e) => e.ts >= since);
  const demo = recent.length === 0;
  const count = (t: ActivityType) => demo
    ? (t === "launch" ? DEMO_GRID.cnt.l : t === "burn" ? DEMO_GRID.cnt.b : t === "trade" ? DEMO_GRID.cnt.t : 0)
    : recent.filter((e) => e.type === t).length;
  const shown = recent.slice(-210);
  const cells = demo ? DEMO_GRID.cells : Array.from({ length: 210 }, (_, i) => {
    const e = shown[i - (210 - shown.length)];
    return e ? FEED_CLASS[e.type] : "";
  });
  const log = [...recent].reverse().slice(0, 6);
  return (
    <section className="dpa">
      <div className="pa">
        <div className="pa-c">
          <div className="pa-h"><span className="lbl"><i className="live" />Protocol activity</span><span className="lbl">Last 30 min</span></div>
          <div className="pa-cnt">
            <div><b>{count("launch")}</b><span>Launches</span></div>
            <div><b>{count("burn")}</b><span>Burns</span></div>
            <div><b>{count("graduate")}</b><span>Migrations</span></div>
            <div><b>{count("trade")}</b><span>Trades</span></div>
          </div>
          <div className="feed" aria-hidden="true">{cells.map((c, i) => <i key={i} className={c} />)}</div>
          <div className="pa-lg"><span><i style={{ background: "var(--y)" }} />Launch</span><span><i style={{ background: "var(--neg)" }} />Burn</span><span><i style={{ background: "#9b8cff" }} />Migrated</span><span><i style={{ background: "var(--pos)" }} />Trade</span></div>
        </div>
        <div className="pa-c pa-log">
          <div className="pa-h"><span className="lbl">Live feed</span>{demo && <span className="lbl">Demo</span>}</div>
          {demo ? <DemoFeed /> : (
            <ul>
              {log.map((e) => {
                const kind = e.type === "launch" ? "l" : e.type === "burn" ? "b" : e.side === "sell" ? "s" : "t";
                const label = e.type === "launch" ? "Launch" : e.type === "burn" ? "Burn" : e.type === "graduate" ? "Migrated" : e.side === "sell" ? "Sell" : "Buy";
                return <li key={e.id}><span className={`ev ${kind}`}>{label}</span><b>{e.symbol ? `$${e.symbol}` : "—"}</b><em>{kind === "l" ? "new" : e.amount != null ? <SolAmt>{e.amount}</SolAmt> : "—"}</em></li>;
              })}
            </ul>
          )}
        </div>
        <div className="pa-c pa-gauge">
          <div className="pa-h" style={{ width: "100%" }}><span className="lbl">Migration</span><a className="bom" href="https://www.meteora.ag" target="_blank" rel="noopener noreferrer" aria-label="Built on Meteora">Built on <MeteoraMark /></a></div>
          <svg viewBox="0 0 200 120" aria-label={`${Math.round(pct * 100)}% migrated`} dangerouslySetInnerHTML={{ __html: needle(pct) }} />
          <div className="gv"><b>{Math.round(pct * 100)}%</b><span>{graduated} of {total} tokens migrated</span></div>
        </div>
        <div className="pa-stats">
          <div><span className="lbl">Total volume</span><b><SolAmt>{fmtSol(volume, volume >= 100 ? 0 : 1)}</SolAmt></b><svg className="spk" viewBox="0 0 100 24" preserveAspectRatio="none"><path d="M0 20 L12 18 L24 19 L36 12 L48 14 L60 8 L72 11 L84 5 L100 7" /></svg></div>
          <div><span className="lbl">Fees to creators</span><b><SolAmt>{fmtSol(fees, fees >= 100 ? 0 : 1)}</SolAmt></b><svg className="spk" viewBox="0 0 100 24" preserveAspectRatio="none"><path d="M0 22 L15 21 L30 18 L45 19 L60 14 L75 12 L100 9" /></svg></div>
          <div><span className="lbl">$HIGHER burned</span><b className="yl">{launched ? fmtSol(burned, 1) : "Soon"}</b><svg className="spk" viewBox="0 0 100 24" preserveAspectRatio="none"><path className="flat" d="M0 12 L100 12" /></svg></div>
          <div><span className="lbl">Active traders 24h</span><b>{traders}</b><svg className="spk" viewBox="0 0 100 24" preserveAspectRatio="none"><path d="M0 18 L20 16 L40 20 L60 15 L80 17 L100 14" /></svg></div>
        </div>
      </div>
    </section>
  );
}

function TokenBoard({ tokens, loading }: { tokens: TokenRow[]; loading: boolean }) {
  const [lq, setLq] = useListQuery();
  const filter = FILTERS.find((f) => f.id === lq.status) ?? FILTERS[0];
  const base = useMemo(() => tokens.filter((t) => (!lq.tiers.length || lq.tiers.includes(t.tier)) && (!lq.locked || !!t.devLocked)), [tokens, lq.tiers, lq.locked]);
  const rows = useMemo(() => {
    const k = SORT_KEY[lq.sort];
    const val = (t: TokenRow) => k === "mcap" ? t.mcapUsd : k === "volume" ? t.volume24hSol : k === "progress" ? progressOf(t) : k === "near" ? (progressOf(t) >= 1 ? -1 : progressOf(t)) : -t.createdAt;
    return base.filter(filter.test).slice().sort((a, b) => val(a) < val(b) ? 1 : val(a) > val(b) ? -1 : 0);
  }, [base, filter, lq.sort]);
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const cur = Math.min(page, pages);
  const start = (cur - 1) * PAGE;
  const pageRows = rows.slice(start, start + PAGE);
  const nums = Array.from({ length: pages }, (_, i) => i + 1).slice(0, 5);
  return (
    <section className="sec">
      <div className="head">
        <div><div className="bul">New <b>tokens</b></div><h2 className="h2">On the curve <span>right now.</span></h2></div>
        <div className="tabs" role="tablist" aria-label="Token status">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" className={lq.status === f.id ? "on" : ""} onClick={() => { setLq({ status: f.id }); setPage(1); }}>{f.label}<span>{base.filter(f.test).length}</span></button>
          ))}
        </div>
      </div>
      <div className="tw brk"><span className="c1" /><span className="c2" />
        <table>
          <thead><tr>
            <th>Token</th><th className="w3">Tier</th><th className="r w3">Market cap</th><th className="w5 h-sm">Bonding</th>
            <th className="r w3 h-md">Vol 24h</th><th className="r w1 h-md">Age</th><th className="w3 h-md">Creator</th><th className="w2 r" />
          </tr></thead>
          <tbody>
            {loading && <tr><td className="tkc" colSpan={8}>Loading tokens.</td></tr>}
            {!loading && pageRows.length === 0 && <tr><td className="tkc" colSpan={8}>No tokens match.</td></tr>}
            {pageRows.map((t) => {
              const p = progressOf(t);
              const tier = TIER_LABEL[t.tier];
              return (
                <tr key={t.mint}>
                  <td className="tkc" data-l="Token"><div className="tk"><div className="av" style={t.image ? { backgroundImage: `url(${t.image})`, color: "transparent" } : undefined}>{(t.ticker || t.name).slice(0, 2)}</div><div><b>{t.name}</b><small>${t.ticker}</small></div></div></td>
                  <td data-l="Tier"><span className={`tier ${tier}`}>{tier}</span></td>
                  <td className="r num" data-l="Market cap">{fmtUsd(t.mcapUsd)}</td>
                  <td className="h-sm" data-l="Bonding"><div className="prog"><div className="bar"><i style={{ width: `${Math.max(p * 100, p > 0 ? 1 : 0)}%` }} /></div>{(p * 100).toFixed(0)}%{t.isMigrated ? " · migrated" : ""}</div></td>
                  <td className="r num h-md" data-l="Vol 24h"><SolAmt>{fmtSol(t.volume24hSol, 1)}</SolAmt></td>
                  <td className="r num dim h-md" data-l="Age">{fmtAge(t.createdAt)}</td>
                  <td className="num dim h-md" data-l="Creator">{shortAddr(t.creator)}</td>
                  <td className="r act" data-l=""><Link className="rb" href={`/token/${t.mint}`}>Buy</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="pg">
          <span>{rows.length === 0 ? "Showing 0" : `Showing ${start + 1}–${Math.min(start + PAGE, rows.length)} of ${rows.length}`}</span>
          <div>
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={cur === 1}>Prev</button>
            {nums.map((n) => <button type="button" key={n} className={n === cur ? "on" : ""} onClick={() => setPage(n)}>{n}</button>)}
            <button type="button" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={cur === pages}>Next</button>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Home page in the mockup layout. Stats and tokens come from the existing API hooks. */
export function HomeView({ initialStats = null, initialTokens = null, intro }: { initialStats?: ApiStats | null; initialTokens?: { total: number; items: ApiToken[] } | null; intro?: ReactNode }) {
  const STATS = useStats(initialStats);
  const { tokens, loading } = useTokens(initialTokens);
  const tick = tokens.slice(0, 12);
  const loop = tick.length ? [...tick, ...tick, ...tick, ...tick] : [];
  return (
    <div className="home" id="v-home">
      <section className="dtop">
        <div className="arena art" aria-label="The arena">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="sc" src="/brand/arena-bg-c.webp" alt="" />
          <div className="ov">
            <div>
              <div className="lbl">Meteora launchpad on Solana</div>
              <h2>Rise above the bar.</h2>
              <p>Tiered curves, dev locks and migrations to locked DAMM v2 liquidity.</p>
            </div>
            <div className="row">
              <Link className="btn y" href="/launch"><b>Launch token</b><i>+</i></Link>
              <Link className="btn" href="/leaderboard"><b>See the champions</b><i>→</i></Link>
            </div>
          </div>
        </div>
        <CurveCard />
      </section>
      <section className="qa">
        <Link href="/launch"><span className="lbl">Create</span><b>Launch a token</b><span className="muted">Name it, pick a tier, go live.</span></Link>
        <Link href="/portfolio"><span className="lbl">Earn</span><b>Claim creator fees</b><span className="muted">Fees from your tokens, in one click.</span></Link>
        <Link href="/rewards"><span className="lbl">Rewards</span><b>Check cashback</b><span className="muted">0.05% of volume, accrued daily.</span></Link>
        <Link href="/open-book"><span className="lbl">Verify</span><b>Open Book</b><span className="muted">Every fee, reconciled against chain.</span></Link>
        <div className="slot"><span className="lbl">Module slot</span><b>+ Add your next feature</b><span className="muted">Reserved space in the grid.</span></div>
      </section>
      <section className="pbn">
        <div><span className="lbl">New · Private launch</span><h3>Launch without carrying your wallet.</h3><p className="muted">Pay privately, launch from a one-time wallet and claim fees to stealth addresses.</p></div>
        <div className="pbr">
          <Link className="btn y" href="/launch"><b>Launch privately</b><i>→</i></Link>
          <button type="button" className="btn" aria-disabled="true" title="Concept"><b>Private send</b><i>→</i></button>
        </div>
      </section>
      <Activity pct={STATS.graduatedPct} graduated={STATS.graduated} total={STATS.totalTokens} volume={STATS.totalVolumeSol} fees={STATS.creatorFeesSol} burned={STATS.barBurned} launched={STATS.barLaunched} traders={STATS.activeTraders24h ?? 0} />
      <div className="tick"><div className="tr">{loop.map((t, i) => <span key={`${t.mint}-${i}`}><b>${t.ticker}</b><span className="dim">—</span></span>)}</div></div>
      <Suspense fallback={null}><TokenBoard tokens={tokens} loading={loading} /></Suspense>
      <section className="sec feat">
        <div>
          <div className="bul">What a <b>higher bar</b> looks like</div>
          <h2 className="h2">A launchpad built on Meteora, <span>with guardrails.</span></h2>
          <p className="muted" style={{ maxWidth: "34em" }}>Every token trades on a Dynamic Bonding Curve, then graduates into a DAMM v2 pool with locked liquidity. Pick the bar you want to clear.</p>
          <div className="tiers">
            {TIER_IDS.map((id) => (
              <div key={id}><div className={`lbl${id === "standard" ? "" : " yl"}`}>{TIER_LABEL[id]}</div><div className={`v${id === "max" ? " yl" : ""}`}>{TIERS[id].migrationQuoteThresholdSol}</div><div className="dim mono" style={{ fontSize: 12 }}>SOL to graduate</div></div>
            ))}
          </div>
        </div>
        <div className="fl">
          {FEATS.map((f, i) => (
            <div className="fi" key={f[0]}><div className="idx">{`{0${i + 1}}`}</div><div><h3>{f[0]}</h3><p>{f[1]}</p></div>{f[2] ? <span className="chip">{f[2]}</span> : <span />}</div>
          ))}
        </div>
      </section>
      {intro}
    </div>
  );
}
