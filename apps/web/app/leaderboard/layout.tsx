import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageMeta } from "@/lib/seo";

/** Metadata for the client-rendered leaderboard page. */
export const metadata: Metadata = pageMeta({
  title: "Leaderboard: top Solana memecoins",
  description: "Top tokens, creators and traders on highbar, the Solana token launchpad built on Meteora, ranked by volume, market cap and score.",
  path: "/leaderboard",
  keywords: ["Solana memecoin leaderboard", "top Solana tokens", "top memecoin creators"],
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
