"use client";
import { HubTabs } from "@/components/HubTabs";
import CashbackSection from "@/components/sections/cashback";
import ReferralSection from "@/components/sections/referral";
import MilestonesSection from "@/components/sections/milestones";
import BarSection from "@/components/sections/bar";
import BurnSection from "@/components/sections/burn";

export function RewardsHub() {
  return (
    <HubTabs title="Rewards" intro="Cashback, referrals, creator milestones, $BAR holder perks and the public buyback & burn record."
      tabs={[
        { id: "cashback", label: "Cashback", component: CashbackSection },
        { id: "referral", label: "Referral", component: ReferralSection },
        { id: "milestones", label: "Milestones", component: MilestonesSection },
        { id: "bar", label: "$BAR perks", component: BarSection },
        { id: "burn", label: "Burn", component: BurnSection },
      ]} />
  );
}
