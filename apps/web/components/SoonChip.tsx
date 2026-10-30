/** Muted gold "Soon" chip, the same look as the Soon badge on /docs/api. Used where a payout amount is not final yet. */
export function SoonChip({ className = "", label = "Soon" }: { className?: string; label?: string }) {
  return (
    <span data-testid="soon-chip" className={`num inline-flex h-6 items-center rounded-full border border-gold-line bg-gold-soft px-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-gold-text ${className}`}>{label}</span>
  );
}
