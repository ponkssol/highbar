"use client";
import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { TopBlock } from "@/components/TopBar";
import { Card } from "@/components/ui";
import { Empty, Loading, OfflineNote, Tabs, TD, TH } from "@/components/PageStates";
import { useApiData } from "@/lib/pagesData";
import { useHbWallet } from "@/lib/wallet";
import { fmtAge, fmtSol, shortAddr } from "@/lib/format";

type Milestone = { id: string; mcapSol: number; days: number; rewardSol: number };
type Progress = Milestone & { streak: number; qualified: boolean; qualifiedDay: string | null; broken: number };
type Tok = { mint: string; name: string; symbol: string; creator: string; migratedAt: number; mcapSol: number | null; sampledAt: number | null; progress: Progress[] };
type Bonus = { mint: string; milestone: string; creator: string; amountSol: number; qualifiedDay: string; paidSig: string | null; paidUrl: string | null; pending: boolean; symbol: string };
type Data = { network?: "devnet" | "mainnet"; dryRun: boolean; milestones: Milestone[]; tokens: Tok[]; bonuses: Bonus[]; totals: { paidSol: number; unpaidSol: number } };
const EMPTY: Data = { dryRun: true, milestones: [], tokens: [], bonuses: [], totals: { paidSol: 0, unpaidSol: 0 } };

export default function MilestonesPage() {
  const wallet = useHbWallet();
  const [tab, setTab] = useState<"all" | "mine">("all");
  const mine = tab === "mine" && !!wallet.address;
  const { data, loading, error } = useApiData<Data>(mine ? `/milestones?creator=${wallet.address}` : "/milestones", EMPTY, 60_000);
  const d = data ?? EMPTY;
  const tx = (b: Bonus) => b.paidUrl ?? `https://solscan.io/tx/${b.paidSig}${d.network === "mainnet" ? "" : "?cluster=devnet"}`;

  return (
    <div className="flex flex-col gap-4">
      <TopBlock title="Milestones">
        <p className="mt-2 max-w-xl text-sm text-ink-2">
          Creators earn a SOL bonus from the treasury when their token keeps its market cap above a target for every full UTC day after it migrates.
          A day below the target restarts the count. Market cap is sampled from the DAMM v2 pool.
        </p>
      </TopBlock>
      <OfflineNote error={error} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {d.milestones.map((m) => (
          <Card key={m.id}>
            <div className="text-[13px] text-ink-3">{m.days} days above {fmtSol(m.mcapSol, 0)} SOL mcap</div>
            <div className="num mt-1 text-lg font-semibold">{fmtSol(m.rewardSol, 2)} SOL bonus</div>
          </Card>
        ))}
      </div>
      {wallet.address && <Tabs value={tab} onChange={setTab} options={[{ id: "all", label: "All tokens" }, { id: "mine", label: "My tokens" }]} />}
      <Card className="overflow-x-auto p-0">
        <h3 className="border-b border-border px-4 py-3 font-semibold">Migrated tokens</h3>
        {loading && !data ? <Loading /> : d.tokens.length === 0 ? (
          <Empty title={mine ? "None of your tokens has migrated yet" : "No migrated tokens tracked yet"} hint="Tokens are tracked from the day after they migrate to DAMM v2." />
        ) : (
          <table className="w-full min-w-[600px] text-sm">
            <thead><tr className="border-b border-border text-xs text-ink-3"><th className={`${TH} text-left`}>Token</th><th className={`${TH} text-right`}>Mcap</th><th className={`${TH} text-left`}>Progress</th><th className={`${TH} text-right`}>Migrated</th></tr></thead>
            <tbody>{d.tokens.map((t) => (
              <tr key={t.mint} className="border-b border-border last:border-0 align-top hover:bg-muted">
                <td className={TD}><Link href={`/token/${t.mint}`} className="hover:underline">{t.symbol ? `$${t.symbol}` : shortAddr(t.mint)}</Link><div className="num text-xs text-ink-3">by {shortAddr(t.creator)}</div></td>
                <td className={`${TD} num text-right`}>{t.mcapSol == null ? "–" : `${fmtSol(t.mcapSol, 1)} SOL`}</td>
                <td className={TD}><div className="flex flex-col gap-1">{t.progress.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-xs">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted ring-1 ring-border"><div className={`h-full ${p.qualified ? "bg-buy" : "bg-ink-2"}`} style={{ width: `${Math.min(100, (p.streak / p.days) * 100)}%` }} /></div>
                    <span className="num text-ink-2">{p.qualified ? `done ${p.qualifiedDay}` : `${p.streak}/${p.days}d`} · {fmtSol(p.mcapSol, 0)} SOL</span>
                  </div>
                ))}</div></td>
                <td className={`${TD} num text-right text-ink-3`}>{fmtAge(t.migratedAt)} ago</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>
      <Card className="overflow-x-auto p-0">
        <h3 className="border-b border-border px-4 py-3 font-semibold">Bonuses</h3>
        {d.bonuses.length === 0 ? <Empty title="No bonuses yet" hint={d.dryRun ? "Payouts are not live yet." : "Bonuses appear here once a token completes a milestone."} /> : (
          <table className="w-full min-w-[520px] text-sm">
            <thead><tr className="border-b border-border text-xs text-ink-3"><th className={`${TH} text-left`}>Token</th><th className={`${TH} text-left`}>Milestone</th><th className={`${TH} text-right`}>Bonus</th><th className={`${TH} text-right`}>Payout</th></tr></thead>
            <tbody>{d.bonuses.map((b) => (
              <tr key={`${b.mint}:${b.milestone}`} className="border-b border-border last:border-0 hover:bg-muted">
                <td className={TD}><Link href={`/token/${b.mint}`} className="hover:underline">{b.symbol ? `$${b.symbol}` : shortAddr(b.mint)}</Link></td>
                <td className={`${TD} num`}>{b.milestone} <span className="text-ink-3">({b.qualifiedDay})</span></td>
                <td className={`${TD} num text-right`}>{fmtSol(b.amountSol, 2)} SOL</td>
                <td className={`${TD} text-right`}>{b.paidSig ? (
                  <a href={tx(b)} target="_blank" rel="noreferrer" className="num inline-flex items-center gap-1 hover:underline">{shortAddr(b.paidSig, 6)}<ExternalLink size={14} className="text-ink-3" /></a>
                ) : <span className="text-xs text-ink-3">{b.pending ? "sending" : "awaiting payout"}</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
