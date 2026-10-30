"use client";
import { TIERS, thresholdSolFor } from "@hb/shared";
import { NETWORK } from "@/lib/settings";

/** Tier migration targets for the runtime NETWORK (client component: NETWORK is set by <Providers> from the server env). */
export function TierTargets() {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      {Object.values(TIERS).map((t) => (
        <div key={t.id} className="rounded border border-border px-3 py-2">
          <div className="text-sm font-medium">{t.label}</div>
          <div className="num text-xs text-ink-3">{thresholdSolFor(t.id, NETWORK)} SOL</div>
        </div>
      ))}
    </div>
  );
}
