"use client";
import { useEffect, useState } from "react";
import { api, statsView, toRow, type ApiStats, type ApiTrade } from "./api";
import { TOKENS, type TokenRow } from "./mock";

function usePoll<T>(load: () => Promise<T>, ms: number, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const run = () => load().then((d) => { if (alive) { setData(d); setError(null); } }).catch((e) => alive && setError(String(e?.message ?? e)));
    run();
    const id = setInterval(run, ms);
    return () => { alive = false; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, error };
}

/** Home table: live tokens from API; mock rows if the API is unreachable. */
export function useTokens(): { tokens: TokenRow[]; live: boolean } {
  const { data, error } = usePoll(() => api.tokens({ limit: 200 }), 15_000);
  if (data) return { tokens: data.items.map(toRow), live: true };
  return { tokens: error ? TOKENS : [], live: false };
}

export function useStats() {
  const { data, error } = usePoll<ApiStats>(() => api.stats(), 30_000);
  void error;
  return statsView(data ?? null);
}

export function useTrades(mint: string) {
  const { data } = usePoll<ApiTrade[]>(() => api.trades(mint), 10_000, [mint]);
  return data;
}