"use client";
import { useEffect, useState } from "react";
import { apiBase } from "./api";

export type Load<T> = { data: T | null; loading: boolean; error: string | null; live: boolean };

/** Fetch from the API with polling; on failure returns `fallback` (mock) with live=false.
 *  State is keyed by `path`: when the path changes (tab / window / wallet switch) the previous path's data is never
 *  returned, so callers cannot render rows of one endpoint's shape with another endpoint's renderer. */
export function useApiData<T>(path: string | null, fallback: T, ms = 20_000): Load<T> {
  const [st, setSt] = useState<Load<T> & { key: string | null }>({ key: path, data: null, loading: !!path, error: null, live: false });
  useEffect(() => {
    if (!path) { setSt({ key: path, data: null, loading: false, error: null, live: false }); return; }
    let alive = true;
    setSt((s) => (s.key === path ? { ...s, loading: true } : { key: path, data: null, loading: true, error: null, live: false }));
    const run = () => fetch(`${apiBase()}${path}`, { cache: "no-store", signal: AbortSignal.timeout(5000) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => alive && setSt({ key: path, data: d as T, loading: false, error: null, live: true }))
      .catch((e) => alive && setSt({ key: path, data: fallback, loading: false, error: String(e?.message ?? e), live: false }));
    run();
    const id = setInterval(run, ms);
    return () => { alive = false; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ms]);
  // Same render as a path change, before the effect runs: hide the stale data.
  if (st.key !== path) return { data: null, loading: !!path, error: null, live: false };
  const { key: _key, ...load } = st;
  return load;
}
