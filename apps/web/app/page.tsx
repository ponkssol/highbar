"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { TopBlock } from "@/components/TopBar";
import { BarChart, TickGauge } from "@/components/charts";
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
        <div className="mt-4 grid grid-cols-1 items-end gap-10 lg:grid-cols-[1.3fr_auto_1fr]">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">New tokens per day</h2>
              <div className="flex items-center gap-4 text-xs text-ink-3">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-ink" />Launched</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] border border-ink bg-hatch" />Graduated</span>
              </div>
            </div>
            <BarChart data={STATS.newPerDay.map((d) => ({ label: d.day, a: d.tokens, b: d.graduated }))} />
          </div>
          <div className="flex justify-center">
            <TickGauge value={STATS.graduatedPct} label="Graduated" sub={`${STATS.graduated} / ${STATS.totalTokens} tokens`} />
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <BigStat value={STATS.totalVolumeSol.toLocaleString("en-US", { maximumFractionDigits: 0 })} unit="SOL" label="Total volume" delta={STATS.volumeDelta} href="/" />
            <BigStat value={STATS.creatorFeesSol.toFixed(1)} unit="SOL" label="Fees to creators" delta={STATS.creatorDelta} href="/leaderboard" />
            <BigStat value={`${(STATS.barBurned / 1e6).toFixed(2)}M`} label="$BAR burned" delta={STATS.burnDelta} href="/burn" badge={<BurnBadge />} />
          </div>
        </div>
      </TopBlock>
      <TokenTable tokens={TOKENS} search={search} />
    </div>
  );
}