"use client";
/** Fee ledger: every transaction of one token with its fee parts, from GET /tokens/:mint/openbook/ledger. Filters reset the cursor,
 *  pagination is cursor-based Prev and Next, rows expand into the full cost breakdown. */
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Download, Search, X } from "lucide-react";
import { fmtDateTimeUS, fmtDateUS, fmtTimeUS } from "@/lib/date";
import { arr, fetchLedger, ledgerCsvUrl, num, providerLabel, RECIPIENT_LABEL, str, type LedgerFilter, type LedgerPage, type LedgerRow, type ObMeta, type TokenOpenBook } from "@/lib/openbook";
import { CTRL_ON } from "../ui";
import { Addr, Chip, fmtNum, fmtOffsetMs, fmtPct, fmtSolOb, fmtTokens, KV, Nil, Panel, Prov, Scan, SecHead, Sol, TD, TH, tint } from "./ObUi";

const LIMIT = 25;
type Kind = "all" | "buys" | "sells" | "failed" | "duplicate";
const KIND_FILTER: Record<Kind, Pick<LedgerFilter, "side" | "status">> = { all: { side: null, status: null }, buys: { side: "buy", status: null }, sells: { side: "sell", status: null }, failed: { side: null, status: "failed" }, duplicate: { side: null, status: "duplicate" } };
const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function when(ts: number | null) {
  if (ts == null) return <Nil />;
  const d = new Date(ts), today = new Date();
  const same = d.toDateString() === today.toDateString();
  return <span title={fmtDateTimeUS(ts, { second: "2-digit" })}>{same ? fmtTimeUS(ts, { second: "2-digit" }) : fmtDateUS(ts, { year: undefined })}</span>;
}
function netFee(r: LedgerRow) {
  const b = num(r.baseFeeSol), p = num(r.priorityFeeSol);
  if (b == null && p == null) return <Nil />;
  return <><span className="num">{fmtSolOb((b ?? 0) + (p ?? 0), 6)}</span>{b != null && p != null && <div className="num mt-0.5 text-[10.5px] text-ink-3">{fmtSolOb(b, 6)} base</div>}</>;
}
function StatusChip({ r }: { r: LedgerRow }) {
  if (r.status === "failed") return <Chip tone="bad" title="Landed with an error, the network fee was still paid">Failed</Chip>;
  if (r.status === "duplicate") return <Chip tone="muted" title={str(r.duplicateOf) ? `Failed retry of ${r.duplicateOf}` : "Failed retry of a landed trade"}>Duplicate</Chip>;
  return <Chip tone="ok">Success</Chip>;
}
function TypeChip({ t }: { t: string | null | undefined }) {
  if (t === "buy") return <span className="inline-flex h-[20px] items-center rounded-[6px] px-2 text-[11px] font-medium" style={tint("var(--hb-buy)")}>Buy</span>;
  if (t === "sell") return <span className="inline-flex h-[20px] items-center rounded-[6px] px-2 text-[11px] font-medium" style={tint("var(--hb-sell)")}>Sell</span>;
  return <Nil />;
}
const Col = ({ title, children, className = "" }: { title: ReactNode; children: ReactNode; className?: string }) => (
  <div className={`min-w-0 ${className}`}><div className="num mb-2.5 text-[10.5px] uppercase tracking-[.16em] text-ink-3">{title}</div><div className="flex flex-col gap-2">{children}</div></div>
);

