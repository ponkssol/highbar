import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

/** Fixed-window counter per key (in-memory, per API instance). Good enough for one Railway instance; use Redis if you scale out. */
export class WindowLimiter {
  private hits = new Map<string, { start: number; n: number }>();
  constructor(readonly max: number, readonly windowMs: number, private now: () => number = Date.now) {}
  /** Returns 0 when allowed, else ms until the window resets. */
  take(key: string): number {
    const t = this.now();
    let h = this.hits.get(key);
    if (!h || t - h.start >= this.windowMs) { h = { start: t, n: 0 }; this.hits.set(key, h); }
    if (h.n >= this.max) return h.start + this.windowMs - t;
    h.n++;
    if (this.hits.size > 50_000) this.sweep(t);
    return 0;
  }
  sweep(t = this.now()) { for (const [k, h] of this.hits) if (t - h.start >= this.windowMs) this.hits.delete(k); }
  get size() { return this.hits.size; }
}

const num = (k: string, d: number) => { const n = Number(process.env[k]); return Number.isFinite(n) && n > 0 ? n : d; };

/** Route classes. Limits are per client IP per minute unless noted; override with RATE_LIMIT_<CLASS>_PER_MIN. */
export function limitsFromEnv() {
  return {
    global: new WindowLimiter(num("RATE_LIMIT_GLOBAL_PER_MIN", 300), 60_000),
    txBuild: new WindowLimiter(num("RATE_LIMIT_TX_PER_MIN", 30), 60_000),
    launch: new WindowLimiter(num("RATE_LIMIT_LAUNCH_PER_MIN", 6), 60_000),
    metadata: new WindowLimiter(num("RATE_LIMIT_METADATA_PER_MIN", 6), 60_000),
    referral: new WindowLimiter(num("RATE_LIMIT_REFERRAL_PER_MIN", 10), 60_000),
    auth: new WindowLimiter(num("RATE_LIMIT_AUTH_PER_MIN", 20), 60_000),
    /** Anti-spam on token creation: launch txs built per creator wallet per hour. */
    launchPerCreator: new WindowLimiter(num("LAUNCHES_PER_CREATOR_PER_HOUR", 5), 3_600_000),
    /** and per IP per hour (on top of the per-minute burst limit). */
    launchPerIpHour: new WindowLimiter(num("LAUNCHES_PER_IP_PER_HOUR", 20), 3_600_000),
  };
}
export type Limits = ReturnType<typeof limitsFromEnv>;

/** Which limiter class a request falls in (besides the global one). */
export function routeClass(method: string, url: string): keyof Limits | null {
  const p = url.split("?")[0];
  if (method === "POST" && p === "/metadata") return "metadata";
  if (method === "POST" && p === "/tx/launch") return "launch";
  if (p === "/tx/launch/quote") return "txBuild";
  if (method === "POST" && (p.startsWith("/tx/") || p === "/claim/build" || p.startsWith("/mint/"))) return "txBuild"; // incl. /tx/launch/sign, /mint/confirm
  if (method === "POST" && p === "/referrals") return "referral";
  if (p.startsWith("/auth/")) return "auth";
  return null;
}

const safeEq = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

/**
 * Client IP. The web app calls the API through its same-origin /hb-api proxy, so the socket IP is the web service's.
 * The proxy sends x-hb-client-ip plus x-hb-proxy-secret = PROXY_SHARED_SECRET; the IP header is only trusted with a matching secret.
 * Otherwise req.ip (Fastify honours X-Forwarded-For only when TRUST_PROXY is set, e.g. behind Railway's edge).
 */
export function clientIp(req: Pick<FastifyRequest, "headers" | "ip">, secret = process.env.PROXY_SHARED_SECRET || ""): string | null {
  const s = req.headers["x-hb-proxy-secret"], ip = req.headers["x-hb-client-ip"];
  if (secret && typeof s === "string" && safeEq(s, secret)) {
    if (typeof ip === "string" && ip.length <= 64) return ip.split(",")[0].trim();
    return null; // the web server itself (SSR / OG images): not rate-limited
  }
  return req.ip;
}

function tooMany(reply: FastifyReply, ms: number) {
  return reply.code(429).header("retry-after", String(Math.max(1, Math.ceil(ms / 1000)))).send({ error: "rate limited, try again shortly" });
}

/** Per-IP limits on every route, stricter ones on POST /metadata, /referrals, /auth/*, /tx/* builders. Disable with RATE_LIMIT_OFF=1 (tests / local load tests only). */
export function registerRateLimit(app: FastifyInstance, limits: Limits = limitsFromEnv()) {
  if (process.env.RATE_LIMIT_OFF === "1") return limits;
  app.addHook("onRequest", async (req, reply) => {
    if (req.method === "OPTIONS" || req.url === "/health") return;
    const ip = clientIp(req);
    if (ip === null) return;
    let wait = limits.global.take(ip);
    const cls = routeClass(req.method, req.url);
    if (!wait && cls) wait = limits[cls].take(ip);
    if (!wait && cls === "launch") wait = limits.launchPerIpHour.take(ip);
    if (wait) return tooMany(reply, wait);
  });
  setInterval(() => { for (const l of Object.values(limits)) l.sweep(); }, 5 * 60_000).unref();
  return limits;
}

/** Anti-spam: at most LAUNCHES_PER_CREATOR_PER_HOUR launch txs built per creator wallet. Returns an error message or null. */
export function creatorLaunchGate(limits: Limits, creator: string): string | null {
  if (process.env.RATE_LIMIT_OFF === "1") return null;
  const wait = limits.launchPerCreator.take(creator);
  return wait ? `launch limit reached for this wallet; try again in ${Math.ceil(wait / 60_000)} min` : null;
}
