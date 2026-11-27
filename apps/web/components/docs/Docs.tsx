import Link from "next/link";
import { isListedPath } from "@/lib/articles";
import { TableScroll } from "../ui/Scroll";
import type { ReactNode } from "react";
import { DocsToc, type TocItem } from "./DocsToc";

/** Shared pieces of the /docs pages (arena theme): Cinzel only on headings (global h1 to h3), body copy in the sans face,
 *  1px hairline borders and gold as a small accent. */

export function DocsHero({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div data-testid="docs-hero" className="phead">
      <div>
        <div className="bul">{eyebrow}</div>
        <h1 className="h1">{title}</h1>
        {children && <div className="muted" style={{ margin: "10px 0 0", maxWidth: "46em" }}>{children}</div>}
      </div>
    </div>
  );
}

/** Page frame: top bar, hero, then a sticky table of contents next to the sections (stacked on small screens). */
export function DocsPage({ hero, toc, children }: { hero: ReactNode; toc: TocItem[]; children: ReactNode }) {
  return (
    <div className="jtx">
      {hero}
      <div className="dg">
        <DocsToc items={toc} />
        <article className="dbody">{children}</article>
        <aside className="dtoc" aria-label="On this page"><div className="lbl">On this page</div></aside>
      </div>
    </div>
  );
}

export function DocSection({ id, eyebrow, title, children }: { id: string; eyebrow?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-4">
      {eyebrow && <div className="lbl">{eyebrow}</div>}
      <h2 id={`${id}-title`}>{title}</h2>
      <div>{children}</div>
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

/** Soft table: hairline row dividers only, numbers in mono. Wide tables scroll sideways on small screens with the first column pinned and an edge fade.
 *  `transpose` swaps rows and columns below sm (for a one-row table with many columns). */
export function DocTable({ head, rows, caption, transpose = false }: { head: ReactNode[]; rows: ReactNode[][]; caption?: string; transpose?: boolean }) {
  const table = (
    <TableScroll sticky={head.length > 3} label={caption}>
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
    </TableScroll>
  );
  if (!transpose) return <div className="overflow-hidden rounded-md border border-border">{table}</div>;
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="hidden sm:block">{table}</div>
      <table className="w-full text-left text-[13px] sm:hidden">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-border bg-muted text-xs text-ink-3"><th scope="col" className="px-3 py-2.5 font-medium">{head[0]}</th>{rows.map((r, i) => <th key={i} scope="col" className="px-3 py-2.5 text-right font-medium">{r[0]}</th>)}</tr>
        </thead>
        <tbody>
          {head.slice(1).map((h, j) => (
            <tr key={j} className="border-b border-border last:border-0">
              <th scope="row" className="px-3 py-2.5 font-medium text-ink">{h}</th>
              {rows.map((r, i) => <td key={i} className="num px-3 py-2.5 text-right text-ink-2">{r[j + 1]}</td>)}
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
  // An article that is not public yet must not be linked, so the URL stays out of the page.
  if (href.startsWith("/articles/") && !isListedPath(href.split("#")[0])) return <span>{children}</span>;
  return href.startsWith("/") || href.startsWith("#")
    ? <Link href={href} className={cls}>{children}</Link>
    : <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{children}</a>;
}
