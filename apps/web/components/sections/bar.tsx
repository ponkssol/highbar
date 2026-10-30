"use client";
import { useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import { TopBlock } from "@/components/TopBar";
import { Button, Card } from "@/components/ui";
import { Empty, OfflineNote, TD, TH } from "@/components/PageStates";
import { useHbWallet } from "@/lib/wallet";
import { fmtSol, shortAddr } from "@/lib/format";
import { fmtBar, perkLines, useBarInfo, useBarWallet } from "@/lib/bar";

const ADDR = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const tiny = (v: number) => (v > 0 && v < 0.0001 ? v.toFixed(8) : fmtSol(v, 4));

export default function BarPage() {
  const wallet = useHbWallet();
  const [draft, setDraft] = useState("");
  const [lookup, setLookup] = useState<string | null>(null);
  const addr = lookup ?? wallet.address;
  const ok = !!addr && ADDR.test(addr);
  const info = useBarInfo();
  const w = useBarWallet(ok ? addr : null);
  const i = info.data ?? null;
  const d = w.data;
  const base = (i?.baseCashbackBps ?? 5) / 100;
  return (
    <div className="flex flex-col gap-4">
      <TopBlock title="$HIGHER perks">
        <p className="mt-2 max-w-xl text-sm text-ink-2">
          Holding $HIGHER raises your trader cashback, adds a fee rebate, unlocks Max tier launches and counts toward the holder fee share.
          Perks are utility for using highbar, not a promise about the token&apos;s price.
        </p>
        {i?.barMint ? (
          <a href={i.barMintUrl ?? "#"} target="_blank" rel="noreferrer" className="num mt-2 inline-flex items-center gap-1 text-xs text-ink-3 hover:underline">
            $HIGHER mint {shortAddr(i.barMint, 6)} ({i.network})<ExternalLink size={12} />
          </a>
        ) : <p className="mt-2 text-xs text-ink-3">$HIGHER has not launched yet, so every wallet is on the base tier for now.</p>}
        <form className="mt-4 flex max-w-xl gap-2" onSubmit={(e) => { e.preventDefault(); const v = draft.trim(); if (ADDR.test(v)) setLookup(v); }}>
          <input aria-label="Wallet address" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={wallet.address ?? "Wallet address"}
            className="num h-10 min-w-0 flex-1 rounded border border-border bg-surface px-3 text-sm outline-none focus:border-ink" />
          <Button type="submit" variant="secondary" disabled={!ADDR.test(draft.trim())}>Look up</Button>
        </form>
      </TopBlock>
      <OfflineNote error={info.error ?? w.error} />

      {ok && d && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {([
            ["$HIGHER balance", d.enabled ? fmtBar(d.balance) : "Not launched yet"],
            ["Tier", d.tier.label],
            ["Next tier", d.next ? `${d.next.tier.label} (+${fmtBar(d.next.needBar)})` : "Top tier"],
            ["Fee share earned", `${tiny(d.paidSol + d.unpaidSol)} SOL`],
          ] as const).map(([k, v]) => (
            <Card key={k}><div className="text-[13px] text-ink-3">{k}</div><div className="num mt-1 text-lg font-semibold">{v}</div></Card>
          ))}
        </div>
      )}
      {!ok && <Card><Empty title="Connect a wallet" hint="Or paste an address to see its $HIGHER tier and perks." /></Card>}

      <Card className="overflow-x-auto p-0">
        <h3 className="border-b border-border px-4 py-3 font-semibold">Tiers</h3>
        <table className="w-full min-w-[560px] text-sm">
          <thead><tr className="border-b border-border text-xs text-ink-3">
            <th className={`${TH} text-left`}>Tier</th><th className={`${TH} text-right`}>Hold</th><th className={`${TH} text-right`}>Cashback</th>
            <th className={`${TH} text-right`}>Fee rebate</th><th className={`${TH} text-center`}>Max tier</th><th className={`${TH} text-center`}>Fee share</th>
          </tr></thead>
          <tbody>{(i?.tiers ?? []).map((t) => (
            <tr key={t.id} className={`border-b border-border last:border-0 ${d?.tier.id === t.id ? "bg-muted font-medium" : ""}`}>
              <td className={TD}>{t.label}{d?.tier.id === t.id && <span className="ml-2 text-xs text-ink-3">you</span>}</td>
              <td className={`${TD} num text-right`}>{t.minBar ? `${fmtBar(t.minBar)} $HIGHER` : "-"}</td>
              <td className={`${TD} num text-right`}>{((base * t.cashbackMultiplierBps) / 10_000).toFixed(3)}%</td>
              <td className={`${TD} num text-right`}>{t.feeRebateBps ? `${t.feeRebateBps / 100}%` : "-"}</td>
              <td className={`${TD} text-center`}>{t.maxTierAccess ? <Check size={16} className="inline" /> : "-"}</td>
              <td className={`${TD} text-center`}>{t.feeShare ? <Check size={16} className="inline" /> : "-"}</td>
            </tr>
          ))}</tbody>
        </table>
        {d && <p className="border-t border-border px-4 py-3 text-xs text-ink-3">Your perks: {perkLines(d.tier).join(" · ")}. Cashback bonus so far: {tiny(d.cashbackBonusSol)} SOL.</p>}
      </Card>

      {ok && !!d?.ledger.length && (
        <Card className="overflow-x-auto p-0">
          <h3 className="border-b border-border px-4 py-3 font-semibold">Fee share</h3>
          <table className="w-full min-w-[520px] text-sm">
            <thead><tr className="border-b border-border text-xs text-ink-3"><th className={`${TH} text-left`}>Day (UTC)</th><th className={`${TH} text-right`}>Holder pool</th><th className={`${TH} text-right`}>Your share</th><th className={`${TH} text-right`}>Payout</th></tr></thead>
            <tbody>{d.ledger.map((l) => (
              <tr key={l.period} className="border-b border-border last:border-0 hover:bg-muted">
                <td className={`${TD} num`}>{l.period}</td>
                <td className={`${TD} num text-right`}>{tiny(l.poolSol)} SOL</td>
                <td className={`${TD} num text-right`}>{tiny(l.amountSol)} SOL</td>
                <td className={`${TD} text-right`}>{l.paidSig ? (
                  <a href={l.paidUrl ?? "#"} target="_blank" rel="noreferrer" className="num inline-flex items-center gap-1 hover:underline">{shortAddr(l.paidSig, 6)}<ExternalLink size={14} className="text-ink-3" /></a>
                ) : <span className="text-xs text-ink-3">{l.pending ? "sending" : i?.feeShareLive ? "awaiting payout" : "accrued"}</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      )}

      <Card>
        <h3 className="font-semibold">How it works</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-2">
          <li>Tiers use the lowest $HIGHER balance your wallet held across the day&apos;s snapshots, so buying right before a payout does not count.</li>
          <li>Cashback and the fee rebate are paid together in SOL with the daily cashback.</li>
          <li>The holder fee share is {(i?.feeShareBps ?? 2000) / 100}% of the platform&apos;s operations share ({(i?.opsSplitBps ?? 5000) / 100}% of net platform fees), split by balance among Holder tier and up.</li>
          {(i?.limits ?? []).map((l) => <li key={l}>{l}</li>)}
        </ul>
      </Card>
    </div>
  );
}
