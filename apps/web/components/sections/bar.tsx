"use client";
import { useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import { TopBlock } from "@/components/TopBar";
import { Card, NA } from "@/components/ui";
import { Empty, OfflineNote, TD, TH } from "@/components/PageStates";
import { InfoTip } from "@/components/InfoTip";
import { SolAmt } from "@/components/Sol";
import { TableCard } from "@/components/ui/TableCard";
import { TableScroll } from "@/components/ui/Scroll";
import { Stacked, StackedItem } from "@/components/ui/Stacked";
import { Intro, WalletLookup } from "./Lookup";
import { useHbWallet } from "@/lib/wallet";
import { fmtSol, shortAddr } from "@/lib/format";
import { fmtBar, perkLines, useBarInfo, useBarWallet } from "@/lib/bar";

const ADDR = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const tiny = (v: number) => (v > 0 && v < 0.0001 ? v.toFixed(8) : fmtSol(v, 4));
const yes = (on: boolean) => (on ? <><Check size={16} className="inline" aria-hidden /><span className="sr-only">Yes</span></> : <span className="text-ink-3">{NA}</span>);

export default function BarPage() {
  const wallet = useHbWallet();
  const [lookup, setLookup] = useState<string | null>(null);
  const addr = lookup ?? wallet.address;
  const ok = !!addr && ADDR.test(addr);
  const info = useBarInfo();
  const w = useBarWallet(ok ? addr : null);
  const i = info.data ?? null;
  const d = w.data;
  const base = (i?.baseCashbackBps ?? 5) / 100;
  const tiers = i?.tiers ?? [];
  const cashback = (m: number) => `${((base * m) / 10_000).toFixed(3)}%`;
  return (
    <div className="flex flex-col gap-4">
      <TopBlock title="$HIGHER perks">
        <Intro label="About $HIGHER perks" more="Perks are utility for using highbar, not a promise about the token's price.">
          Holding $HIGHER raises your trader cashback, adds a fee rebate, unlocks Max tier launches and counts toward the holder fee share.
        </Intro>
        {i?.barMint ? (
          <a href={i.barMintUrl ?? "#"} target="_blank" rel="noreferrer" className="num mt-2 inline-flex items-center gap-1 text-xs text-ink-3 hover:underline">
            $HIGHER mint {shortAddr(i.barMint, 6)} ({i.network})<ExternalLink size={12} />
          </a>
        ) : <p className="mt-2 text-xs text-ink-3">$HIGHER has not launched yet, so every wallet is on the base tier for now.</p>}
        <WalletLookup onLookup={setLookup} placeholder={wallet.address ? shortAddr(wallet.address, 6) : undefined} />
      </TopBlock>
      <OfflineNote error={info.error ?? w.error} />

      {ok && d && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {([
            ["$HIGHER balance", d.enabled ? fmtBar(d.balance) : "Not launched yet"],
            ["Tier", d.tier.label],
            ["Next tier", d.next ? `${d.next.tier.label} (${fmtBar(d.next.needBar)} more)` : "Top tier"],
            ["Fee share earned", <SolAmt key="fs">{tiny(d.paidSol + d.unpaidSol)}</SolAmt>],
          ] as const).map(([k, v]) => (
            <Card key={k}><div className="text-[13px] text-ink-3">{k}</div><div className="num mt-1 text-lg font-semibold">{v}</div></Card>
          ))}
        </div>
      )}
      {!ok && <Card><Empty title="Connect a wallet" hint="Or paste an address to see its $HIGHER tier and perks." /></Card>}

      <TableCard title="Tiers" testId="bar-tiers"
        info={<InfoTip label="How tiers are counted">Tiers use the lowest $HIGHER balance your wallet held across the day&apos;s snapshots, so buying right before a payout does not count.</InfoTip>}
        footer={d ? <>Your perks: {perkLines(d.tier).join(", ")}. Cashback bonus so far: <SolAmt>{tiny(d.cashbackBonusSol)}</SolAmt>.</> : undefined}>
        {/* Mobile: one compact card per tier (name and hold amount, then the perks). From sm up: the table. */}
        <Stacked className="sm:hidden" label="$HIGHER tiers">
          {tiers.map((t) => (
            <StackedItem key={t.id} highlight={d?.tier.id === t.id}
              title={<>{t.label}{d?.tier.id === t.id && <span className="text-xs font-normal text-ink-3">you</span>}</>}
              value={t.minBar ? <span className="whitespace-nowrap">{fmtBar(t.minBar)} $HIGHER</span> : <span className="text-xs text-ink-3">No minimum</span>}
              rows={[
                ["Cashback", cashback(t.cashbackMultiplierBps)],
                ["Fee rebate", t.feeRebateBps ? `${t.feeRebateBps / 100}%` : NA],
                ["Max tier", yes(t.maxTierAccess)],
                ["Fee share", yes(t.feeShare)],
              ]} />
          ))}
        </Stacked>
        <TableScroll className="hidden sm:block" label="$HIGHER tiers">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-xs text-ink-3">
              <th className={`${TH} text-left`}>Tier</th><th className={`${TH} text-right`}>Hold</th><th className={`${TH} text-right`}>Cashback</th>
              <th className={`${TH} whitespace-nowrap text-right`}>Fee rebate</th><th className={`${TH} whitespace-nowrap text-center`}>Max tier</th><th className={`${TH} whitespace-nowrap text-center`}>Fee share</th>
            </tr></thead>
            <tbody>{tiers.map((t) => (
              <tr key={t.id} className={`border-b border-border last:border-0 ${d?.tier.id === t.id ? "bg-muted font-medium" : ""}`}>
                <td className={TD}>{t.label}{d?.tier.id === t.id && <span className="ml-2 text-xs text-ink-3">you</span>}</td>
                <td className={`${TD} num whitespace-nowrap text-right`}>{t.minBar ? `${fmtBar(t.minBar)} $HIGHER` : <span className="text-ink-3">{NA}</span>}</td>
                <td className={`${TD} num text-right`}>{cashback(t.cashbackMultiplierBps)}</td>
                <td className={`${TD} num text-right`}>{t.feeRebateBps ? `${t.feeRebateBps / 100}%` : <span className="text-ink-3">{NA}</span>}</td>
                <td className={`${TD} text-center`}>{yes(t.maxTierAccess)}</td>
                <td className={`${TD} text-center`}>{yes(t.feeShare)}</td>
              </tr>
            ))}</tbody>
          </table>
        </TableScroll>
      </TableCard>

      {ok && !!d?.ledger.length && (
        <TableCard title="Fee share">
          <Stacked className="sm:hidden" label="Fee share payouts">
            {d.ledger.map((l) => (
              <StackedItem key={l.period} title={<span className="num">{l.period}</span>} value={<SolAmt>{tiny(l.amountSol)}</SolAmt>}
                rows={[["Holder pool", <SolAmt key="p">{tiny(l.poolSol)}</SolAmt>], ["Payout", <Payout key="x" l={l} live={!!i?.feeShareLive} />]]} />
            ))}
          </Stacked>
          <TableScroll className="hidden sm:block" label="Fee share payouts">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-xs text-ink-3"><th className={`${TH} text-left`}>Day (UTC)</th><th className={`${TH} text-right`}>Holder pool</th><th className={`${TH} text-right`}>Your share</th><th className={`${TH} text-right`}>Payout</th></tr></thead>
              <tbody>{d.ledger.map((l) => (
                <tr key={l.period} className="border-b border-border last:border-0 hover:bg-muted">
                  <td className={`${TD} num`}>{l.period}</td>
                  <td className={`${TD} num text-right`}><SolAmt>{tiny(l.poolSol)}</SolAmt></td>
                  <td className={`${TD} num text-right`}><SolAmt>{tiny(l.amountSol)}</SolAmt></td>
                  <td className={`${TD} text-right`}><Payout l={l} live={!!i?.feeShareLive} /></td>
                </tr>
              ))}</tbody>
            </table>
          </TableScroll>
        </TableCard>
      )}

      <Card>
        <h3 className="font-semibold">How it works</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-2">
          <li>Cashback and the fee rebate are paid together with the daily cashback (in SOL until $HIGHER launches, then in $HIGHER).</li>
          <li>The holder fee share is {(i?.feeShareBps ?? 2000) / 100}% of the platform&apos;s operations share ({(i?.opsSplitBps ?? 5000) / 100}% of net platform fees), split by balance among Holder tier and up.</li>
          {(i?.limits ?? []).map((l) => <li key={l}>{l}</li>)}
        </ul>
      </Card>
    </div>
  );
}

function Payout({ l, live }: { l: { paidSig: string | null; paidUrl?: string | null; pending: boolean }; live: boolean }) {
  return l.paidSig ? (
    <a href={l.paidUrl ?? "#"} target="_blank" rel="noreferrer" className="num inline-flex items-center gap-1 hover:underline">{shortAddr(l.paidSig, 6)}<ExternalLink size={14} className="text-ink-3" /></a>
  ) : <span className="text-xs text-ink-3">{l.pending ? "sending" : live ? "awaiting payout" : "accrued"}</span>;
}
