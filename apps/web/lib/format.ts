export const shortAddr = (a: string, n = 4) => `${a.slice(0, n)}…${a.slice(-n)}`;
export const fmtSol = (v: number, d = 2) =>
  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(d);
export const fmtUsd = (v: number) =>
  v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(1)}k` : `$${v.toFixed(0)}`;
export function fmtAge(ts: number, now = Date.now()) {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";