"use client";
import { useMemo, useState } from "react";
import { fmtDateUS } from "@/lib/date";
import type { LockView } from "@/lib/lockData";
import { useApiData } from "@/lib/pagesData";
import { shortAddr } from "@/lib/format";
import { Href, TokenCell, Tw } from "./ui";

type Resp = { total: number; items: LockView[] };
const FILTERS = ["All", "Vesting", "Permanent", "Unlocked"] as const;

function permanent(l: LockView) {
  return l.status === "locked" && (l.endTime === 0 || l.endTime > 4_000_000_000);
}

export function V2Locks({ initial }: { initial: LockView[] | null }) {
  const { data } = useApiData<Resp>(`/locks?page=1&limit=100`, { total: initial?.length ?? 0, items: initial ?? [] });
  const items = data?.items ?? initial ?? [];
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const rows = useMemo(() => items.filter((l) => {
    if (filter === "Vesting") return l.status === "vesting";
    if (filter === "Unlocked") return l.status === "unlocked" || l.status === "cancelled";
    if (filter === "Permanent") return permanent(l);
    return true;
  }), [items, filter]);
  const active = items.filter((l) => l.status === "locked" || l.status === "vesting").length;
  const avg = items.length ? items.reduce((a, l) => a + (l.supplyPct || 0), 0) / items.length : 0;
  const next = items.filter((l) => l.endTime > Date.now() / 1000).sort((a, b) => a.endTime - b.endTime)[0];
  const perm = items.filter(permanent).length;

  return (
    <div className="frame">
      <div className="phead">
        <div><div className="bul">Dev <b>token locks</b></div><h1 className="h1">Locked in public. <span>Unlocks on the record.</span></h1></div>
        <div className="lbl">Permanent locks via Jupiter Lock</div>
      </div>
      <div className="strip" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <div><div className="lbl">Active locks</div><div className="v">{active}</div></div>
        <div><div className="lbl">Avg % of supply</div><div className="v">{avg.toFixed(1)}%</div></div>
        <div><div className="lbl">Next unlock</div><div className="v">{next ? fmtDateUS(next.endTime * 1000, { timeZone: "UTC" }) : "—"}</div></div>
        <div><div className="lbl">Permanent</div><div className="v yl">{perm}</div></div>
      </div>
      <div className="sec">
        <div className="head"><h2 className="h2" style={{ fontSize: 28 }}>All locks</h2>
          <div className="tabs seg">{FILTERS.map((f) => <button type="button" key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>{f}</button>)}</div>
        </div>
        <Tw brk>
          <table>
            <thead><tr><th>Token</th><th className="r w4 h-md">Amount</th><th className="r w2">% supply</th><th className="w2 h-md">Locked</th><th className="w4">Unlocks</th><th className="w5 h-sm">Vesting</th><th className="w3 h-md">Creator</th><th className="w4 r h-sm" /></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={8} className="dim empty-row">No locks in this view.</td></tr>}
              {rows.map((l) => {
                const unlock = permanent(l) ? "Permanent" : l.endTime ? fmtDateUS(l.endTime * 1000, { timeZone: "UTC" }) : l.status;
                return (
                  <tr key={l.id}>
                    <td><TokenCell name={l.token?.name || l.mint.slice(0, 4)} symbol={l.token?.symbol || "?"} image={l.token?.image} href={`/token/${l.mint}`} /></td>
                    <td className="r num">{l.lockedTokens.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                    <td className="r num">{l.supplyPct.toFixed(1)}%</td>
                    <td className="num dim">{l.lockedAt ? fmtDateUS(l.lockedAt) : "—"}</td>
                    <td className={`num${permanent(l) ? " yl" : ""}`}>{unlock}</td>
                    <td><div className="prog"><div className="bar"><i style={{ width: `${Math.min(100, l.unlockedPct)}%` }} /></div>{permanent(l) ? "locked" : `${l.unlockedPct.toFixed(0)}%`}</div></td>
                    <td className="num dim">{shortAddr(l.creator)}</td>
                    <td className="r"><Href className="rb" canonical={`/locks/${l.id}`}>View lock ↗</Href></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Tw>
      </div>
    </div>
  );
}
