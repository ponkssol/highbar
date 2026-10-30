"use client";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { TickGauge } from "@/components/charts";
import { KpiGrid } from "@/components/StatsPanel";
import { ActivityGrid } from "@/components/ActivityGrid";
import { TokenTable } from "@/components/TokenTable";
import { BurnBadge } from "@/components/ui";
import { StatsSkeleton, TokenTableSkeleton } from "@/components/ui/Skeleton";
import { useStats, useTokens } from "@/lib/useApi";
import type { ApiStats, ApiToken } from "@/lib/api";
import { ArenaBanner, HairlineDivider } from "@/components/arena";
import { BuiltOnMeteora } from "@/components/BuiltOnMeteora";

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

/** Home grid. Server-fetched stats and tokens are the first render (in the initial HTML), then it polls the API as before. */
export function HomeView({ initialStats = null, initialTokens = null, intro }: { initialStats?: ApiStats | null; initialTokens?: { total: number; items: ApiToken[] } | null; intro?: React.ReactNode }) {
  const STATS = useStats(initialStats);
  const { tokens: TOKENS, loading } = useTokens(initialTokens);
  return (
    <div className="flex flex-col gap-4">
      <TopBar listControls />
      <ArenaBanner />
      <section className="grid grid-cols-1 overflow-hidden rounded-lg border border-border bg-surface shadow-card max-lg:divide-y max-lg:divide-border lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:divide-x lg:divide-border">
        <ActivityGrid bare />
        <div className="flex flex-col items-center justify-center gap-3 p-5 lg:px-8">
          <BuiltOnMeteora />
          <TickGauge value={STATS.graduatedPct} label="Migrated" sub={`${STATS.graduated} of ${STATS.totalTokens} tokens`} />
        </div>
        {STATS.loading ? <StatsSkeleton bare /> : <KpiGrid stats={STATS} bare />}
      </section>
      <HairlineDivider className="my-1" />
      {loading ? <TokenTableSkeleton /> : <Suspense fallback={<TokenTableSkeleton />}><TokenTable tokens={TOKENS} /></Suspense>}
      {intro}
    </div>
  );
}