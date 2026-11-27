import type { ReactNode } from "react";

/** The new shell is chosen in the root layout from the URL. This layout only groups the preview routes. */
export default function V2Layout({ children }: { children: ReactNode }) {
  return children;
}
