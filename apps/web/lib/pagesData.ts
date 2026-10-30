"use client";
import { useEffect, useState } from "react";
import { apiBase } from "./api";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Coerce a 200 body to the fallback's shape: array fallback -> must be an array; object fallback -> must be an object, missing keys
 *  (and array keys that came back as non-arrays) are filled from the fallback; null fallback -> object/array or null.
 *  Returns undefined when the body cannot be used (the caller treats that like a failed request). */
export function coerceShape<T>(d: unknown, fallback: T): T | undefined {
  if (Array.isArray(fallback)) return Array.isArray(d) ? (d as T) : undefined;
  if (isObj(fallback)) {
    if (!isObj(d)) return undefined;
    const out: Record<string, unknown> = { ...fallback, ...d };
    for (const [k, v] of Object.entries(fallback)) if ((Array.isArray(v) && !Array.isArray(d[k]))) out[k] = v;
    return out as T;
  }
  return d === null || typeof d === "object" ? (d as T) : undefined;
}

export type Load<T> = { data: T | null; loading: boolean; error: string | null; live: boolean };

/** Fetch from the API with polling; on failure (network error, timeout, non-2xx, bad JSON, unexpected shape) returns `fallback` with live=false.
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
      .then((d) => { const v = coerceShape(d, fallback); if (v === undefined) throw new Error("unexpected response"); if (alive) setSt({ key: path, data: v, loading: false, error: null, live: true }); })
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
