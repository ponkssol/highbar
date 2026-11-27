"use client";
import { HubTabs } from "@/components/HubTabs";
import OverviewSection from "@/components/sections/portfolio";
import ClaimSection from "@/components/sections/claim";

export function PortfolioHub() {
  return (
    <HubTabs title="Portfolio" headline={<>Your wallet <span style={{ fontSize: ".5em" }}>⧉</span></>}
      tabs={[
        { id: "overview", label: "Overview", component: OverviewSection },
        { id: "claim", label: "Claim fees", component: ClaimSection },
      ]} />
  );
}
