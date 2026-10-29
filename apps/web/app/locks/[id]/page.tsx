import { TokenLogo } from "@/components/TokenLogo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { TopBlock } from "@/components/TopBar";
import { ShareButtons } from "@/components/ShareButtons";
import { fetchLock, fmtLockDate } from "@/lib/lockData";
import { shortAddr } from "@/lib/format";

export const dynamic = "force-dynamic";
const site = () => process.env.SITE_URL || "http://localhost:3000";
const fmtTok = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const l = await fetchLock(id);
  if (!l) return { title: "Lock not found | highbar" };
  const sym = l.token?.symbol || "TOKEN";
  const title = `${fmtTok(l.totalTokens)} $${sym} locked until ${fmtLockDate(l.cliffTime)}`;
  const description = `${l.supplyPct.toFixed(2)}% of supply permanently locked by the creator via Jupiter Lock on highbar.`;
  return { metadataBase: new URL(site()), title: `${title} | highbar`, description, openGraph: { title, description, type: "website", url: `/locks/${id}` }, twitter: { card: "summary_large_image", title, description } };
}

export default async function LockSharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const l = await fetchLock(id);
  if (!l) notFound();
  const sym = l.token?.symbol || "?";
  const rows: [string, string][] = [
    ["Amount", `${fmtTok(l.totalTokens)} $${sym}`], ["% of supply", `${l.supplyPct.toFixed(2)}%`],
    ["Locked on", l.lockedAt ? fmtLockDate(l.lockedAt) : "-"], ["Unlocks", fmtLockDate(l.cliffTime)],
    ["Vesting", l.numberOfPeriod > 0 ? `${l.numberOfPeriod} daily releases, ends ${fmtLockDate(l.endTime)}` : "None (all at unlock)"],
    ["Unlocked so far", `${l.unlockedPct.toFixed(1)}%`], ["Cancel / change recipient", "None (permanent)"],
    ["Creator", shortAddr(l.creator, 6)], ["Escrow", shortAddr(l.escrow, 6)],
  ];
  const text = `${fmtTok(l.totalTokens)} $${sym} (${l.supplyPct.toFixed(2)}% of supply) locked until ${fmtLockDate(l.cliffTime)} on highbar`;
  return (
    <div className="flex flex-col gap-4">
      <TopBlock title="Dev token lock" />
      <div className="rounded-lg border border-border bg-surface p-6 shadow-card">
        <Link href="/locks" className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ArrowLeft size={14} />All locks</Link>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {l.token?.image ? <TokenLogo src={l.token.image} name={sym} size={48} radius={12} /> : <span className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-ink text-on-ink"><Lock size={20} /></span>}
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold tracking-tight">{l.token?.name || shortAddr(l.mint)} <span className="num text-ink-3">${sym}</span></h2>
            <p className="text-sm text-ink-3">{text}</p>
          </div>
          <div className="ml-auto"><ShareButtons path={`/locks/${id}`} text={text} /></div>
        </div>
        <dl className="mt-6 grid gap-x-8 text-sm md:grid-cols-2">
          {rows.map(([k, v]) => <div key={k} className="flex justify-between border-b border-border py-2"><dt className="text-ink-3">{k}</dt><dd className="num">{v}</dd></div>)}
        </dl>
        <div className="mt-4 flex gap-2">
          <Link href={`/token/${l.mint}`} className="inline-flex h-10 items-center rounded bg-ink px-4 text-sm font-medium text-on-ink hover:opacity-90">View token</Link>
          <a href={`https://solscan.io/account/${l.escrow}?cluster=devnet`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded border border-border px-4 text-sm hover:bg-muted">View escrow</a>
        </div>
      </div>
    </div>
  );
}