import Link from "next/link";
import type { ReactNode } from "react";
import { CookieSettingsLink } from "./consent";
import { SiteOverlays } from "./SiteOverlays";

/** Shared page container: every page (header/search row + content) inherits the same max-width and horizontal padding, plus the soft footer with the legal links and the client-only overlays (welcome, cookie card). Used once in app/layout.tsx. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1600px]">
      {children}
      {/* Soft site footer on every page. */}
      <footer data-testid="site-footer" className="mt-12 border-t border-border pb-2 pt-5 text-[13px] text-ink-3">
        <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link href="/docs" className="transition-colors hover:text-ink">Docs</Link>
          <Link href="/v2" className="transition-colors hover:text-ink">New UI</Link>
          <a href="/articles" className="transition-colors hover:text-ink">Guides</a>
          <Link href="/solana-launchpad" className="transition-colors hover:text-ink">Solana launchpad</Link>
          <Link href="/terms" className="transition-colors hover:text-ink">Terms and Conditions</Link>
          <Link href="/privacy" className="transition-colors hover:text-ink">Privacy Policy</Link>
          <CookieSettingsLink className="transition-colors hover:text-ink" />
        </nav>
      </footer>
      {/* Renders nothing on the server. Welcome modal and cookie card mount after hydration. */}
      <SiteOverlays />
    </div>
  );
}