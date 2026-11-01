import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { fmtSol } from "../../lib/format";

export const SEG_TRACK = "relative inline-flex w-max items-center gap-0.5 rounded-full border border-seg-line bg-seg p-1";
export const SEG_ITEM = "relative z-[1] inline-flex h-8 items-center justify-center whitespace-nowrap rounded-full px-3.5 text-[13px] leading-none transition-colors duration-200";

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
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6.75" stroke="currentColor" strokeWidth="1" opacity=".8" /><circle cx="8" cy="5" r=".85" fill="currentColor" /><path d="M8 7.1v4.2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" /></svg>
      </button>
      {open && <span id={id} role="tooltip" className={`absolute top-[calc(100%+8px)] z-30 w-60 rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-left text-[12px] font-normal normal-case leading-relaxed tracking-normal text-ink-2 shadow-xl ${pos}`}>{text}</span>}
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
  return <div className={`mb-2 flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.22em] text-gold-text ${className}`}>{children}</div>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-border bg-surface p-4 ${className}`}>{children}</section>;
}

type BtnKind = "gold" | "ghost" | "danger";
export function Button({ kind = "ghost", className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: BtnKind }) {
  const k = kind === "gold" ? "bg-gold text-gold-ink hover:brightness-105 font-semibold" : kind === "danger" ? "border border-[rgba(224,106,92,.40)] text-sell hover:bg-[rgba(224,106,92,.10)]" : "border border-border text-ink-2 hover:bg-control-hover hover:text-ink";
  return <button type="button" {...p} className={`inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-[13px] transition disabled:cursor-not-allowed disabled:opacity-50 ${k} ${className}`} />;
}

export const INPUT = "w-full rounded-[10px] border border-border bg-control px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-3 focus:border-gold-line focus:bg-control-hover";

export function Field({ label, tip, children, hint }: { label: ReactNode; tip?: ReactNode; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <Eyebrow>{label}{tip && <InfoTip text={tip} />}</Eyebrow>
      {children}
      {hint && <div className="mt-1.5 text-[12px] text-ink-3">{hint}</div>}
    </label>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative h-5 w-[34px] shrink-0 rounded-full transition ${on ? "bg-gold" : "bg-border-strong"}`}>
      <span className={`absolute top-[3px] h-3.5 w-3.5 rounded-full transition ${on ? "left-[17px] bg-gold-ink" : "left-[3px] bg-ink-2"}`} />
    </button>
  );
}

export function Note({ kind = "info", children }: { kind?: "info" | "warn" | "error" | "ok"; children: ReactNode }) {
  const c = kind === "warn" ? "border-gold-line bg-gold-soft text-ink-2" : kind === "error" ? "border-[rgba(224,106,92,.40)] bg-[rgba(224,106,92,.10)] text-sell" : kind === "ok" ? "border-[rgba(76,182,122,.40)] bg-[rgba(76,182,122,.10)] text-buy" : "border-border bg-muted text-ink-2";
  return <div role={kind === "error" ? "alert" : undefined} className={`rounded-[10px] border px-3 py-2 text-[12.5px] leading-relaxed ${c}`}>{children}</div>;
}

export function Copy({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(t.current), []);
  return <button type="button" className="text-[12px] text-gold-text hover:underline" onClick={() => { void navigator.clipboard.writeText(text); setDone(true); clearTimeout(t.current); t.current = setTimeout(() => setDone(false), 1400); }}>{done ? "Copied" : label}</button>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-border-strong px-4 py-8 text-center"><div className="font-display text-[15px] text-ink">{title}</div>{children && <div className="mt-1.5 text-[12.5px] text-ink-3">{children}</div>}</div>;
}

export function TierDot({ tier }: { tier: string }) {
  const c = tier === "higher" ? "bg-tier-higher" : tier === "max" ? "bg-tier-max" : "bg-tier-standard";
  return <span className={`inline-block h-[7px] w-[7px] rounded-full ${c}`} />;
}

export function errText(e: unknown) { return e instanceof Error ? e.message : String(e); }
