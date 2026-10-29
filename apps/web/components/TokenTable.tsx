"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { TIERS } from "@hb/shared";
import { NOW_TS, progressOf, type TokenRow } from "@/lib/mock";
import { fmtAge, fmtSol, fmtUsd, shortAddr } from "@/lib/format";
import { Avatar, ProgressBar, TierBadge } from "./ui";

type Filter = "all" | "bonding" | "almost" | "graduated";
type SortKey = "name" | "tier" | "mcap" | "progress" | "volume" | "age";
const FILTERS: { id: Filter; label: string; test: (t: TokenRow) => boolean }[] = [
  { id: "all", label: "All", test: () => true },
  { id: "bonding", label: "Bonding", test: (t) => progressOf(t) < 0.8 },
  { id: "almost", label: "Almost there", test: (t) => progressOf(t) >= 0.8 && progressOf(t) < 1 },
  { id: "graduated", label: "Graduated", test: (t) => progressOf(t) >= 1 },
];
const TIER_ORDER = { standard: 0, higher: 1, max: 2 };
const val = (t: TokenRow, k: SortKey): number | string =>
  k === "name" ? t.name : k === "tier" ? TIER_ORDER[t.tier] : k === "mcap" ? t.mcapUsd : k === "progress" ? progressOf(t) : k === "volume" ? t.volume24hSol : -t.createdAt;

export function TokenTable({ tokens, search = "" }: { tokens: TokenRow[]; search?: string }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: "age", dir: -1 });
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const f = FILTERS.find((x) => x.id === filter)!;
    return tokens
      .filter((t) => f.test(t) && (!q || `${t.name} ${t.ticker} ${t.mint}`.toLowerCase().includes(q)))
      .sort((a, b) => {
        const va = val(a, sort.k), vb = val(b, sort.k);
        return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
      });
  }, [tokens, filter, sort, search]);

  const Th = ({ k, children, right }: { k?: SortKey; children: React.ReactNode; right?: boolean }) => (
    <th className={`px-4 py-3 text-xs font-medium text-ink-3 ${right ? "text-right" : "text-left"}`}>
      {k ? (
        <button onClick={() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : -1 }))}
          className={`inline-flex items-center gap-1 hover:text-ink ${sort.k === k ? "text-ink" : ""}`}>
          {children}
          {sort.k === k && (sort.dir === 1 ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
        </button>
      ) : children}
    </th>
  );

  return (
    <div className="rounded-lg border border-border bg-surface shadow-card">
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
        <h2 className="text-lg font-semibold">New tokens</h2>
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`h-8 rounded-full px-3 text-sm ${filter === f.id ? "bg-ink text-on-ink" : "border border-border text-ink-2 hover:bg-muted"}`}>
              {f.label} <span className="num ml-1 text-xs opacity-60">{tokens.filter(f.test).length}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="border-b border-border">
            <tr>
              <Th k="name">Token</Th><Th k="tier">Tier</Th><Th k="mcap" right>Market cap</Th>
              <Th k="progress">Bonding progress</Th><Th k="volume" right>Volume 24h</Th><Th k="age" right>Age</Th>
              <Th>Creator</Th><Th>{""}</Th><Th>{""}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const p = progressOf(t);
              return (
                <tr key={t.mint} onClick={() => router.push(`/token/${t.mint}`)}
                  className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-muted">
                  <td className="px-4 py-3">
                    <Link href={`/token/${t.mint}`} className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <Avatar name={t.name} />
                      <span><span className="block font-medium">{t.name}</span><span className="num text-xs text-ink-3">${t.ticker}</span></span>
                    </Link>
                  </td>
                  <td className="px-4 py-3"><TierBadge tier={t.tier} /></td>
                  <td className="num px-4 py-3 text-right">{fmtUsd(t.mcapUsd)}</td>
                  <td className="w-56 px-4 py-3">
                    <ProgressBar value={p} tier={t.tier} />
                    <div className="num mt-1 flex justify-between text-xs text-ink-3">
                      <span className="text-ink">{Math.round(p * 100)}%</span>
                      <span>{fmtSol(t.raisedSol, 1)} / {TIERS[t.tier].migrationQuoteThresholdSol} SOL</span>
                    </div>
                  </td>
                  <td className="num px-4 py-3 text-right">{fmtSol(t.volume24hSol, 1)} SOL</td>
                  <td className="num px-4 py-3 text-right text-ink-2">{fmtAge(t.createdAt, NOW_TS)}</td>
                  <td className="num px-4 py-3 text-ink-2">{shortAddr(t.creator)}</td>
                  <td className="px-2 py-3">{t.antiSniper && <span title="Anti-sniper on"><ShieldCheck size={16} strokeWidth={1.5} className="text-ink-2" /></span>}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/token/${t.mint}`} onClick={(e) => e.stopPropagation()}
                      className="inline-flex h-8 items-center rounded-sm bg-ink px-4 text-sm font-medium text-on-ink hover:opacity-90">Buy</Link>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-ink-3">No tokens match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}