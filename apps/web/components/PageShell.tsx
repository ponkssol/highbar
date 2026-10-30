import Link from "next/link";
import type { ReactNode } from "react";

/** Shared page container: every page (header/search row + content) inherits the same max-width and horizontal padding, plus the soft footer with the Terms link. Used once in app/layout.tsx. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1600px]">
      {children}
      {/* Soft site footer on every page. */}
      <footer data-testid="site-footer" className="mt-12 flex items-center justify-center border-t border-border pb-2 pt-5 text-xs text-ink-3">
        <Link href="/terms" className="hover:text-ink">Terms and Conditions</Link>
      </footer>
    </div>
  );
}