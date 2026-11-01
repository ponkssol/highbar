/** Quiet "Built on" credit for the sidebar footer and the mobile More sheet. Official Meteora full logo from github.com/MeteoraAg/brand-kit
 *  (same files as BuiltOnMeteora on the home page, public/brand/partners): meteora-logo-light.svg on the dark theme, meteora-logo-dark.svg on light.
 *  Colors are left as shipped, only the link opacity changes on hover. Sizes are px, not rem, so they hold on mobile where the root font
 *  is smaller, and the image has a fixed size, so no layout shift. */
const LINK =
  "inline-flex shrink-0 items-center rounded-[3px] opacity-60 transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-line";

export function BuiltOnRow({ className = "" }: { className?: string }) {
  return (
    <div data-testid="built-on-row" className={`flex items-center gap-[10px] ${className}`}>
      <span className="text-[10px] font-medium uppercase leading-none tracking-[0.18em] text-ink-3">Built on</span>
      <a href="https://www.meteora.ag" target="_blank" rel="noopener noreferrer" aria-label="Meteora, opens in a new tab" className={LINK}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/partners/meteora-logo-light.svg" alt="" width={69} height={16} className="hidden h-[16px] w-[69px] dark:block" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/partners/meteora-logo-dark.svg" alt="" width={69} height={16} className="h-[16px] w-[69px] dark:hidden" />
      </a>
    </div>
  );
}
