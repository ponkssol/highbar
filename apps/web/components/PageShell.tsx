import Link from "next/link";
import type { ReactNode } from "react";
import { CookieSettingsLink } from "./consent";
import { SiteOverlays } from "./SiteOverlays";

/** Page column under the topbar: existing page content, then the mockup footer. Overlays mount after hydration. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="shell-page">
      <div className="shell-content">{children}</div>
      <footer className="dfoot" data-testid="site-footer">
        <Link href="/docs">Docs</Link>
        <a href="/articles">Guides</a>
        <Link href="/docs/api">API</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <CookieSettingsLink />
        <span className="dim mono">highbar · Solana launchpad</span>
      </footer>
      <SiteOverlays />
    </div>
  );
}