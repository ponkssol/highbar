"use client";
import Link from "next/link";
import { Search } from "lucide-react";
import { WalletButton } from "./WalletButton";
import { Logo } from "./Logo";

/** Mobile-only (<768px) 48px top bar: mark left, search icon + compact wallet pill right. */
export function MobileHeader() {
  return (
    <header data-testid="mobile-header" className="sticky top-0 z-30 -mx-[14px] -mt-[14px] mb-2.5 flex h-[48px] items-center gap-1 whitespace-nowrap border-b border-border bg-surface px-[14px] md:hidden">
      <Link href="/" className="flex min-w-0 items-center gap-1.5" aria-label="highbar home">
        <Logo height={24} />
      </Link>
      <button type="button" aria-label="Search" onClick={() => window.dispatchEvent(new Event("hb-search"))}
        className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-muted">
        <Search size={18} strokeWidth={1.75} />
      </button>
      <WalletButton compact />
    </header>
  );
}