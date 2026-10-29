"use client";
import Link from "next/link";
import { ArrowUpDown, Plus, Search, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./ui";
import { WalletButton } from "./WalletButton";

export function TopBar({ search, onSearch }: { search?: string; onSearch?: (v: string) => void }) {
  return (
    <div className="flex h-header items-center gap-3">
      <label className="flex h-10 w-full max-w-sm items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm text-ink-3">
        <Search size={16} strokeWidth={1.5} />
        <input value={search} onChange={(e) => onSearch?.(e.target.value)} placeholder="Search token, ticker or mint"
          className="w-full bg-transparent text-ink outline-none placeholder:text-ink-3" />
      </label>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="secondary"><ArrowUpDown size={16} strokeWidth={1.5} />Sort by</Button>
        <Button variant="secondary"><SlidersHorizontal size={16} strokeWidth={1.5} />Filters</Button>
        <WalletButton />
        <Link href="/launch" className="inline-flex h-10 items-center gap-2 rounded bg-ink px-4 text-sm font-medium text-on-ink hover:opacity-90">
          <Plus size={16} />Launch token
        </Link>
      </div>
    </div>
  );
}

/** Page header: search row + title + optional content. No horizontal inset, so it lines up with page cards. */
export function TopBlock({ title, children, search, onSearch }: { title?: string; children?: ReactNode; search?: string; onSearch?: (v: string) => void }) {
  return (
    <section className="pb-2">
      <TopBar search={search} onSearch={onSearch} />
      {title && <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>}
      {children}
    </section>
  );
}