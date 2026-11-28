"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
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
  const [filter, setFilter] = useState<"all" | "vesting" | "locked" | "unlocked">("all");
  useEffect(() => {
    let alive = true;
    fetchLockList(page, PAGE_SIZE).then((r) => alive && (setData(r), setErr(""))).catch((e) => alive && setErr((e as Error).message));
    return () => { alive = false; };
  }, [page]);
  const all = data?.items ?? [];
  const items = all.filter((l) => filter === "all" || l.status === filter);
  const nowS = Math.floor(Date.now() / 1000);
  const next = all.filter((l) => l.cliffTime > nowS).sort((x, y) => x.cliffTime - y.cliffTime)[0];
  const permanent = all.filter((l) => l.status === "locked").length;
  const avgPct = all.length ? all.reduce((n, l) => n + l.supplyPct, 0) / all.length : null;
  const FILTERS: { id: typeof filter; label: string }[] = [{ id: "all", label: "All" }, { id: "vesting", label: "Vesting" }, { id: "locked", label: "Permanent" }, { id: "unlocked", label: "Unlocked" }];
  const prog = (l: LockView) => <div className="prog"><div className="bar"><i style={{ width: `${Math.max(1, Math.min(100, l.unlockedPct))}%` }} /></div>{l.status === "locked" ? "locked" : `${l.unlockedPct.toFixed(0)}%`}</div>;
  return (
    <div className="jtx">
      <div className="phead"><div><div className="bul">Dev <b>token locks</b></div><h1 className="h1">Locked in public. <span>Unlocks on the record.</span></h1></div><div className="lbl">Permanent locks via Jupiter Lock</div></div>
      <div className="strip" style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))" }}>
        <div><div className="lbl">Active locks</div><div className="v">{data ? data.total : "—"}</div></div>
        <div><div className="lbl">Avg % of supply</div><div className="v">{avgPct == null ? "—" : `${avgPct.toFixed(1)}%`}</div></div>
        <div><div className="lbl">Next unlock</div><div className="v">{next ? fmtLockDate(next.cliffTime).replace(/, \d{4}$/, "") : "—"}</div></div>
        <div><div className="lbl">Permanent</div><div className="v yl">{data ? permanent : "—"}</div></div>
      </div>
      <div className="sec msec" style={{ borderBottom: 0 }}>
        <div className="head"><h2 className="h2" style={{ fontSize: 28 }}>All locks</h2>
          <div className="tabs seg" role="tablist" aria-label="Lock status">{FILTERS.map((f) => <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} className={filter === f.id ? "on" : ""} onClick={() => setFilter(f.id)}>{f.label}</button>)}</div>
        </div>
        <div className="tw brk" data-testid="lock-cards"><span className="c1" /><span className="c2" />
          <table>
            <thead><tr><th>Token</th><th className="r w4 h-md">Amount</th><th className="r w2">% supply</th><th className="w2 h-md">Locked</th><th className="w4">Unlocks</th><th className="w5 h-sm">Vesting</th><th className="w3 h-md">Creator</th><th className="w4 r h-sm" /></tr></thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id}>
                  <td data-l="Token" className="tkc"><div className="tk"><div className="av">{(l.token?.symbol || "?").slice(0, 2).toUpperCase()}</div><div><b><Link href={`/token/${l.mint}`}>{l.token?.name || shortAddr(l.mint)}</Link></b><small>${l.token?.symbol || "?"}</small></div></div></td>
                  <td data-l="Amount" className="r num h-md">{fmtTok(l.totalTokens)}</td>
                  <td data-l="% supply" className="r num">{l.supplyPct.toFixed(1)}%</td>
                  <td data-l="Locked" className="num dim h-md">{l.lockedAt ? fmtLockDate(l.lockedAt).replace(/, \d{4}$/, "") : "\u2014"}</td>
                  <td data-l="Unlocks" className={`num ${l.status === "locked" ? "yl" : ""}`}>{l.status === "locked" ? "Permanent" : fmtLockDate(l.cliffTime)}</td>
                  <td data-l="Vesting" className="h-sm">{prog(l)}</td>
                  <td data-l="Creator" className="num dim h-md">{shortAddr(l.creator)}</td>
                  <td className="r act h-sm"><Link href={`/locks/${l.id}`} className="rb">View lock ↗</Link></td>
                </tr>
              ))}
              {data && items.length === 0 && <tr><td colSpan={8} className="dim empty-row" style={{ textAlign: "center", padding: 24 }}>No locks yet.</td></tr>}
              {!data && <tr><td colSpan={8} className="dim empty-row" style={{ textAlign: "center", padding: 24 }}>{err ? "Could not load locks." : "Loading…"}</td></tr>}
            </tbody>
          </table>
        </div>
        {data && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPage={setPage} label="Locks pagination" testId="locks-pagination" />}
      </div>
    </div>
  );
}
