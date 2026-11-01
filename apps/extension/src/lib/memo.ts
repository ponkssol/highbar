/** Small time-boxed promise caches for the trade path: a value asked again within `ttl` ms reuses the same promise (also
 *  while it is still in flight), so warming (popup open, typing an amount) makes the click skip that round trip. A failed
 *  promise is forgotten at once. */
export function memo<V>(ttl: number, max = 100) {
  const m = new Map<string, { at: number; v: Promise<V> }>();
  return {
    get(key: string, fn: () => Promise<V>, now = Date.now()): Promise<V> {
      const c = m.get(key);
      if (c && now - c.at < ttl) return c.v;
      const v = fn();
      m.set(key, { at: now, v });
      v.catch(() => { if (m.get(key)?.v === v) m.delete(key); });
      if (m.size > max) for (const [k, x] of m) if (now - x.at >= ttl) m.delete(k);
      return v;
    },
    has: (key: string, now = Date.now()) => { const c = m.get(key); return !!c && now - c.at < ttl; },
    delete: (key: string) => { m.delete(key); },
    clear: () => m.clear(),
  };
}

/** Per-step timings of one trade (ms since the click reached the worker), for Diagnostics and the report. */
export function timer(now: () => number = Date.now) {
  const t0 = now(), marks: Record<string, number> = {};
  return { mark: (k: string) => { if (!(k in marks)) marks[k] = now() - t0; }, marks: () => ({ ...marks }) };
}
