import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMeta } from "@/lib/seo";

/** Metadata only for /launch (the launch form itself is owned elsewhere and not changed here). */
export const metadata: Metadata = pageMeta({
  title: "Launch a Solana memecoin",
  description: "Launch a Solana memecoin on a Meteora DBC bonding curve: pick a tier that graduates at 85, 150 or 250 SOL, set the anti-sniper fee and add a Dev Lock.",
  path: "/launch",
  keywords: ["launch a Solana memecoin", "create Solana token", "Meteora DBC", "memecoin launchpad"],
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
