import { useEffect, useRef, useState } from "react";
import { playSfx, primeSfx } from "../lib/sfx";
import { createRoot } from "react-dom/client";
import { send, type HistoryItem, type WalletRow, type WalletStatus } from "../lib/messages";
import { cleanRpcUrl, type Presets, type Settings } from "../lib/settings";
import { PRIORITY_PRESETS_SOL, priorityError } from "../lib/priomath";
import { fmtDate, fmtDateTime, fmtNum, fmtSol, fmtUsd, short, solscan } from "../lib/format";
import type { ClaimRow } from "../lib/api";
import { useAsync, useStatus } from "./hooks";
import { Button, Card, Copy, Dropdown, TabBar, Empty, Eyebrow, Field, INPUT, InfoTip, Note, SolAmt, SolanaMark, Switch, TierDot, Toasts, errText, useToasts } from "./components/ui";
import { Label, RefreshIcon, TradeTab } from "./trade";
import { parseCaInput, sortPositions, toastMs } from "../lib/panel";
import { HB_MARK_PATH, HB_MARK_VIEWBOX } from "../lib/icons";
import { DedicatedWarning, ExportBox, MigrateForm, Onboard, RemoveWallet } from "./wallet-forms";
import { nextWalletLabel, WALLET_LABEL_MAX } from "../lib/wallets";

type Tab = "trade" | "portfolio" | "wallet" | "history" | "fees" | "settings";
/** The bottom nav (icon over a short label), left to right. Settings keeps its accessible name for tests and screen readers. */
const TABS: { id: Tab; label: string; icon: () => React.ReactNode }[] = [
  { id: "trade", label: "Trade", icon: TRADE_ICON }, { id: "portfolio", label: "Portfolio", icon: PIE_ICON }, { id: "wallet", label: "Wallets", icon: WALLET_ICON },
  { id: "history", label: "History", icon: CLOCK_ICON }, { id: "fees", label: "Fees", icon: COIN_ICON }];
const ALL_TABS: Tab[] = ["trade", "portfolio", "wallet", "history", "fees", "settings"];
const TITLE: Record<Tab, string> = { trade: "Trade", portfolio: "Portfolio", wallet: "Wallets", history: "History", fees: "Fees", settings: "Settings" };

function App() {
  const { st, err, reload } = useStatus();
  const q = new URLSearchParams(location.search);
  const initial = (q.get("tab") as Tab | null) ?? (location.hash.slice(1) as Tab) ?? "trade";
  const [tab, setTab] = useState<Tab>(ALL_TABS.includes(initial) ? initial : "trade");
  const [mint, setMint] = useState<string | null>(parseCaInput(q.get("ca") ?? ""));
  const toasts = useToasts(toastMs);
  // Keeps the setup view (and the one time recovery phrase) on screen after the wallet exists.
  const [inSetup, setInSetup] = useState(false);
  useEffect(() => { history.replaceState(null, "", `${location.search}#${tab}`); window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }); }, [tab]);
  if (err) return <Shell st={null} tab={tab} setTab={setTab} reload={reload}><Note kind="error">{err}</Note></Shell>;
  if (!st) return <Shell st={null} tab={tab} setTab={setTab} reload={reload}><div className="py-10 text-center text-ink-3">Loading…</div></Shell>;
  const needsWallet = !st.exists || inSetup;
  return (
    <Shell st={st} tab={tab} setTab={setTab} reload={reload}>
      <Toasts items={toasts.items} />
      <div className="space-y-2.5">
        {tab === "settings" && !inSetup ? <SettingsTab st={st} /> : needsWallet ? (tab === "wallet" ? <Card><Eyebrow>Set up a launch wallet</Eyebrow><Onboard onBackup={() => setInSetup(true)} onDone={() => { setInSetup(false); void reload(); }} /></Card> : <Empty title="No wallet yet"><button className="text-gold-text hover:underline" onClick={() => setTab("wallet")}>Create or import one</button> to get started</Empty>)
          : st.needsMigration && tab !== "history" && tab !== "wallet" ? <Card><Eyebrow>Finish the update · {st.label}</Eyebrow><MigrateForm id={st.walletId ?? undefined} onDone={reload} />{st.walletCount > 1 && <div className="mt-3 text-center text-[12px] text-ink-3">Or <button className="text-gold-text hover:underline" onClick={() => setTab("wallet")}>switch to another wallet</button></div>}</Card>
          : tab === "trade" ? <TradeTab st={st} toast={toasts.show} mint={mint} setMint={setMint} />
          : tab === "portfolio" ? <PortfolioTab st={st} onSettings={() => setTab("settings")} onPick={(m) => { setMint(m); setTab("trade"); }} />
          : tab === "wallet" ? <WalletTab st={st} reload={reload} />
          : tab === "history" ? <HistoryTab st={st} />
          : <FeesTab st={st} />}
      </div>
    </Shell>
  );
}

/** The panel frame: a sticky header (mark, section title, wallet picker with its SOL balance), the scrolling content on a
 *  12 px grid, and a fixed bottom icon nav. Colors are the existing highbar tokens only. */
