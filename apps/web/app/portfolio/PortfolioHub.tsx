"use client";
import { HubTabs } from "@/components/HubTabs";
import OverviewSection from "@/components/sections/portfolio";
import ClaimSection from "@/components/sections/claim";

export function PortfolioHub() {
  return (
    <HubTabs title="Portfolio"
      tabs={[
        { id: "overview", label: "Overview", component: OverviewSection },
        { id: "claim", label: "Claim fees", component: ClaimSection },
      ]} />
  );
}
