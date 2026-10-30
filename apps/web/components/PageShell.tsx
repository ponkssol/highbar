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
      <footer data-testid="site-footer" className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-border pb-2 pt-5 text-xs text-ink-3">
        <Link href="/terms" className="hover:text-ink">Terms and Conditions</Link>
        <Link href="/privacy" className="hover:text-ink">Privacy Policy</Link>
        <CookieSettingsLink className="hover:text-ink" />
      </footer>
      {/* Renders nothing on the server. Welcome modal and cookie card mount after hydration. */}
      <SiteOverlays />
    </div>
  );
}