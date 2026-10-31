"use client";
import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { TopBlock } from "@/components/TopBar";
import { Card, NA } from "@/components/ui";
import { InfoTip } from "@/components/InfoTip";
import { SolAmt } from "@/components/Sol";
import { TableCard } from "@/components/ui/TableCard";
import { TableScroll } from "@/components/ui/Scroll";
import { Stacked, StackedItem } from "@/components/ui/Stacked";
import { Intro } from "./Lookup";
import { Empty, Loading, OfflineNote, Tabs, TD, TH } from "@/components/PageStates";
import { useApiData } from "@/lib/pagesData";
import { useHbWallet } from "@/lib/wallet";
import { fmtAge, fmtSol, shortAddr } from "@/lib/format";
import { SoonChip } from "@/components/SoonChip";

type Milestone = { id: string; mcapSol: number; days: number; rewardSol: number };
type Progress = Milestone & { streak: number; qualified: boolean; qualifiedDay: string | null; broken: number };
type Tok = { mint: string; name: string; symbol: string; creator: string; migratedAt: number; dammPool?: string | null; mcapSol: number | null; sampledAt: number | null; progress: Progress[] };
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
        <Intro label="How milestones are counted" more="A day below the target restarts the count. Market cap comes from hourly DAMM v2 pool snapshots. The lowest one of each day counts.">
          Creators earn a SOL bonus from the treasury when their token keeps its market cap above a target for every full UTC day after it migrates.
        </Intro>
      </TopBlock>
      <OfflineNote error={error} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {d.milestones.map((m) => (
          <Card key={m.id}>
            <div className="flex items-center gap-1 text-[13px] text-ink-3">{m.days} days above <SolAmt>{fmtSol(m.mcapSol, 0)}</SolAmt> mcap</div>
            <div className="num mt-1 flex items-baseline gap-1.5 text-lg font-semibold"><SolAmt>{fmtSol(m.rewardSol, 2)}</SolAmt><span className="text-sm font-normal text-ink-3">bonus</span></div>
          </Card>
        ))}
      </div>
      {wallet.address && <Tabs value={tab} onChange={setTab} options={[{ id: "all", label: "All tokens" }, { id: "mine", label: "My tokens" }]} />}
      <TableCard title="Migrated tokens" info={<InfoTip label="When tracking starts">Tokens are tracked from the day after they migrate to DAMM v2.</InfoTip>}>
        {loading && !data ? <Loading /> : d.tokens.length === 0 ? (
          <Empty title={mine ? "None of your tokens has migrated yet" : "No migrated tokens tracked yet"} hint="Tokens are tracked from the day after they migrate to DAMM v2." />
        ) : (
          <>
            <Stacked className="sm:hidden" label="Migrated tokens">
              {d.tokens.map((t) => (
                <StackedItem key={t.mint}
                  title={<span className="min-w-0"><Link href={`/token/${t.mint}`} className="hover:underline">{t.symbol ? `$${t.symbol}` : shortAddr(t.mint)}</Link><span className="num ml-2 text-xs font-normal text-ink-3">by {shortAddr(t.creator)}</span></span>}
                  value={t.mcapSol == null ? <span className="text-ink-3">{NA}</span> : <SolAmt>{fmtSol(t.mcapSol, 1)}</SolAmt>}
                  rows={[["Migrated", `${fmtAge(t.migratedAt)} ago`]]}
                  footer={<ProgressList t={t} />} />
              ))}
            </Stacked>
            <TableScroll className="hidden sm:block" label="Migrated tokens">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-xs text-ink-3"><th className={`${TH} text-left`}>Token</th><th className={`${TH} text-right`}>Mcap</th><th className={`${TH} text-left`}>Progress</th><th className={`${TH} text-right`}>Migrated</th></tr></thead>
                <tbody>{d.tokens.map((t) => (
                  <tr key={t.mint} className="border-b border-border last:border-0 align-top hover:bg-muted">
                    <td className={TD}><Link href={`/token/${t.mint}`} className="hover:underline">{t.symbol ? `$${t.symbol}` : shortAddr(t.mint)}</Link><div className="num text-xs text-ink-3">by {shortAddr(t.creator)}</div></td>
                    <td className={`${TD} num text-right`}>{t.mcapSol == null ? <span className="text-ink-3">{NA}</span> : <SolAmt>{fmtSol(t.mcapSol, 1)}</SolAmt>}</td>
                    <td className={TD}><ProgressList t={t} /></td>
                    <td className={`${TD} num whitespace-nowrap text-right text-ink-3`}>{fmtAge(t.migratedAt)} ago</td>
                  </tr>
                ))}</tbody>
              </table>
            </TableScroll>
          </>
        )}
      </TableCard>
      <TableCard title="Bonuses">
        {d.bonuses.length === 0 ? <Empty title="No bonuses yet" hint={d.dryRun ? "Bonus payouts are coming soon." : "Bonuses appear here once a token completes a milestone."} action={d.dryRun ? <SoonChip /> : undefined} /> : (
          <>
            <Stacked className="sm:hidden" label="Bonuses">
              {d.bonuses.map((b) => (
                <StackedItem key={`${b.mint}:${b.milestone}`} title={<Link href={`/token/${b.mint}`} className="hover:underline">{b.symbol ? `$${b.symbol}` : shortAddr(b.mint)}</Link>}
                  value={<SolAmt>{fmtSol(b.amountSol, 2)}</SolAmt>}
                  rows={[["Milestone", <>{b.milestone} <span className="text-ink-3">({b.qualifiedDay})</span></>], ["Payout", <BonusPayout key="p" b={b} href={tx(b)} dryRun={d.dryRun} />]]} />
              ))}
            </Stacked>
            <TableScroll className="hidden sm:block" label="Bonuses">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-xs text-ink-3"><th className={`${TH} text-left`}>Token</th><th className={`${TH} text-left`}>Milestone</th><th className={`${TH} text-right`}>Bonus</th><th className={`${TH} text-right`}>Payout</th></tr></thead>
                <tbody>{d.bonuses.map((b) => (
                  <tr key={`${b.mint}:${b.milestone}`} className="border-b border-border last:border-0 hover:bg-muted">
                    <td className={TD}><Link href={`/token/${b.mint}`} className="hover:underline">{b.symbol ? `$${b.symbol}` : shortAddr(b.mint)}</Link></td>
                    <td className={`${TD} num`}>{b.milestone} <span className="text-ink-3">({b.qualifiedDay})</span></td>
                    <td className={`${TD} num text-right`}><SolAmt>{fmtSol(b.amountSol, 2)}</SolAmt></td>
                    <td className={`${TD} text-right`}><BonusPayout b={b} href={tx(b)} dryRun={d.dryRun} /></td>
                  </tr>
                ))}</tbody>
              </table>
            </TableScroll>
          </>
        )}
      </TableCard>
    </div>
  );
}

