import Link from "next/link";
import type { ReactNode } from "react";

/** Arena theme pieces (Colosseum look, kept restrained): Cinzel headings, EB Garamond intros, mono labels, hairlines, gold only as an accent. Art and textures are self-made, see public/theme/CREDITS.md. */

const ROMAN: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
export function toRoman(n: number) {
  let out = "";
  for (const [v, s] of ROMAN) while (n >= v) { out += s; n -= v; }
  return out || "–";
}

const MEDAL = ["border-gold-line bg-gold-soft text-gold-text", "border-border text-silver", "border-border text-bronze"];
/** Rank badge with Roman numerals (Cinzel). Top 3 get a thin gold, silver or bronze accent, no fills or glows. i is 0-based. */
export function RomanRank({ i }: { i: number }) {
  return (
    <span aria-label={`Rank ${i + 1}`} title={`#${i + 1}`}
      className={`font-display inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-1.5 text-[12px] font-semibold leading-none tracking-wide ${MEDAL[i] ?? "border-transparent bg-control text-ink-2"}`}>
      {toRoman(i + 1)}
    </span>
  );
}

/** Section ornament: a 1px hairline that fades out at both ends, with a small hollow diamond in the middle. */
export function HairlineDivider({ className = "" }: { className?: string }) {
  return (
    <div role="separator" aria-hidden className={`flex items-center gap-2.5 ${className}`}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-border-strong" />
      <span className="h-1.5 w-1.5 rotate-45 border border-gold-line" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-border-strong" />
    </div>
  );
}

function Banner({ eyebrow, title, children, testid }: { eyebrow: string; title: ReactNode; children?: ReactNode; testid: string }) {
  return (
    <section data-testid={testid} className="hb-hero rounded-lg border border-border">
      <div aria-hidden className="hb-stone" />
      <div aria-hidden className="hb-arcade" />
      <div aria-hidden className="hb-hero-veil" />
      <div aria-hidden className="hb-frame" />
      <div className="relative min-w-0 px-5 py-6 md:px-8 md:py-8">
        <div className="hb-eyebrow">{eyebrow}</div>
        {title}
        {children}
      </div>
    </section>
  );
}

/** Dashboard hero strip: arena title over a faint line-art Colosseum arcade. */
export function ArenaBanner() {
  return (
    <Banner testid="arena-banner" eyebrow="The arena on Solana"
      title={<h1 className="mt-2.5 text-xl font-semibold leading-tight md:text-[34px]">Enter the Arena</h1>}>
      <p className="mt-2 max-w-xl font-serif text-[15px] leading-snug text-ink-2 md:text-[17px]">Launch with a higher bar: tiered curves, dev locks and migrations. <Link href="/leaderboard" className="whitespace-nowrap font-medium text-gold-text underline-offset-4 hover:underline">See the champions</Link></p>
    </Banner>
  );
}

/** Leaderboard header: "Champions" in Cinzel, no ornaments. */
export function ChampionsHeader({ children }: { children?: ReactNode }) {
  return (
    <Banner testid="champions-header" eyebrow="Leaderboard"
      title={<h1 className="mt-2.5 text-xl font-semibold leading-tight md:text-[34px]">Champions</h1>}>
      {children}
    </Banner>
  );
}
