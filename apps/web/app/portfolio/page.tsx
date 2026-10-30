import type { Metadata } from "next";
import { Suspense } from "react";
import { pageMeta } from "@/lib/seo";
import { PortfolioHub } from "./PortfolioHub";

/** Portfolio + creator fee claims. /claim redirects here with ?tab=claim (next.config.mjs). */
// Personal page: not indexed and not in the sitemap.
export const metadata: Metadata = pageMeta({ title: "Portfolio", description: "Your highbar holdings, trades and creator fee claims on Solana.", path: "/portfolio", noindex: true });

export default function PortfolioPage() {
  return <Suspense fallback={null}><PortfolioHub /></Suspense>;
}
