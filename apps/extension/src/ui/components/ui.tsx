import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { fmtSol } from "../../lib/format";

export const SEG_TRACK = "relative inline-flex w-max items-center gap-0.5 rounded-full border border-seg-line bg-seg p-0.5";
export const SEG_ITEM = "relative z-[1] inline-flex h-6 items-center justify-center whitespace-nowrap rounded-full px-2.5 text-[11px] leading-none transition-colors duration-200";

export function TabBar<T extends string>({ tabs, value, onChange, label, full }: { tabs: { id: T; label: ReactNode; disabled?: boolean; title?: string }[]; value: T; onChange: (t: T) => void; label: string; full?: boolean }) {
  return (
    <div role="tablist" aria-label={label} className={`${SEG_TRACK} ${full ? "!flex !w-full" : ""}`}>
      {tabs.map((t) => (
        <button key={t.id} role="tab" type="button" aria-selected={value === t.id} aria-disabled={t.disabled || undefined} title={t.title}
          onClick={() => !t.disabled && onChange(t.id)}
          className={`${SEG_ITEM} ${full ? "flex-1 !px-2" : ""} ${value === t.id ? "bg-seg-on text-seg-on-ink" : "text-ink-3 hover:text-ink-2"} ${t.disabled ? "cursor-not-allowed opacity-55" : ""}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function InfoTip({ text, align = "center" }: { text: ReactNode; align?: "center" | "right" | "left" }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const pos = align === "right" ? "right-[-8px]" : align === "left" ? "left-[-8px]" : "left-1/2 -translate-x-1/2";
  return (
    <span className="relative inline-flex align-middle" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-label="More info" aria-describedby={open ? id : undefined} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onClick={() => setOpen((o) => !o)}
        className="inline-flex text-ink-3 hover:text-ink-2 focus-visible:text-ink-2">
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6.75" stroke="currentColor" strokeWidth="1" opacity=".8" /><circle cx="8" cy="5" r=".85" fill="currentColor" /><path d="M8 7.1v4.2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" /></svg>
      </button>
      {open && <span id={id} role="tooltip" className={`absolute top-[calc(100%+6px)] z-30 w-56 rounded-[8px] border border-border-strong bg-surface px-2.5 py-1.5 text-left text-[11px] font-normal normal-case leading-relaxed tracking-normal text-ink-2 shadow-xl ${pos}`}>{text}</span>}
    </span>
  );
}

export function SolanaMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 397.7 311.7" className={`inline-block h-[0.78em] w-auto shrink-0 ${className}`} style={{ fill: "var(--hb-sol-mark, currentColor)" }} aria-hidden="true" focusable="false">
      <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" />
      <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" />
      <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" />
    </svg>
  );
}
export function SolAmt({ v, className = "" }: { v: number | null | undefined; className?: string }) {
  return <span className={`inline-flex items-baseline gap-1 font-mono tabular-nums ${className}`}><SolanaMark />{v == null ? "–" : fmtSol(v)}<span className="sr-only"> SOL</span></span>;
}

export function Logo({ className = "h-6" }: { className?: string }) {
  return <img src="brand/logo.png" alt="highbar" className={`w-auto ${className}`} />;
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mb-1.5 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gold-text ${className}`}>{children}</div>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[10px] border border-border bg-surface p-3 ${className}`}>{children}</section>;
}

type BtnKind = "gold" | "ghost" | "danger";
export function Button({ kind = "ghost", className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: BtnKind }) {
  const k = kind === "gold" ? "bg-gold text-gold-ink hover:brightness-105 font-semibold" : kind === "danger" ? "border border-[rgba(224,106,92,.40)] text-sell hover:bg-[rgba(224,106,92,.10)]" : "border border-border text-ink-2 hover:bg-control-hover hover:text-ink";
  return <button type="button" {...p} className={`inline-flex h-7 items-center justify-center gap-1.5 rounded-full px-3 text-[12px] transition disabled:cursor-not-allowed disabled:opacity-50 ${k} ${className}`} />;
}

export const INPUT = "w-full rounded-[8px] border border-border bg-control px-2.5 py-1.5 text-[12px] text-ink outline-none placeholder:text-ink-3 focus:border-gold-line focus:bg-control-hover";

export function Field({ label, tip, children, hint }: { label: ReactNode; tip?: ReactNode; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <Eyebrow>{label}{tip && <InfoTip text={tip} />}</Eyebrow>
      {children}
      {hint && <div className="mt-1 text-[11px] text-ink-3">{hint}</div>}
    </label>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative h-[18px] w-[30px] shrink-0 rounded-full transition ${on ? "bg-gold" : "bg-border-strong"}`}>
      <span className={`absolute top-[3px] h-3 w-3 rounded-full transition ${on ? "left-[15px] bg-gold-ink" : "left-[3px] bg-ink-2"}`} />
    </button>
  );
}

export function Note({ kind = "info", children }: { kind?: "info" | "warn" | "error" | "ok"; children: ReactNode }) {
  const c = kind === "warn" ? "border-gold-line bg-gold-soft text-ink-2" : kind === "error" ? "border-[rgba(224,106,92,.40)] bg-[rgba(224,106,92,.10)] text-sell" : kind === "ok" ? "border-[rgba(76,182,122,.40)] bg-[rgba(76,182,122,.10)] text-buy" : "border-border bg-muted text-ink-2";
  // red warnings stay small and on one line (the full text is in the tooltip)
  const one = kind === "error" ? `truncate whitespace-nowrap text-[11px] leading-5` : "text-[11px] leading-snug";
  return <div role={kind === "error" ? "alert" : undefined} title={kind === "error" && typeof children === "string" ? children : undefined} className={`rounded-[8px] border px-2.5 py-1 ${one} ${c}`}>{children}</div>;
}

export function Copy({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(t.current), []);
  return <button type="button" className="text-[11px] text-gold-text hover:underline" onClick={() => { void navigator.clipboard.writeText(text); setDone(true); clearTimeout(t.current); t.current = setTimeout(() => setDone(false), 1400); }}>{done ? "Copied" : label}</button>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="rounded-[10px] border border-dashed border-border-strong px-3 py-5 text-center"><div className="font-display text-[12px] text-ink">{title}</div>{children && <div className="mt-1 text-[11px] text-ink-3">{children}</div>}</div>;
}

export function TierDot({ tier }: { tier: string }) {
  const c = tier === "higher" ? "bg-tier-higher" : tier === "max" ? "bg-tier-max" : "bg-tier-standard";
  return <span className={`inline-block h-[7px] w-[7px] rounded-full ${c}`} />;
}

export function errText(e: unknown) { return e instanceof Error ? e.message : String(e); }

/** The custom dark dropdown (same look as the x.com drawer menus): a small trigger and a listbox under it. Closes on outside
 *  click, Escape or a pick. Options can carry a right-hand detail (a balance). */
export function Dropdown<T extends string>({ value, options, onChange, label, className = "", align = "right", testId }: {
  value: T; options: { id: T; label: ReactNode; detail?: ReactNode; title?: string }[]; onChange: (v: T) => void; label: string; className?: string; align?: "left" | "right"; testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", off); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [open]);
  const cur = options.find((o) => o.id === value);
  return (
    <div ref={box} className={`relative min-w-0 ${className}`}>
      <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={label} data-testid={testId} onClick={() => setOpen((o) => !o)}
        className="flex h-7 w-full min-w-0 items-center gap-1.5 rounded-full border border-border bg-control pl-2.5 pr-2 text-[11px] text-ink hover:bg-control-hover">
        <span className="min-w-0 flex-1 truncate text-left">{cur?.label ?? label}</span>
        {cur?.detail != null && <span className="shrink-0 text-ink-2">{cur.detail}</span>}
        <svg viewBox="0 0 16 16" width="10" height="10" fill="none" aria-hidden="true" className={`shrink-0 text-ink-3 transition ${open ? "rotate-180" : ""}`}><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <ul role="listbox" aria-label={label} className={`absolute top-[calc(100%+4px)] z-40 max-h-64 min-w-full overflow-auto rounded-[10px] border border-gold-line bg-surface p-1 shadow-xl ${align === "right" ? "right-0" : "left-0"}`}>
          {options.map((o) => (
            <li key={o.id} role="option" aria-selected={o.id === value} title={o.title} tabIndex={0}
              onClick={() => { setOpen(false); if (o.id !== value) onChange(o.id); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(false); if (o.id !== value) onChange(o.id); } }}
              className={`flex h-7 cursor-pointer items-center gap-2 whitespace-nowrap rounded-[7px] px-2 text-[11px] outline-none hover:bg-control-hover focus-visible:bg-control-hover ${o.id === value ? "text-gold-text" : "text-ink"}`}>
              <i className={`h-1.5 w-1.5 shrink-0 rounded-full ${o.id === value ? "bg-gold" : "bg-border-strong"}`} />
              <span className="min-w-0 flex-1 truncate">{o.label}</span>
              {o.detail != null && <span className="shrink-0 pl-2 text-ink-2">{o.detail}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Top-center toasts like the x.com ones: 1.5 s, errors 2 s, an optional "View tx" link. */
export type ToastKind = "ok" | "err" | "info";
export interface ToastItem { id: number; kind: ToastKind; text: string; url?: string }
export function useToasts(ms: (k: ToastKind) => number) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const show = useCallback((kind: ToastKind, text: string, url?: string) => {
    const id = ++seq.current;
    setItems((l) => [...l.slice(-2), { id, kind, text, url }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), ms(kind));
  }, [ms]);
  return { items, show };
}
export function Toasts({ items }: { items: ToastItem[] }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-50 flex flex-col items-center gap-1.5 px-3" aria-live="polite" data-testid="hb-toasts">
      {items.map((t) => (
        <div key={t.id} role={t.kind === "err" ? "alert" : "status"} data-kind={t.kind}
          className={`pointer-events-auto flex max-w-full items-center gap-2 rounded-full border bg-surface px-3 py-1 text-[11px] shadow-xl ${t.kind === "ok" ? "border-[rgba(76,182,122,.40)] text-buy" : t.kind === "err" ? "border-[rgba(224,106,92,.40)] text-sell" : "border-gold-line text-ink"}`}>
          <span className="min-w-0 truncate whitespace-nowrap" title={t.text}>{t.text}</span>
          {t.url && <a href={t.url} target="_blank" rel="noreferrer" className="shrink-0 text-gold-text hover:underline">View tx</a>}
        </div>
      ))}
    </div>
  );
}
