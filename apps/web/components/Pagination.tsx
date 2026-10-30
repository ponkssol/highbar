"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Page numbers with ellipses: 1 ... 4 5 6 ... 12 */
export function pageList(page: number, pages: number): (number | "gap")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const sorted = [...new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages))].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((n, i) => { if (i && n - sorted[i - 1] > 1) out.push("gap"); out.push(n); });
  return out;
}

const pgBtn = "num inline-flex h-11 min-w-11 md:h-8 md:min-w-8 items-center justify-center rounded-sm px-2 text-sm";

/** Footer row for table cards: "Showing a-b of N" + Prev / numbers / Next. */
export function Pagination({ page, pageSize, total, onPage, label = "Pagination", testId }: { page: number; pageSize: number; total: number; onPage: (n: number) => void; label?: string; testId?: string }) {
  if (total <= 0) return null;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const cur = Math.min(Math.max(1, page), pages);
  const start = (cur - 1) * pageSize;
  const end = Math.min(total, start + pageSize);
  return (
    <nav aria-label={label} data-testid={testId} className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
      <span className="num text-sm text-ink-3">Showing {start + 1}-{end} of {total}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(cur - 1)} disabled={cur <= 1} aria-label="Previous page"
          className={`${pgBtn} gap-1 border border-border text-ink-2 hover:bg-muted disabled:pointer-events-none disabled:opacity-40`}>
          <ChevronLeft size={14} /> Prev
        </button>
        {pageList(cur, pages).map((n, i) => n === "gap"
          ? <span key={`g${i}`} className="px-1 text-sm text-ink-3" aria-hidden="true">…</span>
          : <button key={n} onClick={() => onPage(n)} aria-current={n === cur ? "page" : undefined}
              className={`${pgBtn} ${n === cur ? "bg-ink text-on-ink" : "border border-border text-ink-2 hover:bg-muted"}`}>{n}</button>)}
        <button onClick={() => onPage(cur + 1)} disabled={cur >= pages} aria-label="Next page"
          className={`${pgBtn} gap-1 border border-border text-ink-2 hover:bg-muted disabled:pointer-events-none disabled:opacity-40`}>
          Next <ChevronRight size={14} />
        </button>
      </div>
    </nav>
  );
}