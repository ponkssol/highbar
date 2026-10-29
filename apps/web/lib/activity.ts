"use client";
import { useEffect, useRef, useState } from "react";

export type ActivityType = "launch" | "burn" | "graduate" | "trade";
export interface ActivityEvent { id: string; type: ActivityType; mint: string; symbol: string; ts: number; amount?: number }

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const MAX = 200;
const SYMS = ["PEPE2", "MOON", "BARK", "HIGH", "SOLX", "FROG", "ZAP", "LUNA", "GIGA", "WAGMI", "DOGE9", "RAY"];
let seq = 0;

function mockEvent(ts = Date.now()): ActivityEvent {
  const r = Math.random();
  const type: ActivityType = r < 0.35 ? "launch" : r < 0.6 ? "burn" : r < 0.68 ? "graduate" : "trade";
  const symbol = SYMS[Math.floor(Math.random() * SYMS.length)];
  return { id: `mock-${ts}-${seq++}`, type, mint: `Mock${symbol}${seq}`, symbol, ts, amount: type === "burn" ? Math.round(Math.random() * 50000) : undefined };
}

function seedMock(): ActivityEvent[] {
  const now = Date.now();
  return Array.from({ length: 90 }, (_, i) => mockEvent(now - (90 - i) * 45_000));
}

/** Live protocol activity, oldest first. Tries GET /activity (then SSE /activity/stream, else 3s polling); falls back to a mock generator. */
export function useActivity() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [source, setSource] = useState<"api" | "mock">("mock");
  const fresh = useRef<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    let poll: ReturnType<typeof setInterval> | undefined;
    let mock: ReturnType<typeof setTimeout> | undefined;
    let es: EventSource | undefined;
    let initial = true;

    const merge = (list: ActivityEvent[]) => {
      if (!alive) return;
      const first = initial;
      initial = false;
      setEvents((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        const add = list.filter((e) => e && e.id && !seen.has(e.id));
        if (!add.length) return prev;
        if (!first) add.forEach((e) => fresh.current.add(e.id));
        return [...prev, ...add].sort((a, b) => a.ts - b.ts).slice(-MAX);
      });
    };

    const startMock = () => {
      if (!alive) return;
      setSource("mock");
      merge(seedMock());
      const tick = () => { merge([mockEvent()]); mock = setTimeout(tick, 1500 + Math.random() * 3000); };
      mock = setTimeout(tick, 1500);
    };

    const fetchOnce = async () => {
      const res = await fetch(`${API_URL}/activity`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const j = await res.json();
      const list: ActivityEvent[] = Array.isArray(j) ? j : j.events ?? j.items ?? [];
      merge(list);
    };

    (async () => {
      try {
        await fetchOnce();
        if (!alive) return;
        setSource("api");
        try {
          es = new EventSource(`${API_URL}/activity/stream`);
          es.onmessage = (m) => { try { const d = JSON.parse(m.data); merge(Array.isArray(d) ? d : [d]); } catch {} };
          es.onerror = () => { es?.close(); es = undefined; if (!poll) poll = setInterval(() => fetchOnce().catch(() => {}), 3000); };
        } catch {
          poll = setInterval(() => fetchOnce().catch(() => {}), 3000);
        }
      } catch {
        startMock();
      }
    })();

    return () => { alive = false; if (poll) clearInterval(poll); if (mock) clearTimeout(mock); es?.close(); };
  }, []);

  return { events, source, isFresh: (id: string) => fresh.current.has(id) };
}