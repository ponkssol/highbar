import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMeta } from "@/lib/seo";

/** Metadata for the client-rendered locks list (the lock detail page sets its own). */
export const metadata: Metadata = pageMeta({
  title: "Dev token locks",
  description: "Every creator Dev Lock on highbar: tokens locked with Jupiter Lock, the share of supply and the unlock date. A Solana launchpad built on Meteora.",
  path: "/locks",
  keywords: ["Dev Lock", "Jupiter Lock", "Solana token lock", "locked dev tokens"],
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
