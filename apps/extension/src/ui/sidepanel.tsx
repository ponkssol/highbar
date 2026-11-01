import { useEffect, useRef, useState } from "react";
import { playSfx, primeSfx } from "../lib/sfx";
import { createRoot } from "react-dom/client";
import { send, type DiagResult, type HistoryItem, type RpcStatus, type WalletRow, type WalletStatus } from "../lib/messages";
import { cleanRpcUrl, type Presets, type Settings } from "../lib/settings";
import { PRIORITY_PRESETS_SOL, priorityError } from "../lib/priomath";
import { fmtDate, fmtDateTime, fmtNum, fmtSol, fmtUsd, short, solscan } from "../lib/format";
import type { ClaimRow } from "../lib/api";
import { useAsync, useStatus } from "./hooks";
import { Button, Card, Copy, Empty, Eyebrow, Field, INPUT, InfoTip, Logo, Note, SolAmt, SolanaMark, Switch, TabBar, TierDot, errText } from "./components/ui";
import { DedicatedWarning, ExportBox, MigrateForm, Onboard, RemoveWallet } from "./wallet-forms";
import { nextWalletLabel, WALLET_LABEL_MAX } from "../lib/wallets";

type Tab = "portfolio" | "wallet" | "history" | "fees" | "settings";
const TABS: { id: Tab; label: React.ReactNode }[] = [{ id: "portfolio", label: "Portfolio" }, { id: "wallet", label: "Wallet" }, { id: "history", label: "History" }, { id: "fees", label: "Fees" },
  { id: "settings", label: <span className="inline-flex items-center gap-1.5" aria-label="Settings">{GEAR_ICON()}Settings</span> }];

function App() {
  const { st, err, reload } = useStatus();
  const initial = (new URLSearchParams(location.search).get("tab") as Tab | null) ?? (location.hash.slice(1) as Tab) ?? "portfolio";
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.id === initial) ? initial : "portfolio");
  // Keeps the setup view (and the one time recovery phrase) on screen after the wallet exists.
  const [inSetup, setInSetup] = useState(false);
  useEffect(() => { history.replaceState(null, "", `#${tab}`); }, [tab]);
  if (err) return <Shell st={null}><Note kind="error">{err}</Note></Shell>;
  if (!st) return <Shell st={null}><div className="py-10 text-center text-ink-3">Loading…</div></Shell>;
  const needsWallet = !st.exists || inSetup;
  return (
    <Shell st={st}>
      <TabBar full label="Sections" value={tab} onChange={setTab} tabs={TABS} />
      <div className="mt-4 space-y-4">
        {tab === "settings" && !inSetup ? <SettingsTab st={st} /> : needsWallet ? (tab === "wallet" ? <Card><Eyebrow>Set up a launch wallet</Eyebrow><Onboard onBackup={() => setInSetup(true)} onDone={() => { setInSetup(false); void reload(); }} /></Card> : <Empty title="No wallet yet"><button className="text-gold-text hover:underline" onClick={() => setTab("wallet")}>Create or import one</button> to get started</Empty>)
          : st.needsMigration && tab !== "history" && tab !== "wallet" ? <Card><Eyebrow>Finish the update · {st.label}</Eyebrow><MigrateForm id={st.walletId ?? undefined} onDone={reload} />{st.walletCount > 1 && <div className="mt-3 text-center text-[12px] text-ink-3">Or <button className="text-gold-text hover:underline" onClick={() => setTab("wallet")}>switch to another wallet</button></div>}</Card>
          : tab === "portfolio" ? <PortfolioTab st={st} onSettings={() => setTab("settings")} />
          : tab === "wallet" ? <WalletTab st={st} reload={reload} />
          : tab === "history" ? <HistoryTab st={st} />
          : <FeesTab st={st} />}
      </div>
    </Shell>
  );
}

