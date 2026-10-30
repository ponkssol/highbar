import { REWARD_PERIOD_MS } from "@hb/shared";

export interface Period { id: string; start: number; end: number }
const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** UTC day period: "yesterday" (default, last closed day) | "today" (still open: preview only) | "YYYY-MM-DD". */
export function period(spec = "yesterday", now = Date.now()): Period {
  const today = Math.floor(now / REWARD_PERIOD_MS) * REWARD_PERIOD_MS;
  let start: number;
  if (spec === "today") start = today;
  else if (spec === "yesterday") start = today - REWARD_PERIOD_MS;
  else {
    start = Date.parse(`${spec}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(spec) || !Number.isFinite(start) || fmt(start) !== spec) throw new Error(`bad period "${spec}" (use yesterday | today | YYYY-MM-DD)`);
  }
  return { id: fmt(start), start, end: start + REWARD_PERIOD_MS };
}
export const isClosed = (p: Period, now = Date.now()) => p.end <= now;
