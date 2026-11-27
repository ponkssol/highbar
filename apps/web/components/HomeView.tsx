"use client";
import { Suspense } from "react";
import { TopBar } from "@/components/TopBar";
import { KpiGrid } from "@/components/StatsPanel";
import { ActivityGrid } from "@/components/ActivityGrid";
import { TokenTable } from "@/components/TokenTable";
import { LinkButton } from "@/components/ui";
import { StatsSkeleton, TokenTableSkeleton } from "@/components/ui/Skeleton";
import { CornerBrackets, Crosshairs, PlusLink } from "@/components/ui/Jtx";
import { useStats, useTokens } from "@/lib/useApi";
import type { ApiStats, ApiToken } from "@/lib/api";
import { BuiltOnMeteora } from "@/components/BuiltOnMeteora";

/** Hero (JTX look): mono eyebrow, a large light headline with a muted first half, the "+" block CTA and an outlined secondary. */
function HomeHero() {
  return (
    <div data-testid="home-hero" className="relative flex min-w-0 flex-col justify-between gap-8 px-5 py-8 md:px-10 md:py-12">
      <CornerBrackets />
      <div className="hb-label">(00) Solana launchpad &middot; Meteora DBC</div>
      <div>
        <h1 className="max-w-[14ch] text-[40px] !font-light leading-[1.02] tracking-[-0.045em] text-ink md:text-[60px]">
          <span className="text-ink-3">Launch with</span> a higher bar.
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-2">Tiered bonding curves, dev locks and migrations to Meteora DAMM v2.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <PlusLink href="/launch">Launch token</PlusLink>
        <LinkButton href="/leaderboard" variant="secondary">See the leaderboard</LinkButton>
      </div>
    </div>
  );
}

/** Home grid. Server-fetched stats and tokens are the first render (in the initial HTML), then it polls the API as before. */
export function HomeView({ initialStats = null, initialTokens = null, intro }: { initialStats?: ApiStats | null; initialTokens?: { total: number; items: ApiToken[] } | null; intro?: React.ReactNode }) {
  const STATS = useStats(initialStats);
  const { tokens: TOKENS, loading } = useTokens(initialTokens);
  const migratedPct = Math.round(Math.max(0, Math.min(1, STATS.graduatedPct || 0)) * 100);
  return (
    <div className="flex flex-col gap-6">
      <TopBar listControls />
      <section className="relative grid grid-cols-1 border border-border bg-surface lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Crosshairs />
        <HomeHero />
        <div className="flex min-w-0 flex-col border-t border-border bg-panel lg:border-l lg:border-t-0">
          <ActivityGrid bare className="flex-1" />
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border px-3 py-3 md:px-5" data-testid="home-migrated">
            <BuiltOnMeteora />
            <div className="flex min-w-[180px] flex-1 items-center gap-3 sm:max-w-[280px]">
              <span className="hb-label whitespace-nowrap">Migrated</span>
              <span className="relative h-1.5 flex-1 bg-border" aria-hidden><span className="absolute inset-y-0 left-0 bg-gold" style={{ width: `${migratedPct}%` }} /></span>
              <span className="num whitespace-nowrap text-xs text-ink-2" title={`${STATS.graduated} of ${STATS.totalTokens} tokens`}>{migratedPct}% <span className="text-ink-3">({STATS.graduated}/{STATS.totalTokens})</span></span>
            </div>
          </div>
        </div>
      </section>
      {STATS.loading ? <StatsSkeleton row /> : <KpiGrid stats={STATS} row />}
      {loading ? <TokenTableSkeleton /> : <Suspense fallback={<TokenTableSkeleton />}><TokenTable tokens={TOKENS} /></Suspense>}
      {intro}
    </div>
  );
}
