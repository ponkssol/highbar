"use client";
import { Search } from "lucide-react";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { ListControls } from "./ListControls";
import { WalletButton } from "./WalletButton";
import { useInHub } from "./HubTabs";
import { prefetchSearch } from "./search/SearchLauncher";
import { PlusLink } from "./ui/Jtx";

/** listControls: show the token-list Sort by / Filters popovers (home page only; they drive the URL query). */
export function TopBar({ listControls = false }: { listControls?: boolean }) {
  // The search box opens the search modal (components/search, loaded on first use). Mobile has no row here: the header search icon opens the same modal.
  const [keys, setKeys] = useState("");
  useEffect(() => setKeys(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘K" : "Ctrl K"), []);
  return (
    <div data-testid="topbar" className="hidden items-center gap-3 md:flex md:h-header">
      <button type="button" data-hb-search aria-haspopup="dialog" aria-label="Search for coins and users" onClick={() => window.dispatchEvent(new Event("hb-search"))}
        onPointerEnter={prefetchSearch} onFocus={prefetchSearch}
        className="flex h-10 w-full max-w-sm items-center gap-2 px-3.5 text-left text-sm text-ink-3 hb-ctrl hover:text-ink-2 focus-visible:border-gold-line focus-visible:outline-none">
        <Search size={16} strokeWidth={1.5} aria-hidden />
        <span className="min-w-0 flex-1 truncate">Search for coins and users…</span>
        {keys && <kbd className="num shrink-0 border border-border px-1.5 py-0.5 text-[10.5px] text-ink-3" aria-hidden>{keys}</kbd>}
      </button>
      <div className="ml-auto hidden items-center gap-2 md:flex">
        {listControls && <div className="max-lg:hidden"><Suspense fallback={null}><ListControls /></Suspense></div>}
        <WalletButton size="lg" />
        <PlusLink href="/launch">Launch<span className="max-lg:hidden">&nbsp;token</span></PlusLink>
      </div>
    </div>
  );
}

/** Page header: search row + title + optional content. No horizontal inset, so it lines up with page cards. */
export function TopBlock({ title, children }: { title?: string; children?: ReactNode }) {
  // Inside a tabbed hub the hub owns the search row + title; the section keeps only its intro/controls.
  if (useInHub()) return children ? <section className="pb-1 [&>p:first-child]:mt-0 [&>div:first-child]:mt-0 [&>form:first-child]:mt-0">{children}</section> : null;
  return (
    <section className="pb-2">
      <TopBar />
      {title && <h1 className="mt-0 text-2xl md:mt-2 md:text-[34px] md:leading-tight">{title}</h1>}
      {children}
    </section>
  );
}