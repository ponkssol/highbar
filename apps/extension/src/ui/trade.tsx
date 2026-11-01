/** Side panel > Trade (v0.4.0): a dense trading box. Paste a CA or token link, see price, market numbers, the token audit and
 *  your PnL, then quick buy (SOL chips) or quick sell (percent chips) with the active wallet. Below it the wallet's positions;
 *  clicking one loads it into the box. Trades go over the worker's "sell" port, exactly like the CA popup and the Holding panel:
 *  the worker adds the priority fee and the 0.02% highbar fee (when /config enables it), signs, simulates and sends. No key or
 *  signed transaction ever reaches this page. */
import { useCallback, useEffect, useRef, useState } from "react";
import { send, type CaPosition, type Holding, type SellPortIn, type SellPortOut, type WalletStatus } from "../lib/messages";
import type { CaInfo } from "../lib/ca";
import { fmtChange, fmtUsdCompact, fmtUsdPrice } from "../lib/ca";
import type { TokenAudit } from "../lib/audit";
import { auditShields, type AuditLevel } from "../lib/audit";
import type { FeeInfo } from "../lib/feemath";
import type { SellStep } from "../lib/sell";
import { pnl, type Pnl } from "../lib/ledger";
import { compactNum, compactPct, compactSol, tinySol } from "../lib/compact";
import { CA_SLIPPAGE_PRESETS } from "../lib/caprefs";
import { PRIORITY_PRESETS_SOL } from "../lib/priomath";
import { PANEL_BUY_SOL, PANEL_SELL_PCT, parseCaInput, parseSolAmount, sortPositions, tradeLabel, trend } from "../lib/panel";
import { playSfx, primeSfx } from "../lib/sfx";
import { short } from "../lib/format";
import { useAsync } from "./hooks";
import { Copy, Dropdown, Empty, Note, SolAmt, SolanaMark, errText, type ToastKind } from "./components/ui";