function Detail({ r, net }: { r: LedgerRow; net?: string | null }) {
  const dt = r.detail, nw = dt?.network, dbc = dt?.dbc, tips = arr(dt?.tips), tx = dt?.tx, all = dt?.allIn, pv = nw?.provenance ?? {};
  const cuUsed = num(nw?.computeUnitsConsumed), cuLim = num(nw?.computeUnitLimit), cuPrice = num(nw?.cuPriceMicroLamports), sigs = num(nw?.signatures);
  const feeBps = num(dbc?.feeBps), baseBps = num(dbc?.baseFeeBps), dso = num(dbc?.slotOffset), dom = num(dbc?.offsetMs), anti = num(dbc?.antiSniperSol);
  const err = dt?.err == null ? null : typeof dt.err === "string" ? dt.err : JSON.stringify(dt.err);
  const tags = arr(r.tags), dups = arr(tx?.duplicates), other = arr(dt?.otherTransfers);
  return (
    <div data-testid="ledger-detail" className="grid gap-5 rounded-[12px] border border-gold-line bg-surface p-4 md:grid-cols-2 2xl:grid-cols-3">
      <Col title="Network">
        {nw ? (
          <>
            <KV k={`Base fee${sigs != null ? ` (${sigs} ${sigs === 1 ? "signature" : "signatures"})` : ""}`} v={<><Sol v={nw.baseFeeSol ?? r.baseFeeSol} dp={6} /><Prov p={pv.baseFeeSol} /></>} />
            <KV k="Priority fee" sub={cuUsed != null || cuPrice != null ? <>{cuUsed != null && `${fmtNum(cuUsed)} CU used`}{cuLim != null && ` of ${fmtNum(cuLim)}`}{cuPrice != null && `, ${fmtNum(cuPrice)} µL per CU`}</> : undefined}
              v={<><Sol v={nw.priorityFeeSol ?? r.priorityFeeSol} dp={6} /><Prov p={pv.priorityFeeSol} /></>} />
            {num(nw.priorityFeeFromBudgetSol) != null && num(nw.priorityFeeFromBudgetSol) !== num(nw.priorityFeeSol) && <KV k="Priority from compute budget" v={<><Sol v={nw.priorityFeeFromBudgetSol} dp={6} /><Prov p={pv.priorityFeeFromBudgetSol} /></>} />}
            {str(nw.feePayer) && <KV k="Fee payer" v={<Addr a={nw.feePayer} net={net} />} />}
          </>
        ) : <div className="text-[12px] text-ink-3">Network costs are not indexed for this transaction</div>}
        {!nw && (num(r.baseFeeSol) != null || num(r.priorityFeeSol) != null) && <><KV k="Base fee" v={<Sol v={r.baseFeeSol} dp={6} />} /><KV k="Priority fee" v={<Sol v={r.priorityFeeSol} dp={6} />} /></>}
        <div className="num mt-1 text-[10.5px] uppercase tracking-[.16em] text-ink-3">Tips per provider</div>
        {tips.length === 0 ? <div className="text-[12px] text-ink-3">No tip in this transaction</div> : tips.map((t, i) => (
          <KV key={i} k={providerLabel(t.provider)} sub={str(t.account) ? <Addr a={t.account} net={net} className="text-[11px] text-ink-3" /> : undefined} v={<><Sol v={t.sol} /><Prov p="exact" /></>} />
        ))}
        {tips.length > 0 && <KV className="border-t border-border pt-2 font-medium" k={<span className="text-ink">Tips total</span>} v={<Sol v={dt?.tipsTotalSol} />} />}
      </Col>
      <Col title={<>DBC fee{feeBps != null && <>, {fmtPct(feeBps / 100)}</>}{dso != null && <> at slot +{fmtNum(dso)}</>}{dom != null && <>, {fmtOffsetMs(dom)}</>}</>}>
        {dbc ? (
          <>
            <KV k="DBC fee total" v={<><Sol v={dbc.totalSol} dp={6} /><Prov p={dbc.totalProvenance} /></>} />
            <div className="flex flex-col gap-1.5 border-l border-border pl-3">
              {arr(dbc.shares).map((s, i) => { const id = String(s.recipient ?? ""); return (
                <KV key={i} className="text-[12px]" k={<span className="flex items-center gap-1.5">{RECIPIENT_LABEL[id] ?? id}{num(s.pct) != null && <span className="num text-ink-3">{fmtPct(num(s.pct)!, num(s.pct)! % 1 ? 2 : 0)}</span>}</span>} sub={str(s.account) ? <Addr a={s.account} net={net} className="text-[11px] text-ink-3" /> : undefined}
                  v={<><Sol v={s.sol} dp={6} /><Prov p={s.provenance} /></>} />); })}
            </div>
            {anti != null && anti > 0 && (
              <div className="rounded-[9px] border px-3 py-2" style={tint("var(--hb-burn)")}>
                <KV k={<span className="text-burn">Anti-sniper portion</span>} sub={feeBps != null && baseBps != null ? `${fmtPct(feeBps / 100)} charged, ${fmtPct(baseBps / 100)} base` : undefined} v={<><Sol v={anti} dp={6} /><Prov p={dbc.antiSniperProvenance} /></>} />
              </div>
            )}
            {(num(dbc.pricePreSol) != null || num(dbc.pricePostSol) != null) && (
              <KV k="Price" sub={num(dbc.priceImpactPct) != null ? `${fmtPct(num(dbc.priceImpactPct)!)} impact` : undefined}
                v={<span className="num text-[12px]">{num(dbc.pricePreSol) != null ? fmtSolOb(num(dbc.pricePreSol)!, 10) : "—"} <span className="text-ink-3">to</span> {num(dbc.pricePostSol) != null ? fmtSolOb(num(dbc.pricePostSol)!, 10) : "—"}</span>} />
            )}
            {num(dbc.minOutHeadroomPct) != null && <KV k="Slippage headroom" v={<span className="num">{fmtPct(num(dbc.minOutHeadroomPct)!, 1)}</span>} />}
          </>
        ) : <div className="text-[12px] text-ink-3">{r.status === "success" ? "DBC fee detail not indexed" : "No DBC fee, the swap did not execute"}</div>}
      </Col>
      <Col title="Transaction" className="md:col-span-2 2xl:col-span-1">
        <KV k="Signature" v={<Addr a={r.sig} kind="tx" net={net} n={6} />} />
        <KV k="Slot and offset" v={<span className="num">{num(r.slot) != null ? <Scan kind="block" id={num(r.slot)} net={net}>{fmtNum(num(r.slot)!)}</Scan> : <Nil />}{num(r.slotOffset) != null && <span className="ml-1.5 text-gold-text">+{fmtNum(num(r.slotOffset)!)}</span>}</span>} />
        {num(tx?.tokenAmount ?? r.tokenAmount) != null && <KV k={r.type === "sell" ? "Sold" : "Received"} v={<span className="num">{fmtTokens(num(tx?.tokenAmount ?? r.tokenAmount)!)}</span>} />}
        {dups.length > 0 && <KV k="Duplicate sends" v={<span className="flex items-center gap-1.5"><Chip className="h-[18px]">{dups.length} failed</Chip>{dups.slice(0, 2).map((s) => <Addr key={s} a={s} kind="tx" net={net} />)}</span>} />}
        {str(r.duplicateOf) && <KV k="Retry of" v={<Addr a={r.duplicateOf} kind="tx" net={net} />} />}
        {other.map((o, i) => <KV key={i} k={<span className="flex items-center gap-1.5">{o.kind === "createAccount" ? "Account rent" : str(o.kind) ?? "Transfer"}<Addr a={o.to} net={net} className="text-[11px] text-ink-3" /></span>} v={<Sol v={o.sol} />} />)}
        {num(dt?.signerSolDeltaSol) != null && <KV k="Signer SOL change" v={<Sol v={dt?.signerSolDeltaSol} />} />}
        {err && <KV k="Error" v={<span className="max-w-[220px] truncate text-[12px] text-sell" title={err}>{err}</span>} />}
        {all && num(all.costSol) != null && (
          <div className="mt-1 rounded-[10px] border border-border bg-control p-3">
            <div className="flex items-center justify-between gap-2"><span className="text-[12.5px] text-ink-2">All-in cost of this {r.type === "sell" ? "sell" : "buy"}</span><span className="num text-[15px] text-gold-text">{fmtSolOb(num(all.costSol)!, 6)} SOL</span></div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-3">
              {num(all.pctOnTop) != null && <>{fmtPct(num(all.pctOnTop)!)} on top of {num(all.spentSol) != null ? `${fmtSolOb(num(all.spentSol)!)} SOL` : "the trade"}</>}
              {tags.map((t) => <Chip key={t} tone={t === "sniper" ? "bad" : t === "dev" ? "blue" : "muted"} className="h-[18px] px-1.5 text-[10px]">{t}</Chip>)}
            </div>
          </div>
        )}
      </Col>
    </div>
  );
}

