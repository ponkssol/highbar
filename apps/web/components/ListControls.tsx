"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpDown, Check, SlidersHorizontal } from "lucide-react";
import { TIERS } from "@hb/shared";
import { Button, TierDot } from "./ui";
import { SORTS, TIER_IDS, activeFilterCount, useListQuery, type StatusId } from "@/lib/listQuery";

export const STATUS_LABEL: Record<StatusId, string> = { all: "All", bonding: "Bonding", almost: "Almost there", graduated: "Migrated" };

function Popover({ label, button, children }: { label: string; button: (open: boolean, toggle: () => void) => ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", down); window.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); window.removeEventListener("keydown", key); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      {button(open, () => setOpen((o) => !o))}
      {open && (
        <div role="dialog" aria-label={label} className="absolute right-0 top-[calc(100%+6px)] z-40 w-60 rounded-lg border border-border bg-surface p-1.5 text-sm shadow-card">
          {children}
        </div>
      )}
    </div>
  );
}

const Row = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) => (
  <button type="button" role="menuitemcheckbox" aria-checked={on} onClick={onClick}
    className={`flex h-9 w-full items-center gap-2 rounded-sm px-2.5 text-left hover:bg-muted ${on ? "font-medium text-ink" : "text-ink-2"}`}>
    <span className="flex-1">{children}</span>{on && <Check size={14} />}
  </button>
);
const Head = ({ children }: { children: ReactNode }) => <div className="px-2.5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-ink-3">{children}</div>;

/** Sort by + Filters popovers for the token list. State lives in the URL (see useListQuery). */
export function ListControls({ small = false }: { small?: boolean }) {
  const [q, set] = useListQuery();
  const n = activeFilterCount(q);
  const sortLabel = SORTS.find((s) => s.id === q.sort)!.label;
  const btn = small ? "h-8 px-3 text-[13px]" : "";
  return (
    <div className="flex items-center gap-2">
      <Popover label="Sort tokens" button={(open, toggle) => (
        <Button variant="secondary" className={`${btn} ${q.sort !== "new" ? "border-ink" : ""}`} aria-expanded={open} aria-haspopup="dialog" onClick={toggle} data-testid="sort-button">
          <ArrowUpDown size={16} strokeWidth={1.5} />{q.sort === "new" ? "Sort by" : sortLabel}
        </Button>
      )}>
        <Head>Sort by</Head>
        {SORTS.map((s) => <Row key={s.id} on={q.sort === s.id} onClick={() => set({ sort: s.id })}>{s.label}</Row>)}
      </Popover>
      <Popover label="Filter tokens" button={(open, toggle) => (
        <Button variant="secondary" className={`${btn} ${n ? "border-ink" : ""}`} aria-expanded={open} aria-haspopup="dialog" onClick={toggle} data-testid="filters-button">
          <SlidersHorizontal size={16} strokeWidth={1.5} />Filters
          {n > 0 && <span className="num ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1.5 text-[11px] text-on-ink">{n}</span>}
        </Button>
      )}>
        <Head>Tier</Head>
        {TIER_IDS.map((t) => (
          <Row key={t} on={q.tiers.includes(t)} onClick={() => set({ tiers: q.tiers.includes(t) ? q.tiers.filter((x) => x !== t) : [...q.tiers, t] })}>
            <span className="flex items-center gap-2"><TierDot tier={t} />{TIERS[t].label}</span>
          </Row>
        ))}
        <Head>Stage</Head>
        {(Object.keys(STATUS_LABEL) as StatusId[]).map((s) => <Row key={s} on={q.status === s} onClick={() => set({ status: s })}>{STATUS_LABEL[s]}</Row>)}
        <Head>Lock</Head>
        <Row on={q.locked} onClick={() => set({ locked: !q.locked })}>Dev tokens locked</Row>
        {n > 0 && (
          <div className="mt-1 border-t border-border pt-1">
            <button type="button" onClick={() => set({ tiers: [], status: "all", locked: false })} className="h-9 w-full rounded-sm px-2.5 text-left text-ink-3 hover:bg-muted hover:text-ink">Clear filters</button>
          </div>
        )}
      </Popover>
    </div>
  );
}
