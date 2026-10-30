"use client";
/** Open Book building blocks: provenance chips, null-safe numbers, Solscan links and section heads. Soft gold, hairline borders. */
import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { shortAddr } from "@/lib/format";
import { solscanUrl, type SolscanKind } from "@/lib/solscan";
import { num } from "@/lib/openbook";

/** Muted placeholder for a value the API does not have. Never a 0. */
export function Nil({ title = "Not available" }: { title?: string }) {
  return <span className="text-ink-3 opacity-60" aria-label={title} title={title}>—</span>;
}

const trimZeros = (s: string, minDp: number) => {
  const [i, d = ""] = s.split(".");
  let dd = d.replace(/0+$/, "");
  if (dd.length < minDp) dd = d.slice(0, Math.max(minDp, dd.length)).padEnd(minDp, "0");
  return dd ? `${i}.${dd}` : i;
};
/** SOL with 4 decimals, more for dust so 0.00001 never reads as 0.0000. Always a leading zero, en-US grouping. */
export function fmtSolOb(v: number, dp = 4): string {
  const a = Math.abs(v);
  if (a === 0) return (0).toFixed(dp);
  if (a >= 1000) return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (a >= 10 ** -dp) return v.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const extra = Math.min(12, Math.ceil(-Math.log10(a)) + 1);
  return trimZeros(v.toFixed(extra), dp);
}
export const fmtNum = (v: number, dp = 0) => v.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
export function fmtPct(v: number, dp = 2) {
  const a = Math.abs(v);
  if (a > 0 && a < 10 ** -dp) return `${v < 0 ? "-" : ""}<${(10 ** -dp).toFixed(dp)}%`;
  return `${v.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}%`;
}
export const fmtTokens = (v: number) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toLocaleString("en-US", { maximumFractionDigits: 2 })}M` : Math.abs(v) >= 1e3 ? `${(v / 1e3).toLocaleString("en-US", { maximumFractionDigits: 1 })}k` : v.toLocaleString("en-US", { maximumFractionDigits: 2 }));
export const fmtOffsetMs = (ms: number) => (ms < 1000 ? `${Math.round(ms)}ms` : ms < 60e3 ? `${(ms / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}s` : ms < 3600e3 ? `${Math.floor(ms / 60e3)}m ${Math.round((ms % 60e3) / 1000)}s` : `${Math.floor(ms / 3600e3)}h ${Math.round((ms % 3600e3) / 60e3)}m`);

/** Solscan link with an external-link glyph. Null id renders the muted placeholder. */
export function Scan({ kind, id, net, children, className = "", icon = true, title }: { kind: SolscanKind; id: string | number | null | undefined; net?: string | null; children?: ReactNode; className?: string; icon?: boolean; title?: string }) {
  if (id == null || id === "") return <>{children ?? <Nil />}</>;
  const label = kind === "block" ? `View slot ${id} on Solscan` : kind === "tx" ? "View transaction on Solscan" : kind === "token" ? "View token on Solscan" : "View account on Solscan";
  return (
    <a href={solscanUrl(kind, id, net)} target="_blank" rel="noopener noreferrer" title={title ?? label} aria-label={typeof children === "string" ? `${children}, ${label}` : label}
      className={`group/scan inline-flex items-center gap-1 underline-offset-2 hover:text-gold-text hover:underline decoration-gold-line ${className}`}>
      {children}
      {icon && <ExternalLink size={11} strokeWidth={1.6} aria-hidden className="shrink-0 text-ink-3 opacity-60 group-hover/scan:text-gold-text group-hover/scan:opacity-100" />}
    </a>
  );
}
/** Short address or signature linked to Solscan. */
export function Addr({ a, kind = "account", net, n = 4, label, className = "" }: { a: string | null | undefined; kind?: SolscanKind; net?: string | null; n?: number; label?: string | null; className?: string }) {
  if (!a) return <Nil />;
  return <Scan kind={kind} id={a} net={net} className={`num ${className}`} title={a}>{label || shortAddr(a, n)}</Scan>;
}

/** SOL amount. `link` makes the number itself a Solscan link (tx or account). */
export function Sol({ v, dp = 4, unit = true, className = "", link, net }: { v: unknown; dp?: number; unit?: boolean; className?: string; link?: { kind: SolscanKind; id: string | null | undefined } | null; net?: string | null }) {
  const n = num(v);
  if (n == null) return <Nil />;
  const body = <span className={`num whitespace-nowrap ${className}`}>{fmtSolOb(n, dp)}{unit && <span className="ml-1 text-[0.82em] text-ink-3">SOL</span>}</span>;
  return link?.id ? <Scan kind={link.kind} id={link.id} net={net}>{body}</Scan> : body;
}
export function Pct({ v, dp = 2, className = "" }: { v: unknown; dp?: number; className?: string }) {
  const n = num(v);
  return n == null ? <Nil /> : <span className={`num whitespace-nowrap ${className}`}>{fmtPct(n, dp)}</span>;
}

/** Provenance from the API: exact (read from transaction meta) or derived (computed from pool config). */
export function Prov({ p, className = "" }: { p: string | null | undefined; className?: string }) {
  if (!p) return null;
  const exact = p === "exact", derived = p === "derived";
  const tip = exact ? "Exact, read from transaction meta" : derived ? "Derived, computed from pool config and indexed trades" : p;
  return (
    <span title={tip} data-prov={p} style={derived ? tint("var(--hb-burn)") : undefined}
      className={`num inline-flex h-[18px] shrink-0 items-center rounded-full border px-1.5 text-[10px] font-medium lowercase leading-none tracking-wide ${exact ? "border-gold-line bg-gold-soft text-gold-text" : derived ? "" : "border-border text-ink-3"}`}>
      {p}
    </span>
  );
}

/** Soft tint of a theme color: 10% fill, 30% hairline, full-strength text. Tailwind cannot add alpha to var() colors, so inline. */
export const mix = (c: string, p: number) => `color-mix(in srgb, ${c} ${p}%, transparent)`;
export const tint = (c: string) => ({ color: c, background: mix(c, 10), borderColor: mix(c, 30) });
export type Tone = "gold" | "ok" | "bad" | "warn" | "muted" | "blue";
const TONE_VAR: Partial<Record<Tone, string>> = { ok: "var(--hb-buy)", bad: "var(--hb-sell)", warn: "var(--hb-burn)", blue: "var(--hb-tier-standard)" };
export function Chip({ tone = "muted", children, className = "", title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  const v = TONE_VAR[tone];
  return <span title={title} style={v ? tint(v) : undefined} className={`inline-flex h-[22px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 text-[11px] font-medium leading-none ${tone === "gold" ? "border-gold-line bg-gold-soft text-gold-text" : tone === "muted" ? "border-border bg-control text-ink-2" : ""} ${className}`}>{children}</span>;
}
export function NewBadge({ className = "" }: { className?: string }) {
  return <span className={`num inline-flex h-4 items-center rounded-[4px] border border-gold-line bg-gold-soft px-1 text-[9px] font-semibold uppercase leading-none tracking-[.12em] text-gold-text ${className}`}>New</span>;
}

/** Section head: small gold-outlined letter, serif title, muted subtitle, optional right slot. */
export function SecHead({ letter, title, sub, right, id, as: H = "h2" }: { letter?: string; title: string; sub?: ReactNode; right?: ReactNode; id?: string; as?: "h2" | "h3" }) {
  return (
    <div className="mb-3 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {letter && <span aria-hidden className="num inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] border border-gold-line px-1 text-[10.5px] text-gold-text">{letter}</span>}
      <H id={id} className="font-serif text-[21px] font-medium leading-tight tracking-normal text-ink md:text-[22px]">{title}</H>
      {sub && <p className="min-w-0 text-[12.5px] text-ink-3">{sub}</p>}
      {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
    </div>
  );
}
export function Panel({ children, className = "", gold = false }: { children: ReactNode; className?: string; gold?: boolean }) {
  return (
    <div className={`min-w-0 rounded-lg border shadow-card ${gold ? "border-gold-line bg-[linear-gradient(180deg,var(--hb-gold-soft),var(--hb-surface)_70%)]" : "border-border bg-surface"} ${className}`}>{children}</div>
  );
}
export function Lbl({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex items-center gap-1.5 text-[11.5px] text-ink-3 ${className}`}>{children}</div>;
}
export function Big({ children }: { children: ReactNode }) {
  return <div className="num mt-1.5 text-[26px] font-medium leading-none tracking-[-0.02em] text-ink md:text-[28px]">{children}</div>;
}
export const Unit = ({ children = "SOL" }: { children?: ReactNode }) => <small className="ml-1.5 text-[12px] font-normal tracking-normal text-ink-3">{children}</small>;
export function KV({ k, v, sub, className = "" }: { k: ReactNode; v: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={`flex items-start justify-between gap-3 text-[12.5px] ${className}`}>
      <div className="min-w-0 text-ink-2">{k}{sub && <div className="mt-0.5 text-[11px] text-ink-3">{sub}</div>}</div>
      <div className="flex shrink-0 items-center gap-1.5 text-right text-ink">{v}</div>
    </div>
  );
}
export const Sq = ({ c, className = "" }: { c: string; className?: string }) => <span aria-hidden className={`inline-block h-2 w-2 shrink-0 rounded-[2px] ${className}`} style={{ background: c }} />;
export const TH = "px-3 py-2.5 text-left text-[11px] font-normal text-ink-3 whitespace-nowrap";
export const TD = "px-3 py-2.5 align-middle whitespace-nowrap";

export const COLORS = { gold: "var(--hb-gold)", silver: "var(--hb-silver)", bronze: "var(--hb-bronze)", blue: "var(--hb-act-graduate)", violet: "var(--hb-tier-max)", burn: "var(--hb-burn)", green: "var(--hb-tier-higher)", muted: "var(--hb-ink-3)" };
export const RECIPIENT_COLOR: Record<string, string> = { meteora: COLORS.silver, creator: COLORS.gold, platform: COLORS.bronze, referral: COLORS.blue };
export const BUCKET_COLOR: Record<string, string> = { buyback: COLORS.burn, ops: COLORS.silver, treasury: COLORS.green };
export const FEE_COLOR: Record<string, string> = { dbc: COLORS.gold, tips: COLORS.blue, priority: COLORS.violet, base: COLORS.silver };
const PROV_COLORS = [COLORS.gold, COLORS.bronze, COLORS.blue, COLORS.violet, COLORS.green, COLORS.silver];
export const providerColor = (i: number) => PROV_COLORS[i % PROV_COLORS.length];