type Toast = (kind: ToastKind, text: string, url?: string) => void;
const STEP: Record<SellStep, string> = { build: "Building", sign: "Signing in the extension", simulate: "Simulating", send: "Sending", confirm: "Confirming on Solana" };
const TXT = { up: "text-buy", dn: "text-sell", flat: "text-ink-3" } as const;
/** The section label used across the panel: small caps, gold. */
export function Label({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return <div className="flex h-5 items-center justify-between gap-2"><span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold-text">{children}</span>{right != null && <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-ink-3">{right}</span>}</div>;
}
export function RefreshIcon({ spin }: { spin?: boolean }) {
  return <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true" className={spin ? "animate-spin" : ""}><path d="M13 8a5 5 0 1 1-1.46-3.54" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><path d="M13 2.75V5.5h-2.75" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
const TokenImg = ({ src, size = 28 }: { src: string | null; size?: number }) => src
  ? <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-[8px] border border-border object-cover" style={{ width: size, height: size }} />
  : <span className="shrink-0 rounded-[8px] border border-border bg-muted" style={{ width: size, height: size }} />;

export function TradeTab({ st, toast, mint, setMint }: { st: WalletStatus; toast: Toast; mint: string | null; setMint: (m: string | null) => void }) {
  const port = useAsync(() => send({ type: "portfolio" }), [st.walletId]);
  const [q, setQ] = useState(mint ?? "");
  const bad = q.trim() !== "" && parseCaInput(q) === null;
  useEffect(() => { if (mint && mint !== parseCaInput(q)) setQ(mint); }, [mint]); // eslint-disable-line react-hooks/exhaustive-deps
  const onInput = (v: string) => { setQ(v); const m = parseCaInput(v); if (m) setMint(m); else if (!v.trim()) setMint(null); };
  // close the open token: back to the home view (balance, search, Holding); the next token gets a fresh trade box
  const closeToken = useCallback(() => { setQ(""); setMint(null); }, [setMint]);
  useEffect(() => {
    if (!mint) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      // an open dropdown (or the wallet picker) closes first
      if (document.querySelector('[role="listbox"], [aria-expanded="true"]')) return;
      closeToken();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [mint, closeToken]);
  const tokens = sortPositions(port.data?.tokens ?? []);
  const totalTok = tokens.reduce((a, t) => a + (t.valueSol ?? 0), 0);
  return (
    <div className="space-y-3">
      {/* balance: the one big number, tokens beside it */}
      <section className="flex items-end justify-between gap-3 px-1 pt-1" data-testid="hb-assets">
        <div className="min-w-0">
          <div className="truncate text-[20px] font-semibold leading-none tracking-tight text-ink" data-testid="hb-balance"><SolAmt v={port.data?.sol} /></div>
          <div className="mt-1 truncate text-[11px] text-ink-3">{port.data ? <>+ <SolAmt v={totalTok} /> in {tokens.length} token{tokens.length === 1 ? "" : "s"}</> : "\u00a0"}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2 font-mono text-[11px] text-ink-3"><span title={st.address ?? ""}>{short(st.address ?? "", 4)}</span><Copy text={st.address ?? ""} label="Copy" /></div>
      </section>
      {/* token search */}
      <label className={`flex h-9 items-center gap-2 rounded-[10px] border bg-control px-3 focus-within:border-gold-line ${bad ? "border-[rgba(224,106,92,.40)]" : "border-border"}`}>
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true" className="shrink-0 text-ink-3"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" /><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
        <input value={q} onChange={(e) => onInput(e.currentTarget.value)} placeholder="Paste a token CA or link" spellCheck={false} autoComplete="off" aria-label="Token address" data-testid="hb-ca-input"
          className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-ink outline-none placeholder:font-sans placeholder:text-ink-3" />
        {(q || mint) && <button type="button" aria-label={mint ? "Close token" : "Clear"} title={mint ? "Close token (Esc)" : "Clear"} data-testid="hb-ca-clear" className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-control-hover hover:text-ink" onClick={closeToken}>×</button>}
      </label>
      {bad && <div className="truncate px-1 text-[11px] text-sell">Not a Solana token address or token link</div>}
      {mint && <TokenBox key={`${mint}:${st.walletId}`} st={st} mint={mint} toast={toast} onTraded={() => void port.reload()} onClose={closeToken} />}
      {/* held tokens: tap one to trade it */}
      <section>
        <Label right={<button type="button" aria-label="Refresh holdings" className="grid h-6 w-6 place-items-center rounded-full text-ink-3 hover:bg-control-hover hover:text-ink disabled:opacity-50" disabled={port.busy} onClick={() => void port.reload()}><RefreshIcon spin={port.busy} /></button>}>Holding{tokens.length ? ` · ${tokens.length}` : ""}</Label>
        {port.err && <div className="mt-1"><Note kind="error"><span data-testid="portfolio-error">{port.err}</span></Note></div>}
        {port.data && tokens.length === 0 ? <div className="mt-1"><Empty title="Nothing held yet">Paste a CA above to buy, or launch a coin</Empty></div> : (
          <ul className="mt-1 divide-y divide-border overflow-hidden rounded-[10px] border border-border bg-surface" data-testid="hb-positions">
            {tokens.map((t) => <PosRow key={t.mint} t={t} on={t.mint === mint} onPick={() => { setQ(t.mint); setMint(t.mint); scrollTo({ top: 0, behavior: "smooth" }); }} />)}
          </ul>
        )}
      </section>
    </div>
  );
}

function PosRow({ t, on, onPick }: { t: Holding; on: boolean; onPick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onPick} data-testid="hb-position" aria-current={on || undefined} title={t.name ?? t.mint}
        className={`grid h-12 w-full grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 px-3 text-left hover:bg-control-hover ${on ? "bg-[rgba(255,199,44,.06)]" : ""}`}>
        <TokenImg src={t.image} size={28} />
        <span className="min-w-0">
          <span className="block truncate text-[12px] font-semibold text-ink">{t.symbol ? `$${t.symbol}` : short(t.mint, 4)}</span>
          <span className="block truncate font-mono text-[11px] text-ink-3">{compactNum(t.amount)}</span>
        </span>
        <span className="text-right font-mono text-[12px] text-ink-2">{t.valueSol != null ? <SolAmt v={t.valueSol} /> : <span className="text-ink-3">–</span>}</span>
      </button>
    </li>
  );
}

type Run = { side: "buy" | "sell"; amt: number; step: SellStep } | null;

function TokenBox({ st, mint, toast, onTraded, onClose }: { st: WalletStatus; mint: string; toast: Toast; onTraded: () => void; onClose: () => void }) {
  const [info, setInfo] = useState<CaInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [audit, setAudit] = useState<TokenAudit | null>(null);
  const [pos, setPos] = useState<CaPosition | null>(null);
  const [fee, setFee] = useState<(FeeInfo & { prioritySol: number }) | null>(null);
  const [slip, setSlip] = useState<number | null>(null);
  const [run, setRun] = useState<Run>(null);
  const [custom, setCustom] = useState("");
  const [sol, setSol] = useState<number | null>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const loadPos = useCallback(() => { if (st.walletId) void send({ type: "ca:position", walletId: st.walletId, mint }).then((p) => alive.current && setPos(p)).catch(() => {}); }, [st.walletId, mint]);
  const loadSol = useCallback(() => { void send({ type: "wallets:list", balances: true, fresh: true }).then((l) => alive.current && setSol(l.find((w) => w.active)?.sol ?? null)).catch(() => {}); }, []);
  useEffect(() => {
    setInfo(null); setErr(null);
    let t: ReturnType<typeof setTimeout> | null = null;
    const get = (fresh: boolean) => send({ type: "ca:info", mint, fresh }).then((i) => { if (!alive.current) return; setInfo(i); if (i.partial) t = setTimeout(() => void get(true), 1500); }, (e) => alive.current && setErr(errText(e)));
    void get(false);
    void send({ type: "ca:audit", mint }).then((a) => alive.current && setAudit(a)).catch(() => {});
    void send({ type: "fee:info" }).then((f) => alive.current && setFee(f)).catch(() => {});
    void send({ type: "ca:prefs:get" }).then((p) => alive.current && setSlip(p.slippagePct)).catch(() => {});
    loadPos(); loadSol();
    // live header numbers every 3 s while the panel is visible (the worker caches and batches them)
    const live = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void send({ type: "ca:live", mint }).then((l) => alive.current && setInfo((o) => o && { ...o, priceUsd: l.priceUsd ?? o.priceUsd, mcapUsd: l.mcapUsd ?? o.mcapUsd, change24h: l.change24h ?? o.change24h, volume24hUsd: l.volume24hUsd ?? o.volume24hUsd, liquidityUsd: l.liquidityUsd ?? o.liquidityUsd })).catch(() => {});
    }, 3000);
    return () => { clearInterval(live); if (t) clearTimeout(t); };
  }, [mint, loadPos, loadSol]);

  let raw = 0n;
  try { raw = pos ? BigInt(pos.balanceRaw) : 0n; } catch { raw = 0n; }
  const held = raw > 0n;
  const sym = info?.symbol ?? "";
  const priceSol = info?.priceUsd != null && pos?.solUsd ? info.priceUsd / pos.solUsd : null;
  const p = pos && held ? pnl(raw, pos.decimals, priceSol, pos.entries) : null;
  const canTrade = st.ready && !run && !!st.walletId;

  const trade = (side: "buy" | "sell", amt: number) => {
    if (!canTrade || slip === null) return;
    primeSfx();
    setRun({ side, amt, step: "build" });
    const port = chrome.runtime.connect({ name: "sell" });
    let ended = false;
    const end = () => { if (ended) return; ended = true; try { port.disconnect(); } catch { /* gone */ } if (alive.current) setRun(null); loadPos(); loadSol(); onTraded(); setTimeout(() => alive.current && loadPos(), 4000); };
    let sent = false;
    const what = side === "buy" ? "Buy" : "Sell";
    port.onMessage.addListener((m: SellPortOut) => {
      if (m.type === "step") { if (alive.current && !sent) setRun({ side, amt, step: m.step }); }
      // fast mode: "Sent" at once and the panel is free again; the confirmation runs in the background
      else if (m.type === "sent") { sent = true; toast("ok", `${what} sent`, m.solscanUrl); playSfx("ok"); if (alive.current) setRun(null); }
      else if (m.type === "done") { if (!sent) { toast("ok", `${what} success`, m.solscanUrl); playSfx("ok"); } end(); }
      else { toast(/holds none of this token/.test(m.error) ? "info" : "err", sent ? `${what} failed: ${m.error}` : m.error); playSfx("err"); end(); }
    });
    port.onDisconnect.addListener(() => { if (!ended) { toast("err", "The extension stopped answering. Check Solscan before you try again."); end(); } });
    const msg: SellPortIn = side === "buy"
      ? { type: "sell", side: "buy", walletId: st.walletId!, mint, pct: 0, sol: amt, slippagePct: slip }
      : { type: "sell", side: "sell", walletId: st.walletId!, mint, pct: amt, slippagePct: slip };
    port.postMessage(msg);
  };
  const customSol = parseSolAmount(custom);
  const slipOpts = [...new Set([...CA_SLIPPAGE_PRESETS, 10, 20, ...(slip !== null ? [slip] : [])])].sort((a, b) => a - b);
  const prioOpts = [...new Set([...PRIORITY_PRESETS_SOL, ...(fee ? [fee.prioritySol] : [])])].sort((a, b) => a - b);
  // one settings row for both sides (no repeated labels): slippage, priority, the fee note
  const meta = (
    <div className="flex h-8 min-w-0 items-center gap-2 text-[11px] text-ink-3" data-testid="hb-trade-meta">
      <Dropdown className="w-[68px] shrink-0" label="Slippage" testId="hb-slip" value={String(slip ?? "")} align="left"
        options={slipOpts.map((v) => ({ id: String(v), label: `${v}%` }))} onChange={(v) => { const n = Number(v); setSlip(n); void send({ type: "ca:prefs:set", slippagePct: n }).catch(() => {}); }} />
      <Dropdown className="w-[84px] shrink-0" label="Priority fee" testId="hb-prio" value={String(fee?.prioritySol ?? "")} align="left"
        options={prioOpts.map((v) => ({ id: String(v), label: `${v}` }))} onChange={(v) => { const n = Number(v); void send({ type: "priority:set", sol: n }).then((r) => alive.current && setFee((f) => f && { ...f, prioritySol: r.prioritySol })).catch((e) => toast("err", errText(e))); }} />
      {fee?.enabled && <span className="ml-auto min-w-0 truncate" title="The highbar fee, added on top of the amount">Fee 0.02%</span>}
    </div>
  );
  const PRE = "h-8 min-w-0 rounded-[8px] border font-mono text-[12px] disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <section className="overflow-hidden rounded-[12px] border border-gold-line bg-surface" data-testid="hb-trade-box">
      {/* token head */}
      <div className="grid grid-cols-[32px_minmax(0,1fr)_auto_24px] items-center gap-2 px-3 pt-3">
        <TokenImg src={info?.image ?? null} size={32} />
        <div className="min-w-0">
          <div className="flex min-w-0 items-baseline gap-1"><span className="truncate text-[13px] font-semibold text-ink" data-testid="hb-token-name">{sym ? `$${sym}` : info?.name ?? (err ? "Unknown token" : "Loading…")}</span></div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-ink-3"><span title={info?.name ? `${info.name} · ${mint}` : mint}>{short(mint, 4)}</span><Copy text={mint} label="Copy" />{info?.tokenUrl && <a className="font-sans text-gold-text hover:underline" href={info.tokenUrl} target="_blank" rel="noreferrer">Open</a>}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[13px] text-ink" data-testid="hb-token-price">{fmtUsdPrice(info?.priceUsd ?? null)}</div>
          <div className={`font-mono text-[11px] ${TXT[trend(info?.change24h)]}`}>{fmtChange(info?.change24h ?? null)}</div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close token" title="Close (Esc)" data-testid="hb-token-close"
          className="grid h-6 w-6 place-items-center self-start rounded-full text-ink-3 hover:bg-control-hover hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold-line">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      </div>
      {err && <div className="px-3 pt-2"><Note kind="error">{err}</Note></div>}
      <AuditChips a={audit} />
      {/* quick trade: buy chips, custom amount, sell chips, one settings row */}
      <div className="space-y-2 border-t border-border px-3 pb-1 pt-3" data-testid="hb-quick">
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="Quick buy in SOL">
          {PANEL_BUY_SOL.map((v) => (
            <button key={v} type="button" disabled={!canTrade} onClick={() => trade("buy", v)} title={tradeLabel("buy", v)} aria-label={tradeLabel("buy", v)} data-testid={`hb-panel-buy-${v}`}
              className={`${PRE} border-[rgba(76,182,122,.40)] text-buy hover:bg-[rgba(76,182,122,.10)]`}>{v}</button>
          ))}
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <label className="flex h-8 min-w-0 items-center gap-2 rounded-[8px] border border-border bg-control px-2 focus-within:border-gold-line">
            <SolanaMark className="text-ink-3" />
            <input value={custom} onChange={(e) => setCustom(e.currentTarget.value)} inputMode="decimal" placeholder="Amount" aria-label="Custom buy in SOL" data-testid="hb-panel-buy-custom"
              onKeyDown={(e) => { if (e.key === "Enter" && customSol !== null) trade("buy", customSol); }}
              className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-ink outline-none placeholder:font-sans placeholder:text-ink-3" />
            <span className="shrink-0 font-mono text-[11px] text-ink-3" data-testid="hb-buy-bal" title="SOL balance">{sol == null ? "" : `/ ${compactSol(sol)}`}</span>
          </label>
          <button type="button" disabled={!canTrade || customSol === null} onClick={() => customSol !== null && trade("buy", customSol)} data-testid="hb-panel-buy-go"
            className="h-8 w-[88px] rounded-[8px] bg-buy text-[12px] font-semibold text-on-ink hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">Buy</button>
        </div>
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="Quick sell percent">
          {PANEL_SELL_PCT.map((v) => (
            <button key={v} type="button" disabled={!canTrade || !held} onClick={() => trade("sell", v)} title={tradeLabel("sell", v)} aria-label={tradeLabel("sell", v)} data-testid={`hb-panel-sell-${v}`}
              className={`${PRE} border-[rgba(224,106,92,.40)] text-sell hover:bg-[rgba(224,106,92,.10)]`}>{v}%</button>
          ))}
        </div>
        {meta}
      </div>
      {(run || !st.ready) && (
        <div className="truncate border-t border-border px-3 py-1 text-[11px] text-ink-3" data-testid="hb-trade-step">
          {run ? `${tradeLabel(run.side, run.amt)} · ${STEP[run.step]}…` : "Finish the wallet update to trade"}
        </div>
      )}
      {/* position: holding, value, PnL (only when held) */}
      {held && p && (
        <PosLine amt={Number(raw) / 10 ** pos!.decimals} sym={info?.symbol ?? ""} p={p} />
      )}
      <PanelChart mint={mint} info={info} />
      <div className="grid grid-cols-3 border-t border-border text-center">
        {[["MC", info?.mcapUsd], ["Vol 24h", info?.volume24hUsd], ["Liq", info?.liquidityUsd]].map(([k, v]) => (
          <div key={k as string} className="min-w-0 py-2"><div className="text-[10px] text-ink-3">{k as string}</div><div className="truncate font-mono text-[11px] text-ink-2">{fmtUsdCompact((v as number | null | undefined) ?? null)}</div></div>
        ))}
      </div>
    </section>
  );
}

