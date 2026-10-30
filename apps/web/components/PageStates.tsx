import { AlertTriangle, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "./ui/Skeleton";
import { Segmented } from "./TabBar";

const LOADING = "Loading…";
const ROW_W = [["w-24", "w-14"], ["w-32", "w-10"], ["w-20", "w-16"], ["w-28", "w-12"], ["w-24", "w-14"]] as const;

/** Table-shaped skeleton (rows the height of a real row) so a card keeps its size while it loads instead of collapsing to a spinner. */
export function Loading({ label = LOADING, rows = 5 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-label={label} className="px-4 py-1">
      {Array.from({ length: rows }, (_, i) => {
        const [a, b] = ROW_W[i % ROW_W.length];
        return (
          <div key={i} className="flex h-11 items-center gap-4 border-b border-border last:border-0">
            <Skeleton className={`h-3.5 ${a}`} /><Skeleton className="hidden h-3 w-12 opacity-70 sm:block" /><Skeleton className={`ml-auto h-3.5 ${b}`} /><Skeleton className="h-3 w-12 opacity-70" />
          </div>
        );
      })}
      {label !== LOADING ? <p className="py-2 text-center text-xs text-ink-3">{label}</p> : <span className="sr-only">{label}</span>}
    </div>
  );
}
export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <Inbox size={22} strokeWidth={1.5} className="text-ink-3" />
      <div className="text-sm font-medium">{title}</div>
      {hint && <div className="max-w-sm text-xs text-ink-3">{hint}</div>}
      {action}
    </div>
  );
}
export function OfflineNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="flex items-center gap-2 rounded border border-border bg-muted px-3 py-2 text-xs text-ink-2">
      <AlertTriangle size={14} strokeWidth={1.5} />API unreachable ({error}). Showing sample data.
    </div>
  );
}
/** Pill segmented control (soft gold pill that slides between options). */
export function Tabs<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[]; label?: string }) {
  return <Segmented value={value} onChange={onChange} options={options} label={label} className="inline-flex rounded-full bg-control p-1" itemClassName="h-8 rounded-full border border-transparent px-3 text-sm" />;
}
export const TH = "px-4 py-2 font-medium";
export const TD = "px-4 py-3";