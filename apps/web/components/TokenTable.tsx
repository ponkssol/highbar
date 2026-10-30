"use client";
import { TokenLogo } from "./TokenLogo";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { TIERS } from "@hb/shared";
import { progressOf, type TokenRow } from "@/lib/mock";
import { fmtAge, fmtSol, fmtUsd, shortAddr } from "@/lib/format";
import { Avatar, ProgressBar, TierBadge } from "./ui";
import { Pagination } from "./Pagination";
import { DevLockedBadge } from "./DevLockedBadge";
import { OfficialBadge } from "./OfficialBadge";

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

export const PAGE_SIZE = 15;


export function TokenTable({ tokens, search = "", pageSize = PAGE_SIZE }: { tokens: TokenRow[]; search?: string; pageSize?: number }) {
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
  // Page is tied to the current view: any change to filter/sort/search resets it to 1 in the same render.
  const viewKey = `${filter}|${sort.k}|${sort.dir}|${search.trim().toLowerCase()}|${pageSize}`;
  const [pg, setPg] = useState({ key: viewKey, page: 1 });
  const page = pg.key === viewKey ? pg.page : 1;
  const setPage = (n: number) => setPg({ key: viewKey, page: n });
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const cur = Math.min(page, pages);
  const start = (cur - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

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
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-4 py-3">
        <h2 className="text-lg font-semibold">New tokens</h2>
        <div className="-mx-1 flex max-w-full gap-1 overflow-x-auto px-1">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`relative h-7 shrink-0 whitespace-nowrap rounded-full px-2.5 text-[12px] after:absolute after:inset-x-0 after:-inset-y-[6px] after:content-[''] md:h-8 md:px-3 md:text-sm ${filter === f.id ? "bg-ink text-on-ink" : "border border-border text-ink-2 hover:bg-muted"}`}>
              {f.label} <span className="num ml-1 text-xs opacity-60">{tokens.filter(f.test).length}</span>
            </button>
          ))}
        </div>
      </div>
      <ul className="flex flex-col gap-3 p-3 md:hidden" data-testid="token-cards">
        {pageRows.map((t) => {
          const p = progressOf(t);
          return (
            <li key={t.mint}>
              <Link href={`/token/${t.mint}`} className="block rounded-[12px] border border-border p-3 active:bg-muted">
                <div className="flex items-center gap-3">
                  <TokenLogo src={t.image} name={t.name} />
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{t.name}</span><span className="flex items-center gap-1.5"><span className="num text-xs text-ink-3">${t.ticker}</span><OfficialBadge official={t.official} /><DevLockedBadge devLocked={t.devLocked} unlockAt={t.unlockAt} /></span></span>
                  <TierBadge tier={t.tier} />
                  <span className="num text-right text-sm">{fmtUsd(t.mcapUsd)}</span>
                </div>
                <div className="mt-3 flex items-center gap-3"><div className="flex-1"><ProgressBar value={p} tier={t.tier} /></div><span className="num w-10 text-right text-xs">{Math.round(p * 100)}%</span></div>
                <div className="num mt-2 flex justify-between text-xs text-ink-3"><span>Vol {fmtSol(t.volume24hSol, 1)} SOL</span><span>{fmtAge(t.createdAt, Date.now())}</span><span>{shortAddr(t.creator)}</span></div>
              </Link>
            </li>
          );
        })}
        {rows.length === 0 && <li className="py-10 text-center text-ink-3">No tokens match.</li>}
      </ul>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="border-b border-border">
            <tr>
              <Th k="name">Token</Th><Th k="tier">Tier</Th><Th k="mcap" right>Market cap</Th>
              <Th k="progress">Bonding progress</Th><Th k="volume" right>Volume 24h</Th><Th k="age" right>Age</Th>
              <Th>Creator</Th><Th>{""}</Th><Th>{""}</Th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((t) => {
              const p = progressOf(t);
              return (
                <tr key={t.mint} onClick={() => router.push(`/token/${t.mint}`)}
                  className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-muted">
                  <td className="px-4 py-3">
                    <Link href={`/token/${t.mint}`} className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <TokenLogo src={t.image} name={t.name} />
                      <span><span className="block font-medium">{t.name}</span><span className="flex items-center gap-1.5"><span className="num text-xs text-ink-3">${t.ticker}</span><OfficialBadge official={t.official} /><DevLockedBadge devLocked={t.devLocked} unlockAt={t.unlockAt} /></span></span>
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
                  <td className="num px-4 py-3 text-right text-ink-2">{fmtAge(t.createdAt, Date.now())}</td>
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
      <Pagination page={cur} pageSize={pageSize} total={rows.length} onPage={setPage} label="Tokens pagination" testId="token-pagination" />
    </div>
  );
}