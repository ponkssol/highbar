"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { TopBlock } from "@/components/TopBar";
import { Pagination } from "@/components/Pagination";
import { fetchLockList, fmtLockDate, type LockView } from "@/lib/lockData";
import { shortAddr } from "@/lib/format";

const PAGE_SIZE = 15;
const fmtTok = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const STATUS: Record<LockView["status"], string> = { locked: "Locked", vesting: "Vesting", unlocked: "Unlocked", cancelled: "Cancelled" };

export default function LocksPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; items: LockView[] } | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let alive = true;
    fetchLockList(page, PAGE_SIZE).then((r) => alive && (setData(r), setErr(""))).catch((e) => alive && setErr((e as Error).message));
    return () => { alive = false; };
  }, [page]);
  const th = "px-4 py-3 text-xs font-medium text-ink-3";
  return (
    <div className="flex flex-col gap-4">
      <TopBlock title="Dev token locks" />
      <div className="rounded-lg border border-border bg-surface shadow-card">
        <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Lock size={16} strokeWidth={1.5} />All locks</h2>
          <span className="text-sm text-ink-3">Permanent locks via Jupiter Lock</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="border-b border-border"><tr>
              <th className={`${th} text-left`}>Token</th><th className={`${th} text-right`}>Amount</th><th className={`${th} text-right`}>% of supply</th>
              <th className={`${th} text-left`}>Locked</th><th className={`${th} text-left`}>Unlocks</th><th className={`${th} text-left`}>Vesting progress</th>
              <th className={`${th} text-left`}>Creator</th><th className={th} />
            </tr></thead>
            <tbody>
              {data?.items.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0 transition-colors hover:bg-muted">
                  <td className="px-4 py-3"><Link href={`/token/${l.mint}`} className="block"><span className="block font-medium">{l.token?.name || shortAddr(l.mint)}</span><span className="num text-xs text-ink-3">${l.token?.symbol || "?"}</span></Link></td>
                  <td className="num px-4 py-3 text-right">{fmtTok(l.totalTokens)}</td>
                  <td className="num px-4 py-3 text-right">{l.supplyPct.toFixed(2)}%</td>
                  <td className="num px-4 py-3 text-ink-2">{l.lockedAt ? fmtLockDate(l.lockedAt) : "-"}</td>
                  <td className="num px-4 py-3">{fmtLockDate(l.cliffTime)}</td>
                  <td className="w-56 px-4 py-3">
                    <div className="h-1.5 w-full rounded-full bg-border"><div className="h-1.5 rounded-full bg-ink" style={{ width: `${Math.min(100, l.unlockedPct)}%` }} /></div>
                    <div className="num mt-1 flex justify-between text-xs text-ink-3"><span className="text-ink">{STATUS[l.status]}</span><span>{l.unlockedPct.toFixed(0)}% unlocked</span></div>
                  </td>
                  <td className="num px-4 py-3 text-ink-2">{shortAddr(l.creator)}</td>
                  <td className="px-4 py-3 text-right"><Link href={`/locks/${l.id}`} className="inline-flex h-8 items-center rounded-sm border border-border px-3 text-sm hover:bg-muted">View</Link></td>
                </tr>
              ))}
              {data && data.items.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-ink-3">No locks yet.</td></tr>}
              {!data && <tr><td colSpan={8} className="px-4 py-10 text-center text-ink-3">{err ? "Could not load locks." : "Loading..."}</td></tr>}
            </tbody>
          </table>
        </div>
        {data && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPage={setPage} label="Locks pagination" testId="locks-pagination" />}
      </div>
    </div>
  );
}