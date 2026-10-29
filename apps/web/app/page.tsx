"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { TopBlock } from "@/components/TopBar";
import { TickGauge } from "@/components/charts";
import { KpiGrid } from "@/components/StatsPanel";
import { ActivityGrid } from "@/components/ActivityGrid";
import { TokenTable } from "@/components/TokenTable";
import { BurnBadge } from "@/components/ui";
import { STATS, TOKENS } from "@/lib/mock";

function BigStat({ value, unit, label, delta, href, badge }: { value: string; unit?: string; label: string; delta: number; href: string; badge?: React.ReactNode }) {
  return (
    <Link href={href} className="group block">
      <div className="flex items-baseline gap-1.5">
        <span className="num text-kpi">{value}</span>
        {unit && <span className="text-sm text-ink-3">{unit}</span>}
      </div>
      <div className="mt-1 flex items-center gap-2 text-[13px] text-ink-2">
        {label}
        <ArrowUpRight size={14} strokeWidth={1.5} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        {badge}
      </div>
      <div className={`num mt-1 text-xs ${delta >= 0 ? "text-buy" : "text-sell"}`}>{delta >= 0 ? "+" : ""}{delta}% 7d</div>
    </Link>
  );
}

export default function Home() {
  const [search, setSearch] = useState("");
  return (
    <div className="flex flex-col gap-4">
      <TopBlock search={search} onSearch={setSearch}>
        <div className="mt-4 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2 xl:grid-cols-[5fr_2.4fr_4.6fr]">
          <ActivityGrid className="h-full lg:col-span-2 xl:col-span-1" />
          <div className="flex h-full items-center justify-center rounded-lg border border-border bg-surface p-5">
            <TickGauge value={STATS.graduatedPct} label="Graduated" sub={`${STATS.graduated} / ${STATS.totalTokens} tokens`} />
          </div>
          <KpiGrid stats={STATS} className="h-full" />
        </div>
      </TopBlock>
      <TokenTable tokens={TOKENS} search={search} />
    </div>
  );
}