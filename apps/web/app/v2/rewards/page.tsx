import type { Metadata } from "next";
import { V2Rewards } from "@/components/v2/RewardsPage";

export const metadata: Metadata = { title: "Rewards", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const tab = (await searchParams).tab || "cashback";
  return <V2Rewards initial={tab} />;
}
