"use client";
/** /open-book: platform-wide bookkeeping. The server page passes the first payloads (SSR, cached 60 s), this view adds the
 *  interactive parts: window chips, token search, status filter, sorting and cursor paging. Aggregates link to the Methodology
 *  section, single accounts and transactions link to Solscan. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { TIERS, type TierId } from "@hb/shared";
import { fmtDateTimeUS, fmtDateUS } from "@/lib/date";
import { arr, fetchObTokens, num, OB_WINDOWS, providerLabel, str, type ObTokenRow, type ObTokensPage, type ObWindow, type PlatformOpenBook, type TokensQuery, type TreasuryWallet } from "@/lib/openbook";
import { TokenLogo } from "../TokenLogo";
import { CTRL_ON, TierBadge } from "../ui";
import { FeeFlow, Spark, type FlowLink, type FlowNode } from "./charts";
import { IndexChip } from "./OpenBookTab";
import { Addr, BUCKET_COLOR, Chip, COLORS, fmtNum, fmtPct, fmtSolOb, fmtTokens, KV, Lbl, Nil, Panel, Prov, RECIPIENT_COLOR, Scan, SecHead, Sol, TD, TH, Unit, mix } from "./ObUi";

const PAGE = 25;
const ROLE_LABEL: Record<string, string> = { feeReceiver: "Fee receiver", treasury: "Treasury", lockTip: "Lock tips" };
const ROLE_NOTE: Record<string, string> = {
  feeReceiver: "Receives the platform share of DBC fees. The ops and treasury buckets stay here, nothing is swept out.",
  lockTip: "Receives the flat lock tip paid with each Dev Lock transaction.",
};
const chip = "hb-ctrl inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] text-ink-2";
const M = "#methodology";

function Card({ label, children, sub, gold }: { label: string; children: ReactNode; sub?: ReactNode; gold?: boolean }) {
  return (
    <Panel gold={gold} className="p-4">
      <Lbl>{label}</Lbl>
      <a href={M} className="mt-2 block font-mono text-[22px] leading-none tracking-tight text-ink hover:text-gold-text" title="How this is computed">{children}</a>
      {sub && <div className="mt-2 text-[11.5px] text-ink-3">{sub}</div>}
    </Panel>
  );
}
const solOr = (v: unknown, dp = 2) => { const n = num(v); return n == null ? <Nil /> : <>{fmtSolOb(n, dp)}<Unit /></>; };

function Totals({ t }: { t: PlatformOpenBook["totals"] }) {
  const n = (v: unknown) => num(v);
  return (
    <div data-testid="ob-totals" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Card label="Tokens launched" sub={n(t?.migratedCount) != null && <>{fmtNum(n(t?.migratedCount)!)} migrated to DAMM v2</>}>{n(t?.tokensLaunched) != null ? fmtNum(n(t?.tokensLaunched)!) : <Nil />}</Card>
      <Card label="Total volume" sub={<>{n(t?.volumeUsd) != null && <>≈ ${fmtNum(n(t?.volumeUsd)!)}, </>}{n(t?.txCount) != null && <>{fmtNum(n(t?.txCount)!)} txs</>}</>}>{solOr(t?.volumeSol)}</Card>
      <Card label="Total fees paid" sub={n(t?.feesPctOfVolume) != null && <>{fmtPct(n(t?.feesPctOfVolume)!)} of volume, all-in</>}>{solOr(t?.feesPaidSol, 4)}</Card>
      <Card label="DBC fees" sub={n(t?.dbcPctOfVolume) != null && <>{fmtPct(n(t?.dbcPctOfVolume)!)} of volume</>}>{solOr(t?.dbcFeesSol, 4)}</Card>
      <Card label="Creators earned" sub={n(t?.creatorCount) != null && <>across {fmtNum(n(t?.creatorCount)!)} {n(t?.creatorCount) === 1 ? "creator" : "creators"}</>}>{solOr(t?.creatorsEarnedSol, 4)}</Card>
      <Card gold label="Tips paid by traders" sub={n(t?.sniperTipPct) != null && <span className="text-burn">{fmtPct(n(t?.sniperTipPct)!, 1)} from sniper wallets</span>}>{solOr(t?.tipsSol, 4)}</Card>
    </div>
  );
}

function WalletCard({ w, net }: { w: TreasuryWallet; net?: string | null }) {
  const roles = arr(w.roles), spark = arr(w.spark).map((p) => num(p.balanceSol)).filter((v): v is number => v != null);
  const isTip = roles.includes("lockTip") && !roles.includes("feeReceiver");
  const title = roles.includes("feeReceiver") ? "Platform fee wallet" : isTip ? "Lock-tip wallet" : roles.includes("treasury") ? "Treasury" : "Platform wallet";
  const color = isTip ? COLORS.blue : COLORS.gold, ch = num(w.netChange24hSol);
  return (
    <Panel className="flex flex-col p-4" >
      <div className="flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border" style={{ borderColor: mix(color, 35), background: mix(color, 10) }}><i className="h-2.5 w-2.5 rotate-45 rounded-[2px]" style={{ background: color }} /></span>
        <div className="min-w-0 flex-1">
          <h3 className="font-sans text-[13.5px] font-medium tracking-normal text-ink">{title}</h3>
          <Addr a={w.address} net={net} className="text-[11.5px] text-ink-3" />
        </div>
        <div className="flex flex-wrap justify-end gap-1">{roles.map((r) => <Chip key={r} className="h-[20px] px-2 text-[10.5px]">{ROLE_LABEL[r] ?? r}</Chip>)}</div>
      </div>
      <div className="mt-3 flex items-baseline font-mono text-[26px] leading-none tracking-tight">{num(w.balanceSol) != null ? <Scan kind="account" id={w.address} net={net} className="text-ink">{fmtSolOb(num(w.balanceSol)!, 4)}</Scan> : <Nil />}<Unit /><Prov p={w.provenance} className="ml-2" /></div>
      <p className="mt-1.5 min-h-[30px] text-[11.5px] leading-snug text-ink-3">{roles.map((r) => ROLE_NOTE[r]).filter(Boolean).join(" ")}</p>
      <Spark values={spark} color={color} className="mt-2" />
      <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3 text-[12px]">
        <KV k="Net change 24h" v={ch == null ? <Nil /> : <span className={`num ${ch < 0 ? "text-sell" : ch > 0 ? "text-buy" : "text-ink-2"}`}>{ch > 0 ? "+" : ""}{fmtSolOb(ch, 4)} SOL</span>} />
        {num(w.wsolSol) != null && <KV k="Wrapped SOL" v={<Sol v={w.wsolSol} />} />}
        {num(w.higherHeldTokens) != null && <KV k="$HIGHER held" v={<span className="num">{fmtTokens(num(w.higherHeldTokens)!)}</span>} />}
        {str(w.ownerLabel) && <KV k="Owner" v={<Addr a={w.owner} net={net} label={w.ownerLabel} />} />}
        <KV k="Read at slot" v={<span className="num text-ink-2" title={num(w.balanceAt) != null ? fmtDateTimeUS(num(w.balanceAt)!) : undefined}>{num(w.slot) != null ? <Scan kind="block" id={num(w.slot)} net={net}>{fmtNum(num(w.slot)!)}</Scan> : <Nil />}</span>} />
      </div>
    </Panel>
  );
}

function Flow({ ob }: { ob: PlatformOpenBook }) {
  const f = ob.feeFlow, r = f?.recipients, ft = f?.feeTypes, pu = ob.platformUse, sp = f?.splitPct ?? {};
  const v = (x: unknown) => Math.max(0, num(x) ?? 0);
  const tips = arr(r?.tips).filter((t) => v(t.sol) > 0).sort((a, b) => v(b.sol) - v(a.sol));
  const shown = tips.slice(0, 4), rest = tips.slice(4);
  const tipRows = rest.length ? [...shown, { provider: "others", sol: rest.reduce((a, t) => a + v(t.sol), 0) }] : shown;
  const pct = (k: string) => { const p = num(sp[k]); return p == null ? undefined : fmtPct(p, p % 1 ? 1 : 0); };
  const platform = v(r?.platformSol), puPct = pu?.pct ?? {};
  const nodes: FlowNode[] = [
    { id: "traders", col: 0, label: "Traders", v: v(f?.tradersSol), color: COLORS.silver },
    { id: "dbc", col: 1, label: "DBC fees", v: v(ft?.dbcSol), color: COLORS.gold },
    { id: "tips", col: 1, label: "Tips to providers", v: v(ft?.tipsSol), color: COLORS.blue },
    { id: "network", col: 1, label: "Network base and priority", v: v(ft?.networkSol), color: COLORS.muted },
    { id: "meteora", col: 2, label: "Meteora protocol", note: pct("meteora"), v: v(r?.meteoraSol), color: RECIPIENT_COLOR.meteora },
    { id: "creators", col: 2, label: "Creators", note: pct("creators"), v: v(r?.creatorsSol), color: RECIPIENT_COLOR.creator },
    { id: "platform", col: 2, label: "Platform", note: pct("platform"), v: platform, color: RECIPIENT_COLOR.platform },
    { id: "referrers", col: 2, label: "Referrers", note: pct("referrers"), v: v(r?.referrersSol), color: RECIPIENT_COLOR.referral },
    ...tipRows.map((t, i) => ({ id: `tip${i}`, col: 2, label: providerLabel(t.provider), v: v(t.sol), color: COLORS.blue })),
    { id: "validators", col: 2, label: "Validators", v: v(r?.validatorsSol), color: COLORS.muted },
    { id: "burned", col: 2, label: "Burned base fee", v: v(r?.burnedBaseFeeSol), color: COLORS.burn },
    // platform use is a share of the platform node, sized by the API's percentages (buckets are pooled, there is no per-window SOL)
    ...Object.entries(puPct).filter(([, p]) => num(p) != null).map(([k, p]) => ({ id: `use-${k}`, col: 3, label: k === "buyback" ? "Buyback and burn" : k === "ops" ? "Operations" : k === "treasury" ? "Treasury" : k, note: fmtPct(num(p)!, 0), v: (platform * num(p)!) / 100, color: BUCKET_COLOR[k] ?? COLORS.muted })),
  ].filter((n) => n.v > 0 || n.col === 3);
  const links: FlowLink[] = [
    { from: "traders", to: "dbc", v: v(ft?.dbcSol) }, { from: "traders", to: "tips", v: v(ft?.tipsSol) }, { from: "traders", to: "network", v: v(ft?.networkSol) },
    ...["meteora", "creators", "platform", "referrers"].map((k) => ({ from: "dbc", to: k, v: nodes.find((n) => n.id === k)?.v ?? 0 })),
    ...tipRows.map((_, i) => ({ from: "tips", to: `tip${i}`, v: nodes.find((n) => n.id === `tip${i}`)?.v ?? 0 })),
    { from: "network", to: "validators", v: v(r?.validatorsSol) }, { from: "network", to: "burned", v: v(r?.burnedBaseFeeSol) },
    ...nodes.filter((n) => n.col === 3).map((n) => ({ from: "platform", to: n.id, v: n.v })),
  ];
  const bb = ob.buyback, burned = num(bb?.burnedTokens);
  const fmt = (n: FlowNode) => (n.col === 3 ? "share of platform" : `${fmtSolOb(n.v, 4)} SOL`);
  return (
    <section aria-labelledby="ob-flow" className="flex min-w-0 flex-col gap-3">
      <SecHead id="ob-flow" title="Fee flow" sub={<>Where every lamport traders paid ended up{f?.tipsWindow && f.tipsWindow !== f.window ? ", tips over all time" : ""}</>}
        right={<div className="flex flex-wrap items-center gap-3 text-[11.5px] text-ink-3"><Leg c={COLORS.gold}>On-platform (DBC)</Leg><Leg c={COLORS.blue}>Off-platform (block engines)</Leg><Leg c={COLORS.muted}>Network</Leg><Prov p={f?.provenance} /></div>} />
      <Panel className="p-4">
        {num(f?.tradersSol) ? <div className="relative overflow-x-auto"><FeeFlow nodes={nodes} links={links} heads={["Paid by", "Fee type", "Recipient", "Platform use"]} fmt={fmt} /></div>
          : <div className="py-10 text-center text-[12.5px] text-ink-3">No fees in this window yet</div>}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-[12px] text-ink-3">
          <span>
            {bb?.status === "soon" || burned == null ? <>Buyback and burn <Chip tone="gold" className="ml-1 h-[20px]">Soon</Chip> <span className="ml-1">starts when $HIGHER launches</span></>
              : <>Burned to date <span className="num text-ink">{fmtTokens(burned)} $HIGHER</span> via {fmtNum(num(bb?.buybackTxCount) ?? 0)} buyback txs{str(bb?.lastSig) && <> <Addr a={bb?.lastSig} kind="tx" net={ob.meta?.network} /></>}</>}
          </span>
          {num(f?.platformPctOfFees) != null && <span>Platform share is {fmtPct(num(f?.platformPctOfFees)!, 1)} of total fees paid{num(f?.tipsPctOfFees) != null && <>, {fmtPct(num(f?.tipsPctOfFees)!, 1)} leaves highbar as tips</>}</span>}
        </div>
      </Panel>
      <div className="grid gap-3 md:grid-cols-3">
        <Panel className="p-4">
          <Lbl>Platform use, closed periods</Lbl>
          <div className="mt-2.5 flex flex-col gap-1.5 text-[12px]">
            <KV k="Periods closed" v={<span className="num">{num(pu?.periods) != null ? fmtNum(num(pu?.periods)!) : <Nil />}</span>} />
            <KV k="Gross platform share" v={<Sol v={pu?.grossSol} />} />
            {(["buybackSol", "opsSol", "treasurySol"] as const).map((k) => <KV key={k} k={k === "buybackSol" ? "Buyback" : k === "opsSol" ? "Ops" : "Treasury"} v={<Sol v={pu?.[k]} />} />)}
            <KV k="LP rebate and cashback" v={<span className="num">{solOr((num(pu?.lpRebateSol) ?? 0) + (num(pu?.cashbackSol) ?? 0), 4)}</span>} />
          </div>
        </Panel>
        <Panel className="p-4">
          <Lbl>Fee claims</Lbl>
          <div className="mt-2.5 flex flex-col gap-1.5 text-[12px]">
            {([["dbcTrading", "DBC trading fees"], ["dbcMigration", "DBC migration fees"], ["dbcSurplus", "DBC surplus"], ["dammLp", "DAMM v2 LP fees"]] as const).map(([k, l]) => (
              <KV key={k} k={l} v={<span className="num"><Sol v={ob.claims?.[k]?.sol} />{num(ob.claims?.[k]?.count) != null && <span className="ml-1.5 text-ink-3">{fmtNum(num(ob.claims?.[k]?.count)!)} claims</span>}</span>} />
            ))}
          </div>
        </Panel>
        <Panel className="p-4">
          <Lbl>Cashback paid to traders</Lbl>
          <div className="mt-2 font-mono text-[22px] leading-none">{solOr(ob.cashbackPaid?.sol, 4)}</div>
          <div className="mt-2 text-[11.5px] text-ink-3">{num(ob.cashbackPaid?.payouts) != null && <>{fmtNum(num(ob.cashbackPaid?.payouts)!)} payouts to {fmtNum(num(ob.cashbackPaid?.wallets) ?? 0)} wallets</>}</div>
        </Panel>
      </div>
    </section>
  );
}
const Leg = ({ c, children }: { c: string; children: ReactNode }) => <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-[2px]" style={{ background: c }} />{children}</span>;

type SortKey = "volume" | "dbcFees" | "creatorEarned" | "tips" | "sniperTipPct";
const COLS: { k: SortKey; label: string }[] = [{ k: "volume", label: "Volume" }, { k: "dbcFees", label: "DBC fees" }, { k: "creatorEarned", label: "Creator earned" }, { k: "tips", label: "Tips paid" }, { k: "sniperTipPct", label: "Sniper share of tips" }];
const tierOf = (t: unknown): TierId | null => (typeof t === "string" && t in TIERS ? (t as TierId) : null);

function Tokens({ initial, initialQ }: { initial: ObTokensPage | null; initialQ: string }) {
  const [qIn, setQIn] = useState(initialQ);
  const [q, setQ] = useState(initialQ);
  const [status, setStatus] = useState<NonNullable<TokensQuery["status"]>>("all");
  const [sort, setSort] = useState<SortKey | null>(null);
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [stack, setStack] = useState<(string | null)[]>([null]);
  const [data, setData] = useState<ObTokensPage | null>(initial);
  const [err, setErr] = useState<string | null>(initial ? null : "unavailable");
  const [loading, setLoading] = useState(false);
  const first = useRef(true);
  const cursor = stack[stack.length - 1];
  const key = JSON.stringify({ q, status, sort, order });
  useEffect(() => { const t = setTimeout(() => setQ(qIn.trim().slice(0, 64)), 300); return () => clearTimeout(t); }, [qIn]);
  useEffect(() => {
    // keep ?q= in the address bar without a server round trip
    const u = new URL(window.location.href);
    if (q) u.searchParams.set("q", q); else u.searchParams.delete("q");
    if (u.toString() !== window.location.href) window.history.replaceState(window.history.state, "", u.toString());
  }, [q]);
  useEffect(() => { setStack([null]); }, [key]);
  useEffect(() => {
    if (first.current) { first.current = false; if (initial) return; }
    const ac = new AbortController();
    setLoading(true);
    fetchObTokens({ q, status, sort: sort ?? undefined, order: sort ? order : undefined, cursor, limit: PAGE }, ac.signal)
      .then((d) => { setData(d); setErr(null); })
      .catch((e: Error) => { if (!ac.signal.aborted) { setErr(e.message || "unavailable"); setData(null); } })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, cursor]);
  const rows = arr(data?.rows), total = num(data?.total), start = (stack.length - 1) * PAGE;
  const net = data?.meta?.network;
  const onSort = (k: SortKey) => { if (sort === k) setOrder((o) => (o === "desc" ? "asc" : "desc")); else { setSort(k); setOrder("desc"); } };
  const sniperColor = (p: number) => (p >= 60 ? "var(--hb-sell)" : p >= 40 ? "var(--hb-burn)" : "var(--hb-tier-higher)");
  return (
    <section aria-labelledby="ob-tokens" className="flex min-w-0 flex-col gap-3">
      <SecHead id="ob-tokens" title="All tokens" sub={<>{total != null && <>{fmtNum(total)} {total === 1 ? "token" : "tokens"}, </>}{sort ? `sorted by ${COLS.find((c) => c.k === sort)?.label.toLowerCase()}` : q ? "best match first" : "sorted by volume"}</>}
        right={<div className="flex flex-wrap items-center gap-1.5">
          <label className="hb-ctrl flex h-7 w-full items-center gap-1.5 rounded-full px-2.5 sm:w-[230px]">
            <Search size={13} strokeWidth={1.6} className="shrink-0 text-ink-3" aria-hidden />
            <input data-testid="ob-search" value={qIn} onChange={(e) => setQIn(e.target.value)} placeholder="Filter by name or mint" aria-label="Filter tokens by name, ticker or mint" spellCheck={false}
              className="min-w-0 flex-1 bg-transparent text-[12px] text-ink outline-none placeholder:text-ink-3" />
            {qIn && <button type="button" aria-label="Clear search" onClick={() => { setQIn(""); setQ(""); }} className="text-ink-3 hover:text-ink"><X size={13} /></button>}
          </label>
          {(["all", "bonding", "migrated"] as const).map((s) => <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)} className={`${chip} ${status === s ? `${CTRL_ON} text-ink` : ""}`}>{s === "all" ? "All" : s === "bonding" ? "Bonding" : "Migrated"}</button>)}
        </div>} />
      <Panel className="overflow-hidden">
        <div className="relative overflow-x-auto">
          <table data-testid="ob-tokens-table" className={`w-full min-w-[900px] text-[12.5px] transition-opacity ${loading ? "opacity-60" : ""}`}>
            <thead><tr className="border-b border-border">
              <th className={`${TH} w-8`}>#</th><th className={TH}>Token</th><th className={TH}>Tier</th>
              {COLS.map((c) => (
                <th key={c.k} className={`${TH} ${c.k === "sniperTipPct" ? "" : "text-right"}`} aria-sort={sort === c.k ? (order === "asc" ? "ascending" : "descending") : "none"}>
                  <button type="button" onClick={() => onSort(c.k)} className={`inline-flex items-center gap-1 hover:text-ink ${sort === c.k || (!sort && c.k === "volume" && !q) ? "text-gold-text" : ""}`}>
                    {c.label}{sort === c.k && (order === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                  </button>
                </th>
              ))}
              <th className={TH}>Status</th><th className={`${TH} w-6`}><span className="sr-only">Open</span></th>
            </tr></thead>
            <tbody>
              {err && <tr><td colSpan={11} className="px-3 py-8 text-center text-ink-3">The token list could not be loaded ({err}).</td></tr>}
              {!err && rows.length === 0 && <tr><td colSpan={11} className="px-3 py-8 text-center text-ink-3">{q ? <>No tokens match “{q}”</> : "No tokens yet"}</td></tr>}
              {rows.map((t, i) => <TokenRow key={t.mint ?? i} t={t} i={start + i} net={net} sniperColor={sniperColor} />)}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3.5 py-2.5">
          <span data-testid="ob-tokens-showing" className="text-[12px] text-ink-3">{total != null && rows.length > 0 ? <>Showing <span className="num text-ink-2">{fmtNum(start + 1)}–{fmtNum(start + rows.length)}</span> of <span className="num text-ink-2">{fmtNum(total)}</span>, amounts in SOL</> : total === 0 ? "Showing 0 of 0" : ""}</span>
          <div className="flex gap-1.5">
            <button type="button" disabled={stack.length < 2 || loading} onClick={() => setStack((s) => s.slice(0, -1))} className="hb-ctrl inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[12px] text-ink disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={13} />Prev</button>
            <button type="button" disabled={!data?.nextCursor || loading} onClick={() => setStack((s) => [...s, data!.nextCursor!])} className="hb-ctrl inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[12px] text-ink disabled:cursor-not-allowed disabled:opacity-40">Next<ChevronRight size={13} /></button>
          </div>
        </div>
      </Panel>
    </section>
  );
}

function TokenRow({ t, i, net, sniperColor }: { t: ObTokenRow; i: number; net?: string | null; sniperColor: (p: number) => string }) {
  const href = t.mint ? `/token/${t.mint}?tab=openbook` : undefined, tier = tierOf(t.tier), sp = num(t.sniperTipPct), pr = num(t.progressPct);
  const name = str(t.name) ?? "Unnamed", sym = str(t.symbol), router = useRouter();
  const cell = (v: unknown) => <span className="num">{num(v) != null ? fmtSolOb(num(v)!, 2) : <Nil />}</span>;
  return (
    <tr data-testid="ob-token-row" onClick={(e) => { if (href && !(e.target as HTMLElement).closest("a,button")) router.push(href); }} className={`group border-t border-border hover:bg-control ${href ? "cursor-pointer" : ""}`}>
      <td className={`${TD} num text-ink-3`}>{i + 1}</td>
      <td className={TD}>
        {href ? <Link href={href} className="flex items-center gap-2.5" data-testid="ob-token-link">
          <TokenLogo name={name} size={28} />
          <span className="min-w-0"><span className="block max-w-[180px] truncate text-[13px] font-medium text-ink">{name}</span>{sym && <span className="num block text-[11px] text-ink-3">${sym}</span>}</span>
        </Link> : name}
      </td>
      <td className={TD}>{tier ? <TierBadge tier={tier} /> : <Nil />}</td>
      <td className={`${TD} text-right`}>{cell(t.volumeSol)}</td>
      <td className={`${TD} text-right`}>{cell(t.dbcFeesSol)}</td>
      <td className={`${TD} text-right`}>{cell(t.creatorEarnedSol)}</td>
      <td className={`${TD} text-right`}>{cell(t.tipsSol)}</td>
      <td className={TD}>{sp == null ? <Nil /> : <span className="flex items-center gap-2"><span className="h-[5px] w-16 overflow-hidden rounded-full bg-border"><i className="block h-full rounded-full" style={{ width: `${Math.min(100, sp)}%`, background: sniperColor(sp) }} /></span><span className="num text-[12px]" style={{ color: sniperColor(sp) }}>{fmtPct(sp, 1)}</span></span>}</td>
      <td className={TD}>{t.status === "migrated" ? <Chip tone="blue">Migrated</Chip> : t.status === "bonding" ? <span className="flex items-center gap-1.5"><Chip tone="gold">Bonding</Chip>{pr != null && <span className="num text-[11.5px] text-ink-2">{fmtPct(pr, 1)}</span>}</span> : <Nil />}</td>
      <td className={`${TD} text-ink-3`}><ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden /></td>
    </tr>
  );
}

function Methodology({ ob }: { ob: PlatformOpenBook | null }) {
  const p = ob?.platformUse?.pct ?? {};
  const pc = (k: string) => (num(p[k]) != null ? fmtPct(num(p[k])!, 0) : null);
  return (
    <section id="methodology" aria-labelledby="ob-method" className="scroll-mt-20">
      <SecHead id="ob-method" title="Methodology" sub="How every figure on this page is computed" />
      <Panel className="grid gap-x-8 gap-y-4 p-5 text-[12.5px] leading-relaxed text-ink-2 md:grid-cols-2">
        <p><b className="font-medium text-ink">Exact</b> figures are read from transaction meta: balance changes, fees and tips as they landed on chain. <b className="font-medium text-ink">Derived</b> figures are computed from the pool config, such as the DBC fee split between Meteora, the creator, the platform and referrers.</p>
        <p>The DBC trading fee is split by the pool config. Meteora takes its protocol share first, a referral share of that comes back to referrers on trades made through the highbar UI, and the creator and the platform split the rest by tier. Totals are summed per transaction, so these cards link here instead of a single Solscan page.</p>
        <p>The platform share is used {pc("buyback") && pc("ops") && pc("treasury") ? <>{pc("buyback")} for buyback and burn, {pc("ops")} for operations and {pc("treasury")} for the treasury</> : "for buyback and burn, operations and the treasury"}. Buckets are pooled per closed period, operations and treasury stay in the fee receiver wallet. LP fees after migration come from a permanently locked DAMM v2 position.</p>
        <p>Tips go to block engines, not highbar. Sniper wallets are those landing a buy within two slots of the pool being created. Network fees are split between validators and the burned part of the base fee. Windows are calendar days in UTC{ob?.windowStartMs ? <>, this one starts {fmtDateUS(ob.windowStartMs)}</> : ""}.</p>
      </Panel>
    </section>
  );
}

export function OpenBookPlatform({ ob, tokens, window: w, q }: { ob: PlatformOpenBook | null; tokens: ObTokensPage | null; window: ObWindow; q: string }) {
  const net = ob?.meta?.network;
  const wallets = arr(ob?.treasuryWallets);
  const winHref = useMemo(() => (id: ObWindow) => { const s = new URLSearchParams(); if (id !== "all") s.set("window", id); if (q) s.set("q", q); const t = s.toString(); return `/open-book${t ? `?${t}` : ""}`; }, [q]);
  return (
    <div className="flex min-w-0 flex-col gap-7 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Open Book sections" className="flex flex-wrap gap-4 text-[12.5px] text-ink-3">
          {[["Overview", "#ob-totals"], ["Treasury", "#ob-treasury"], ["Fee flow", "#ob-flow"], ["All tokens", "#ob-tokens"], ["Methodology", M]].map(([l, h]) => <a key={h} href={h} className="hover:text-ink">{l}</a>)}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <IndexChip meta={ob?.meta} />
          <div role="group" aria-label="Time window" className="flex gap-1">
            {OB_WINDOWS.map((o) => <Link key={o.id} href={winHref(o.id)} scroll={false} aria-current={w === o.id ? "true" : undefined} data-testid={`ob-window-${o.id}`} className={`${chip} ${w === o.id ? `${CTRL_ON} text-ink` : ""}`}>{o.label}</Link>)}
          </div>
        </div>
      </div>
      {ob ? (
        <>
          <div id="ob-totals" className="scroll-mt-20"><Totals t={ob.totals} /></div>
          {wallets.length > 0 && (
            <section id="ob-treasury" aria-labelledby="ob-treasury-h" className="scroll-mt-20">
              <SecHead id="ob-treasury-h" title="Treasury wallets" sub="Live balances, read from chain" />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{wallets.map((x, i) => <WalletCard key={x.address ?? i} w={x} net={net} />)}</div>
            </section>
          )}
          <Flow ob={ob} />
        </>
      ) : <Panel className="p-8 text-center text-[13px] text-ink-3">The platform totals could not be loaded right now. Try again in a minute.</Panel>}
      <Tokens initial={tokens} initialQ={q} />
      <Methodology ob={ob} />
    </div>
  );
}
