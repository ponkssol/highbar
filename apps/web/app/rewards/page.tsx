import { Suspense } from "react";
import { RewardsHub } from "./RewardsHub";

/** One hub for every earn/reward surface. Old URLs (/cashback, /referral, /milestones, /bar, /burn) redirect here with ?tab= (next.config.mjs). */
export default function RewardsPage() {
  return <Suspense fallback={null}><RewardsHub /></Suspense>;
}
