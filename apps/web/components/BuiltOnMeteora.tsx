/** "Built on Meteora" mark above the Migrated gauge on the home page. Official Meteora full logo from their brand kit
 *  (github.com/MeteoraAg/brand-kit, meteora-v2/full-logo, linked from docs.meteora.ag brand kit page), stored locally in public/brand/partners.
 *  meteora-logo-light.svg = full-logo-positive (light ink, dark theme), meteora-logo-dark.svg = full-logo-negative (dark ink, light theme). */
export function BuiltOnMeteora() {
  return (
    <a href="https://meteora.ag" target="_blank" rel="noopener noreferrer" data-testid="built-on-meteora"
      className="group inline-flex items-center gap-2 rounded-full px-2.5 py-1 opacity-70 hover:bg-control hover:opacity-100 focus-visible:opacity-100">
      <span className="num text-[10px] font-medium uppercase tracking-[0.2em] text-ink-3">Built on</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/partners/meteora-logo-light.svg" alt="Meteora" width={74} height={17} className="hidden h-[15px] w-auto dark:block" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/partners/meteora-logo-dark.svg" alt="Meteora" width={74} height={17} className="h-[15px] w-auto dark:hidden" />
    </a>
  );
}
