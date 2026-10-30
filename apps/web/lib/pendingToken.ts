/** Server-only (middleware.ts, app/token/[mint]/page.tsx): GET /tokens/:mint/pending on the API, for an address the API has no
 *  token row for. "pending" = our DBC pool for this mint exists on-chain and the indexer is catching up (show TokenPending, noindex),
 *  "unknown" = no such pool (a real 404), "indexed" = the row just landed, "retry" = timeout / rate limit / API error (transient,
 *  never a 404). The visitor IP is passed with the shared proxy secret so the API's per-IP RPC limit applies to the visitor. */
export type PendingState = "indexed" | "pending" | "unknown" | "retry";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const PENDING_TIMEOUT_MS = 2500;

/** Vercel sets x-real-ip / x-forwarded-for (first entry = visitor), same as the /hb-api proxy. */
export function visitorIp(h: { get(name: string): string | null }): string {
  return (h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0] || "").trim().slice(0, 64);
}

export async function fetchPending(mint: string, ip: string, timeoutMs = PENDING_TIMEOUT_MS): Promise<PendingState> {
  if (!BASE58.test(mint)) return "unknown";
  const secret = process.env.PROXY_SHARED_SECRET;
  const headers: Record<string, string> = secret ? { "x-hb-proxy-secret": secret, ...(ip ? { "x-hb-client-ip": ip } : {}) } : {};
  try {
    const r = await fetch(`${process.env.API_URL || "http://localhost:4000"}/tokens/${mint}/pending`, { cache: "no-store", headers, signal: AbortSignal.timeout(timeoutMs) });
    if (r.status === 400) return "unknown";
    if (!r.ok) { await r.body?.cancel().catch(() => {}); return "retry"; }
    const s = ((await r.json()) as { status?: unknown }).status;
    return s === "indexed" || s === "pending" || s === "unknown" ? s : "retry";
  } catch { return "retry"; }
}
