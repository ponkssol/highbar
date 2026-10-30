"use client";
import { useApiData } from "@/lib/pagesData";
import { ScoreBadge } from "./ScoreBadge";

type Breakdown = { tier: number; antiSniper: number; devLock: number; spread: number; holders: number; top10Pct: number; lockedPct: number; lockDaysLeft: number; label: string };
type Resp = { score: number | null; label: string | null; breakdown: Breakdown | null; max: { tier: number; antiSniper: number; devLock: number; spread: number }; updatedAt: number | null };

/** Higher Bar score with its four parts (GET /tokens/:mint/score). */
export function ScoreCard({ mint }: { mint: string }) {
  const { data } = useApiData<Resp | null>(`/tokens/${mint}/score`, null, 60_000);
  if (!data || data.score == null || !data.breakdown) return null;
  const b = data.breakdown, m = data.max;
  const parts: [string, number, number, string][] = [
    ["Tier", b.tier, m.tier, ""],
    ["Anti-sniper", b.antiSniper, m.antiSniper, b.antiSniper ? "on" : "off"],
    ["Dev lock", b.devLock, m.devLock, b.lockedPct ? `${b.lockedPct}% for ${Math.round(b.lockDaysLeft)}d` : "none"],
    ["Holder spread", b.spread, m.spread, `${b.holders} holders, top 10 ${b.top10Pct}%`],
  ];
  return (
    <div data-testid="score-card" className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">highbar score</h3>
        <ScoreBadge score={data.score} size="md" />
      </div>
      <div className="num mb-3 flex items-baseline gap-2"><span className="text-kpi">{data.score}</span><span className="text-sm text-ink-3">/ 100 · {data.label}</span></div>
      <dl className="flex flex-col gap-2.5 text-sm">
        {parts.map(([k, v, max, note]) => (
          <div key={k}>
            <div className="flex justify-between"><dt className="text-ink-3">{k}{note && <span className="ml-1.5 text-xs">({note})</span>}</dt><dd className="num">{v} / {max}</dd></div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-border"><div className="h-1.5 rounded-full bg-ink" style={{ width: `${max ? (v / max) * 100 : 0}%` }} /></div>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-ink-3">Holders are counted from bonding-curve trades. Updated every few minutes.</p>
    </div>
  );
}
