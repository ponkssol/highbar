import type { Metadata } from "next";
import { Suspense } from "react";
import { pageMeta } from "@/lib/seo";
import { RewardsHub } from "./RewardsHub";

/** One hub for every earn/reward surface. Old URLs (/cashback, /referral, /milestones, /bar, /burn) redirect here with ?tab= (next.config.mjs). */
// Personal page: not indexed and not in the sitemap.
export const metadata: Metadata = pageMeta({ title: "Rewards", description: "Cashback, referrals, milestones and $HIGHER perks for traders and creators on highbar.", path: "/rewards", noindex: true });

export default function RewardsPage() {
  return <Suspense fallback={null}><RewardsHub /></Suspense>;
}
