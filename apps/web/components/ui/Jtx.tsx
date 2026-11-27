import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/** JTX look pieces: "+" crosshairs at section corners, corner brackets on the hero, numbered mono labels and the
 *  primary block button with its attached square "+" box. Styles live in app/globals.css (.hb-cross, .hb-bracket, .hb-label). */

const CORNER = { tl: "-left-[5px] -top-[5px]", tr: "-right-[5px] -top-[5px]", bl: "-bottom-[5px] -left-[5px]", br: "-bottom-[5px] -right-[5px]" } as const;
type Corner = keyof typeof CORNER;

/** Small "+" markers sitting on the corners of the nearest positioned parent (give it `relative`). */
export function Crosshairs({ corners = ["tl", "tr", "bl", "br"] }: { corners?: Corner[] }) {
  return <>{corners.map((c) => <span key={c} aria-hidden className={`hb-cross ${CORNER[c]}`} />)}</>;
}

const BRACKET: Record<Corner, string> = {
  tl: "left-2 top-2 border-l border-t",
  tr: "right-2 top-2 border-r border-t",
  bl: "bottom-2 left-2 border-b border-l",
  br: "bottom-2 right-2 border-b border-r",
};
/** Four L-shaped corner marks just inside the parent's edges (hero panel). */
export function CornerBrackets() {
  return <>{(Object.keys(BRACKET) as Corner[]).map((c) => <span key={c} aria-hidden className={`hb-bracket ${BRACKET[c]}`} />)}</>;
}

/** "(01) TOTAL VOLUME" style label. */
export function IndexLabel({ n, children, className = "" }: { n?: number; children: ReactNode; className?: string }) {
  return <span className={`hb-label ${className}`}>{n != null && <span className="mr-1.5">({String(n).padStart(2, "0")})</span>}{children}</span>;
}

function PlusBox() {
  return (
    <span aria-hidden className={`flex aspect-square h-full items-center justify-center border-l border-[color-mix(in_srgb,currentColor_22%,transparent)]`}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.25"><path d="M6 0v12M0 6h12" /></svg>
    </span>
  );
}

const PLUS_BASE = "hb-press group inline-flex items-stretch whitespace-nowrap text-sm font-medium transition-[filter,opacity] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40";
const PLUS_TONE = { gold: "bg-gold text-gold-ink", ink: "bg-ink text-on-ink" } as const;
const PLUS_H = { md: "h-10", lg: "h-12" } as const;

/** Primary CTA: a solid block with an attached square "+" box on the right. */
export function PlusLink({ href, children, tone = "gold", size = "md", className = "" }: { href: string; children: ReactNode; tone?: "gold" | "ink"; size?: "md" | "lg"; className?: string }) {
  return (
    <Link href={href} className={`${PLUS_BASE} ${PLUS_TONE[tone]} ${PLUS_H[size]} ${className}`}>
      <span className="flex items-center px-4">{children}</span>
      <PlusBox />
    </Link>
  );
}
export function PlusButton({ children, tone = "gold", size = "md", className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "gold" | "ink"; size?: "md" | "lg" }) {
  return (
    <button {...p} className={`${PLUS_BASE} ${PLUS_TONE[tone]} ${PLUS_H[size]} ${className}`}>
      <span className="flex flex-1 items-center justify-center px-4">{children}</span>
      <PlusBox />
    </button>
  );
}
