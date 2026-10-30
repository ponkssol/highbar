"use client";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { ListControls } from "./ListControls";
import { WalletButton } from "./WalletButton";
import { useInHub } from "./HubTabs";

/** listControls: show the token-list Sort by / Filters popovers (home page only; they drive the URL query). */
export function TopBar({ search, onSearch, listControls = false }: { search?: string; onSearch?: (v: string) => void; listControls?: boolean }) {
  // Mobile: the row is hidden behind the header search icon (hb-search event); md+ always shows it.
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const t = () => setOpen((o) => { const n = !o; if (n) setTimeout(() => document.querySelector<HTMLInputElement>("[data-hb-search]")?.focus(), 0); return n; });
    window.addEventListener("hb-search", t);
    return () => window.removeEventListener("hb-search", t);
  }, []);
  return (
    <div data-testid="topbar" className={`${open ? "flex" : "hidden"} items-center gap-3 md:flex md:h-header`}>
      <label className="flex h-11 w-full items-center gap-2 md:h-10 md:max-w-sm rounded-full border border-border bg-surface px-4 text-sm text-ink-3">
        <Search size={16} strokeWidth={1.5} />
        <input value={search} onChange={(e) => onSearch?.(e.target.value)} data-hb-search placeholder="Search token, ticker or mint"
          className="w-full bg-transparent text-ink outline-none placeholder:text-ink-3" />
      </label>
      <div className="ml-auto hidden items-center gap-2 md:flex">
        {listControls && <div className="max-lg:hidden"><Suspense fallback={null}><ListControls /></Suspense></div>}
        <WalletButton size="lg" />
        <Link href="/launch" className="inline-flex h-10 items-center gap-2 rounded bg-ink px-4 text-sm font-medium text-on-ink hover:opacity-90">
          <Plus size={16} /><span>Launch<span className="max-lg:hidden"> token</span></span>
        </Link>
      </div>
    </div>
  );
}

/** Page header: search row + title + optional content. No horizontal inset, so it lines up with page cards. */
export function TopBlock({ title, children, search, onSearch }: { title?: string; children?: ReactNode; search?: string; onSearch?: (v: string) => void }) {
  // Inside a tabbed hub the hub owns the search row + title; the section keeps only its intro/controls.
  if (useInHub()) return children ? <section className="pb-1 [&>p:first-child]:mt-0 [&>div:first-child]:mt-0 [&>form:first-child]:mt-0">{children}</section> : null;
  return (
    <section className="pb-2">
      <TopBar search={search} onSearch={onSearch} />
      {title && <h1 className="mt-0 text-xl md:mt-2 md:text-2xl font-semibold tracking-tight">{title}</h1>}
      {children}
    </section>
  );
}