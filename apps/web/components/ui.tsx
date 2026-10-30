import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { TIERS, type TierId } from "@hb/shared";
import { fmtPrice } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost";
const VAR: Record<Variant, string> = {
  primary: "bg-ink text-on-ink hover:opacity-90 border border-ink",
  secondary: "hb-ctrl text-ink",
  ghost: "bg-transparent text-ink hover:bg-muted",
};
const BASE = "inline-flex items-center justify-center gap-2 h-10 px-4 rounded text-sm font-medium transition-opacity duration-150 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap";

export function Button({ variant = "primary", className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button {...p} className={`${BASE} ${VAR[variant]} ${className}`} />;
}
export function LinkButton({ href, variant = "primary", className = "", children }: { href: string; variant?: Variant; className?: string; children: ReactNode }) {
  return <Link href={href} className={`${BASE} ${VAR[variant]} ${className}`}>{children}</Link>;
}

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
      style={{ width: size, height: size, background: shades[i], color: i > 1 ? "var(--hb-ink)" : "var(--hb-on-ink)" }}
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
  return <span title={`${prefix}${v.toFixed(Math.min(20, n.length + 12)).replace(/0+$/, "")}`}>{prefix}{m[1]}<sub className="mx-[1px] align-[-0.25em] text-[0.62em] leading-none">{n}</sub>{m[3]}</span>;
}