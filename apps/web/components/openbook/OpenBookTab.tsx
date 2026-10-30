"use client";
/** Token page "Open Book" tab: the public bookkeeping of one token. Every number comes from GET /tokens/:mint/openbook (and the
 *  ledger endpoint), every figure links to Solscan, and a value the API does not have stays empty. */
import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { RotateCw } from "lucide-react";
import { fmtAge } from "@/lib/format";
import { fmtDateTimeUS, fmtDateUS } from "@/lib/date";
import { arr, BUCKET_LABEL, FEE_KIND_LABEL, fetchTokenOpenBook, num, ObError, providerLabel, RECIPIENT_LABEL, str, type ObMeta, type TokenOpenBook } from "@/lib/openbook";
import { SoonChip } from "../SoonChip";
import { DecayChart, Donut, StackBar, TipBars } from "./charts";
import { Addr, Big, BUCKET_COLOR, Chip, COLORS, FEE_COLOR, fmtNum, fmtOffsetMs, fmtPct, fmtSolOb, fmtTokens, KV, Lbl, Nil, Panel, Pct, Prov, providerColor, RECIPIENT_COLOR, Scan, SecHead, Sol, Sq, TD, TH, Unit, tint } from "./ObUi";
import { Ledger } from "./Ledger";

export function IndexChip({ meta, className = "" }: { meta: ObMeta | null | undefined; className?: string }) {
  const net = meta?.network, slot = num(meta?.indexedSlot), at = num(meta?.indexedAt), st = meta?.indexState;
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t); }, []);
  const tone = st === "synced" ? "ok" : st === "lagging" || st === "backfilling" ? "warn" : "muted";
  const word = st === "synced" ? "Synced" : st === "lagging" ? "Lagging" : st === "backfilling" ? "Backfilling" : st === "pending" ? "Indexing pending" : null;
  return (
    <div data-testid="ob-index" className={`flex flex-wrap items-center gap-2 text-[12px] text-ink-3 ${className}`}>
      {slot != null && <span>Indexed to slot <Scan kind="block" id={slot} net={net} className="num text-ink">{fmtNum(slot)}</Scan></span>}
      {word && <Chip tone={tone} title={at != null ? `Indexed ${fmtDateTimeUS(at, { second: "2-digit" })}` : undefined}><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />{word}{at != null && now != null && st !== "pending" ? ` ${fmtAge(at, now)} ago` : ""}</Chip>}
    </div>
  );
}

