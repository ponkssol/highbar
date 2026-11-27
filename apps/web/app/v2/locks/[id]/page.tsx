import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LockPending } from "@/app/locks/[id]/LockPending";
import { Href } from "@/components/v2/ui";
import { fmtLockDate } from "@/lib/lockData";
import { shortAddr } from "@/lib/format";
import { getLock } from "@/lib/seoData";

type Params = { params: Promise<{ id: string }> };
const isAddress = (s: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
const fmtTok = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const lock = await getLock(id);
  return { title: lock?.token?.symbol ? `$${lock.token.symbol} Dev Lock` : "Dev token lock" };
}

export default async function Page({ params }: Params) {
  const { id } = await params;
  const lock = await getLock(id);
  if (!lock) {
    if (!isAddress(id)) notFound();
    return <div className="frame"><div className="phead"><div><div className="bul">Dev token lock</div><h1 className="h1">Checking the lock.</h1></div></div><LockPending /></div>;
  }
  const sym = lock.token?.symbol || "TOKEN";
  const cluster = process.env.NETWORK === "mainnet" || process.env.NETWORK === "mainnet-beta" ? "" : "?cluster=devnet";
  const rows: [string, string][] = [
    ["Amount", `${fmtTok(lock.totalTokens)} $${sym}`],
    ["% of supply", `${lock.supplyPct.toFixed(2)}%`],
    ["Locked on", lock.lockedAt ? fmtLockDate(lock.lockedAt) : "—"],
    ["Unlocks", fmtLockDate(lock.cliffTime)],
    ["Vesting", lock.numberOfPeriod > 0 ? `${lock.numberOfPeriod} daily releases, ends ${fmtLockDate(lock.endTime)}` : "None (all at unlock)"],
    ["Unlocked so far", `${lock.unlockedPct.toFixed(1)}%`],
    ["Cancel or change recipient", "None (permanent)"],
    ["Status", lock.status],
    ["Creator", shortAddr(lock.creator, 6)],
    ["Escrow", shortAddr(lock.escrow, 6)],
  ];
  return (
    <div className="frame">
      <div className="phead">
        <div>
          <Href canonical="/locks" className="dim mono">← All locks</Href>
          <div className="bul">Dev token lock</div>
          <h1 className="h1">{lock.token?.name || "Lock"} <span>${sym}</span></h1>
          <p className="muted">{fmtTok(lock.totalTokens)} ${sym} ({lock.supplyPct.toFixed(2)}% of supply) locked until {fmtLockDate(lock.cliffTime)}.</p>
        </div>
        <Href className="btn sm" canonical={`/token/${lock.mint}`}><b>View token</b><i>→</i></Href>
      </div>
      <div className="sec">
        <div className="kvl">
          {rows.map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}
          <div><span>Escrow on Solscan</span><b><a href={`https://solscan.io/account/${lock.escrow}${cluster}`} target="_blank" rel="noreferrer">View escrow ↗</a></b></div>
        </div>
      </div>
    </div>
  );
}
