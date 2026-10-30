import Link from "next/link";
import type { ReactNode } from "react";
import { TopBar } from "@/components/TopBar";
import { DocsToc, type TocItem } from "./DocsToc";

/** Shared pieces of the /docs pages (arena theme): Cinzel only on headings (global h1 to h3), body copy in the sans face,
 *  1px hairline borders and gold as a small accent. */

export function DocsHero({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <section data-testid="docs-hero" className="hb-hero rounded-lg border border-border">
      <div aria-hidden className="hb-stone" />
      <div aria-hidden className="hb-arcade" />
      <div aria-hidden className="hb-hero-veil" />
      <div aria-hidden className="hb-frame" />
      <div className="relative min-w-0 px-5 py-6 md:px-8 md:py-8">
        <div className="hb-eyebrow">{eyebrow}</div>
        <h1 className="mt-2.5 text-xl font-semibold leading-tight md:text-[34px]">{title}</h1>
        {children && <div className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-2 md:text-[15px]">{children}</div>}
      </div>
    </section>
  );
}

/** Page frame: top bar, hero, then a sticky table of contents next to the sections (stacked on small screens). */
export function DocsPage({ hero, toc, children }: { hero: ReactNode; toc: TocItem[]; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 pb-8">
      <TopBar />
      {hero}
      <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-8">
        <div><DocsToc items={toc} /></div>
        <div className="flex min-w-0 flex-col gap-4">{children}</div>
      </div>
    </div>
  );
}

export function DocSection({ id, eyebrow, title, children }: { id: string; eyebrow?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-4 rounded-lg border border-border bg-surface p-5 shadow-card md:p-7">
      {eyebrow && <div className="hb-eyebrow mb-2">{eyebrow}</div>}
      <h2 id={`${id}-title`} className="text-lg font-semibold leading-snug md:text-xl">{title}</h2>
      <div className="mt-3 flex max-w-3xl flex-col gap-3 text-[14px] leading-relaxed text-ink-2 md:text-[15px]">{children}</div>
    </section>
  );
}

export function SubHead({ children }: { children: ReactNode }) {
  return <h3 className="mt-2 text-[15px] font-semibold text-ink">{children}</h3>;
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5"><span aria-hidden className="mt-[9px] h-1 w-1 shrink-0 rotate-45 border border-gold-line" /><span>{it}</span></li>
      ))}
    </ul>
  );
}

export function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span className="font-display mt-px inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border border-gold-line text-[11px] font-semibold text-gold-text">{i + 1}</span>
          <span>{it}</span>
        </li>
      ))}
    </ol>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <div className="rounded-md border border-gold-line bg-gold-soft px-4 py-3 text-[13px] leading-relaxed text-ink-2 md:text-sm">{children}</div>;
}

/** Soft table: hairline row dividers only, numbers in mono. Scrolls sideways on small screens. */
export function DocTable({ head, rows, caption }: { head: ReactNode[]; rows: ReactNode[][]; caption?: string }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className={`w-full text-left text-[13px] ${head.length > 3 ? "min-w-[560px]" : ""}`}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-border bg-muted text-xs text-ink-3">{head.map((h, i) => <th key={i} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {r.map((c, j) => <td key={j} className={`px-3 py-2.5 ${j === 0 ? "font-medium text-ink" : "num text-ink-2"}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return <code className="num rounded-[5px] border border-border bg-muted px-1.5 py-px text-[0.86em] text-ink">{children}</code>;
}

export function CodeBlock({ children, label, wrap = false }: { children: string; label?: string; wrap?: boolean }) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-muted">
      {label && <div className="border-b border-border px-4 py-2 font-mono text-[11px] uppercase tracking-[.16em] text-ink-3">{label}</div>}
      <pre className={`${wrap ? "whitespace-pre-wrap break-all" : "overflow-x-auto"} px-4 py-3 font-mono text-[12.5px] leading-relaxed text-ink`}><code>{children}</code></pre>
    </div>
  );
}

/** Inline link in docs copy: internal paths use next/link, anything else opens in a new tab. */
export function DocLink({ href, children }: { href: string; children: ReactNode }) {
  const cls = "font-medium text-gold-text underline-offset-4 hover:underline";
  return href.startsWith("/") || href.startsWith("#")
    ? <Link href={href} className={cls}>{children}</Link>
    : <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{children}</a>;
}
