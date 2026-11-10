import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GuidesSection } from "@/components/seo/GuidesSection";
import { GUIDE_PICKS } from "@/lib/guidePicks";
import { pageMeta } from "@/lib/seo";

/** Metadata for /launch, plus a server-rendered guides list under the form. The form itself is unchanged. */
export const metadata: Metadata = pageMeta({
  title: "Launch a Solana memecoin",
  description: "Launch a Solana memecoin on a Meteora DBC bonding curve: pick a tier that graduates at 85, 150 or 250 SOL, set the anti-sniper fee and add a Dev Lock.",
  path: "/launch",
  keywords: ["launch a Solana memecoin", "create Solana token", "Meteora DBC", "memecoin launchpad"],
});

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <GuidesSection id="launch-guides" slugs={GUIDE_PICKS.launch} />
    </>
  );
}