/** The same chart page as the x.com popup (chart.html: GMGN embed first, highbar's own chart as the fallback). */
function PanelChart({ mint, info }: { mint: string; info: CaInfo | null }) {
  if (!info) return <div className="mx-3 mb-3 h-[150px] rounded-[8px] border border-border bg-[#0F0E0B]" />;
  const src = `chart.html?mint=${encodeURIComponent(mint)}${info.highbar ? "&hb=1" : ""}${mint.endsWith("pump") ? "&pf=1" : ""}`;
  return <div className="mx-3 mb-3 h-[132px] overflow-hidden rounded-[8px] border border-border bg-[#0F0E0B]" data-testid="hb-panel-chart"><iframe title="Price chart" src={src} className="h-full w-full border-0" /></div>;
}

/** The position as one line (amount · value · PnL (PnL %)), the same as the x.com popup; average buy and invested in the tooltip. */
function PosLine({ amt, sym, p }: { amt: number; sym: string; p: Pnl }) {
  const sol = (n: number | null, signed = false) => (n == null || !Number.isFinite(n) ? "—" : `${compactSol(n, signed)} SOL`);
  const tip = `Holding ${compactNum(amt)}${sym ? ` $${sym}` : ""}\nValue ${sol(p.valueSol)}\nAvg buy ${tinySol(p.avgSol)}\nInvested ${sol(p.investedSol)}\nUnrealized PnL ${sol(p.pnlSol, true)}${p.pnlPct == null ? "" : ` (${compactPct(p.pnlPct)})`}`;
  return (
    <div className="flex h-7 cursor-help items-baseline gap-1.5 overflow-hidden whitespace-nowrap border-t border-border px-3 pt-[6px] text-[11px]" title={tip} aria-label={tip.replace(/\n/g, ", ")} data-testid="hb-panel-pnl">
      <span className="font-mono text-ink">{compactNum(amt)}</span>{sym ? <span className="text-[10px] text-ink-3">${sym}</span> : null}
      <i className="not-italic text-ink-3" aria-hidden="true">·</i>
      <span className="font-mono text-gold-text">{sol(p.valueSol)}</span>
      <i className="not-italic text-ink-3" aria-hidden="true">·</i>
      <span className={`min-w-0 truncate font-mono ${TXT[trend(p.pnlSol)]}`}>{p.pnlSol == null ? "PnL —" : compactSol(p.pnlSol, true)}{p.pnlPct == null ? "" : ` (${compactPct(p.pnlPct)})`}</span>
    </div>
  );
}


