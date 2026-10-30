import { Gauge } from "lucide-react";

/** Higher Bar score pill (0-100). "Higher Bar" (>= 70) is inverted ink, the rest are muted. */
export function ScoreBadge({ score, size = "sm" }: { score?: number | null; size?: "sm" | "md" }) {
  if (score == null) return null;
  const top = score >= 70;
  const cls = size === "md" ? "h-5 px-2 text-[11px]" : "h-[18px] px-1.5 text-[10px]";
  return (
    <span data-testid="score-badge" title={`highbar score ${score}/100 (tier, anti-sniper, dev lock, holder spread)`}
      className={`num inline-flex items-center gap-1 whitespace-nowrap rounded-full font-medium leading-none ${top ? "bg-ink text-on-ink" : "bg-[color-mix(in_srgb,var(--hb-ink)_8%,transparent)] text-ink-2"} ${cls}`}>
      <Gauge size={size === "md" ? 12 : 10} strokeWidth={2} />HB {score}
    </span>
  );
}