/** Streak per milestone: bar, then "done day" or "streak of days", then the target mcap. */
function ProgressList({ t }: { t: Tok }) {
  return (
    <div className="flex flex-col gap-1">{t.progress.map((p) => (
      <div key={p.id} className="flex items-center gap-2 text-xs">
        <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border"><div className={`h-full ${p.qualified ? "bg-buy" : "bg-ink-2"}`} style={{ width: `${Math.min(100, (p.streak / p.days) * 100)}%` }} /></div>
        <span className="num inline-flex items-center gap-1.5 whitespace-nowrap text-ink-2">{p.qualified ? `done ${p.qualifiedDay}` : `${p.streak} of ${p.days}d`}<span className="text-ink-3">at</span><SolAmt>{fmtSol(p.mcapSol, 0)}</SolAmt></span>
      </div>
    ))}</div>
  );
}
function BonusPayout({ b, href, dryRun }: { b: Bonus; href: string; dryRun: boolean }) {
  return b.paidSig ? (
    <a href={href} target="_blank" rel="noreferrer" className="num inline-flex items-center gap-1 hover:underline">{shortAddr(b.paidSig, 6)}<ExternalLink size={14} className="text-ink-3" /></a>
  ) : b.pending || !dryRun ? <span className="text-xs text-ink-3">{b.pending ? "sending" : "awaiting payout"}</span> : <SoonChip />;
}
