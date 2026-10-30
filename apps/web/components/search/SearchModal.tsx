"use client";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Search, Star, Wallet, X } from "lucide-react";
import { fmtAge, fmtSol, fmtUsd, shortAddr } from "@/lib/format";
import { fmtDateTimeUS } from "@/lib/date";
import { explorerAddr } from "@/lib/settings";
import { hotCoins, isAddress, loadSpark, searchAll, SEARCH_MIN_CHARS, topTraders, type HotCoin, type SearchResult, type SearchToken, type SearchUser, type Trader } from "@/lib/search";
import { clearHistory, getFavs, getHistory, HISTORY_EVENT, pushHistory, toggleFav, type HistoryKind, type SavedToken } from "@/lib/searchHistory";

/** Carousel data survives closing and reopening the modal for a minute, so a quick reopen shows cards at once. */
const memo: { hot?: { at: number; v: HotCoin[] }; traders?: { at: number; v: Trader[] } } = {};
const FRESH_MS = 60_000;

const mcap = (t: { marketCapUsd: number | null; marketCapSol: number | null }) =>
  t.marketCapUsd != null ? fmtUsd(t.marketCapUsd) : t.marketCapSol != null ? `${fmtSol(t.marketCapSol, 1)} SOL` : "";
const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

type Opt = { id: string; run: () => void };

function Img({ src, name, size }: { src: string | null; name: string; size: number }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) return <span role="img" aria-label={`${name} logo`} className="inline-flex shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-ink-2" style={{ width: size, height: size }}>{name.slice(0, 2).toUpperCase()}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={`${name} logo`} width={size} height={size} loading="lazy" decoding="async" onError={() => setBad(true)} className="shrink-0 rounded-full bg-muted object-cover" style={{ width: size, height: size }} />;
}