function Shell({ st, children }: { st: WalletStatus | null; children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-[520px] px-4 pb-8 pt-4">
      <header className="mb-4 flex items-center gap-2.5">
        <Logo className="h-7" />
        <span className="flex-1" />
        {st?.network && <span className="rounded-full border border-gold-line px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gold-text">{st.network === "mainnet" ? "Mainnet" : "Devnet"}</span>}
        {st?.exists && <span className="inline-flex max-w-[200px] items-center gap-1.5 rounded-full border border-border bg-control px-2.5 py-1 text-[11px] text-ink-2" title={`${st.label ?? ""} ${st.address ?? ""}`} data-testid="header-wallet"><i className={`h-1.5 w-1.5 shrink-0 rounded-full ${st.ready ? "bg-buy" : "bg-gold"}`} /><span className="truncate text-ink">{st.label}</span><span className="font-mono text-ink-3">{short(st.address ?? "", 4)}</span></span>}
      </header>
      {children}
    </div>
  );
}

// ---------------- Portfolio ----------------
function PortfolioTab({ st, onSettings }: { st: WalletStatus; onSettings: () => void }) {
  const { data, err, busy, reload } = useAsync(() => send({ type: "portfolio" }), [st.walletId]);
  const net = st.network ?? "devnet";
  const total = data ? data.sol + data.tokens.reduce((a, t) => a + (t.valueSol ?? 0), 0) : null;
  return (
    <>
      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-[rgba(255,199,44,.10)] blur-3xl" />
        <Eyebrow>{st.walletCount > 1 ? <span className="normal-case tracking-normal text-ink-2">{st.label}</span> : null}{st.walletCount > 1 ? " · " : ""}Balance <InfoTip text="SOL in this wallet plus your tokens valued at the current highbar price. Tokens from other launchpads show without a value." /></Eyebrow>
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[34px] font-semibold leading-none tracking-tight text-ink"><SolAmt v={data?.sol} /></div>
            {total != null && data!.tokens.length > 0 && <div className="mt-2 text-[12.5px] text-ink-3">Total with tokens <SolAmt v={total} className="text-ink-2" /></div>}
          </div>
          <Button onClick={() => void reload()} disabled={busy}>{busy ? "Loading…" : "Refresh"}</Button>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3 font-mono text-[12px] text-ink-3">
          <span title={st.address ?? ""}>{short(st.address ?? "", 6)}</span>
          <span className="flex gap-3"><Copy text={st.address ?? ""} label="Copy address" /><a className="text-gold-text hover:underline" href={solscan("account", st.address ?? "", net)} target="_blank" rel="noreferrer">Solscan</a></span>
        </div>
      </Card>
      {err && <Note kind="error"><span data-testid="portfolio-error">{err}</span>{/RPC/.test(err) && <> <button type="button" className="font-medium text-ink underline-offset-2 hover:underline" onClick={onSettings}>Open Settings</button></>}</Note>}
      <div>
        <Eyebrow>Tokens</Eyebrow>
        {data && data.tokens.length === 0 ? <Empty title="No tokens yet">Coins you launch or buy show up here</Empty> : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {(data?.tokens ?? []).map((t) => (
              <li key={t.mint} className="flex items-center gap-3 px-3.5 py-3">
                {t.image ? <img src={t.image} alt="" className="h-9 w-9 rounded-[10px] border border-border object-cover" /> : <span className="h-9 w-9 rounded-[10px] border border-border bg-muted" />}
                <div className="min-w-0 flex-1">
                  <a href={`${st.siteUrl}/token/${t.mint}`} target="_blank" rel="noreferrer" className="block truncate text-[13.5px] font-medium text-ink hover:text-gold-text">{t.name ?? short(t.mint, 4)}</a>
                  <div className="font-mono text-[11.5px] text-ink-3">{t.symbol ? `$${t.symbol}` : short(t.mint, 4)} · {fmtNum(t.amount)}</div>
                </div>
                <div className="text-right text-[13px] text-ink-2">{t.valueSol != null ? <SolAmt v={t.valueSol} /> : <span className="text-ink-3">–</span>}</div>
              </li>
            ))}
          </ul>
        )}
        {data && <div className="mt-2 text-right text-[11.5px] text-ink-3">Updated {fmtDateTime(data.updatedAt)}</div>}
      </div>
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
        <ul className="mt-3 space-y-2" data-testid="wallet-list">
          {list.map((w) => <WalletItem key={w.id} w={w} last={list.length === 1} open={open === w.id} onToggle={() => setOpen(open === w.id ? null : w.id)} onSelect={() => void select(w.id)} onChanged={() => { reload(); void rows.reload(); }} />)}
        </ul>
        {rows.err && <div className="mt-2"><Note kind="error">{rows.err}</Note></div>}
        {!adding && <Button className="mt-3 w-full" onClick={() => { setAdding(true); setOpen(null); }} data-testid="add-wallet">+ Add wallet</Button>}
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
    <li className={`overflow-hidden rounded-[12px] border transition ${w.active ? "border-gold-line bg-[rgba(255,199,44,.06)]" : "border-border bg-control hover:bg-control-hover"}`} data-testid="wallet-row" data-active={w.active ? "true" : "false"}>
      <div role="button" tabIndex={0} aria-pressed={w.active} aria-label={`Use ${w.label}`} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 outline-none focus-visible:ring-1 focus-visible:ring-gold-line" onClick={onSelect} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onSelect(); } }}>
        <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${w.active ? "border-gold" : "border-border-strong"}`}>{w.active && <i className="h-2 w-2 rounded-full bg-gold" />}</span>
        <div className="min-w-0 flex-1">
          {edit ? (
            <input ref={inp} className={`${INPUT} h-7 py-0.5`} value={name} maxLength={WALLET_LABEL_MAX} aria-label="Wallet label" data-testid="rename-input" onClick={stop}
              onChange={(e) => setName(e.target.value)} onBlur={() => void saveName()} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") void saveName(); if (e.key === "Escape") { setEdit(false); setName(w.label); } }} />
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[13.5px] font-medium text-ink" data-testid="wallet-label">{w.label}</span>
              <button type="button" className="text-ink-3 hover:text-ink" aria-label={`Rename ${w.label}`} title="Rename" onClick={(e) => { stop(e); setName(w.label); setEdit(true); }}>{PENCIL()}</button>
              {w.active && <span className="rounded-full border border-gold-line px-1.5 text-[10px] uppercase tracking-[0.12em] text-gold-text">Active</span>}
              {w.needsMigration && <span className="rounded-full border border-gold-line px-1.5 text-[10px] text-gold-text">Update pending</span>}
            </div>
          )}
          <div className="mt-0.5 flex items-center gap-2 font-mono text-[11.5px] text-ink-3"><span title={w.address}>{short(w.address, 4)}</span><span onClick={stop}><Copy text={w.address} /></span></div>
        </div>
        <div className="text-right text-[13px] text-ink"><SolAmt v={w.sol} /></div>
        <button type="button" className="grid h-7 w-7 place-items-center rounded-full text-ink-3 hover:bg-control-hover hover:text-ink" aria-expanded={open} aria-label={`Manage ${w.label}`} title="Manage" onClick={(e) => { stop(e); onToggle(); }}><CHEVRON up={open} /></button>
      </div>
      {err && <div className="px-3 pb-2"><Note kind="error">{err}</Note></div>}
      {open && (
        <div className="space-y-3 border-t border-border bg-surface px-3 py-3" data-testid="wallet-manage">
          <div className="flex items-center justify-between text-[12px] text-ink-3"><span>{w.kind === "mnemonic" ? "Recovery phrase wallet" : "Imported private key"}</span><span>Added {fmtDate(w.createdAt)}</span></div>
          {w.needsMigration ? <MigrateForm id={w.id} onDone={onChanged} /> : (
            <details><summary className="cursor-pointer text-[13px] text-ink-2 hover:text-ink">Export key</summary><div className="mt-3"><ExportBox id={w.id} /></div></details>
          )}
          <details><summary className="cursor-pointer text-[13px] text-sell hover:brightness-110">Remove wallet</summary><div className="mt-3"><RemoveWallet id={w.id} label={w.label} last={last} /></div></details>
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
        <span className="text-[13px] text-ink-2">Priority fee <InfoTip text="Paid to Solana validators so buys, sells and launches land faster. The total per transaction in SOL: highbar sets the compute unit limit from a simulation and the price to match. Max 0.1 SOL." /></span>
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
        {err ? <p className="mt-1.5 text-[11.5px] text-[#E06A5C]" role="alert">{err}</p>
          : <p className="mt-1.5 text-[11.5px] text-ink-3">Now {sol} SOL per transaction{preset ? "" : " (custom)"}. Shown with the highbar fee before you sign.</p>}
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
          <span className="text-[13px] text-ink-2">Token detection <InfoTip text="Adds a small button under the name of tweets that mention a Solana token (a contract address, a token page link or a $TICKER that resolves to one token). It opens the price, chart and a buy and sell box." /></span>
          <Switch on={s.caDetect} onChange={(v) => void save({ caDetect: v })} label="Token detection" />
        </div>
        <div className="mt-2 rounded-[10px] border border-border bg-control px-3 py-2.5" data-testid="hb-sound">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-ink-2">Sound <InfoTip text="A short chime when a buy, sell or launch succeeds and a soft low tone when it fails. Made in the browser (no audio files, nothing downloaded)." /></span>
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
      <ReferralCard p={s.presets} onSave={(presets) => save({ presets })} ready={st.ready} label={st.walletCount > 1 ? st.label : null} />
      <RpcCard />
      <DiagCard />
      <p className="pb-1 pt-0.5 text-center text-[10.5px] text-ink-3" data-testid="hb-version">highbar extension v{chrome.runtime.getManifest().version}</p>
    </>
  );
}

/** Settings > Diagnostics: one request to each chart and price source, exactly as the token popup makes it (from the worker). */
function DiagCard() {
  const [rows, setRows] = useState<DiagResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const run = async () => { setBusy(true); setErr(null); try { setRows(await send({ type: "diag:sources" })); } catch (e) { setErr(errText(e)); } finally { setBusy(false); } };
  return (
    <Card>
      <div className="flex items-center justify-between">
        <Eyebrow>Diagnostics</Eyebrow>
        <Button className="h-7 px-3 text-[12px]" onClick={() => void run()} disabled={busy} data-testid="hb-diag-run">{busy ? "Testing…" : rows ? "Test again" : "Test sources"}</Button>
      </div>
      <p className="text-[12px] text-ink-3">Checks the market data sources the token popup uses: pump.fun candles, Jupiter price, DexScreener and GeckoTerminal.</p>
      {err && <Note kind="error">{err}</Note>}
      {rows && (
        <ul className="flex flex-col gap-1" data-testid="hb-diag">
          {rows.map((r) => (
            <li key={r.name} className="flex items-center gap-2 rounded-[8px] border border-border bg-control px-2.5 py-1.5 text-[12px]" title={r.url}>
              <span className={`h-2 w-2 flex-none rounded-full ${r.ok ? "bg-buy" : "bg-sell"}`} aria-hidden="true" />
              <span className="flex-1 text-ink-2">{r.name}</span>
              <span className={r.ok ? "text-ink-3" : "text-sell"}>{r.ok ? "OK" : r.status ? `HTTP ${r.status}` : "Failed"}{r.note && r.note !== "OK" ? ` · ${r.note}` : ""}</span>
              <span className="w-12 text-right tabular-nums text-ink-3">{r.ms} ms</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function GEAR_ICON() {
  return <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="2.1" stroke="currentColor" strokeWidth="1.3" /><path d="M8 1.6v1.6M8 12.8v1.6M14.4 8h-1.6M3.2 8H1.6M12.5 3.5l-1.1 1.1M4.6 11.4l-1.1 1.1M12.5 12.5l-1.1-1.1M4.6 4.6L3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><circle cx="8" cy="8" r="4.4" stroke="currentColor" strokeWidth="1.3" /></svg>;
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
          <span className="text-[13px] text-ink-2">Anti-sniper <InfoTip text="Starts the trading fee at 25% and decays it to 1% over the first minute." /></span>
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
          <span className="text-[13px] text-ink-2">Use the tweet text as description</span>
          <Switch on={d.useTweetText} onChange={(v) => set({ useTweetText: v })} label="Use tweet text" />
        </div>
        <Field label="Default description" hint={d.useTweetText ? "Used when the tweet has no text" : "Used for every launch"}>
          <textarea className={`${INPUT} h-16 resize-none`} maxLength={1000} value={d.description} onChange={(e) => set({ description: e.target.value })} />
        </Field>
        <div className={`rounded-[10px] border px-3 py-2.5 ${d.instant ? "border-gold-line bg-gold-soft" : "border-border bg-control"}`}>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-ink">Instant mode <InfoTip text="The tweet button launches right away with these presets, with no review step. Shift click the button to review first." /></span>
            <Switch on={d.instant} onChange={(v) => { set({ instant: v }); setAck(false); }} label="Instant mode" />
          </div>
          <div className="mt-2 flex items-center justify-between text-[12.5px] text-ink-2"><span>Dev buy per launch</span><SolAmt v={d.devBuySol} className="text-[14px] font-semibold text-ink" /></div>
          {d.instant && !p.instant && (
            <label className="mt-2 flex items-start gap-2 text-[12.5px] text-ink-2"><input type="checkbox" className="mt-0.5 accent-[#FFC72C]" checked={ack} onChange={(e) => setAck(e.target.checked)} data-testid="instant-ack" />
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

/** RPC: the highbar server RPC by default (its upstream URL stays on the server and is never shown). A custom URL is checked before it is saved. */
function RpcCard() {
  const [st, setSt] = useState<RpcStatus | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ k: "ok" | "error" | "info"; t: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const first = useRef(true);
  // A fresh probe every time: when the panel opens, when it becomes visible again, and on Re-check. The worker retries once before it reports Unavailable.
  const recheck = async () => {
    setChecking(true);
    try { const r = await send({ type: "rpc:status" }); setSt(r); if (first.current) { setUrl(r.customUrl ?? ""); first.current = false; } }
    catch (e) { setSt((o) => ({ mode: o?.mode ?? "server", customUrl: o?.customUrl ?? null, ok: false, message: errText(e), detail: null, checkedAt: Date.now() })); }
    finally { setChecking(false); }
  };
  useEffect(() => {
    void recheck();
    const vis = () => { if (document.visibilityState === "visible") void recheck(); };
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const clean = url ? cleanRpcUrl(url) : null;
  const apply = async (next: string | null) => {
    setBusy(true); setMsg(null);
    try {
      if (next && !(await chrome.permissions.request({ origins: [`${new URL(next).origin}/*`] }))) { setMsg({ k: "error", t: "Permission for that host was not granted" }); return; }
      const r = await send({ type: "rpc:set", url: next });
      setSt(r); setUrl(r.customUrl ?? "");
      setMsg(r.mode === "custom" && r.ok ? { k: "ok", t: "Custom RPC saved and answering" } : !next ? { k: r.ok ? "ok" : "error", t: r.ok ? "Using the highbar server RPC" : r.message ?? "Server RPC unavailable" } : { k: "error", t: r.message ?? "That RPC did not answer" });
    } catch (e) { setMsg({ k: "error", t: errText(e) }); } finally { setBusy(false); }
  };
  const host = st?.customUrl ? new URL(st.customUrl).host : null;
  return (
    <Card>
      <Eyebrow>RPC <InfoTip text="Balances, token reads and sends go through this RPC. The default is the highbar server RPC. Your own RPC is checked before it is saved and stays only in this browser." /></Eyebrow>
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-[10px] border border-border bg-control px-3 py-2.5" data-testid="rpc-mode">
          <span className="text-[13px] text-ink">{st?.mode === "custom" ? <>Custom RPC <span className="font-mono text-[12px] text-ink-3">{host}</span></> : "highbar server RPC (default)"}</span>
          <span className={`inline-flex items-center gap-1.5 text-[12px] ${!st ? "text-ink-3" : st.ok ? "text-buy" : "text-sell"}`}><i className={`h-1.5 w-1.5 rounded-full ${!st || checking ? "bg-ink-3" : st.ok ? "bg-buy" : "bg-sell"}`} />{!st || checking ? "Checking…" : st.ok ? "Answering" : "Unavailable"}</span>
        </div>
        <div className="-mt-1.5 flex items-center justify-between gap-2 text-[11.5px] text-ink-3">
          <span className="min-w-0 truncate" data-testid="rpc-detail" title={st?.detail ?? undefined}>{st?.checkedAt ? `Checked ${new Date(st.checkedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}` : ""}{st && !st.ok && st.detail ? ` · ${st.detail}` : ""}</span>
          <button type="button" className="shrink-0 text-gold-text hover:underline disabled:opacity-50" disabled={checking || busy} onClick={() => void recheck()} data-testid="rpc-recheck">{checking ? "Checking…" : "Re-check"}</button>
        </div>
        {st && !st.ok && !msg && !checking && <Note kind="error">{st.mode === "server" ? "The highbar server RPC is not answering right now. Re-check in a moment or add your own RPC below" : st.message}</Note>}
        <Field label="Custom RPC" hint="Optional. Leave empty to use the default" tip="An https Solana RPC URL on the same network as highbar. It is checked with a quick getLatestBlockhash call (and a network check) before it is saved. If it does not answer, the server RPC stays in use.">
          <input className={`${INPUT} font-mono text-[12px]`} placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value.trim())} spellCheck={false} autoComplete="off" data-testid="rpc-input" />
        </Field>
        {url && !clean && <div className="text-[12px] text-sell">Use an https:// URL (http only for localhost)</div>}
        {msg && <Note kind={msg.k}>{msg.t}</Note>}
        <div className="flex justify-between gap-2">
          <Button disabled={busy || (st?.mode !== "custom" && !url)} onClick={() => void apply(null)}>Use default</Button>
          <Button kind="gold" disabled={busy || !clean || clean === st?.customUrl} onClick={() => void apply(clean)}>{busy ? "Checking…" : "Save"}</Button>
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
                  <div className="flex items-center gap-2"><span className="truncate text-[13.5px] font-medium text-ink">{h.name}</span><span className="font-mono text-[11.5px] text-ink-3">${h.ticker}</span></div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-ink-3"><TierDot tier={h.tier} /><span className="capitalize">{h.tier}</span><span>·</span><span>{fmtDate(h.at)}</span>{h.devBuySol > 0 && <><span>·</span><span className="inline-flex items-center gap-1">dev buy <SolAmt v={h.devBuySol} /></span></>}</div>
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
          <div className="text-[30px] font-semibold leading-none text-ink"><SolAmt v={data?.totalSol} /></div>
          <Button onClick={() => void reload()} disabled={busy}>{busy ? "Loading…" : "Refresh"}</Button>
        </div>
        {data && <div className="mt-3 text-[11.5px] text-ink-3">Updated {fmtDateTime(data.updatedAt)} · {short(data.creator, 4)}</div>}
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
                  <div className="min-w-0 flex-1"><div className="truncate text-[13.5px] font-medium text-ink">{r.name}</div><div className="flex items-center gap-1.5 font-mono text-[11.5px] text-ink-3"><TierDot tier={r.tier} />${r.symbol}{r.migrated && <span className="rounded-full border border-border px-1.5 font-sans text-[10.5px]">graduated</span>}</div></div>
                  <a className="text-[12px] text-gold-text hover:underline" href={solscan("account", r.pool, net)} target="_blank" rel="noreferrer">Pool</a>
                </div>
                {r.error && <div className="mt-2 text-[12px] text-sell">{r.error}</div>}
                {lines.length > 0 ? (
                  <div className="mt-2.5 space-y-1.5 border-t border-border pt-2.5">
                    {lines.map((l) => (
                      <div key={l.kind + (l.position ?? "")} className="flex items-center justify-between gap-2 text-[12.5px]">
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
            <div className="text-[13.5px] text-ink">{pending.row.name} {pending.kind === "trading" ? "trading fees" : pending.kind === "migration" ? "migration fee" : "LP fees"}</div>
            <div className="mt-1 text-[22px] font-semibold"><SolAmt v={pending.amount} /></div>
            <div className="mt-2 text-[12px] text-ink-3">The extension checks that the transaction only has this wallet as fee payer before it signs.</div>
            <div className="mt-4 grid grid-cols-2 gap-2"><Button onClick={() => setPending(null)} disabled={claiming}>Cancel</Button><Button kind="gold" onClick={() => void claim(pending)} disabled={claiming}>{claiming ? "Claiming…" : "Claim"}</Button></div>
          </Card>
        </div>
      )}
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
