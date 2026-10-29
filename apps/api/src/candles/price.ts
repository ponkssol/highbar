/** Cached SOL/USD: Jupiter price API, fallback env SOL_USD_FALLBACK (or SOL_USD), default 150. */
const FALLBACK = Number(process.env.SOL_USD_FALLBACK ?? process.env.SOL_USD ?? 150);
const SOL = "So11111111111111111111111111111111111111112";
let cache = { at: 0, v: FALLBACK, src: "fallback" as "jupiter" | "fallback" };
let inflight: Promise<void> | null = null;

async function refresh() {
  try {
    const r = await fetch(`https://lite-api.jup.ag/price/v3?ids=${SOL}`, { signal: AbortSignal.timeout(3000) });
    const j = (await r.json()) as Record<string, { usdPrice?: number }>;
    const p = Number(j?.[SOL]?.usdPrice);
    if (r.ok && p > 0) cache = { at: Date.now(), v: p, src: "jupiter" };
    else cache = { ...cache, at: Date.now() };
  } catch { cache = { ...cache, at: Date.now() }; }
}
export async function solUsd(maxAgeMs = 60_000) {
  if (Date.now() - cache.at > maxAgeMs) { inflight ??= refresh().finally(() => { inflight = null; }); await inflight; }
  return cache;
}