import { TokenLogo } from "@/components/TokenLogo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { TopBlock } from "@/components/TopBar";
import { ShareButtons } from "@/components/ShareButtons";
import { fmtLockDate } from "@/lib/lockData";
import { shortAddr } from "@/lib/format";
import { LockDonut, fmtPct } from "@/components/LockDonut";
import { LockPending } from "./LockPending";
import { JsonLd } from "@/components/JsonLd";
import { getLock } from "@/lib/seoData";
import { breadcrumbJsonLd, pageMeta } from "@/lib/seo";

// Lock reads are cached for 60 s (lib/seoData). Non-address ids 404 in middleware.ts; an unreadable address shows LockPending.
export const revalidate = 60;
const network = () => (process.env.NETWORK === "mainnet" || process.env.NETWORK === "mainnet-beta" ? "mainnet" : "devnet"); // runtime server env
const fmtTok = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
/** Looks like a Solana address (base58, 32 to 44 chars). Only these get the pending state, anything else is a plain 404. */
const isAddress = (s: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const l = await getLock(id);
  if (!l) return { title: { absolute: "Lock not found | highbar" }, robots: { index: false, follow: true } };
  const sym = l.token?.symbol || "TOKEN";
  return pageMeta({
    absoluteTitle: `$${sym} Dev Lock until ${fmtLockDate(l.cliffTime)} | highbar`, path: `/locks/${id}`, images: false,
    description: `${fmtPct(l.supplyPct)} of the $${sym} supply is locked by its creator with Jupiter Lock on highbar, a Solana launchpad built on Meteora. Unlocks ${fmtLockDate(l.cliffTime)}.`,
    keywords: [`$${sym} Dev Lock`, `${sym} token lock`, "Jupiter Lock", "Solana token lock"],
  });
}

export default async function LockSharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const l = await getLock(id);
  if (!l) {
    // A lock created a moment ago can be briefly unreadable (RPC lag). Show a retrying state instead of a hard 404.
    if (!isAddress(id)) notFound();
    return (
      <div className="flex flex-col gap-4">
        <TopBlock title="Dev token lock" />
        <LockPending />
      </div>
    );
  }
  const sym = l.token?.symbol || "?";
  const rows: [string, string][] = [
    ["Amount", `${fmtTok(l.totalTokens)} $${sym}`], ["% of supply", fmtPct(l.supplyPct)],
    ["Locked on", l.lockedAt ? fmtLockDate(l.lockedAt) : "-"], ["Unlocks", fmtLockDate(l.cliffTime)],
    ["Vesting", l.numberOfPeriod > 0 ? `${l.numberOfPeriod} daily releases, ends ${fmtLockDate(l.endTime)}` : "None (all at unlock)"],
    ["Unlocked so far", `${l.unlockedPct.toFixed(1)}%`], ["Cancel or change recipient", "None (permanent)"],
    ["Creator", shortAddr(l.creator, 6)], ["Escrow", shortAddr(l.escrow, 6)],
  ];
  const text = `${fmtTok(l.totalTokens)} $${sym} (${fmtPct(l.supplyPct)} of supply) locked until ${fmtLockDate(l.cliffTime)} on highbar`;
  return (
    <div className="flex flex-col gap-4">
      <JsonLd data={breadcrumbJsonLd([["Home", "/"], ["Locks", "/locks"], [`$${sym} Dev Lock`, `/locks/${id}`]])} />
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
        <div className="mt-6"><LockDonut lock={l} symbol={sym} fmt={fmtTok} /></div>
        <div className="mt-4 flex gap-2">
          <Link href={`/token/${l.mint}`} className="inline-flex h-10 items-center rounded bg-ink px-4 text-sm font-medium text-on-ink hover:opacity-90">View token</Link>
          <a href={`https://solscan.io/account/${l.escrow}${network() === "mainnet" ? "" : "?cluster=devnet"}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded border border-border px-4 text-sm hover:bg-muted">View escrow</a>
        </div>
      </div>
    </div>
  );
}