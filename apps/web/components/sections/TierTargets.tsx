"use client";
import { TIERS, migrationMcapSol, thresholdSolFor } from "@hb/shared";
import { NETWORK } from "@/lib/settings";
import { feeSplitPct, postMigrationPct } from "@/lib/fees";

const sol = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

/** Tier migration targets for the runtime NETWORK (client component: NETWORK is set by <Providers> from the server env). */
export function TierTargets() {
  return (
    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
      {Object.values(TIERS).map((t) => (
        <div key={t.id} className="rounded border border-border px-3 py-2">
          <div className="text-sm font-medium">{t.label}</div>
          <div className="num text-xs text-ink-3">Migrates at {thresholdSolFor(t.id, NETWORK)} SOL (~{sol(migrationMcapSol(t.id, NETWORK))} SOL mcap)</div>
          <div className="num text-xs text-ink-3">Creator {feeSplitPct(t.id).creator}% on the curve, {postMigrationPct(t.id).creator}% after migration</div>
        </div>
      ))}
    </div>
  );
}
