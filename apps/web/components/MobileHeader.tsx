"use client";
import Link from "next/link";
import { Search } from "lucide-react";
import { WalletButton } from "./WalletButton";

/** Mobile-only (<768px) top bar: logo left, search + wallet pill right. Search toggles the page search row (hb-search event). */
export function MobileHeader() {
  return (
    <header data-testid="mobile-header" className="sticky top-0 z-30 -mx-4 -mt-4 mb-3 flex h-14 items-center gap-2 border-b border-border bg-surface px-4 md:hidden">
      <Link href="/" className="flex items-center gap-2" aria-label="Higher Bar home">
        <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-ink text-sm font-semibold text-on-ink">HB</span>
        <span className="font-semibold tracking-tight">Higher Bar</span>
      </Link>
      <button type="button" aria-label="Search" onClick={() => window.dispatchEvent(new Event("hb-search"))}
        className="ml-auto flex h-11 w-11 items-center justify-center rounded-full text-ink-2 hover:bg-muted">
        <Search size={22} strokeWidth={1.5} />
      </button>
      <div className="[&_button]:h-11 [&_button]:rounded-full [&_a]:h-11 [&_a]:rounded-full"><WalletButton /></div>
    </header>
  );
}