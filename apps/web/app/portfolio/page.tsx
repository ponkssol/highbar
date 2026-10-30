import { Suspense } from "react";
import { PortfolioHub } from "./PortfolioHub";

/** Portfolio + creator fee claims. /claim redirects here with ?tab=claim (next.config.mjs). */
export default function PortfolioPage() {
  return <Suspense fallback={null}><PortfolioHub /></Suspense>;
}
