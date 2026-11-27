"use client";
import Link from "next/link";
import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { fmtPrice, fmtSol, shortAddr } from "@/lib/format";
import { uiHref } from "@/lib/uiVersion";
import type { TierId } from "@hb/shared";

const TIER_LABEL: Record<string, string> = { standard: "Standard", higher: "Higher", max: "Max" };
export const tierLabel = (tier: string) => TIER_LABEL[tier] ?? tier;

export function Href({ canonical, children, className }: { canonical: string; children: ReactNode; className?: string }) {
  return <Link href={uiHref(canonical)} className={className}>{children}</Link>;
}

export function Btn({ href, children, y, sm, icon = "→", onClick, type = "button" }: {
  href?: string; children: ReactNode; y?: boolean; sm?: boolean; icon?: string; onClick?: () => void; type?: "button" | "submit";
}) {
  const cls = `btn${y ? " y" : ""}${sm ? " sm" : ""}`;
  const inner = <><b>{children}</b><i>{icon}</i></>;
  if (href) return <Link className={cls} href={uiHref(href)}>{inner}</Link>;
  return <button type={type} className={cls} onClick={onClick}>{inner}</button>;
}

export function SolNum({ v, digits = 4 }: { v: number | null | undefined; digits?: number }) {
  if (v == null || !Number.isFinite(v)) return <span className="dim">—</span>;
  return <><i className="sol" />{fmtSol(v, digits)}</>;
}

export function PriceText({ v, prefix = "" }: { v: number; prefix?: string }) {
  const s = fmtPrice(v);
  const m = s.match(/^(-?0\.0)([\u2080-\u2089]+)(\d+)$/);
  if (!m) return <>{prefix}{s}</>;
  const n = [...m[2]].map((ch) => ch.charCodeAt(0) - 0x2080).join("");
  return <>{prefix}{m[1]}<sub>{n}</sub>{m[3]}</>;
}

function art(seed: string) {
  let n = 0;
  for (const ch of seed) n = (n * 31 + ch.charCodeAt(0)) % 9973;
  const h = [44, 36, 28, 50, 18, 58, 24][n % 7];
  return `linear-gradient(135deg, hsl(${h} 55% 18%), hsl(${(h + 24) % 360} 40% 28%))`;
}

export function Avatar({ symbol, image, size }: { symbol: string; image?: string | null; size?: number }) {
  const letters = (symbol || "?").replace(/^\$/, "").slice(0, 2).toUpperCase() || "?";
  const style: CSSProperties = {
    backgroundImage: image ? `url(${image})` : art(symbol || letters),
    ...(size ? { width: size, height: size, fontSize: size > 40 ? 14 : 11 } : {}),
  };
  return <div className="av" style={style} aria-hidden>{image ? "" : letters}</div>;
}

export function Tier({ tier }: { tier: string }) {
  const label = tierLabel(tier);
  return <span className={`tier ${label}`}>{label}</span>;
}

export function TokenCell({ name, symbol, image, href, extra }: { name: string; symbol: string; image?: string | null; href?: string; extra?: string }) {
  const inner = (
    <div className="tk">
      <Avatar symbol={symbol} image={image} />
      <div><b>{name || symbol}</b><small>${symbol}{extra}</small></div>
    </div>
  );
  return href ? <Href canonical={href}>{inner}</Href> : inner;
}

/** Copies header labels onto cells so the ≤700px card layout can show them. */
export function Tw({ children, brk, flat, id, className = "" }: { children: ReactNode; brk?: boolean; flat?: boolean; id?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const tb = ref.current?.querySelector("table");
    const head = tb?.tHead?.rows[0];
    const body = tb?.tBodies[0];
    if (!head || !body) return;
    const hs = [...head.cells];
    for (const tr of body.rows) {
      [...tr.cells].forEach((c, i) => {
        const h = hs[i];
        if (!h || c.colSpan > 1) return;
        c.dataset.l = (h.textContent || "").trim();
        if (h.classList.contains("h-md")) c.classList.add("h-md");
        if (h.classList.contains("h-sm")) c.classList.add("h-sm");
        if (c.querySelector(".tk")) c.classList.add("tkc");
        if (c.querySelector(".rb, .btn")) c.classList.add("act");
      });
    }
  });
  return (
    <div ref={ref} id={id} className={`tw${flat ? " flat" : ""}${brk ? " brk" : ""} ${className}`.trim()}>
      {brk && <><span className="c1" /><span className="c2" /></>}
      {children}
    </div>
  );
}

export function Seg({ children, label }: { children: ReactNode; label: string }) {
  return <div className="tabs seg" role="group" aria-label={label}>{children}</div>;
}

export function EmptyPanel({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <section className="empty brk">
      <span className="c1" /><span className="c2" />
      <div className="eb">
        <h3>{title}</h3>
        <p>{body}</p>
        {action}
      </div>
    </section>
  );
}

export function roman(n: number) {
  const map: [number, string][] = [[100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let s = "", x = Math.max(1, n);
  for (const [v, r] of map) while (x >= v) { s += r; x -= v; }
  return s;
}

export function addr(a?: string | null, n = 4) {
  return a ? shortAddr(a, n) : "—";
}

export function pct(v: number) {
  return `${Math.max(0, Math.min(100, v)).toFixed(v >= 10 ? 0 : 1)}%`;
}

export const TIER_IDS: TierId[] = ["standard", "higher", "max"];
