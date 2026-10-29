"use client";
import { useEffect, useState } from "react";
import { Lock, Unlock } from "lucide-react";

function left(sec: number) {
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
}

/** Dev-lock pill with a live countdown; flips to "Dev unlocked" once unlockAt (unix seconds) passes. */
export function DevLockedBadge({ devLocked, unlockAt, size = "sm" }: { devLocked?: boolean; unlockAt?: number | null; size?: "sm" | "md" }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now() / 1000);
    const id = setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => clearInterval(id);
  }, []);
  if (!devLocked || !unlockAt) return null;
  const done = now != null && now >= unlockAt;
  const date = new Date(unlockAt * 1000).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";
  const cls = size === "md" ? "px-2 py-0.5 text-xs" : "px-1.5 text-[10px] leading-4";
  return (
    <span data-testid="dev-locked" title={done ? `Dev tokens unlocked ${date}` : `Dev tokens locked until ${date}`} suppressHydrationWarning
      className={`num inline-flex items-center gap-1 whitespace-nowrap rounded-full border font-medium ${done ? "border-border text-ink-3" : "border-ink text-ink"} ${cls}`}>
      {done ? <Unlock size={size === "md" ? 12 : 10} strokeWidth={2} /> : <Lock size={size === "md" ? 12 : 10} strokeWidth={2} />}
      {done ? "Dev unlocked" : now == null ? "Dev locked" : `Dev locked ${left(unlockAt - now)}`}
    </span>
  );
}