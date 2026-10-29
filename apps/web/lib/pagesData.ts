"use client";
import { useEffect, useState } from "react";
import { apiBase } from "./api";

export type Load<T> = { data: T | null; loading: boolean; error: string | null; live: boolean };

/** Fetch from the API with polling; on failure returns `fallback` (mock) with live=false. */
export function useApiData<T>(path: string | null, fallback: T, ms = 20_000): Load<T> {
  const [st, setSt] = useState<Load<T>>({ data: null, loading: !!path, error: null, live: false });
  useEffect(() => {
    if (!path) { setSt({ data: null, loading: false, error: null, live: false }); return; }
    let alive = true;
    setSt((s) => ({ ...s, loading: true }));
    const run = () => fetch(`${apiBase()}${path}`, { cache: "no-store", signal: AbortSignal.timeout(5000) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => alive && setSt({ data: d as T, loading: false, error: null, live: true }))
      .catch((e) => alive && setSt({ data: fallback, loading: false, error: String(e?.message ?? e), live: false }));
    run();
    const id = setInterval(run, ms);
    return () => { alive = false; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ms]);
  return st;
}