/** Mini price line: green when the last close is at or above the first, muted red below. Real closes only, nothing drawn without data. */
function Spark({ points }: { points: number[] | null | undefined }) {
  if (points === undefined) return <div className="h-10 w-full animate-pulse rounded bg-control" aria-hidden />;
  if (!points || points.length < 2) return <div className="flex h-10 items-center text-[11px] text-ink-3">No trades yet</div>;
  const lo = Math.min(...points), hi = Math.max(...points), span = hi - lo;
  // A flat series (no trades in the window) sits in the middle instead of on the floor.
  const xy = points.map((p, i) => [(i / (points.length - 1)) * 100, span > 0 ? 30 - ((p - lo) / span) * 26 - 2 : 16] as const);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  const up = points[points.length - 1] >= points[0];
  const color = up ? "var(--hb-buy)" : "var(--hb-sell)";
  const gid = `sp${up ? "u" : "d"}`;
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-10 w-full" aria-hidden style={{ opacity: up ? 1 : 0.75 }}>
      <defs><linearGradient id={gid} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".22" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${line} L100 32 L0 32 Z`} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function CoinCard({ c, onOpen, root }: { c: HotCoin; onOpen: (t: SearchToken) => void; root: React.RefObject<HTMLDivElement | null> }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [spark, setSpark] = useState<number[] | null | undefined>(c.spark ?? undefined);
  useEffect(() => {
    if (c.spark) return;
    const el = ref.current; if (!el) return;
    // Candles only for cards that scroll into view, cached in lib/search.ts.
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); loadSpark(c.mint).then(setSpark); } }, { root: root.current, rootMargin: "0px 120px" });
    io.observe(el);
    return () => io.disconnect();
  }, [c.mint, c.spark, root]);
  return (
    <button ref={ref} type="button" onClick={() => onOpen(c)} data-testid="hot-coin"
      className="flex w-[164px] shrink-0 snap-start flex-col gap-2 rounded bg-control p-3 text-left hover:bg-control-hover focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold-line md:w-[172px]">
      <span className="flex min-w-0 items-center gap-2.5">
        <Img src={c.image} name={c.name} size={34} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-ink">{c.name}</span>
          <span className="num block truncate text-[11px] text-ink-3">${c.symbol}</span>
        </span>
      </span>
      <Spark points={spark} />
      <span className="flex items-baseline justify-between gap-2">
        <span className="num text-sm font-semibold text-ink">{mcap(c)}</span>
        {c.change24hPct != null ? <span className={`num text-[11px] ${c.change24hPct >= 0 ? "text-buy" : "text-sell opacity-80"}`}>{c.change24hPct >= 0 ? "+" : ""}{c.change24hPct.toFixed(1)}%</span> : <span className="text-[11px] text-ink-3" />}
      </span>
    </button>
  );
}

function TraderCard({ t }: { t: Trader }) {
  const name = t.label || shortAddr(t.wallet, 4);
  return (
    <a href={explorerAddr(t.wallet)} target="_blank" rel="noopener noreferrer" data-testid="top-trader"
      className="flex w-[164px] shrink-0 snap-start flex-col gap-2 rounded bg-control p-3 hover:bg-control-hover focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold-line md:w-[172px]">
      <span className="flex min-w-0 items-center gap-2.5">
        <span aria-hidden className="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-text"><Wallet size={15} strokeWidth={1.5} /></span>
        <span className="min-w-0">
          <span className="num block truncate text-sm font-medium text-ink">{name}</span>
          <span className="block truncate text-[11px] text-ink-3">{t.trades != null ? `${t.trades.toLocaleString("en-US")} trades` : "Trader"}</span>
        </span>
      </span>
      <span className="mt-auto">
        <span className="block text-[11px] text-ink-3">{t.pnlSol != null ? "PnL est." : "Volume"}</span>
        <span className={`num block text-sm font-semibold ${t.pnlSol == null ? "text-ink" : t.pnlSol >= 0 ? "text-buy" : "text-sell opacity-80"}`}>
          {t.pnlSol != null ? `${t.pnlSol >= 0 ? "+" : ""}${fmtSol(t.pnlSol)} SOL` : `${fmtSol(t.volumeSol, 1)} SOL`}
        </span>
        {t.pnlSol != null && <span className="num block text-[11px] text-ink-3">{fmtSol(t.volumeSol, 1)} SOL volume</span>}
      </span>
    </a>
  );
}

function TokenRow({ t, id, active, fav, onOpen, onHover }: { t: SearchToken; id: string; active: boolean; fav: boolean; onOpen: () => void; onHover: () => void }) {
  return (
    <div id={id} role="option" aria-selected={active} onClick={onOpen} onMouseMove={onHover} data-testid="search-row"
      className={`relative flex cursor-pointer items-center gap-3 rounded px-2 py-2 ${active ? "bg-control-hover" : "hover:bg-control"}`}>
      {active && <span aria-hidden className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-gold" />}
      <button type="button" tabIndex={-1} aria-label={fav ? `Remove ${t.name} from favourites` : `Add ${t.name} to favourites`} aria-pressed={fav}
        onClick={(e) => { e.stopPropagation(); toggleFav(t.mint); }}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-control-hover ${fav ? "text-gold" : "text-ink-3"}`}>
        <Star size={15} strokeWidth={1.5} fill={fav ? "currentColor" : "none"} />
      </button>
      <Img src={t.image} name={t.name} size={38} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{t.name}</span>
        <span className="num block truncate text-[11px] text-ink-3">${t.symbol}<span className="ml-2 text-ink-3/80">{shortAddr(t.mint, 5)}</span></span>
      </span>
      <span className="shrink-0 text-right">
        <span className="num block text-sm font-semibold text-ink">{mcap(t)}</span>
        <span className="num block text-[11px] text-ink-3" title={t.createdAt ? `Created ${fmtDateTimeUS(t.createdAt)}` : undefined}>{t.createdAt ? fmtAge(t.createdAt) : ""}</span>
      </span>
    </div>
  );
}