function Shell({ st, tab, setTab, reload, children }: { st: WalletStatus | null; tab: Tab; setTab: (t: Tab) => void; reload: () => void; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[520px] flex-col">
      {/* header: mark, the wallet picker (with its balance), settings tucked behind the gear */}
      <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-bg/95 px-3 backdrop-blur" data-testid="hb-header">
        <HbMark />
        <h1 className="sr-only" data-testid="hb-title">{TITLE[tab]}</h1>
        {st?.exists ? <WalletPick st={st} reload={reload} /> : <span className="text-[12px] font-semibold text-ink">highbar</span>}
        <span className="flex-1" />
        <button type="button" aria-label="Settings" title="Settings" aria-pressed={tab === "settings"} onClick={() => setTab(tab === "settings" ? "trade" : "settings")} data-testid="hb-nav-settings"
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-[8px] border ${tab === "settings" ? "border-gold-line bg-gold-soft text-gold-text" : "border-border text-ink-3 hover:bg-control-hover hover:text-ink"}`}>{GEAR_ICON()}</button>
      </header>
      <main className="flex-1 px-3 pb-[72px] pt-3">{children}</main>
      <nav role="tablist" aria-label="Sections" className="fixed inset-x-0 bottom-0 z-30 mx-auto grid h-14 max-w-[520px] grid-cols-5 border-t border-border bg-bg" data-testid="hb-nav">
        {TABS.map((t) => (
          <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} aria-label={t.label} title={t.label} onClick={() => setTab(t.id)} data-testid={`hb-nav-${t.id}`}
            className={`relative flex min-w-0 flex-col items-center justify-center gap-1 text-[10px] leading-none transition-colors ${tab === t.id ? "text-gold-text" : "text-ink-3 hover:text-ink-2"}`}>
            {tab === t.id && <i className="absolute inset-x-[24%] top-0 h-[2px] rounded-b-full bg-gold" aria-hidden="true" />}
            <span className={`grid h-6 w-10 place-items-center rounded-[8px] ${tab === t.id ? "bg-gold-soft" : ""}`}>{t.icon()}</span>
            <span className="max-w-full truncate px-0.5">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

/** Header wallet picker: the active wallet with its SOL balance; picking one makes it active (the panel follows). */
function WalletPick({ st, reload }: { st: WalletStatus; reload: () => void }) {
  const rows = useAsync(() => send({ type: "wallets:list", balances: true }), [st.walletId, st.walletCount, st.label]);
  const list = rows.data ?? [];
  const opts = list.length ? list.map((w) => ({ id: w.id, label: w.label, detail: <SolAmt v={w.sol} className="text-[11px]" />, title: w.address }))
    : [{ id: st.walletId ?? "", label: st.label ?? "Wallet", detail: <SolAmt v={null} className="text-[11px]" /> }];
  return (
    <div className="flex min-w-0 items-center gap-1.5" data-testid="header-wallet" title={`${st.label ?? ""} ${st.address ?? ""}`}>
      <i className={`h-1.5 w-1.5 shrink-0 rounded-full ${st.ready ? "bg-buy" : "bg-gold"}`} aria-hidden="true" />
      <Dropdown className="w-[176px] max-w-[56vw]" label="Active wallet" testId="hb-wallet-pick" value={st.walletId ?? ""} options={opts}
        onChange={(id) => { void send({ type: "wallet:select", id }).then(() => { reload(); void rows.reload(); }).catch(() => {}); }} />
    </div>
  );
}

function HbMark() {
  return <svg viewBox={HB_MARK_VIEWBOX} width="18" height="18" className="shrink-0" role="img" aria-label="highbar"><path fill="#FECA02" fillRule="evenodd" d={HB_MARK_PATH} /></svg>;
}
const ico = (d: React.ReactNode) => <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
function TRADE_ICON() { return ico(<><path d="M2.5 11.5l3.5-3.5 2.5 2.5 5-5" /><path d="M10 5.5h3.5V9" /></>); }
function PIE_ICON() { return ico(<><path d="M8 2.5a5.5 5.5 0 1 0 5.5 5.5H8z" /><path d="M10 1.8a4.5 4.5 0 0 1 4.2 4.2H10z" /></>); }
function WALLET_ICON() { return ico(<><rect x="2" y="4" width="12" height="9" rx="2" /><path d="M2 6.5h12M10.5 9.5h1.5" /><path d="M4 4l6-2 1 2" /></>); }
function CLOCK_ICON() { return ico(<><circle cx="8" cy="8" r="5.5" /><path d="M8 5v3l2 1.5" /></>); }
function COIN_ICON() { return ico(<><ellipse cx="8" cy="5" rx="5" ry="2.2" /><path d="M3 5v3c0 1.2 2.2 2.2 5 2.2s5-1 5-2.2V5M3 8v3c0 1.2 2.2 2.2 5 2.2s5-1 5-2.2V8" /></>); }

// ---------------- Portfolio ----------------
function PortfolioTab({ st, onSettings, onPick }: { st: WalletStatus; onSettings: () => void; onPick: (mint: string) => void }) {
  const { data, err, busy, reload } = useAsync(() => send({ type: "portfolio" }), [st.walletId]);
  const net = st.network ?? "devnet";
  const tokSol = data ? data.tokens.reduce((a, t) => a + (t.valueSol ?? 0), 0) : null;
  const total = data ? data.sol + (tokSol ?? 0) : null;
  return (
    <>
      {/* total assets: the big number left, SOL and tokens right, then one action row */}
      <section className="rounded-[10px] border border-border bg-surface" data-testid="hb-total">
        <div className="flex items-start justify-between gap-3 px-3 pt-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-[11px] text-ink-3">{st.walletCount > 1 ? <span className="truncate text-ink-2">{st.label} ·</span> : null}Total assets <InfoTip text="SOL in this wallet plus your tokens valued at the current highbar price. Tokens from other launchpads show without a value." /></div>
            <div className="mt-1 truncate text-[20px] font-semibold leading-none tracking-tight text-ink"><SolAmt v={total} /></div>
          </div>
          <dl className="grid shrink-0 grid-cols-[auto_auto] gap-x-2 gap-y-1 pt-0.5 text-[11px]">
            <dt className="text-ink-3">SOL</dt><dd className="text-right text-ink-2"><SolAmt v={data?.sol} /></dd>
            <dt className="text-ink-3">Tokens</dt><dd className="text-right text-ink-2"><SolAmt v={tokSol} /></dd>
          </dl>
        </div>
        <div className="mt-2.5 flex h-8 items-center gap-1.5 border-t border-border px-2 font-mono text-[11px] text-ink-3">
          <span className="min-w-0 flex-1 truncate" title={st.address ?? ""}>{short(st.address ?? "", 5)}</span>
          <Copy text={st.address ?? ""} label="Copy" />
          <a className="ml-1.5 text-gold-text hover:underline" href={solscan("account", st.address ?? "", net)} target="_blank" rel="noreferrer">Solscan</a>
          <button type="button" aria-label="Refresh" title="Refresh" className="ml-1 grid h-6 w-6 place-items-center rounded-full text-ink-3 hover:bg-control-hover hover:text-ink disabled:opacity-50" disabled={busy} onClick={() => void reload()}><RefreshIcon spin={busy} /></button>
        </div>
      </section>
      {err && <div className="flex min-w-0 items-center gap-2"><div className="min-w-0 flex-1" title={err}><Note kind="error"><span data-testid="portfolio-error">{err}</span></Note></div>{/RPC/.test(err) && <button type="button" className="shrink-0 text-[11px] font-medium text-gold-text hover:underline" onClick={onSettings}>Open Settings</button>}</div>}
      <section>
        <Label right={data ? <span>Updated {fmtDateTime(data.updatedAt)}</span> : null}>Tokens{data?.tokens.length ? ` · ${data.tokens.length}` : ""}</Label>
        {data && data.tokens.length === 0 ? <div className="mt-1"><Empty title="No tokens yet">Coins you launch or buy show up here</Empty></div> : (
          <ul className="mt-1 divide-y divide-border overflow-hidden rounded-[10px] border border-border bg-surface" data-testid="hb-portfolio-tokens">
            {sortPositions(data?.tokens ?? []).map((t) => (
              <li key={t.mint} className="grid grid-cols-[28px_minmax(0,1fr)_auto_auto] items-center gap-2 px-2.5 py-1.5">
                {t.image ? <img src={t.image} alt="" className="h-7 w-7 rounded-[8px] border border-border object-cover" /> : <span className="h-7 w-7 rounded-[8px] border border-border bg-muted" />}
                <div className="min-w-0">
                  <a href={`${st.siteUrl}/token/${t.mint}`} target="_blank" rel="noreferrer" className="block truncate text-[12px] font-medium text-ink hover:text-gold-text">{t.name ?? short(t.mint, 4)}</a>
                  <div className="truncate font-mono text-[11px] text-ink-3">{t.symbol ? `$${t.symbol}` : short(t.mint, 4)} · {fmtNum(t.amount)}</div>
                </div>
                <div className="text-right text-[11px] text-ink-2">{t.valueSol != null ? <SolAmt v={t.valueSol} /> : <span className="text-ink-3">–</span>}</div>
                <button type="button" className="h-6 rounded-full border border-gold-line px-2 text-[11px] text-gold-text hover:bg-gold-soft" onClick={() => onPick(t.mint)} aria-label={`Trade ${t.symbol ?? t.mint}`} data-testid="hb-portfolio-trade">Trade</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

// ---------------- Wallet & settings ----------------
function useSettings(st: WalletStatus) {
  const [s, setS] = useState<Settings | null>(null);
  useEffect(() => { void send({ type: "settings:get" }).then(setS); }, [st.presets]);
  const save = async (patch: Partial<Omit<Settings, "presets">> & { presets?: Partial<Presets> }) => setS(await send({ type: "settings:set", patch }));
  return { s, save };
}

function WalletTab({ st, reload }: { st: WalletStatus; reload: () => void }) {
  const { s, save } = useSettings(st);
  const rows = useAsync(() => send({ type: "wallets:list", balances: true }), [st.walletId, st.walletCount, st.label, st.ready]);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  if (!s) return null;
  const list = rows.data ?? [];
  const total = list.length && list.every((w) => w.sol != null) ? list.reduce((a, w) => a + (w.sol ?? 0), 0) : null;
  const select = async (id: string) => { if (id === st.walletId) return; await send({ type: "wallet:select", id }).catch(() => {}); reload(); };
  return (
    <>
      <Card>
        <div className="flex items-center justify-between">
          <Eyebrow className="!mb-0">Wallets <InfoTip text="The active wallet is the one Portfolio, History, Fees and the referral use. On x.com you pick the wallet that launches in the drawer." /></Eyebrow>
          <span className="flex items-center gap-3 text-[12px] text-ink-3">{total != null && list.length > 1 && <span>Total <SolAmt v={total} className="text-ink-2" /></span>}<button className="text-gold-text hover:underline disabled:opacity-50" disabled={rows.busy} onClick={() => void rows.reload()}>{rows.busy ? "Loading…" : "Refresh"}</button></span>
        </div>
        <ul className="mt-2 space-y-1.5" data-testid="wallet-list">
          {list.map((w) => <WalletItem key={w.id} w={w} last={list.length === 1} open={open === w.id} onToggle={() => setOpen(open === w.id ? null : w.id)} onSelect={() => void select(w.id)} onChanged={() => { reload(); void rows.reload(); }} />)}
        </ul>
        {rows.err && <div className="mt-2"><Note kind="error">{rows.err}</Note></div>}
        {!adding && <Button className="mt-2 w-full" onClick={() => { setAdding(true); setOpen(null); }} data-testid="add-wallet">+ Add wallet</Button>}
      </Card>

      {adding && (
        <Card>
          <Eyebrow>Add a wallet</Eyebrow>
          <Onboard adding={{ nextLabel: nextWalletLabel(list.map((w) => w.label)) }} onCancel={() => setAdding(false)} onDone={() => { setAdding(false); reload(); void rows.reload(); }} />
        </Card>
      )}

      {!s.dedicatedAck ? (
        <div className="space-y-2"><DedicatedWarning /><Button className="w-full" onClick={() => void save({ dedicatedAck: true })}>These are dedicated launch wallets</Button></div>
      ) : null}
      <div className="text-center text-[12px] text-ink-3">Presets, referral and RPC are in Settings</div>
    </>
  );
}

function PENCIL() { return <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true"><path d="M10.8 2.7l2.5 2.5L6 12.5l-3 .5.5-3 7.3-7.3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>; }
function CHEVRON({ up }: { up: boolean }) { return <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true" style={{ transform: up ? "rotate(180deg)" : undefined }}><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>; }

/** One wallet: pick it (click the row), rename it (pencil), and Manage for export, remove or the one time password update. */
function WalletItem({ w, last, open, onToggle, onSelect, onChanged }: { w: WalletRow; last: boolean; open: boolean; onToggle: () => void; onSelect: () => void; onChanged: () => void }) {
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(w.label);
  const [err, setErr] = useState<string | null>(null);
  const inp = useRef<HTMLInputElement>(null);
  useEffect(() => { if (edit) inp.current?.select(); }, [edit]);
  const saveName = async () => {
    const v = name.trim();
    if (!v || v === w.label) { setEdit(false); setName(w.label); return; }
    try { await send({ type: "wallet:rename", id: w.id, label: v }); setEdit(false); setErr(null); onChanged(); } catch (e) { setErr(errText(e)); }
  };
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <li className={`overflow-hidden rounded-[10px] border transition ${w.active ? "border-gold-line bg-[rgba(255,199,44,.06)]" : "border-border bg-control hover:bg-control-hover"}`} data-testid="wallet-row" data-active={w.active ? "true" : "false"}>
      <div role="button" tabIndex={0} aria-pressed={w.active} aria-label={`Use ${w.label}`} className="flex cursor-pointer items-center gap-2.5 px-2.5 py-2 outline-none focus-visible:ring-1 focus-visible:ring-gold-line" onClick={onSelect} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onSelect(); } }}>
        <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${w.active ? "border-gold" : "border-border-strong"}`}>{w.active && <i className="h-2 w-2 rounded-full bg-gold" />}</span>
        <div className="min-w-0 flex-1">
          {edit ? (
            <input ref={inp} className={`${INPUT} h-7 py-0.5`} value={name} maxLength={WALLET_LABEL_MAX} aria-label="Wallet label" data-testid="rename-input" onClick={stop}
              onChange={(e) => setName(e.target.value)} onBlur={() => void saveName()} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") void saveName(); if (e.key === "Escape") { setEdit(false); setName(w.label); } }} />
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[12px] font-medium text-ink" data-testid="wallet-label">{w.label}</span>
              <button type="button" className="text-ink-3 hover:text-ink" aria-label={`Rename ${w.label}`} title="Rename" onClick={(e) => { stop(e); setName(w.label); setEdit(true); }}>{PENCIL()}</button>
              {w.active && <span className="rounded-full border border-gold-line px-1.5 text-[10px] uppercase tracking-[0.12em] text-gold-text">Active</span>}
              {w.needsMigration && <span className="rounded-full border border-gold-line px-1.5 text-[10px] text-gold-text">Update pending</span>}
            </div>
          )}
          <div className="mt-0.5 flex items-center gap-2 font-mono text-[11px] text-ink-3"><span title={w.address}>{short(w.address, 4)}</span><span onClick={stop}><Copy text={w.address} /></span></div>
        </div>
        <div className="text-right text-[12px] text-ink"><SolAmt v={w.sol} /></div>
        <button type="button" className="grid h-7 w-7 place-items-center rounded-full text-ink-3 hover:bg-control-hover hover:text-ink" aria-expanded={open} aria-label={`Manage ${w.label}`} title="Manage" onClick={(e) => { stop(e); onToggle(); }}><CHEVRON up={open} /></button>
      </div>
      {err && <div className="px-3 pb-2"><Note kind="error">{err}</Note></div>}
      {open && (
        <div className="space-y-3 border-t border-border bg-surface px-3 py-3" data-testid="wallet-manage">
          <div className="flex items-center justify-between text-[12px] text-ink-3"><span>{w.kind === "mnemonic" ? "Recovery phrase wallet" : "Imported private key"}</span><span>Added {fmtDate(w.createdAt)}</span></div>
          {w.needsMigration ? <MigrateForm id={w.id} onDone={onChanged} /> : (
            <details><summary className="cursor-pointer text-[12px] text-ink-2 hover:text-ink">Export key</summary><div className="mt-3"><ExportBox id={w.id} /></div></details>
          )}
          <details><summary className="cursor-pointer text-[12px] text-sell hover:brightness-110">Remove wallet</summary><div className="mt-3"><RemoveWallet id={w.id} label={w.label} last={last} /></div></details>
        </div>
      )}
    </li>
  );
}