export function Ledger({ mint, summary, meta }: { mint: string; summary: TokenOpenBook["ledger"]; meta?: ObMeta | null }) {
  const [kind, setKind] = useState<Kind>("all");
  const [sniper, setSniper] = useState(false);
  const [walletIn, setWalletIn] = useState("");
  const [wallet, setWallet] = useState("");
  const filter = useMemo<LedgerFilter>(() => ({ ...KIND_FILTER[kind], sniper, wallet }), [kind, sniper, wallet]);
  const fkey = JSON.stringify(filter);
  const [cursor, setCursor] = useState<string | null>(null);
  const [starts, setStarts] = useState<number[]>([0]);
  const [page, setPage] = useState<LedgerPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const top = useRef<HTMLDivElement>(null);
  // any filter change starts over at the head page: a cursor is bound to its filter set
  useEffect(() => { setCursor(null); setStarts([0]); setOpen(new Set()); }, [fkey]);
  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    fetchLedger(mint, filter, cursor, LIMIT, ac.signal)
      .then((p) => { setPage(p); setErr(null); })
      .catch((e: Error) => { if (!ac.signal.aborted) { setErr(e.message || "unavailable"); setPage(null); } })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mint, fkey, cursor]);
  useEffect(() => { const t = setTimeout(() => { const v = walletIn.trim(); if (!v || B58.test(v)) setWallet(v); }, 400); return () => clearTimeout(t); }, [walletIn]);
  const c = summary?.counts ?? {};
  const rows = arr(page?.rows), total = num(page?.total), start = starts[starts.length - 1] ?? 0;
  const net = page?.meta?.network ?? meta?.network;
  const walletBad = !!walletIn.trim() && !B58.test(walletIn.trim());
  const KINDS: { id: Kind; label: string; n: unknown }[] = [{ id: "all", label: "All", n: c.all }, { id: "buys", label: "Buys", n: c.buys }, { id: "sells", label: "Sells", n: c.sells }, { id: "failed", label: "Failed", n: c.failed }, { id: "duplicate", label: "Duplicate", n: c.duplicate }];
  const go = (dir: 1 | -1) => {
    if (dir === 1 && page?.nextCursor) { setStarts((s) => [...s, start + rows.length]); setCursor(page.nextCursor); }
    if (dir === -1 && page?.prevCursor) { setStarts((s) => (s.length > 1 ? s.slice(0, -1) : [0])); setCursor(starts.length > 2 ? page.prevCursor! : null); }
    setOpen(new Set());
    top.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  const toggle = (k: string) => setOpen((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const chip = "hb-ctrl inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] text-ink-2";
  return (
    <section aria-labelledby="ob-h" className="min-w-0" ref={top}>
      <SecHead letter="H" id="ob-h" title="Fee ledger" sub={<>Every transaction, every lamport{num(summary?.total) != null && <>, {fmtNum(num(summary?.total)!)} txs</>}</>}
        right={summary?.csv ? <a data-testid="ledger-csv" href={ledgerCsvUrl(mint, filter)} download={`${mint.slice(0, 6)}-ledger.csv`} className={`${chip} text-ink`}><Download size={13} strokeWidth={1.6} />CSV</a> : undefined} />
      <div className="mb-3 flex flex-wrap items-center gap-2" data-testid="ledger-filters">
        <div role="group" aria-label="Transaction type" className="flex flex-wrap gap-1.5">
          {KINDS.map((k) => (
            <button key={k.id} type="button" aria-pressed={kind === k.id} onClick={() => setKind(k.id)} className={`${chip} ${kind === k.id ? `${CTRL_ON} text-ink` : ""}`}>
              {k.label}{num(k.n) != null && <span className="num text-[10.5px] text-ink-3">{fmtNum(num(k.n)!)}</span>}
            </button>
          ))}
        </div>
        <button type="button" aria-pressed={sniper} onClick={() => setSniper((s) => !s)} className={`${chip} ${sniper ? `${CTRL_ON} text-ink` : ""}`} title="Bought within the early window">
          Snipers only{num(c.snipers) != null && <span className="num text-[10.5px] text-ink-3">{fmtNum(num(c.snipers)!)}{c.sniperCountCapped ? " or more" : ""}</span>}
        </button>
        <label className={`hb-ctrl ml-auto flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-full px-2.5 sm:max-w-[260px] ${walletBad ? "border-sell" : ""}`}>
          <Search size={13} strokeWidth={1.6} className="shrink-0 text-ink-3" aria-hidden />
          <input value={walletIn} onChange={(e) => setWalletIn(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { const v = walletIn.trim(); if (!v || B58.test(v)) setWallet(v); } }}
            placeholder="Filter by wallet" aria-label="Filter by wallet address" spellCheck={false} className="num min-w-0 flex-1 bg-transparent text-[12px] text-ink outline-none placeholder:font-sans placeholder:text-ink-3" />
          {walletIn && <button type="button" aria-label="Clear wallet filter" onClick={() => { setWalletIn(""); setWallet(""); }} className="text-ink-3 hover:text-ink"><X size={13} /></button>}
        </label>
      </div>
      <Panel className="overflow-hidden">
        <div className="relative overflow-x-auto">
          <table data-testid="ledger-table" className={`w-full min-w-[720px] text-[12.5px] [&_td]:px-2.5 [&_th]:px-2.5 transition-opacity ${loading ? "opacity-60" : ""}`}>
            <thead><tr className="border-b border-border">
              <th className={`${TH} w-6 pr-0`}><span className="sr-only">Expand</span></th><th className={TH}>Time</th><th className={TH}>Type</th><th className={TH}>Wallet</th><th className={`${TH} text-right`}>SOL</th><th className={`${TH} text-right`} title="Base fee plus priority fee">Network fee</th><th className={`${TH} text-right`}>Tip and provider</th><th className={`${TH} text-right`}>DBC fee</th><th className={TH}>Status</th><th className={`${TH} hidden 2xl:table-cell`}>Signature</th>
            </tr></thead>
            <tbody>
              {err && <tr><td colSpan={10} className="px-3 py-6 text-center text-ink-3">The ledger could not be loaded ({err}).</td></tr>}
              {!err && !loading && rows.length === 0 && <tr><td colSpan={10} className="px-3 py-6 text-center text-ink-3">No transactions match these filters</td></tr>}
              {rows.map((r, i) => {
                const k = `${r.sig}-${r.ixIdx ?? i}`, isOpen = open.has(k), provs = arr(r.tipProviders);
                return (
                  <Fragment key={k}>
                    <tr data-testid="ledger-row" onClick={(e) => { if (!(e.target as HTMLElement).closest("a,button")) toggle(k); }} className={`cursor-pointer border-t border-border hover:bg-control ${isOpen ? "[background:var(--hb-gold-soft)]" : ""} ${r.status !== "success" ? "text-ink-2" : ""}`}>
                      <td className={`${TD} w-6 pr-0`}>
                        <button type="button" aria-expanded={isOpen} aria-label={isOpen ? "Hide details" : "Show details"} onClick={() => toggle(k)} className="grid h-5 w-5 place-items-center rounded text-ink-3 hover:text-ink">
                          <ChevronDown size={13} strokeWidth={1.8} className={`transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                        </button>
                      </td>
                      <td className={`${TD} num whitespace-nowrap text-ink-2`}>{str(r.sig) ? <Scan kind="tx" id={r.sig} net={net} icon={false}>{when(num(r.ts))}</Scan> : when(num(r.ts))}</td>
                      <td className={TD}><TypeChip t={r.type} /></td>
                      <td className={TD}><Addr a={r.wallet} net={net} label={r.label} /></td>
                      <td className={`${TD} text-right`}><Sol v={r.sol} unit={false} /></td>
                      <td className={`${TD} text-right text-ink-2`}>{netFee(r)}</td>
                      <td className={`${TD} text-right`}><Sol v={r.tipSol} unit={false} />{provs.length > 0 && <div className="mt-0.5 text-[10.5px] text-ink-3">{provs.map(providerLabel).join(", ")}</div>}</td>
                      <td className={`${TD} text-right`}><Sol v={r.dbcFeeSol} unit={false} /></td>
                      <td className={TD}><StatusChip r={r} /></td>
                      <td className={`${TD} hidden 2xl:table-cell`}><Addr a={r.sig} kind="tx" net={net} /></td>
                    </tr>
                    {isOpen && <tr className="[background:var(--hb-gold-soft)]"><td colSpan={10} className="px-3 pb-3 pt-1"><Detail r={r} net={net} /></td></tr>}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3.5 py-2.5">
          <span data-testid="ledger-showing" className="text-[12px] text-ink-3">
            {total != null && rows.length > 0 ? <>Showing <span className="num text-ink-2">{fmtNum(start + 1)}–{fmtNum(start + rows.length)}</span> of <span className="num text-ink-2">{page?.totalExact === false ? "at least " : ""}{fmtNum(total)}</span></> : total === 0 ? "Showing 0 of 0" : ""}
            <span className="ml-1.5 hidden md:inline">Failed and duplicate txs paid the network fee but no DBC fee.</span>
          </span>
          <div className="flex gap-1.5">
            <button type="button" data-testid="ledger-prev" disabled={!page?.prevCursor || loading} onClick={() => go(-1)} className="hb-ctrl inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[12px] text-ink disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={13} />Prev</button>
            <button type="button" data-testid="ledger-next" disabled={!page?.nextCursor || loading} onClick={() => go(1)} className="hb-ctrl inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[12px] text-ink disabled:cursor-not-allowed disabled:opacity-40">Next<ChevronRight size={13} /></button>
          </div>
        </div>
      </Panel>
      {walletBad && <p className="mt-1.5 text-[11.5px] text-sell">That does not look like a Solana address.</p>}
    </section>
  );
}