const ACTION_TONE: Record<string, "ok" | "bad" | "gold" | "blue"> = { buy: "ok", sell: "bad", lock: "gold", transfer: "blue" };
const ACTION_LABEL: Record<string, string> = { buy: "Dev buy", sell: "Sell", lock: "Token lock", transfer: "Transfer" };
const TAG_TONE: Record<string, "blue" | "bad" | "warn" | "muted"> = { dev: "blue", sniper: "bad", bundle: "warn", early: "muted" };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Summary({ d, net }: { d: TokenOpenBook; net?: string | null }) {
  const v = d.summary?.volume, f = d.summary?.fees, as = d.summary?.antiSniper, tp = d.summary?.tips, sn = tp?.snipers;
  const parts = arr(f?.parts);
  const pts = arr(as?.schedule?.points).map((p) => ({ offsetMs: num(p.offsetMs), feeBps: num(p.feeBps) })).filter((p): p is { offsetMs: number; feeBps: number } => p.offsetMs != null && p.feeBps != null);
  const dur = num(as?.schedule?.durationMs) ?? (pts.length ? pts[pts.length - 1].offsetMs : null);
  const base = num(as?.baseFeeBps);
  const launchSlot = num(d.launch?.launchSlot);
  return (
    <section aria-labelledby="ob-a">
      <SecHead letter="A" id="ob-a" title="Summary" sub={<>All time{launchSlot != null && <>, since launch at slot <Scan kind="block" id={launchSlot} net={net} className="num">{fmtNum(launchSlot)}</Scan></>}</>} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-[1fr_1.3fr_1fr_1.2fr]">
        <Panel className="p-4">
          <Lbl>Total volume <Prov p={v?.provenance} /></Lbl>
          <Big>{num(v?.totalSol) != null ? <>{fmtSolOb(num(v?.totalSol)!, 2)}<Unit /></> : <Nil />}</Big>
          <div className="num mt-1.5 flex flex-wrap gap-x-3 text-[11.5px] text-ink-3">
            {num(v?.totalUsd) != null && <span>≈ ${fmtNum(num(v?.totalUsd)!)}</span>}
            {num(v?.txCount) != null && <span>{fmtNum(num(v?.txCount)!)} txs</span>}
          </div>
          <div className="my-3 h-px bg-border" />
          <KV k={<>Buys{num(v?.buyCount) != null && <span className="num ml-1.5 text-ink-3">{fmtNum(num(v?.buyCount)!)}</span>}</>} v={<Sol v={v?.buySol} dp={2} />} />
          <KV className="mt-1.5" k={<>Sells{num(v?.sellCount) != null && <span className="num ml-1.5 text-ink-3">{fmtNum(num(v?.sellCount)!)}</span>}</>} v={<Sol v={v?.sellSol} dp={2} />} />
        </Panel>
        <Panel className="p-4">
          <Lbl>Total fees paid by traders {f?.complete === false && <Chip tone="warn" className="h-[18px]">partial</Chip>}</Lbl>
          <Big>{num(f?.totalSol) != null ? <>{fmtSolOb(num(f?.totalSol)!)}<Unit /></> : <Nil />}</Big>
          {num(f?.pctOfVolume) != null && <div className="mt-1.5 text-[11.5px] text-ink-3">{fmtPct(num(f?.pctOfVolume)!)} of volume, all-in</div>}
          <StackBar className="mb-3 mt-3.5" segs={parts.map((p) => ({ key: String(p.kind), v: num(p.sol) ?? 0, color: FEE_COLOR[String(p.kind)] ?? COLORS.muted, label: FEE_KIND_LABEL[String(p.kind)] }))} />
          <div className="flex flex-col gap-1.5">
            {parts.map((p) => (
              <div key={String(p.kind)} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 text-[12px]">
                <Sq c={FEE_COLOR[String(p.kind)] ?? COLORS.muted} />
                <span className="flex min-w-0 items-center gap-1.5 truncate text-ink-2">{FEE_KIND_LABEL[String(p.kind)] ?? String(p.kind ?? "")}<Prov p={p.provenance} /></span>
                <Sol v={p.sol} unit={false} />
                <span className="num w-12 text-right text-[11px] text-ink-3">{num(p.pct) != null ? fmtPct(num(p.pct)!, 1) : ""}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="p-4">
          <Lbl>Anti-sniper fee portion {as && <Prov p={as.provenance ?? "derived"} />}</Lbl>
          {as ? (
            <>
              <Big>{num(as.portionSol) != null ? <>{fmtSolOb(num(as.portionSol)!)}<Unit /></> : <Nil />}</Big>
              {num(as.pctOfDbcFees) != null && <div className="mt-1.5 text-[11.5px] text-ink-3">{fmtPct(num(as.pctOfDbcFees)!, 1)} of all DBC fees</div>}
              <div className="my-3 h-px bg-border" />
              {pts.length > 1 && dur ? (
                <>
                  <DecayChart points={pts} durationMs={dur} baseBps={base} />
                  <div className="num mt-1 flex justify-between text-[10.5px] text-ink-3">
                    <span>0s at {fmtPct(pts[0].feeBps / 100, 0)}</span><span>{Math.round(dur / 1000)}s at {fmtPct((base ?? pts[pts.length - 1].feeBps) / 100, 0)} base</span>
                  </div>
                </>
              ) : <div className="text-[12px] text-ink-3">No schedule points</div>}
            </>
          ) : (
            <div className="mt-3 text-[12.5px] leading-relaxed text-ink-3">{d.launch?.antiSniper ? "Not indexed yet." : "Off. This token launched without the anti-sniper fee, so every trade paid the flat base fee."}</div>
          )}
        </Panel>
        <Panel gold className="p-4">
          <Lbl>Total tips paid by traders <Prov p={tp?.provenance} /></Lbl>
          <Big>{num(tp?.totalSol) != null ? <>{fmtSolOb(num(tp?.totalSol)!)}<Unit /></> : <Nil />}</Big>
          <div className="mt-1.5 text-[11.5px] text-ink-3">
            {num(tp?.providerCount) != null && <>to {fmtNum(num(tp?.providerCount)!)} block-engine {num(tp?.providerCount) === 1 ? "provider" : "providers"}</>}
            {num(tp?.txCount) != null && <>, {fmtNum(num(tp?.txCount)!)} {num(tp?.txCount) === 1 ? "tx" : "txs"}</>}
          </div>
          {sn && num(sn.sol) != null && (
            <div className="mt-3.5 rounded-[10px] border p-3" style={tint("var(--hb-burn)")} title={str(sn.rule) ? `Sniper rule: ${sn.rule}` : undefined}>
              <div className="text-[12.5px] text-ink-2">
                <b className="num font-medium text-burn">{fmtSolOb(num(sn.sol)!)} SOL</b>{num(sn.pct) != null && <> ({fmtPct(num(sn.pct)!, 1)})</>} paid by{" "}
                <b className="font-medium text-ink">{num(sn.walletCount) != null ? `${fmtNum(num(sn.walletCount)!)} sniper ${num(sn.walletCount) === 1 ? "wallet" : "wallets"}` : "snipers"}</b>
              </div>
              {num(sn.pct) != null && <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-border"><i className="block h-full rounded-full bg-burn" style={{ width: `${Math.min(100, num(sn.pct)!)}%` }} /></div>}
              {num(sn.multiple) != null && num(sn.avgTipPerTxSol) != null && num(sn.othersAvgTipPerTxSol) != null ? (
                <div className="mt-2 text-[11px] text-ink-3">Snipers tipped {fmtNum(num(sn.multiple)!, 0)}× more per tx than other buyers ({fmtSolOb(num(sn.avgTipPerTxSol)!)} vs {fmtSolOb(num(sn.othersAvgTipPerTxSol)!)} SOL).</div>
              ) : num(sn.avgTipPerTxSol) != null ? (
                <div className="mt-2 text-[11px] text-ink-3">Average sniper tip {fmtSolOb(num(sn.avgTipPerTxSol)!)} SOL per tx.</div>
              ) : null}
            </div>
          )}
        </Panel>
      </div>
    </section>
  );
}

function FeeSplit({ d, net }: { d: TokenOpenBook; net?: string | null }) {
  const fs = d.feesSplit, rows = arr(fs?.rows), tot = num(fs?.dbcFeesSol);
  return (
    <Panel className="p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="font-serif text-[18px] font-medium tracking-normal text-ink">DBC fee split</h3><div className="mt-0.5 text-[12px] text-ink-3">Meteora Dynamic Bonding Curve fee, split per pool config and tier</div></div>
        <Prov p={fs?.provenance} />
      </div>
      <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <Donut segs={rows.map((r) => ({ key: String(r.recipient), v: num(r.sol) ?? num(r.pct) ?? 0, color: RECIPIENT_COLOR[String(r.recipient)] ?? COLORS.muted, label: RECIPIENT_LABEL[String(r.recipient)] }))}>
          <span className="num text-[17px] text-ink">{tot != null ? fmtSolOb(tot, tot >= 10 ? 2 : 4) : "—"}</span>
          <span className="text-[10.5px] text-ink-3">SOL in DBC fees</span>
        </Donut>
        <table className="w-full min-w-0 text-[12.5px]">
          <tbody>
            {rows.map((r) => {
              const id = String(r.recipient), cnt = num(r.recipientCount);
              return (
                <tr key={id} className="border-t border-border first:border-t-0">
                  <td className="py-2 pr-2">
                    <span className="flex items-center gap-2 text-ink"><Sq c={RECIPIENT_COLOR[id] ?? COLORS.muted} />{RECIPIENT_LABEL[id] ?? cap(id)}</span>
                    <div className="ml-4 mt-0.5 text-[11px] text-ink-3">{str(r.account) ? <Addr a={r.account} net={net} /> : id === "meteora" ? "Meteora DBC" : id === "referral" ? (cnt != null ? `${fmtNum(cnt)} ${cnt === 1 ? "referrer" : "referrers"}, UI trades only` : "UI trades only") : ""}</div>
                  </td>
                  <td className="num py-2 text-right text-[11.5px] text-ink-3">{num(r.pct) != null ? fmtPct(num(r.pct)!, num(r.pct)! % 1 ? 2 : 0) : ""}</td>
                  <td className="py-2 pl-3 text-right"><span className="inline-flex items-center gap-1.5"><Sol v={r.sol} />{r.provenance !== fs?.provenance && <Prov p={r.provenance} />}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

const BUCKET_NOTE: Record<string, string> = { buyback: "Market-buys $HIGHER and burns it", ops: "Infra, RPC, indexers and team, stays in the fee receiver", treasury: "Reserve, stays in the fee receiver" };
function PlatformShare({ d, net }: { d: TokenOpenBook; net?: string | null }) {
  const pf = d.platformFlow, bk = arr(pf?.buckets), share = num(pf?.platformShareSol);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  return (
    <Panel className="p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-[18px] font-medium tracking-normal text-ink">Where the platform share goes</h3>
          <div className="mt-0.5 text-[12px] text-ink-3">{share != null && <><span className="num text-ink-2">{fmtSolOb(share)} SOL</span> platform share, </>}split {bk.map((b) => fmtPct(num(b.pct) ?? 0, 0)).join(", ")} after deductions</div>
        </div>
        <div className="flex shrink-0 items-center gap-2"><Prov p={pf?.provenance} />{str(pf?.wallet) && <Addr a={pf?.wallet} net={net} className="text-[12px]" />}</div>
      </div>
      <div className="mb-3 mt-4 flex h-9 gap-[3px] overflow-hidden rounded-[9px]" role="img" aria-label={bk.map((b) => `${BUCKET_LABEL[String(b.bucket)] ?? b.bucket} ${num(b.pct)}%`).join(", ")}>
        {bk.map((b) => { const id = String(b.bucket), p = num(b.pct) ?? 0; return (
          <div key={id} className="flex min-w-0 items-center justify-between gap-1 px-2.5 text-[11.5px] font-semibold text-[#14110b]" style={{ width: `${p}%`, background: BUCKET_COLOR[id] ?? COLORS.muted }}>
            <span className="truncate">{p >= 20 ? BUCKET_LABEL[id] ?? id : ""}</span><span className="num">{fmtPct(p, 0)}</span>
          </div>); })}
      </div>
      {bk.map((b) => { const id = String(b.bucket), last = num(b.lastAt), cnt = num(b.txCount); return (
        <div key={id} className="flex items-start justify-between gap-3 border-t border-border py-2.5">
          <div className="flex min-w-0 items-start gap-2.5">
            <Sq c={BUCKET_COLOR[id] ?? COLORS.muted} className="mt-1.5" />
            <div className="min-w-0"><div className="text-[12.5px] font-medium text-ink">{BUCKET_LABEL[id] ?? cap(id)} <span className="num ml-1 text-[11px] font-normal text-ink-3">{fmtPct(num(b.pct) ?? 0, 0)}</span></div><div className="text-[11.5px] text-ink-3">{BUCKET_NOTE[id] ?? ""}</div></div>
          </div>
          <div className="shrink-0 text-right">
            <div className="flex items-center justify-end gap-1.5">{b.state === "soon" ? <SoonChip /> : <Sol v={b.sol} link={str(b.lastSig) ? { kind: "tx", id: b.lastSig } : str(b.account) ? { kind: "account", id: b.account } : null} net={net} />}</div>
            <div className="mt-0.5 text-[11px] text-ink-3">
              {b.state === "soon" ? "Starts when $HIGHER launches" : last != null && now != null ? <>last {fmtAge(last, now)} ago{cnt != null && <>, {fmtNum(cnt)} {cnt === 1 ? "tx" : "txs"}</>}</> : b.pooled ? "accrued, pooled across tokens" : "accrued"}
            </div>
          </div>
        </div>); })}
      <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-1.5 border-t border-border pt-3 text-[12px]">
        <KV k="Claimed to fee wallet" v={<><Sol v={pf?.claimedSol} /><Prov p={pf?.claimedProvenance} /></>} />
        <KV k="LP rebate to creator" v={<Sol v={pf?.deductions?.lpRebateSol} />} />
        <KV k="Trader cashback" v={<><Sol v={pf?.deductions?.cashbackSol} /><Prov p={pf?.deductions?.cashbackProvenance} /></>} />
        <KV k="Net to buckets" v={<Sol v={pf?.netSol} />} />
      </div>
    </Panel>
  );
}

function DevActivity({ d, net, onLockTab }: { d: TokenOpenBook; net?: string | null; onLockTab?: () => void }) {
  const da = d.devActivity, ev = arr(da?.events), dl = d.devLock, locks = arr(d.locks);
  const lockPct = num(da?.lockedPctSupply) ?? num(dl?.lockedPctSupply as number);
  const unlock = num(dl?.cliffTime as number) ?? num(dl?.endTime as number) ?? num(dl?.unlockAt as number);
  const stat = (k: string, v: ReactNode, s?: ReactNode) => (
    <div className="border-border p-3.5 [&:not(:first-child)]:border-l max-sm:[&:nth-child(3)]:border-l-0 max-sm:[&:nth-child(n+3)]:border-t"><div className="text-[11.5px] text-ink-3">{k}</div><div className="num mt-1 text-[16px] text-ink">{v}</div>{s && <div className="mt-0.5 text-[11px] text-ink-3">{s}</div>}</div>
  );
  return (
    <section aria-labelledby="ob-c" className="min-w-0">
      <SecHead letter="C" id="ob-c" title="Dev activity" sub={<>Creator wallet <Addr a={da?.creator ?? d.launch?.creator} net={net} /></>}
        right={num(da?.undisclosedLinkedCount) === 0 ? <Chip tone="ok">No undisclosed linked wallets</Chip> : undefined} />
      <Panel>
        <div className="grid grid-cols-2 border-b border-border sm:grid-cols-4">
          {stat("Dev bought", <Sol v={da?.boughtSol} />, num(da?.boughtPctSupply) != null ? `${fmtPct(num(da?.boughtPctSupply)!)} of supply` : undefined)}
          {stat("Dev sold", <Sol v={da?.soldSol} />, <>{num(da?.soldPctSupply) != null && `${fmtPct(num(da?.soldPctSupply)!)} of supply`}{num(da?.sellTxCount) != null && `, ${fmtNum(num(da?.sellTxCount)!)} ${num(da?.sellTxCount) === 1 ? "tx" : "txs"}`}</>)}
          {stat("Locked in Dev Lock", lockPct != null ? fmtPct(lockPct) : <Nil />, lockPct != null ? (unlock != null ? `unlocks ${fmtDateUS(unlock * 1000)}` : "of supply") : "No active lock")}
          {stat("Dev holds now", <Pct v={da?.holdsPctSupply} />, num(da?.holdsInclLockedPct) != null ? `incl. locked ${fmtPct(num(da?.holdsInclLockedPct)!)}` : num(da?.holdsAsOf) != null ? `as of ${fmtDateTimeUS(num(da?.holdsAsOf)!)}` : undefined)}
        </div>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[560px] text-[12.5px]">
            <thead><tr className="border-b border-border"><th className={TH}>Action</th><th className={TH}>Offset</th><th className={`${TH} text-right`}>SOL</th><th className={`${TH} text-right`}>% supply</th><th className={TH}>Note</th><th className={TH}>Signature</th></tr></thead>
            <tbody>
              {ev.length === 0 && <tr><td colSpan={6} className="px-3 py-4 text-center text-ink-3">No dev trades indexed yet</td></tr>}
              {ev.map((e, i) => {
                const a = String(e.action ?? ""), so = num(e.slotOffset), om = num(e.offsetMs);
                const note = e.atomicWithCreate ? "Atomic with create" : a === "lock" ? "Dev Lock" : e.fromUnlocked ? "Sold from unlocked balance" : a === "sell" ? "Sold" : "";
                return (
                  <tr key={`${e.sig}-${i}`} className="border-t border-border">
                    <td className={TD}><Chip tone={ACTION_TONE[a] ?? "muted"}>{ACTION_LABEL[a] ?? cap(a)}</Chip></td>
                    <td className={`${TD} num text-ink-2`} title={om != null ? fmtOffsetMs(om) : undefined}>{so != null ? `+${fmtNum(so)}` : <Nil />}<span className="ml-1 text-[10.5px] text-ink-3">{so != null ? (so === 1 ? "slot" : "slots") : ""}</span></td>
                    <td className={`${TD} text-right`}><Sol v={e.sol} unit={false} /></td>
                    <td className={`${TD} text-right`}><Pct v={e.pctSupply} /></td>
                    <td className={`${TD} text-ink-2`}>{note}{a === "lock" && str(e.escrow) && <span className="ml-1.5 text-ink-3">escrow <Addr a={e.escrow} net={net} /></span>}</td>
                    <td className={TD}><Addr a={e.sig} kind="tx" net={net} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3.5 py-2.5 text-[12px] text-ink-3">
          <span>{dl || locks.length ? <>Dev Lock {str(dl?.escrow as string) ? <>escrow <Addr a={dl?.escrow as string} net={net} /></> : `${locks.length} ${locks.length === 1 ? "lock" : "locks"}`}{unlock != null && <>, unlocks {fmtDateTimeUS(unlock * 1000)}</>}</> : "No Dev Lock on this token"}</span>
          {onLockTab && <button type="button" onClick={onLockTab} className="text-gold-text hover:underline">Open Dev lock</button>}
        </div>
      </Panel>
    </section>
  );
}

function Migration({ d, net }: { d: TokenOpenBook; net?: string | null }) {
  const m = d.migration, st = m?.steps, pm = d.postMigration, migrated = m?.status === "migrated" || !!st?.migrated;
  const prog = num(m?.progressPct), q = num(m?.quoteReserveSol), th = num(m?.thresholdSol), rem = num(m?.remainingSol), eta = num(m?.etaMs);
  const step = (state: "done" | "now" | "todo", t: string, sub: ReactNode, right?: ReactNode) => (
    <li className="flex items-center gap-3 py-2">
      <span aria-hidden className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full text-[10px] ${state === "done" ? "" : state === "now" ? "bg-gold-soft text-gold-text ring-[3px] ring-[color:var(--hb-gold-soft)]" : "border border-dashed border-border-strong"}`} style={state === "done" ? tint("var(--hb-buy)") : undefined}>{state === "done" ? "✓" : state === "now" ? "●" : ""}</span>
      <div className="min-w-0 flex-1"><div className="text-[12.5px] text-ink">{t}</div><div className="text-[11px] text-ink-3">{sub}</div></div>
      {right}
    </li>
  );
  const pending = <span className="num text-[11px] text-ink-3">pending</span>;
  const lpKind = str(st?.lpLocked?.kind);
  return (
    <section aria-labelledby="ob-d" className="min-w-0">
      <SecHead letter="D" id="ob-d" title="Migration" sub="Meteora DBC to DAMM v2" right={<Chip tone={migrated ? "ok" : "gold"}>{migrated ? "Migrated" : cap(String(m?.status ?? "bonding"))}</Chip>} />
      <Panel className="p-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="num text-[24px] tracking-[-0.02em] text-ink">{q != null ? fmtSolOb(q, 2) : <Nil />}{th != null && <span className="ml-1 text-[13px] text-ink-3">of {fmtSolOb(th, 0)} SOL</span>}</span>
          {prog != null && <span className="num text-gold-text">{fmtPct(prog, 1)}</span>}
        </div>
        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-border"><i className="block h-full rounded-full bg-[linear-gradient(90deg,var(--hb-bronze),var(--hb-gold))]" style={{ width: `${Math.max(0, Math.min(100, prog ?? 0))}%` }} /></div>
        <ol className="mt-3">
          {step(st?.poolCreated ? "done" : "now", "Pool created on Meteora DBC", <>{num(st?.poolCreated?.slot) != null ? <>slot <Scan kind="block" id={num(st?.poolCreated?.slot)} net={net} className="num">{fmtNum(num(st?.poolCreated?.slot)!)}</Scan></> : ""}{num(st?.poolCreated?.ts) != null && <>, {fmtDateTimeUS(num(st?.poolCreated?.ts)!)}</>}</>,
            str(st?.poolCreated?.pool) ? <Addr a={st?.poolCreated?.pool} net={net} className="text-[11.5px]" /> : str(st?.poolCreated?.sig) ? <Addr a={st?.poolCreated?.sig} kind="tx" net={net} className="text-[11.5px]" /> : undefined)}
          {step(migrated ? "done" : "now", "Bonding curve filling", migrated ? "Threshold reached" : <>{rem != null ? `${fmtSolOb(rem, 2)} SOL to go` : ""}{eta != null && `, about ${fmtOffsetMs(eta)} at the current pace`}</>)}
          {step(migrated ? "done" : "todo", "Migrate to Meteora DAMM v2", st?.migrated ? <>{num(st.migrated.slot) != null && <>slot <Scan kind="block" id={num(st.migrated.slot)} net={net} className="num">{fmtNum(num(st.migrated.slot)!)}</Scan></>}{num(st.migrated.ts) != null && <>, {fmtDateTimeUS(num(st.migrated.ts)!)}</>}</> : "Pool and LP are created at the threshold",
            st?.migrated ? (str(st.migrated.dammPool) ? <Addr a={st.migrated.dammPool} net={net} className="text-[11.5px]" /> : str(st.migrated.sig) ? <Addr a={st.migrated.sig} kind="tx" net={net} className="text-[11.5px]" /> : undefined) : pending)}
          {step(st?.lpLocked ? "done" : "todo", "LP permanently locked in DAMM v2", lpKind === "damm_v2_permanent_lock" || !lpKind ? "100% of LP, DAMM v2 permanent lock" : lpKind,
            st?.lpLocked ? (str(st.lpLocked.sig) ? <Addr a={st.lpLocked.sig} kind="tx" net={net} className="text-[11.5px]" /> : <span className="num text-[11px] text-ink-3">from config</span>) : pending)}
        </ol>
        {pm && migrated && (
          <div className="mt-2 flex flex-col gap-1.5 border-t border-border pt-3">
            <div className="mb-0.5 flex items-center gap-1.5 text-[11.5px] text-ink-3">After migration <Prov p={pm.provenance} /></div>
            <KV k="DBC trading fees claimed" v={<Sol v={pm.dbcTradingClaimedSol} />} />
            <KV k="Migration fee" v={<Sol v={pm.migrationFeeSol} />} />
            <KV k="Curve surplus" v={<Sol v={pm.surplusSol} />} />
            <KV k="DAMM v2 LP fees" v={num(pm.dammLpFeesSol) != null ? <Sol v={pm.dammLpFeesSol} /> : <span className="text-[11.5px] text-ink-3">no claim indexed</span>} />
            {pm.lpRebate && <KV k="Creator LP rebate" sub={num(pm.lpRebate.paidCount) != null ? `${fmtNum(num(pm.lpRebate.paidCount)!)} ${num(pm.lpRebate.paidCount) === 1 ? "payout" : "payouts"}` : undefined}
              v={<><Sol v={pm.lpRebate.paidSol} link={str(pm.lpRebate.lastPaidSig) ? { kind: "tx", id: pm.lpRebate.lastPaidSig } : null} net={net} /><span className="text-[11px] text-ink-3">of</span><Sol v={pm.lpRebate.accruedSol} /></>} />}
          </div>
        )}
      </Panel>
    </section>
  );
}

function EarlyBuyers({ d, net }: { d: TokenOpenBook; net?: string | null }) {
  const eb = d.earlyBuyers, rows = arr(eb?.rows), sn = eb?.snipers, w = eb?.window, rules = eb?.rules ?? {};
  const winLabel = w?.kind === "seconds" && num(w.value) != null ? `${fmtNum(num(w.value)!)}s` : num(w?.value) != null ? `${fmtNum(num(w?.value)!)} ${w?.kind ?? ""}` : null;
  const range = arr(sn?.slotRange);
  return (
    <section aria-labelledby="ob-e" className="min-w-0">
      <SecHead letter="E" id="ob-e" title="Early buyers and snipers" sub={winLabel ? `First ${winLabel} after pool creation` : "After pool creation"} />
      <Panel>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[720px] text-[12.5px]">
            <thead><tr className="border-b border-border">
              <th className={TH}>#</th><th className={TH}>Wallet</th><th className={TH}>Offset</th><th className={`${TH} text-right`}>SOL in</th><th className={`${TH} text-right`}>% supply</th><th className={`${TH} text-right`}>Tip paid</th><th className={TH}>Via</th><th className={TH}>Tag</th><th className={`${TH} text-right`}>Holds now</th>
            </tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={9} className="px-3 py-4 text-center text-ink-3">No early buys indexed</td></tr>}
              {rows.map((r, i) => {
                const so = num(r.slotOffset), om = num(r.offsetMs), tag = String(r.tag ?? ""), fa = num(r.failedAttempts);
                const via = str(r.tipProvider) ? providerLabel(r.tipProvider) : arr(r.tipProviders).map(providerLabel).join(", ");
                return (
                  <tr key={`${r.wallet}-${i}`} className="border-t border-border">
                    <td className={`${TD} num text-ink-3`}>{num(r.rank) ?? i + 1}</td>
                    <td className={TD}><Addr a={r.wallet} net={net} label={r.label} />{fa ? <span className="ml-1.5 text-[10.5px] text-sell" title="Failed attempts before landing">{fa} failed</span> : null}</td>
                    <td className={`${TD} num`} title={om != null ? `${fmtOffsetMs(om)} after creation` : undefined}><span className={so === 0 ? "text-gold-text" : "text-ink-2"}>{so != null ? `+${fmtNum(so)}` : <Nil />}</span>{om != null && <span className="ml-1.5 text-[10.5px] text-ink-3">{fmtOffsetMs(om)}</span>}</td>
                    <td className={`${TD} text-right`}><Sol v={r.solIn} unit={false} link={str(r.firstSig) ? { kind: "tx", id: r.firstSig } : null} net={net} /></td>
                    <td className={`${TD} text-right`}><Pct v={r.pctSupply} /></td>
                    <td className={`${TD} text-right`}><Sol v={r.tipSol} unit={false} /></td>
                    <td className={`${TD} text-ink-2`}>{via || <Nil />}</td>
                    <td className={TD}><span title={str(rules[tag]) ?? undefined}><Chip tone={TAG_TONE[tag] ?? "muted"}>{cap(tag || "buyer")}</Chip></span></td>
                    <td className={`${TD} text-right text-ink-2`}><Pct v={r.holdsNowPct} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3.5 py-2.5 text-[12px] text-ink-2">
          <span>
            {sn && num(sn.pctSupplyTaken) != null ? <>Snipers took <b className="num font-medium text-burn">{fmtPct(num(sn.pctSupplyTaken)!)}</b> of supply{range.length === 2 && <> in slots +{range[0]} to +{range[1]}</>}{num(sn.heldNowPct) != null && <>, <b className="num font-medium text-ink">{fmtPct(num(sn.heldNowPct)!)}</b> still held</>}</> : "No sniper buys"}
          </span>
          {num(eb?.total) != null && <span className="text-ink-3">Showing {fmtNum(num(eb?.shown) ?? rows.length)} of {fmtNum(num(eb?.total)!)}</span>}
        </div>
      </Panel>
      {str(rules.sniper) && <p className="mt-2 text-[11px] text-ink-3">Sniper means {rules.sniper}. Early means {str(rules.early) ?? "any other buy in the window"}.</p>}
    </section>
  );
}

function Tips({ d, net }: { d: TokenOpenBook; net?: string | null }) {
  const t = d.tipsByProvider, ps = arr(t?.providers), tot = num(t?.totalSol);
  const rows = ps.map((p, i) => ({ key: String(p.provider ?? i), label: providerLabel(p.provider), v: num(p.tipSol) ?? 0, sniper: num(p.sniperTipSol) ?? 0, color: providerColor(i), count: num(p.txCount) }));
  return (
    <section aria-labelledby="ob-f" className="min-w-0">
      <SecHead letter="F" id="ob-f" title="Tips by provider" sub={<span className="inline-flex items-center gap-1.5">SOL <Prov p={t?.provenance} /></span>} />
      <Panel className="p-4">
        {rows.length === 0 ? <div className="py-6 text-center text-[12.5px] text-ink-3">No tips paid on this token yet</div> : (
          <>
            <div className="mb-2 flex flex-wrap gap-3.5 text-[11.5px] text-ink-2">
              <span className="flex items-center gap-1.5"><Sq c={COLORS.gold} />All traders</span>
              <span className="flex items-center gap-1.5"><span aria-hidden className="inline-block h-2 w-2 rounded-[2px]" style={{ background: "repeating-linear-gradient(45deg,var(--hb-burn) 0 2px,var(--hb-surface) 2px 4px)" }} />of which snipers</span>
            </div>
            <TipBars rows={rows} />
            <div className="mt-2">
              {rows.map((r, i) => { const p = ps[i]; return (
                <div key={r.key} className="flex items-center justify-between gap-3 border-t border-border py-1.5 text-[12px]">
                  <span className="flex min-w-0 items-center gap-2 truncate text-ink-2"><Sq c={r.color} />{r.label}</span>
                  <span className="flex items-center gap-3">
                    {num(p.pctOfTips) != null && <span className="num text-[11px] text-ink-3">{fmtPct(num(p.pctOfTips)!, 1)}</span>}
                    {num(p.sniperPct) != null && <span className="num w-[74px] text-right text-[11px] text-burn">{fmtPct(num(p.sniperPct)!, 0)} snipe</span>}
                    <Sol v={p.tipSol} />
                  </span>
                </div>); })}
            </div>
          </>
        )}
        <div className="mt-2 flex flex-col gap-1.5 border-t border-border pt-2.5">
          <KV k="Total tips" v={<Sol v={tot} />} />
          <KV k="Largest single tip" v={<Sol v={t?.largestTip?.sol} link={str(t?.largestTip?.sig) ? { kind: "tx", id: t?.largestTip?.sig } : null} net={net} />} />
          {num(t?.medianTipSol) != null && <KV k="Median tip" v={<Sol v={t?.medianTipSol} />} />}
        </div>
      </Panel>
    </section>
  );
}

function Holders({ d, net }: { d: TokenOpenBook; net?: string | null }) {
  const h = d.holders, top = arr(h?.top), max = Math.max(...top.map((x) => num(x.pctSupply) ?? 0), 0.0001);
  const cell = (k: string, v: ReactNode) => <div className="min-w-0 rounded-[10px] border border-border bg-control px-3 py-2.5"><div className="text-[11px] text-ink-3">{k}</div><div className="num mt-0.5 text-[16px] text-ink">{v}</div></div>;
  return (
    <section aria-labelledby="ob-g" className="min-w-0">
      <SecHead letter="G" id="ob-g" title="Holder concentration" sub={num(h?.asOf) != null ? `As of ${fmtDateTimeUS(num(h?.asOf)!)}` : undefined} right={<Prov p={h?.provenance} />} />
      <Panel className="p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {cell("Holders", num(h?.count) != null ? fmtNum(num(h?.count)!) : <Nil />)}
          {cell("Top 10", <Pct v={h?.top10Pct} />)}
          {cell("Top 20", <Pct v={h?.top20Pct} />)}
          {cell("Dev", <Pct v={h?.devPct} />)}
        </div>
        <ol className="mt-3 grid gap-x-6 gap-y-1 xl:grid-cols-2">
          {top.map((x, i) => { const p = num(x.pctSupply); return (
            <li key={`${x.wallet}-${i}`} className="grid grid-cols-[18px_minmax(0,1fr)_minmax(60px,120px)_64px] items-center gap-2 py-1 text-[12px]">
              <span className="num text-ink-3">{i + 1}</span>
              <span className="flex min-w-0 items-center gap-1.5 truncate"><Addr a={x.wallet} net={net} />{x.label && <span className="truncate text-[11px] text-ink-3">{x.label}</span>}{x.isCreator && <Chip tone="blue" className="h-[18px] px-1.5 text-[10px]">Dev</Chip>}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-border"><i className="block h-full rounded-full" style={{ width: `${((p ?? 0) / max) * 100}%`, background: x.isCreator ? "var(--hb-tier-standard)" : "var(--hb-gold)" }} /></span>
              <span className="text-right"><Pct v={p} /></span>
            </li>); })}
        </ol>
        {str(h?.rule) && <p className="mt-2 text-[11px] text-ink-3">Holders are wallets with a positive net indexed balance. The creator counts net of active locks.</p>}
      </Panel>
    </section>
  );
}

function Skeleton() {
  return (
    <div data-testid="ob-loading" className="flex flex-col gap-3" aria-busy="true">
      <div className="h-4 w-2/3 animate-pulse rounded bg-control" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-lg border border-border bg-surface" />)}</div>
      <div className="h-64 animate-pulse rounded-lg border border-border bg-surface" />
    </div>
  );
}

export function OpenBookTab({ mint, onLockTab }: { mint: string; ticker?: string; onLockTab?: () => void }) {
  const [data, setData] = useState<TokenOpenBook | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => { setErr(null); setNonce((n) => n + 1); }, []);
  useEffect(() => {
    const ac = new AbortController();
    fetchTokenOpenBook(mint, ac.signal).then((d) => { setData(d); setErr(null); setMissing(false); }).catch((e: Error) => { if (ac.signal.aborted) return; setMissing(e instanceof ObError && e.status === 404); setErr(e.message || "unavailable"); });
    return () => ac.abort();
  }, [mint, nonce]);
  if (!data && err && missing) return (
    <Panel className="flex flex-col items-center gap-2 p-8 text-center">
      <div className="font-serif text-[18px] text-ink">No Open Book for this token yet</div>
      <p className="max-w-md text-[12.5px] text-ink-3">The bookkeeping index has not read this token. Its ledger appears here once the first trades are indexed.</p>
    </Panel>
  );
  if (!data && err) return (
    <Panel className="flex flex-col items-center gap-3 p-8 text-center">
      <div className="font-serif text-[18px] text-ink">The Open Book is not available right now</div>
      <p className="max-w-md text-[12.5px] text-ink-3">The bookkeeping index could not be reached. Nothing is shown rather than a guess.</p>
      <button type="button" onClick={reload} className="hb-ctrl inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] text-ink"><RotateCw size={13} strokeWidth={1.6} />Try again</button>
    </Panel>
  );
  if (!data) return <Skeleton />;
  const net = data.meta?.network;
  return (
    <div data-testid="openbook-tab" className="flex flex-col gap-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-[640px] font-serif text-[15.5px] italic leading-snug text-ink-2">An open ledger of every lamport this token has moved. Who paid what, to whom, and where the platform’s share goes, with every figure linked to its source.</p>
        <IndexChip meta={data.meta} />
      </div>
      {data.meta?.indexState === "pending" && <Panel className="p-3 text-[12.5px] text-ink-2">This token is still being indexed. Figures fill in as transactions are read, and empty fields mean not indexed yet, not zero.</Panel>}
      <Summary d={data} net={net} />
      <section aria-labelledby="ob-b">
        <SecHead letter="B" id="ob-b" title="Fee split" sub="Where every DBC fee lamport lands" />
        <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2"><FeeSplit d={data} net={net} /><PlatformShare d={data} net={net} /></div>
      </section>
      <div className="grid grid-cols-1 gap-7 2xl:grid-cols-[1.7fr_1fr] 2xl:gap-3"><DevActivity d={data} net={net} onLockTab={onLockTab} /><Migration d={data} net={net} /></div>
      <div className="grid grid-cols-1 gap-7 2xl:grid-cols-[1.7fr_1fr] 2xl:gap-3"><EarlyBuyers d={data} net={net} /><Tips d={data} net={net} /></div>
      <Holders d={data} net={net} />
      <Ledger mint={mint} summary={data.ledger} meta={data.meta} />
      <p className="border-t border-border pt-4 text-center text-[11.5px] text-ink-3">Every figure links to its on-chain source on Solscan. Fees marked <span className="text-gold-text">exact</span> are read from transaction meta, <span className="text-burn">derived</span> ones are computed from pool config.</p>
    </div>
  );
}