let volT: ReturnType<typeof setTimeout> | null = null;

/** Settings > Transactions: the priority fee for every buy, sell and launch (the same value as the token popup's gear). */
function PriorityCard({ sol, onSave }: { sol: number; onSave: (v: number) => Promise<void> }) {
  const preset = (PRIORITY_PRESETS_SOL as readonly number[]).includes(sol);
  const [txt, setTxt] = useState(preset ? "" : String(sol));
  const [err, setErr] = useState<string | null>(null);
  const commit = () => { if (!txt.trim()) return; const e = priorityError(txt); setErr(e); if (!e) void onSave(Number(txt.replace(",", "."))); };
  return (
    <Card>
      <Eyebrow>Transactions</Eyebrow>
      <div className="rounded-[10px] border border-border bg-control px-3 py-2.5" data-testid="hb-priority">
        <span className="text-[12px] text-ink-2">Priority fee <InfoTip text="Paid to Solana validators so buys, sells and launches land faster. The total per transaction in SOL: highbar sets the compute unit limit from a simulation and the price to match. Max 0.1 SOL." /></span>
        <div className="mt-2 flex items-center gap-1.5">
          {PRIORITY_PRESETS_SOL.map((v) => (
            <button key={v} type="button" data-testid="hb-priority-chip" aria-pressed={sol === v}
              className={`h-7 flex-1 rounded-[8px] border text-[12px] tabular-nums ${sol === v ? "border-[#FFC72C] bg-[rgba(255,199,44,.12)] text-[#FFC72C]" : "border-border text-ink-2 hover:bg-control-hover"}`}
              onClick={() => { setTxt(""); setErr(null); void onSave(v); }}>{v}</button>
          ))}
          <label className="relative w-[104px] flex-none">
            <input value={txt} inputMode="decimal" placeholder="custom" aria-label="Custom priority fee in SOL" data-testid="hb-priority-custom"
              className={`${INPUT} h-7 pl-2.5 pr-9 text-[12px] tabular-nums`}
              onChange={(e) => setTxt(e.currentTarget.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") commit(); }} />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-ink-3">SOL</span>
          </label>
        </div>
        {err ? <p className="mt-1.5 text-[11px] text-[#E06A5C]" role="alert">{err}</p>
          : <p className="mt-1.5 text-[11px] text-ink-3">Now {sol} SOL per transaction{preset ? "" : " (custom)"}. Added to every buy, sell and launch.</p>}
      </div>
    </Card>
  );
}
function SettingsTab({ st }: { st: WalletStatus }) {
  const { s, save } = useSettings(st);
  if (!s) return null;
  return (
    <>
      <PresetsCard p={s.presets} onSave={(presets) => save({ presets })} />
      <Card>
        <Eyebrow>On x.com</Eyebrow>
        <div className="flex items-center justify-between rounded-[10px] border border-border bg-control px-3 py-2.5">
          <span className="text-[12px] text-ink-2">Token detection <InfoTip text="Adds a small button under the name of tweets that mention a Solana token (a contract address, a token page link or a $TICKER that resolves to one token). It opens the price, chart and a buy and sell box." /></span>
          <Switch on={s.caDetect} onChange={(v) => void save({ caDetect: v })} label="Token detection" />
        </div>
        <div className="mt-2 rounded-[10px] border border-border bg-control px-3 py-2.5" data-testid="hb-sound">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-ink-2">Sound <InfoTip text="A short chime when a buy, sell or launch succeeds and a soft low tone when it fails. Made in the browser (no audio files, nothing downloaded)." /></span>
            <Switch on={s.sound} onChange={(v) => void save({ sound: v })} label="Sound" />
          </div>
          {s.sound && (
            <label className="mt-2 flex items-center gap-2.5 text-[12px] text-ink-3">
              <span>Volume</span>
              <input type="range" min={0} max={100} step={5} defaultValue={Math.round(s.soundVol * 100)} aria-label="Sound volume" data-testid="hb-sound-vol"
                className="h-1 flex-1 cursor-pointer accent-[#FFC72C]"
                onChange={(e) => { const v = Number(e.currentTarget.value) / 100; primeSfx(); if (volT) clearTimeout(volT); volT = setTimeout(() => { playSfx("ok", v); void save({ soundVol: v }); }, 200); }} />
              <span className="w-8 text-right tabular-nums text-ink-2">{Math.round(s.soundVol * 100)}%</span>
            </label>
          )}
        </div>
      </Card>
      <PriorityCard sol={s.prioritySol} onSave={(prioritySol) => save({ prioritySol })} />
      <Card>
        <Eyebrow>Speed</Eyebrow>
        <div className="flex items-center justify-between gap-3 rounded-[10px] border border-border bg-control px-3 py-2.5" data-testid="hb-fast">
          <span className="min-w-0 text-[12px] text-ink-2">Fast trades <InfoTip text="Skips the extra simulation and the RPC preflight, uses a fixed compute limit and shows Sent as soon as the transaction is out; the confirmation runs in the background and a failure shows a toast. Tradeoff: a transaction that would fail can still land on chain and cost its network and priority fee. The highbar fee and your priority fee are unchanged." /></span>
          <Switch on={s.fastTrade} onChange={(v) => void save({ fastTrade: v })} label="Fast trades" />
        </div>
      </Card>
      <ReferralCard p={s.presets} onSave={(presets) => save({ presets })} ready={st.ready} label={st.walletCount > 1 ? st.label : null} />
      <RpcCard />
      <p className="pb-1 pt-0.5 text-center text-[11px] text-ink-3" data-testid="hb-version">highbar extension v{chrome.runtime.getManifest().version}</p>
    </>
  );
}

function GEAR_ICON() {
  return <svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="2.1" stroke="currentColor" strokeWidth="1.3" /><path d="M8 1.6v1.6M8 12.8v1.6M14.4 8h-1.6M3.2 8H1.6M12.5 3.5l-1.1 1.1M4.6 11.4l-1.1 1.1M12.5 12.5l-1.1-1.1M4.6 4.6L3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><circle cx="8" cy="8" r="4.4" stroke="currentColor" strokeWidth="1.3" /></svg>;
}

function PresetsCard({ p, onSave }: { p: Presets; onSave: (p: Partial<Presets>) => Promise<unknown> }) {
  const [d, setD] = useState(p);
  const [ack, setAck] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => setD(p), [p]);
  const dirty = JSON.stringify(d) !== JSON.stringify(p);
  const set = (x: Partial<Presets>) => { setD((o) => ({ ...o, ...x })); setSaved(false); };
  return (
    <Card>
      <Eyebrow>Launch presets <InfoTip text="Used to prefill the drawer on x.com and for instant launches." /></Eyebrow>
      <div className="space-y-4">
        <Field label="Tier" tip="Higher and Max raise the migration target and the creator share. Max targets 250 SOL on mainnet, and the highbar API may ask for $HIGHER in the wallet for it.">
          <TabBar label="Tier" value={d.tier as string} onChange={(t) => set({ tier: t as Presets["tier"] })} tabs={[
            { id: "standard", label: <span className="inline-flex items-center gap-1.5"><TierDot tier="standard" />Standard</span> },
            { id: "higher", label: <span className="inline-flex items-center gap-1.5"><TierDot tier="higher" />Higher</span> },
            { id: "max", label: <span className="inline-flex items-center gap-1.5"><TierDot tier="max" />Max</span> },
          ]} />
        </Field>
        <div className="flex items-center justify-between rounded-[10px] border border-border bg-control px-3 py-2.5">
          <span className="text-[12px] text-ink-2">Anti-sniper <InfoTip text="Starts the trading fee at 25% and decays it to 1% over the first minute." /></span>
          <Switch on={d.antiSniper} onChange={(v) => set({ antiSniper: v })} label="Anti-sniper" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Dev buy" tip="Your own buy inside the launch transaction. It is spent from this wallet on every launch. The extension has no cap, the tier sets the maximum.">
            <div className="relative"><SolanaMark className="absolute left-3 top-1/2 -translate-y-1/2 !h-[11px]" /><input type="number" min={0} step={0.1} className={`${INPUT} pl-8 font-mono`} value={d.devBuySol} onChange={(e) => set({ devBuySol: Math.max(0, Number(e.target.value) || 0) })} data-testid="preset-devbuy" /></div>
          </Field>
          <Field label="Slippage" tip="Applies to the dev buy only.">
            <div className="relative"><input type="number" min={0} max={50} step={0.5} className={`${INPUT} pr-7 font-mono`} value={d.slippageBps / 100} onChange={(e) => set({ slippageBps: Math.round(Math.min(50, Math.max(0, Number(e.target.value) || 0)) * 100) })} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3">%</span></div>
          </Field>
        </div>
        <div className="flex items-center justify-between rounded-[10px] border border-border bg-control px-3 py-2.5">
          <span className="text-[12px] text-ink-2">Use the tweet text as description</span>
          <Switch on={d.useTweetText} onChange={(v) => set({ useTweetText: v })} label="Use tweet text" />
        </div>
        <Field label="Default description" hint={d.useTweetText ? "Used when the tweet has no text" : "Used for every launch"}>
          <textarea className={`${INPUT} h-16 resize-none`} maxLength={1000} value={d.description} onChange={(e) => set({ description: e.target.value })} />
        </Field>
        <div className={`rounded-[10px] border px-3 py-2.5 ${d.instant ? "border-gold-line bg-gold-soft" : "border-border bg-control"}`}>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-ink">Instant mode <InfoTip text="The tweet button launches right away with these presets, with no review step. Shift click the button to review first." /></span>
            <Switch on={d.instant} onChange={(v) => { set({ instant: v }); setAck(false); }} label="Instant mode" />
          </div>
          <div className="mt-2 flex items-center justify-between text-[12px] text-ink-2"><span>Dev buy per launch</span><SolAmt v={d.devBuySol} className="text-[12px] font-semibold text-ink" /></div>
          {d.instant && !p.instant && (
            <label className="mt-2 flex items-start gap-2 text-[12px] text-ink-2"><input type="checkbox" className="mt-0.5 accent-[#FFC72C]" checked={ack} onChange={(e) => setAck(e.target.checked)} data-testid="instant-ack" />
              <span>I understand one click launches a coin and spends {fmtSol(d.devBuySol)} SOL plus network fees from this wallet</span></label>
          )}
        </div>
        <div className="flex items-center justify-end gap-3">
          {saved && <span className="text-[12px] text-buy">Saved</span>}
          <Button kind="gold" disabled={!dirty || (d.instant && !p.instant && !ack)} onClick={async () => { await onSave(d); setSaved(true); }}>Save presets</Button>
        </div>
      </div>
    </Card>
  );
}

function ReferralCard({ p, onSave, ready, label }: { p: Presets; onSave: (p: Partial<Presets>) => Promise<unknown>; ready: boolean; label: string | null }) {
  const [v, setV] = useState(p.referrer);
  const [msg, setMsg] = useState<{ k: "ok" | "error" | "info"; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setV(p.referrer), [p.referrer]);
  return (
    <Card>
      <Eyebrow>Referral <InfoTip text="Binds a referrer to a wallet once. The wallet signs a sign-in message (no transaction) and highbar records it. It cannot be changed later. Bind applies to the active wallet. Each other wallet binds the saved referrer on its own first launch." /></Eyebrow>
      {label && <div className="-mt-1 mb-2 text-[12px] text-ink-3">For {label}, the active wallet</div>}
      <div className="flex gap-2">
        <input className={`${INPUT} font-mono text-[12px]`} placeholder="Referrer wallet address" value={v} onChange={(e) => setV(e.target.value.trim())} spellCheck={false} />
        <Button disabled={!v || busy || !ready} title={ready ? undefined : "Finish the wallet update first"} onClick={async () => {
          setBusy(true); setMsg(null);
          try { await onSave({ referrer: v }); const r = await send({ type: "referral:bind", referrer: v }); setMsg({ k: "ok", t: r.created ? "Referral bound" : `Already bound to ${short(r.referrer, 4)}` }); }
          catch (e) { setMsg({ k: "error", t: errText(e) }); } finally { setBusy(false); }
        }}>{busy ? "Binding…" : "Bind"}</Button>
      </div>
      {msg && <div className="mt-2"><Note kind={msg.k}>{msg.t}</Note></div>}
    </Card>
  );
}

/** RPC: the highbar server RPC by default (its upstream URL stays on the server and is never shown, and its status is not polled
 *  here). Only the optional custom URL is shown; it is checked before it is saved, and "Use default" goes back to the server RPC. */
function RpcCard() {
  const [saved, setSaved] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ k: "ok" | "error" | "info"; t: string } | null>(null);
  useEffect(() => { void send({ type: "settings:get" }).then((s) => { const u = s.rpcUrl || null; setSaved(u); setUrl(u ?? ""); }).catch(() => {}); }, []);
  const clean = url ? cleanRpcUrl(url) : null;
  const apply = async (next: string | null) => {
    setBusy(true); setMsg(null);
    try {
      if (next && !(await chrome.permissions.request({ origins: [`${new URL(next).origin}/*`] }))) { setMsg({ k: "error", t: "Permission for that host was not granted" }); return; }
      const r = await send({ type: "rpc:set", url: next });
      setSaved(r.customUrl); setUrl(r.customUrl ?? "");
      setMsg(r.mode === "custom" && r.ok ? { k: "ok", t: "Custom RPC saved and answering" } : !next ? { k: "ok", t: "Using the default RPC" } : { k: "error", t: r.message ?? "That RPC did not answer" });
    } catch (e) { setMsg({ k: "error", t: errText(e) }); } finally { setBusy(false); }
  };
  return (
    <Card>
      <div className="space-y-3" data-testid="rpc-card">
        <Field label="Custom RPC" hint="Optional. Leave empty to use the default" tip="An https Solana RPC URL on the same network as highbar. It is checked with a quick getLatestBlockhash call (and a network check) before it is saved. If it does not answer, the default stays in use.">
          <input className={`${INPUT} font-mono text-[12px]`} placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value.trim())} spellCheck={false} autoComplete="off" data-testid="rpc-input" />
        </Field>
        {url && !clean && <div className="text-[12px] text-sell">Use an https:// URL (http only for localhost)</div>}
        {msg && <Note kind={msg.k}>{msg.t}</Note>}
        <div className="flex justify-between gap-2">
          <Button disabled={busy || (!saved && !url)} onClick={() => void apply(null)} data-testid="rpc-default">Use default</Button>
          <Button kind="gold" disabled={busy || !clean || clean === saved} onClick={() => void apply(clean)} data-testid="rpc-save">{busy ? "Checking…" : "Save"}</Button>
        </div>
      </div>
    </Card>
  );
}

