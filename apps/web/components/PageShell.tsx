import type { ReactNode } from "react";

/** Shared page container: every page (header/search row + content) inherits the same max-width and horizontal padding. Used once in app/layout.tsx. */
export function PageShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[1600px]">{children}</div>;
}