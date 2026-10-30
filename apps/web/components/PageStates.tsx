import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export function Loading({ label = "Loading…" }: { label?: string }) {
  return <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-3"><Loader2 size={16} className="animate-spin" />{label}</div>;
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
export function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[] }) {
  return (
    <div className="inline-flex rounded-full bg-control p-1">
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)}
          type="button" className={`h-8 whitespace-nowrap rounded-full border px-3 text-sm transition-colors ${value === o.id ? "hb-ctrl-on font-medium" : "border-transparent text-ink-2 hover:text-ink"}`}>{o.label}</button>
      ))}
    </div>
  );
}
export const TH = "px-4 py-2 font-medium";
export const TD = "px-4 py-3";