"use client";
import { useState, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { TopBlock } from "@/components/TopBar";
import { Button, Card } from "@/components/ui";
import { Empty, Loading, OfflineNote, TD, TH } from "@/components/PageStates";
import { useApiData } from "@/lib/pagesData";
import { useHbWallet } from "@/lib/wallet";
import { fmtAge, fmtSol, shortAddr } from "@/lib/format";
import { SoonChip } from "@/components/SoonChip";
import { cashbackAccrual, fmtAccrualDate, rowEligible, type CashbackAccrualFields, type CashbackRowFields } from "@/lib/cashbackAccrual";

type Row = CashbackRowFields & { sig: string; mint: string; name: string; symbol: string; side: "buy" | "sell"; sol: number; ts: number; cashbackSol: number };
type Ledger = { period: string; trades: number; volumeSol: number; amountSol: number; paidSig: string | null; paidAt: number | null; pending: boolean; paidUrl: string | null };
type Cashback = CashbackAccrualFields & {
  wallet: string; bps: number; volumeSol: number; accruedSol: number; paidSol: number;
  trades: number; otherTrades: number; live: boolean; rows: Row[];
  network?: "devnet" | "mainnet"; unpaidSol?: number; pendingSol?: number; minPayoutSol?: number; ledger?: Ledger[];
};
const EMPTY: Cashback = { wallet: "", bps: 5, volumeSol: 0, accruedSol: 0, paidSol: 0, trades: 0, otherTrades: 0, live: false, rows: [] };
const ADDR = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const tiny = (v: number) => (v > 0 && v < 0.0001 ? v.toFixed(8) : fmtSol(v, 4));

export default function CashbackPage() {
  const wallet = useHbWallet();
  const [draft, setDraft] = useState("");
  const [lookup, setLookup] = useState<string | null>(null);
  const addr = lookup ?? wallet.address;
  const ok = !!addr && ADDR.test(addr);
  const { data, loading, error } = useApiData<Cashback>(ok ? `/cashback/${addr}` : null, EMPTY);
  const d = data ?? EMPTY;
  const find = () => { const v = draft.trim(); if (ADDR.test(v)) setLookup(v); };
  const accrual = cashbackAccrual(data);
  const since = accrual.since;
  const sinceNote = since ? `${accrual.accruing ? "Accruing since" : "Accrues from"} ${fmtAccrualDate(since)}` : undefined;
  const minPayout = d.minPayoutSol ?? 0.001;
  return (
    <div className="flex flex-col gap-4">
      <TopBlock title="Cashback">
        <p className="mt-2 max-w-xl text-sm text-ink-2">
          Trades made on highbar accrue {EMPTY.bps / 100}% of volume per UTC day, with a minimum payout of {minPayout} SOL.{" "}
          {since ? `${sinceNote}. Cashback starts from zero on that day, so earlier trades are not paid. Every payout links its transaction.` : "Payouts are coming soon. Cashback starts from zero when payouts begin, so earlier trades are not paid."}
        </p>
        <form className="mt-4 flex max-w-xl gap-2" onSubmit={(e) => { e.preventDefault(); find(); }}>
          <input aria-label="Wallet address" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={wallet.address ?? "Wallet address"}
            className="num h-10 min-w-0 flex-1 rounded border border-border bg-surface px-3 text-sm outline-none focus:border-ink" />
          <Button type="submit" variant="secondary" disabled={!ADDR.test(draft.trim())}>Look up</Button>
        </form>
      </TopBlock>
      <OfflineNote error={error} />
      {!ok ? <Card><Empty title="Connect a wallet" hint="Or paste an address to see its accrued cashback." /></Card> : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {([["Accrued", since ? `${tiny(d.accruedSol)} SOL` : <SoonChip key="soon" />], ["Platform volume", `${tiny(d.volumeSol)} SOL`], ["Awaiting payout", since ? `${tiny((d.unpaidSol ?? 0) + (d.pendingSol ?? d.accruedSol - d.paidSol))} SOL` : <SoonChip key="soon" />, sinceNote], ["Paid out", `${tiny(d.paidSol)} SOL`]] as [string, ReactNode, string?][]).map(([k, v, note]) => (
              <Card key={k}><div className="text-[13px] text-ink-3">{k}</div><div className="num mt-1 flex min-h-7 items-center text-lg font-semibold">{v}</div>{note && <div className="mt-0.5 text-xs text-ink-3">{note}</div>}</Card>
            ))}
          </div>
          {d.otherTrades > 0 && <p className="text-xs text-ink-3">{d.otherTrades} other trade{d.otherTrades === 1 ? "" : "s"} on this wallet did not use the platform referral, so they are not in the cashback.</p>}
          {!!d.ledger?.length && (
            <Card className="overflow-x-auto p-0">
              <h3 className="border-b border-border px-4 py-3 font-semibold">Payouts</h3>
              <table className="w-full min-w-[520px] text-sm">
                <thead><tr className="border-b border-border text-xs text-ink-3"><th className={`${TH} text-left`}>Day (UTC)</th><th className={`${TH} text-right`}>Trades</th><th className={`${TH} text-right`}>Volume</th><th className={`${TH} text-right`}>Cashback</th><th className={`${TH} text-right`}>Payout</th></tr></thead>
                <tbody>{d.ledger.map((l) => (
                  <tr key={l.period} className="border-b border-border last:border-0 hover:bg-muted">
                    <td className={`${TD} num`}>{l.period}</td>
                    <td className={`${TD} num text-right`}>{l.trades}</td>
                    <td className={`${TD} num text-right`}>{tiny(l.volumeSol)} SOL</td>
                    <td className={`${TD} num text-right`}>{tiny(l.amountSol)} SOL</td>
                    <td className={`${TD} text-right`}>{l.paidSig ? (
                      <a href={l.paidUrl ?? `https://solscan.io/tx/${l.paidSig}${d.network === "mainnet" ? "" : "?cluster=devnet"}`} target="_blank" rel="noreferrer" className="num inline-flex items-center gap-1 hover:underline">
                        {shortAddr(l.paidSig, 6)}<ExternalLink size={14} className="text-ink-3" />
                      </a>
                    ) : l.pending || since ? <span className="text-xs text-ink-3">{l.pending ? "sending" : "awaiting payout"}</span> : <SoonChip />}</td>
                  </tr>
                ))}</tbody>
              </table>
            </Card>
          )}
          <Card className="overflow-x-auto p-0">
            <h3 className="border-b border-border px-4 py-3 font-semibold">{since ? "Accruing trades" : "Recent trades"}</h3>
            {loading && !data ? <Loading /> : d.rows.length === 0 ? (
              <Empty title="No platform trades yet" hint="Cashback starts once this wallet buys or sells through highbar." />
            ) : (
              <table className="w-full min-w-[520px] text-sm">
                <thead><tr className="border-b border-border text-xs text-ink-3"><th className={`${TH} text-left`}>Token</th><th className={`${TH} text-left`}>Side</th><th className={`${TH} text-right`}>Volume</th><th className={`${TH} text-right`}>{since ? "Cashback" : <span className="inline-flex items-center gap-2">Cashback <SoonChip /></span>}</th><th className={`${TH} text-right`}>Time</th></tr></thead>
                <tbody>{d.rows.map((r) => (
                  <tr key={r.sig} className="border-b border-border last:border-0 hover:bg-muted">
                    <td className={TD}><Link href={`/token/${r.mint}`} className="hover:underline">{r.symbol ? `$${r.symbol}` : shortAddr(r.mint)}</Link></td>
                    <td className={TD}><span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize text-white ${r.side === "buy" ? "bg-buy" : "bg-sell"}`}>{r.side}</span></td>
                    <td className={`${TD} num text-right`}>{tiny(r.sol)} SOL</td>
                    <td className={`${TD} num text-right`}>{!since ? <span className="text-ink-3">–</span> : rowEligible(r, accrual) ? `${tiny(r.cashbackSol)} SOL` : <span className="text-xs text-ink-3">Before go-public</span>}</td>
                    <td className={`${TD} num text-right text-ink-3`}>{fmtAge(r.ts)} ago</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
