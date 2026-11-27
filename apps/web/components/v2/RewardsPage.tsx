"use client";
import { useState, type ComponentType } from "react";
import CashbackSection from "@/components/sections/cashback";
import ReferralSection from "@/components/sections/referral";
import MilestonesSection from "@/components/sections/milestones";
import BarSection from "@/components/sections/bar";
import BurnSection from "@/components/sections/burn";

const TABS: { label: string; Component: ComponentType }[] = [
  { label: "Cashback", Component: CashbackSection },
  { label: "Referral", Component: ReferralSection },
  { label: "Milestones", Component: MilestonesSection },
  { label: "$HIGHER perks", Component: BarSection },
  { label: "Burn", Component: BurnSection },
];

const TAB_IDS = ["cashback", "referral", "milestones", "bar", "burn"] as const;

export function V2Rewards({ initial = "cashback" }: { initial?: string }) {
  const [tab, setTab] = useState(Math.max(0, TAB_IDS.indexOf(initial as (typeof TAB_IDS)[number])));
  const Panel = TABS[tab].Component;

  return (
    <div className="frame">
      <div className="phead">
        <div>
          <div className="bul">Rewards</div>
          <h1 className="h1">Trade, refer, climb. <span>Get paid back.</span></h1>
          <p className="muted" style={{ margin: "10px 0 0", maxWidth: "40em" }}>Cashback, referrals, creator milestones, $HIGHER holder perks and the public buyback and burn record.</p>
        </div>
      </div>
      <div className="ttabs">{TABS.map((item, i) => <button type="button" key={item.label} className={tab === i ? "on" : ""} onClick={() => setTab(i)}>{item.label}</button>)}</div>
      <div className="sec"><Panel /></div>
    </div>
  );
}
