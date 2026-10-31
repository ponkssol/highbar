"use client";
import { useState, type ReactNode } from "react";
import { Button, Input } from "@/components/ui";
import { InfoTip } from "@/components/InfoTip";

const ADDR = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** Wallet address lookup used by the rewards sections, so data shows without connecting a wallet. */
export function WalletLookup({ onLookup, placeholder = "Wallet address", className = "" }: { onLookup: (addr: string) => void; placeholder?: string; className?: string }) {
  const [draft, setDraft] = useState("");
  const valid = ADDR.test(draft.trim());
  return (
    <form className={`mt-4 flex max-w-xl gap-2 ${className}`} onSubmit={(e) => { e.preventDefault(); if (valid) onLookup(draft.trim()); }}>
      <Input aria-label="Wallet address" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} spellCheck={false} autoComplete="off" className="num flex-1" />
      <Button type="submit" variant="secondary" disabled={!valid}>Look up</Button>
    </form>
  );
}

/** Section intro: one short line stays visible, the longer explanation moves into the info icon next to it. */
export function Intro({ children, more, label = "More details" }: { children: ReactNode; more?: ReactNode; label?: string }) {
  return (
    <p className="mt-2 flex max-w-xl items-start gap-1.5 text-sm text-ink-2">
      <span>{children}</span>
      {more && <InfoTip label={label} className="mt-0.5" width={300}>{more}</InfoTip>}
    </p>
  );
}