function ActionRow({ id, active, icon, title, sub, onRun, onHover }: { id: string; active: boolean; icon: ReactNode; title: string; sub: ReactNode; onRun: () => void; onHover: () => void }) {
  return (
    <div id={id} role="option" aria-selected={active} onClick={onRun} onMouseMove={onHover} data-testid="search-action"
      className={`relative flex cursor-pointer items-center gap-3 rounded px-2 py-2.5 ${active ? "bg-control-hover" : "hover:bg-control"}`}>
      {active && <span aria-hidden className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-gold" />}
      <span aria-hidden className="ml-1 inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold-text">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="num block truncate text-[11px] text-ink-3">{sub}</span>
      </span>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div role="group" aria-label={title} className="px-3 pt-4 md:px-4">
      <div className="mb-1.5 flex items-center justify-between px-2">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-2">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function SearchModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const uid = useId().replace(/:/g, "");
  const dialog = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"hot" | "traders">("hot");
  const [hot, setHot] = useState<HotCoin[] | null>(memo.hot && Date.now() - memo.hot.at < FRESH_MS ? memo.hot.v : null);
  const [traders, setTraders] = useState<Trader[] | null>(memo.traders && Date.now() - memo.traders.at < FRESH_MS ? memo.traders.v : null);
  const [stripErr, setStripErr] = useState(false);
  const [res, setRes] = useState<{ q: string; r: SearchResult | null; err: boolean } | null>(null);
  const [active, setActive] = useState(-1);
  const [hist, setHist] = useState<Record<HistoryKind, SavedToken[]>>({ searched: [], viewed: [] });
  const [favs, setFavs] = useState<string[]>([]);
  const [ends, setEnds] = useState({ left: true, right: false });
  const query = q.trim();

  // Body scroll lock and initial focus. Focus goes back to the opener from SearchLauncher once this unmounts.
  useEffect(() => {
    const h = document.documentElement, b = document.body, prev = [h.style.overflow, b.style.overflow];
    h.style.overflow = "hidden"; b.style.overflow = "hidden";
    input.current?.focus();
    return () => { h.style.overflow = prev[0]; b.style.overflow = prev[1]; };
  }, []);
  useEffect(() => {
    const load = () => { setHist({ searched: getHistory("searched"), viewed: getHistory("viewed") }); setFavs(getFavs()); };
    load();
    window.addEventListener(HISTORY_EVENT, load); window.addEventListener("storage", load);
    return () => { window.removeEventListener(HISTORY_EVENT, load); window.removeEventListener("storage", load); };
  }, []);
  // Carousel data, loaded once per tab.
  useEffect(() => {
    const ac = new AbortController();
    setStripErr(false);
    if (tab === "hot" && !hot) hotCoins(12, ac.signal).then((v) => { memo.hot = { at: Date.now(), v }; setHot(v); }).catch(() => !ac.signal.aborted && setStripErr(true));
    if (tab === "traders" && !traders) topTraders(12, ac.signal).then((v) => { memo.traders = { at: Date.now(), v }; setTraders(v); }).catch(() => !ac.signal.aborted && setStripErr(true));
    return () => ac.abort();
  }, [tab, hot, traders]);
  // Debounced search (250 ms). Each keystroke cancels the request before it. Nothing is sent below SEARCH_MIN_CHARS.
  useEffect(() => {
    setActive(-1);
    if (query.length < SEARCH_MIN_CHARS) { setRes(null); return; }
    const ac = new AbortController();
    const t = setTimeout(() => {
      searchAll(query, 8, ac.signal).then((r) => setRes({ q: query, r, err: false })).catch(() => { if (!ac.signal.aborted) setRes({ q: query, r: null, err: true }); });
    }, 250);
    return () => { clearTimeout(t); ac.abort(); };
  }, [query]);

  const openToken = (t: SearchToken) => { pushHistory("searched", t); onClose(); router.push(`/token/${t.mint}`); };
  const openWallet = (w: string) => { window.open(explorerAddr(w), "_blank", "noopener,noreferrer"); onClose(); };

  const done = res && res.q === query ? res : null;
  const tokens = done?.r?.tokens ?? [], users = done?.r?.users ?? [];
  const addr = isAddress(query) ? query : null;
  const noHit = !!done && !done.err && tokens.length === 0 && users.length === 0;

  // Every row the arrow keys can reach, in screen order.
  const opts: Opt[] = useMemo(() => {
    if (!query) return [
      ...hist.searched.slice(0, 5).map((t) => ({ id: `${uid}-s-${t.mint}`, run: () => openToken(t) })),
      ...hist.viewed.slice(0, 10).map((t) => ({ id: `${uid}-v-${t.mint}`, run: () => openToken(t) })),
    ];
    const o: Opt[] = [
      ...tokens.map((t) => ({ id: `${uid}-t-${t.mint}`, run: () => openToken(t) })),
      ...users.map((u) => ({ id: `${uid}-u-${u.wallet}`, run: () => openWallet(u.wallet) })),
    ];
    if (addr && noHit) o.push({ id: `${uid}-ot`, run: () => { onClose(); router.push(`/token/${addr}`); } }, { id: `${uid}-ow`, run: () => openWallet(addr) });
    return o;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, hist, tokens, users, addr, noHit, uid]);
  const idx = (id: string) => opts.findIndex((o) => o.id === id);
  const activeId = active >= 0 && active < opts.length ? opts[active].id : undefined;
  useEffect(() => { if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" }); }, [activeId]);

  const onInputKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); if (opts.length) setActive((a) => (a + 1) % opts.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (opts.length) setActive((a) => (a <= 0 ? opts.length - 1 : a - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); const o = opts[active] ?? (query ? opts[0] : undefined); o?.run(); }
  };
  // Esc anywhere in the dialog closes it, Tab stays inside it.
  const onDialogKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); return; }
    if (e.key !== "Tab" || !dialog.current) return;
    const f = [...dialog.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,[tabindex]:not([tabindex="-1"])')].filter((el) => el.tabIndex >= 0 && el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const syncEnds = () => { const s = strip.current; if (s) setEnds({ left: s.scrollLeft <= 2, right: s.scrollLeft + s.clientWidth >= s.scrollWidth - 2 }); };
  const items = tab === "hot" ? hot : traders;
  useEffect(syncEnds, [items, tab]);
  const scrollBy = (dir: 1 | -1) => strip.current?.scrollBy({ left: dir * Math.max(180, strip.current.clientWidth * 0.8), behavior: "smooth" });

  const listId = `${uid}-list`;
  const histRows = (kind: HistoryKind, n: number) => hist[kind].slice(0, n).map((t) => {
    const id = `${uid}-${kind === "searched" ? "s" : "v"}-${t.mint}`;
    return <TokenRow key={id} id={id} t={t} active={id === activeId} fav={favs.includes(t.mint)} onOpen={() => openToken(t)} onHover={() => setActive(idx(id))} />;
  });
  const clearBtn = (kind: HistoryKind) => (
    <button type="button" onClick={() => clearHistory(kind)} className="rounded-full px-2 py-0.5 text-xs text-ink-3 hover:bg-control hover:text-ink" aria-label={kind === "searched" ? "Clear recently searched" : "Clear recently viewed"}>Clear</button>
  );

  return (
    <div className="fixed inset-0 z-[100] flex justify-center md:items-start md:px-6 md:pt-[9vh]" data-testid="search-modal">
      <div className="hb-scrim absolute inset-0 backdrop-blur-[3px]" onClick={onClose} aria-hidden />
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={`${uid}-title`} onKeyDown={onDialogKey}
        className="hb-modal relative flex h-[100dvh] w-full flex-col overflow-hidden bg-surface md:h-auto md:max-h-[min(720px,84vh)] md:max-w-[660px] md:rounded-lg md:border md:border-border md:shadow-[0_24px_80px_-24px_rgba(0,0,0,.55)]">
        <h2 id={`${uid}-title`} className="sr-only">Search highbar</h2>
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 pt-[env(safe-area-inset-top)] md:px-5">
          <Search size={18} strokeWidth={1.5} className="shrink-0 text-ink-3" aria-hidden />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onInputKey} placeholder="Search for coins and users…"
            role="combobox" aria-expanded={opts.length > 0} aria-controls={listId} aria-autocomplete="list" aria-activedescendant={activeId} aria-label="Search for coins and users"
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} enterKeyHint="search" data-testid="search-input"
            className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3 md:h-[60px] md:text-base" />
          {q && <button type="button" onClick={() => { setQ(""); input.current?.focus(); }} aria-label="Clear search" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-3 hover:bg-control hover:text-ink"><X size={16} /></button>}
          <button type="button" onClick={onClose} className="shrink-0 rounded-full px-2.5 py-1 text-sm text-ink-2 hover:bg-control md:hidden">Close</button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
          {!query && (
            <div>
              <div className="flex items-center justify-between px-5 pt-4 md:px-6">
                <div role="tablist" aria-label="Discover" className="inline-flex rounded-full bg-control p-[3px]">
                  {([["hot", "Hot coins"], ["traders", "Top traders"]] as const).map(([id, label]) => (
                    <button key={id} type="button" role="tab" aria-selected={tab === id} aria-controls={`${uid}-strip`} id={`${uid}-tab-${id}`} onClick={() => setTab(id)}
                      className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium ${tab === id ? "bg-gold-soft text-ink" : "text-ink-3 hover:text-ink"}`}>{label}</button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => scrollBy(-1)} disabled={ends.left} aria-label="Scroll left" className="flex h-8 w-8 items-center justify-center rounded-full text-ink-2 hover:bg-control disabled:opacity-30"><ChevronLeft size={17} strokeWidth={1.5} /></button>
                  <button type="button" onClick={() => scrollBy(1)} disabled={ends.right} aria-label="Scroll right" className="flex h-8 w-8 items-center justify-center rounded-full text-ink-2 hover:bg-control disabled:opacity-30"><ChevronRight size={17} strokeWidth={1.5} /></button>
                </div>
              </div>
              <div id={`${uid}-strip`} role="tabpanel" aria-labelledby={`${uid}-tab-${tab}`} ref={strip} onScroll={syncEnds}
                className="no-scrollbar flex snap-x gap-2.5 overflow-x-auto scroll-px-5 px-5 pb-1 pt-3 md:scroll-px-6 md:px-6">
                {items === null && !stripErr && Array.from({ length: 4 }, (_, i) => <div key={i} className="h-[136px] w-[164px] shrink-0 animate-pulse rounded bg-control md:w-[172px]" aria-hidden />)}
                {stripErr && <p className="py-8 text-sm text-ink-3">Could not load {tab === "hot" ? "hot coins" : "top traders"}. Try again in a moment.</p>}
                {items?.length === 0 && <p className="py-8 text-sm text-ink-3">{tab === "hot" ? "No coins yet." : "No trades yet."}</p>}
                {tab === "hot" && hot?.map((c) => <CoinCard key={c.mint} c={c} onOpen={openToken} root={strip} />)}
                {tab === "traders" && traders?.map((t) => <TraderCard key={t.wallet} t={t} />)}
              </div>
            </div>
          )}
          <div id={listId} role="listbox" aria-label={query ? "Search results" : "Recent coins"}>
            {!query && (
              <>
                {hist.searched.length > 0 && <Section title="Recently searched" action={clearBtn("searched")}>{histRows("searched", 5)}</Section>}
                {hist.viewed.length > 0 && <Section title="Recently viewed" action={clearBtn("viewed")}>{histRows("viewed", 10)}</Section>}
              </>
            )}
            {query && (
              <>
                {tokens.length > 0 && <Section title="Coins">{tokens.map((t) => { const id = `${uid}-t-${t.mint}`; return <TokenRow key={id} id={id} t={t} active={id === activeId} fav={favs.includes(t.mint)} onOpen={() => openToken(t)} onHover={() => setActive(idx(id))} />; })}</Section>}
                {users.length > 0 && <Section title="Users">{users.map((u: SearchUser) => { const id = `${uid}-u-${u.wallet}`; return (
                  <ActionRow key={id} id={id} active={id === activeId} icon={<Wallet size={15} strokeWidth={1.5} />} title={u.label || shortAddr(u.wallet, 5)}
                    sub={<>{shortAddr(u.wallet, 5)}{u.volumeSol != null && <span className="ml-2">{fmtSol(u.volumeSol, 1)} SOL volume</span>}{u.pnlSol != null && <span className={`ml-2 ${u.pnlSol >= 0 ? "text-buy" : "text-sell opacity-80"}`}>PnL est. {u.pnlSol >= 0 ? "+" : ""}{fmtSol(u.pnlSol)} SOL</span>}</>} onRun={() => openWallet(u.wallet)} onHover={() => setActive(idx(id))} />); })}</Section>}
                {noHit && addr && (
                  <Section title="No match yet">
                    <ActionRow id={`${uid}-ot`} active={activeId === `${uid}-ot`} icon={<Search size={15} strokeWidth={1.5} />} title="Open token" sub={shortAddr(addr, 6)} onRun={() => opts[idx(`${uid}-ot`)]?.run()} onHover={() => setActive(idx(`${uid}-ot`))} />
                    <ActionRow id={`${uid}-ow`} active={activeId === `${uid}-ow`} icon={<ExternalLink size={15} strokeWidth={1.5} />} title="Open wallet" sub={`${shortAddr(addr, 6)} on the explorer`} onRun={() => openWallet(addr)} onHover={() => setActive(idx(`${uid}-ow`))} />
                  </Section>
                )}
              </>
            )}
          </div>
          {!query && !hist.searched.length && !hist.viewed.length && <p className="px-6 pb-2 pt-8 text-center text-sm text-ink-3">Coins you search for and open show up here.</p>}
          <p className="sr-only" aria-live="polite">{query && done && !done.err ? `${tokens.length + users.length} results` : ""}</p>
          {query && query.length < SEARCH_MIN_CHARS && <p className="px-6 py-8 text-center text-sm text-ink-3">Keep typing…</p>}
          {query.length >= SEARCH_MIN_CHARS && !done && <p className="px-6 py-8 text-center text-sm text-ink-3">Searching…</p>}
          {done?.err && <p className="px-6 py-8 text-center text-sm text-ink-3">Search is unavailable right now. Try again in a moment.</p>}
          {noHit && !addr && <p className="px-6 py-8 text-center text-sm text-ink-3">No coins or users match “{query}”</p>}
        </div>

        <div className="hidden shrink-0 items-center gap-4 border-t border-border px-5 py-2.5 text-xs text-ink-3 md:flex" aria-hidden>
          <span className="flex items-center gap-1.5"><kbd className="num rounded bg-control px-1.5 py-0.5 text-[11px] text-ink-2">↵</kbd>to search</span>
          <span className="flex items-center gap-1.5"><kbd className="num rounded bg-control px-1.5 py-0.5 text-[11px] text-ink-2">esc</kbd>to close</span>
          <kbd className="num ml-auto rounded bg-control px-1.5 py-0.5 text-[11px] text-ink-2">{isMac() ? "⌘K" : "Ctrl K"}</kbd>
        </div>
      </div>
    </div>
  );
}
