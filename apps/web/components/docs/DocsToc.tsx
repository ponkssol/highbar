"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type TocItem = { id: string; label: string };

/** Table of contents for the docs pages: a sticky list on desktop (lg and up) with the visible section highlighted,
 *  and a collapsible "On this page" panel on smaller screens that closes after a link is picked. */
export function DocsToc({ items, title = "On this page" }: { items: TocItem[]; title?: string }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const details = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const seen = new Map<string, boolean>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) seen.set(e.target.id, e.isIntersecting);
      const first = items.find((i) => seen.get(i.id));
      if (first) setActive(first.id);
    }, { rootMargin: "-12% 0px -70% 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);

  const link = (i: TocItem, mobile: boolean) => {
    const on = active === i.id;
    return (
      <li key={i.id}>
        <a href={`#${i.id}`} aria-current={on ? "true" : undefined}
          onClick={() => { setActive(i.id); if (mobile && details.current) details.current.open = false; }}
          className={on ? "on" : ""}>
          {i.label}
        </a>
      </li>
    );
  };

  return (
    <>
      <details ref={details} data-testid="docs-toc-mobile" className="group rounded-lg border border-border bg-surface lg:hidden">
        <summary className="flex h-11 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
          {title}
          <ChevronDown size={16} strokeWidth={1.5} className="text-ink-3 transition-transform group-open:rotate-180" />
        </summary>
        <ul className="border-t border-border px-2 pb-3 pt-2">{items.map((i) => link(i, true))}</ul>
      </details>
      <nav aria-label={title} data-testid="docs-toc" className="dnav hidden lg:flex">
        <div className="lbl" style={{ marginBottom: 12 }}>{title}</div>
        <ul>{items.map((i) => link(i, false))}</ul>
      </nav>
    </>
  );
}