const CHIP: Record<AuditLevel, string> = { ok: "border-[rgba(76,182,122,.30)] text-buy", bad: "border-[rgba(224,106,92,.30)] text-sell", warn: "border-gold-line text-gold-text", na: "border-border text-ink-3", neutral: "border-border text-ink-2" };
/** The token audit as four small chips (same checks and wording as the x.com popup). Hover or focus shows what a chip checks and
 *  this token's result in a small CSS-only tooltip (below the row, kept inside the panel); the same text is the aria-label. */
function AuditChips({ a }: { a: TokenAudit | null }) {
  return (
    <div className="flex flex-wrap justify-between gap-1 px-3 py-2 [&>*]:flex-[1_0_auto]" role="list" aria-label="Token audit" data-testid="hb-panel-audit">
      {auditShields(a).map((s, i) => (
        <span key={s.key} role="listitem" tabIndex={0} aria-label={`${s.label}: ${s.tip}`} data-k={s.key}
          className={`group relative flex h-5 min-w-0 cursor-help items-center justify-center gap-[3px] whitespace-nowrap rounded-full border px-1 text-[10px] tracking-[-0.01em] outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold-line ${CHIP[s.level]}`}>
          <svg viewBox="0 0 16 16" width="9" height="9" fill="none" aria-hidden="true" className="shrink-0"><path d="M8 1.6 13.2 3.5v4.1c0 3.2-2.2 5.6-5.2 6.8-3-1.2-5.2-3.6-5.2-6.8V3.5L8 1.6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
          <span>{s.label}</span>{s.mark && <span className="shrink-0">{s.mark}</span>}
          <span role="tooltip" data-testid="hb-panel-audit-tip" className={`pointer-events-none absolute top-full z-50 mt-1 hidden w-max max-w-[200px] whitespace-normal rounded-md border border-gold-line bg-[#111] px-[7px] py-[5px] text-left text-[10.5px] leading-[1.4] tracking-normal text-ink shadow-[0_8px_24px_rgba(0,0,0,.5)] group-hover:block group-focus-visible:block ${i < 2 ? "left-0" : "right-0"}`}>{s.tip}<span className="mt-0.5 block text-[9.5px] text-ink-3">On-chain, read through your RPC</span></span>
        </span>
      ))}
    </div>
  );
}
