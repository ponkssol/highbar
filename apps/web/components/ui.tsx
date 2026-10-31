import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { TIERS, type TierId } from "@hb/shared";
import { fmtPrice } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "gold";
type Size = "sm" | "md" | "lg";
const VAR: Record<Variant, string> = {
  primary: "bg-ink text-on-ink hover:opacity-90 border border-ink",
  secondary: "hb-ctrl text-ink",
  ghost: "bg-transparent text-ink hover:bg-muted",
  gold: "bg-gold text-gold-ink border border-gold hover:opacity-90",
};
/** Control heights: sm 32px, md 40px (default), lg 48px. One radius (12px) and one weight (500) for every button. */
const SIZE: Record<Size, string> = { sm: "h-8 px-3 text-[13px]", md: "h-10 px-4 text-sm", lg: "h-12 px-5 text-sm" };
const BASE = "hb-press inline-flex items-center justify-center gap-2 rounded font-medium transition-opacity duration-150 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap";
export const buttonClass = (variant: Variant = "primary", size: Size = "md") => `${BASE} ${SIZE[size]} ${VAR[variant]}`;

export function Button({ variant = "primary", size = "md", className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button {...p} className={`${buttonClass(variant, size)} ${className}`} />;
}
export function LinkButton({ href, variant = "primary", size = "md", className = "", children }: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode }) {
  return <Link href={href} className={`${buttonClass(variant, size)} ${className}`}>{children}</Link>;
}

/** Text input: sm 32px, md 40px. Thin border that darkens on focus. */
export const inputClass = (size: Size = "md") =>
  `${size === "sm" ? "h-8 text-[13px]" : "h-10 text-sm"} w-full min-w-0 rounded border border-border bg-surface px-3 outline-none placeholder:text-ink-3 focus:border-ink`;
export function Input({ size = "md", className = "", ...p }: Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & { size?: Size }) {
  return <input {...p} className={`${inputClass(size)} ${className}`} />;
}

/** The one empty-value placeholder (em dash). */
export const NA = "\u2014";

export function Card({ children, className = "", highlight = false }: { children: ReactNode; className?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border shadow-card ${/(^|\s)p[xy]?-/.test(className) ? "" : "p-4 md:p-5"} ${highlight ? "bg-ink text-on-ink border-ink" : "bg-surface border-border"} ${className}`}>
      {children}
    </div>
  );
}

/** Active state for soft controls (gold tint); pair with a soft control or `border border-transparent`. */
export const CTRL_ON = "hb-ctrl-on";

export const TIER_COLOR: Record<TierId, string> = { standard: "bg-tier-standard", higher: "bg-tier-higher", max: "bg-tier-max" };

export function TierDot({ tier }: { tier: TierId }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${TIER_COLOR[tier]}`} />;
}
export function TierBadge({ tier }: { tier: TierId }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs text-ink">
      <TierDot tier={tier} />
      {TIERS[tier]?.label ?? String(tier ?? "")}
    </span>
  );
}

export function ProgressBar({ value, tier }: { value: number; tier?: TierId }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="relative h-1.5 w-full rounded-full bg-border">
      <div className="h-1.5 rounded-full bg-gold" style={{ width: `${pct}%` }} />
      {tier === "max" && pct > 0 && (
        <span className={`absolute top-1/2 h-2 w-2 -translate-y-1/2 -translate-x-1/2 rounded-full ring-2 ring-surface ${TIER_COLOR.max}`} style={{ left: `${pct}%` }} />
      )}
    </div>
  );
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const shades = ["var(--hb-ink)", "var(--hb-ink-2)", "var(--hb-ink-3)", "var(--hb-border-strong)"];
  const i = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % shades.length;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full text-xs font-semibold"
      style={{ width: size, height: size, background: shades[i], color: i === 3 ? "var(--hb-ink)" : "var(--hb-on-ink)" /* on-ink on ink-3 keeps 4.5:1 in both themes */ }}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function BurnBadge({ children = "burn" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-ink-2">
      <span className="h-1.5 w-1.5 rounded-full bg-burn" />
      {children}
    </span>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="text-[13px] text-ink-3">{children}</div>;
}
/** Price with a real subscript zero count (0.0<sub>7</sub>2535) so it stays legible in any font. */
export function Price({ v, prefix = "" }: { v: number; prefix?: string }) {
  const s = fmtPrice(v);
  const m = s.match(/^(-?0\.0)([\u2080-\u2089]+)(\d+)$/);
  if (!m) return <>{prefix}{s}</>;
  const n = [...m[2]].map((ch) => ch.charCodeAt(0) - 0x2080).join("");
  return <span title={`${prefix}${v.toFixed(Math.min(20, n.length + 12)).replace(/0+$/, "")}`}>{prefix}{m[1]}<sub className="mx-[1px] align-[-0.2em] text-[0.72em] font-semibold leading-none md:text-[0.7em]">{n}</sub>{m[3]}</span>;
}