// ---------------- History ----------------
const STATUS_CHIP: Record<HistoryItem["status"], string> = { confirmed: "text-buy border-[rgba(76,182,122,.30)] bg-[rgba(76,182,122,.10)]", pending: "text-gold-text border-gold-line bg-gold-soft", failed: "text-sell border-[rgba(224,106,92,.30)] bg-[rgba(224,106,92,.10)]" };
function HistoryTab({ st }: { st: WalletStatus }) {
  const { data, err, busy, reload } = useAsync(() => send({ type: "history" }), [st.walletId]);
  const net = st.network ?? "devnet";
  return (
    <>
      <div className="flex items-center justify-between"><Eyebrow className="!mb-0">Create history</Eyebrow><Button className="!h-8" onClick={() => void reload()} disabled={busy}>Refresh</Button></div>
      {err && <Note kind="error">{err}</Note>}
      {data && data.length === 0 ? <Empty title="No launches yet">Press Launch on any tweet on x.com</Empty> : (
        <ul className="space-y-2">
          {(data ?? []).map((h) => (
            <li key={h.id} className="rounded-lg border border-border bg-surface p-3">
              <div className="flex items-center gap-3">
                {h.image ? <img src={h.image} alt="" className="h-10 w-10 rounded-[10px] border border-border object-cover" /> : <span className="h-10 w-10 rounded-[10px] border border-border bg-muted" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="truncate text-[12px] font-medium text-ink">{h.name}</span><span className="font-mono text-[11px] text-ink-3">${h.ticker}</span></div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-3"><TierDot tier={h.tier} /><span className="capitalize">{h.tier}</span><span>·</span><span>{fmtDate(h.at)}</span>{h.devBuySol > 0 && <><span>·</span><span className="inline-flex items-center gap-1">dev buy <SolAmt v={h.devBuySol} /></span></>}</div>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] capitalize ${STATUS_CHIP[h.status]}`}>{h.status}</span>
              </div>
              {(h.mint || h.tweetUrl || h.error) && (
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2 text-[12px]">
                  {h.mcapUsd != null && <span className="text-ink-2">MC {fmtUsd(h.mcapUsd)}</span>}
                  {h.mint && <a className="text-gold-text hover:underline" href={`${st.siteUrl}/token/${h.mint}`} target="_blank" rel="noreferrer">highbar</a>}
                  {h.signature && <a className="text-gold-text hover:underline" href={solscan("tx", h.signature, net)} target="_blank" rel="noreferrer">Solscan</a>}
                  {h.tweetUrl && <a className="text-gold-text hover:underline" href={h.tweetUrl} target="_blank" rel="noreferrer">Tweet</a>}
                  {h.error && <span className="w-full text-sell">{h.error}</span>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// ---------------- Fees ----------------
type Pending = { row: ClaimRow; kind: "trading" | "migration" | "lp"; position?: string; amount: number };
function FeesTab({ st }: { st: WalletStatus }) {
  const { data, err, busy, reload } = useAsync(() => send({ type: "fees" }), [st.walletId]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [msg, setMsg] = useState<{ k: "ok" | "error"; t: React.ReactNode } | null>(null);
  const [claiming, setClaiming] = useState(false);
  const net = st.network ?? "devnet";
  const claim = async (p: Pending) => {
    setClaiming(true); setMsg(null);
    try { const r = await send({ type: "fees:claim", pool: p.row.pool, kind: p.kind, position: p.position }); setMsg({ k: "ok", t: <>Claimed. <a className="underline" href={r.solscanUrl} target="_blank" rel="noreferrer">View on Solscan</a></> }); setPending(null); void reload(); }
    catch (e) { setMsg({ k: "error", t: errText(e) }); } finally { setClaiming(false); }
  };
  const rows = data?.tokens ?? [];
  return (
    <>
      <Card>
        <Eyebrow>Claimable creator fees <InfoTip text="Your share of trading fees on your launches, the migration fee after a coin graduates, and LP fees from locked positions. Claims are built by highbar and signed here." /></Eyebrow>
        <div className="flex items-end justify-between">
          <div className="text-[20px] font-semibold leading-none text-ink"><SolAmt v={data?.totalSol} /></div>
          <Button onClick={() => void reload()} disabled={busy}>{busy ? "Loading…" : "Refresh"}</Button>
        </div>
        {data && <div className="mt-3 text-[11px] text-ink-3">Updated {fmtDateTime(data.updatedAt)} · {short(data.creator, 4)}</div>}
      </Card>
      {err && <Note kind="error">{err}</Note>}
      {msg && <Note kind={msg.k}>{msg.t}</Note>}
      {data && rows.length === 0 ? <Empty title="No fees yet">Fees from your launches show up here</Empty> : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const lines: Pending[] = [
              ...(r.tradingFeeSol > 0 ? [{ row: r, kind: "trading" as const, amount: r.tradingFeeSol }] : []),
              ...(r.migrationFeeSol > 0 ? [{ row: r, kind: "migration" as const, amount: r.migrationFeeSol }] : []),
              ...(r.lp?.positions ?? []).filter((x) => x.unclaimedSol > 0).map((x) => ({ row: r, kind: "lp" as const, position: x.position, amount: x.unclaimedSol })),
            ];
            return (
              <li key={r.pool} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex items-center gap-3">
                  {r.image ? <img src={r.image} alt="" className="h-9 w-9 rounded-[10px] border border-border object-cover" /> : <span className="h-9 w-9 rounded-[10px] border border-border bg-muted" />}
                  <div className="min-w-0 flex-1"><div className="truncate text-[12px] font-medium text-ink">{r.name}</div><div className="flex items-center gap-1.5 font-mono text-[11px] text-ink-3"><TierDot tier={r.tier} />${r.symbol}{r.migrated && <span className="rounded-full border border-border px-1.5 font-sans text-[11px]">graduated</span>}</div></div>
                  <a className="text-[12px] text-gold-text hover:underline" href={solscan("account", r.pool, net)} target="_blank" rel="noreferrer">Pool</a>
                </div>
                {r.error && <div className="mt-2 text-[12px] text-sell">{r.error}</div>}
                {lines.length > 0 ? (
                  <div className="mt-2.5 space-y-1.5 border-t border-border pt-2.5">
                    {lines.map((l) => (
                      <div key={l.kind + (l.position ?? "")} className="flex items-center justify-between gap-2 text-[12px]">
                        <span className="text-ink-2">{l.kind === "trading" ? "Trading fees" : l.kind === "migration" ? "Migration fee" : "LP fees"}</span>
                        <span className="flex items-center gap-3"><SolAmt v={l.amount} className="text-ink" /><Button className="!h-7 !px-3 !text-[12px]" disabled={!st.ready || claiming} onClick={() => setPending(l)}>Claim</Button></span>
                      </div>
                    ))}
                  </div>
                ) : !r.error && <div className="mt-2 text-[12px] text-ink-3">Nothing to claim right now</div>}
              </li>
            );
          })}
        </ul>
      )}
      {pending && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <Card className="w-full max-w-[480px] !border-gold-line">
            <Eyebrow>Confirm claim</Eyebrow>
            <div className="text-[12px] text-ink">{pending.row.name} {pending.kind === "trading" ? "trading fees" : pending.kind === "migration" ? "migration fee" : "LP fees"}</div>
            <div className="mt-1 text-[20px] font-semibold"><SolAmt v={pending.amount} /></div>
            <div className="mt-2 text-[12px] text-ink-3">The extension checks that the transaction only has this wallet as fee payer before it signs.</div>
            <div className="mt-4 grid grid-cols-2 gap-2"><Button onClick={() => setPending(null)} disabled={claiming}>Cancel</Button><Button kind="gold" onClick={() => void claim(pending)} disabled={claiming}>{claiming ? "Claiming…" : "Claim"}</Button></div>
          </Card>
        </div>
      )}
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
