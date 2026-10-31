import type { ReactNode } from "react";
import { SolanaMark } from "./SolanaMark";

/** A SOL amount: the Solana mark in front of the number and an sr-only " SOL" for screen readers. Pass the formatted number only. */
export function SolAmt({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[0.25em] whitespace-nowrap ${className}`}>
      <SolanaMark />{children}<span className="sr-only"> SOL</span>
    </span>
  );
}

/** Header or unit label for SOL values: the mark in front of the text. With no text, an sr-only "SOL" keeps the label for screen readers. */
export function SolHead({ children }: { children?: ReactNode }) {
  return <span className="inline-flex items-center gap-[0.3em] whitespace-nowrap"><SolanaMark />{children ?? <span className="sr-only">SOL</span>}</span>;
}
