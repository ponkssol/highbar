"use client";
import { useEffect, useRef, useState } from "react";

export type ActivityType = "launch" | "burn" | "graduate" | "trade";
export interface ActivityEvent { id: string; type: ActivityType; mint: string; symbol: string; ts: number; amount?: number; side?: "buy" | "sell" }

const ENDPOINT = "/hb-api/activity";
/** One square of the live grid. */
export const BUCKET_MS = 10_000;
/** Poll and clock interval: one timer drives both, so a square never waits more than this for its events. */
export const TICK_MS = 5_000;
/** Events older than this are dropped (comfortably more than the widest grid). */
const KEEP_MS = 90 * 60_000;
const SYMS = ["PEPE2", "MOON", "PAWS", "HOWL", "SOLX", "FROG", "ZAP", "LUNA", "GIGA", "WAGMI", "DOGE9", "RAY"];
let seq = 0;

function mockEvent(ts = Date.now()): ActivityEvent {
  const r = Math.random();
  const type: ActivityType = r < 0.12 ? "launch" : r < 0.2 ? "burn" : r < 0.24 ? "graduate" : "trade";
  const symbol = SYMS[Math.floor(Math.random() * SYMS.length)];
  return { id: `mock-${ts}-${seq++}`, type, mint: `Mock${symbol}${seq}`, symbol, ts, amount: type === "burn" ? Math.round(Math.random() * 50000) : undefined };
}
/** Demo history for the last hour: roughly every other 10 s square has something. */
function seedMock(now: number): ActivityEvent[] {
  const out: ActivityEvent[] = [];
  for (let t = now - 60 * 60_000; t < now; t += BUCKET_MS) if (Math.random() < 0.45) out.push(mockEvent(t + Math.floor(Math.random() * BUCKET_MS)));
  return out;
}

/** Live protocol activity, oldest first, plus `now` (advanced on the same timer).
 *  Polls same-origin /hb-api/activity every TICK_MS (first call asks for the last KEEP_MS, then ?since=), pauses while the tab is hidden
 *  and catches up on return. Falls back to a local demo generator when the endpoint is unavailable. */
export function useActivity() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [source, setSource] = useState<"api" | "mock">("mock");
  const [now, setNow] = useState(0);
  const fresh = useRef<Set<string>>(new Set());

  useEffect(() => {
    let alive = true, busy = false, timer: ReturnType<typeof setTimeout> | undefined, lastTs = 0, initial = true, mode: "probe" | "api" | "mock" = "probe";

    const merge = (list: ActivityEvent[]) => {
      if (!alive) return;
      const first = initial;
      initial = false;
      setEvents((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        const add = list.filter((e) => e && e.id && typeof e.ts === "number" && !seen.has(e.id));
        const cut = Date.now() - KEEP_MS;
        if (!add.length && (!prev.length || prev[0].ts >= cut)) return prev;
        if (!first) add.forEach((e) => fresh.current.add(e.id));
        return [...prev, ...add].filter((e) => e.ts >= cut).sort((a, b) => a.ts - b.ts);
      });
    };

    const fetchOnce = async () => {
      const since = lastTs || Date.now() - KEEP_MS;
      const res = await fetch(`${ENDPOINT}?since=${since}&limit=${lastTs ? 200 : 500}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const j = await res.json();
      const list: ActivityEvent[] = Array.isArray(j) ? j : j.events ?? j.items ?? [];
      for (const e of list) if (e?.ts > lastTs) lastTs = e.ts;
      merge(list);
    };

    const tick = async () => {
      timer = undefined;
      if (!alive || busy) return;
      busy = true;
      setNow(Date.now());
      if (mode === "probe") {
        try { await fetchOnce(); mode = "api"; if (alive) setSource("api"); }
        catch { mode = "mock"; if (alive) { setSource("mock"); merge(seedMock(Date.now())); } }
      } else if (mode === "api") await fetchOnce().catch(() => {});
      else if (Math.random() < 0.7) merge([mockEvent()]);
      busy = false;
      if (alive && !document.hidden) timer = setTimeout(tick, TICK_MS - (Date.now() % TICK_MS) + 20); // aligned, so squares turn over on time
    };
    const onVis = () => { if (document.hidden) { if (timer) clearTimeout(timer); timer = undefined; } else if (!timer && !busy) void tick(); };

    void tick();
    document.addEventListener("visibilitychange", onVis);
    return () => { alive = false; if (timer) clearTimeout(timer); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  return { events, source, now, isFresh: (id: string) => fresh.current.has(id) };
}
