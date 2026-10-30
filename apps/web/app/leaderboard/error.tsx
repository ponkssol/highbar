"use client";
import { useEffect } from "react";
import { Card } from "@/components/ui";
import { Empty } from "@/components/PageStates";

/** Last-resort boundary for /leaderboard: a render error shows an empty state with a retry instead of the app crash screen. */
export default function LeaderboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.warn("leaderboard render error", error?.digest ?? error?.message); }, [error]);
  return (
    <div className="flex flex-col gap-4">
      <Card className="p-0">
        <Empty
          title="Leaderboard unavailable"
          hint="Something went wrong loading this view."
          action={<button type="button" onClick={() => reset()} className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted">Try again</button>}
        />
      </Card>
    </div>
  );
}