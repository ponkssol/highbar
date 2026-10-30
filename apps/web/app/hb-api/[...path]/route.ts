/** Same-origin proxy to the highbar API. Server-only env: API_URL (default http://localhost:4000), PROXY_SHARED_SECRET (same value as the API). */
const API_URL = process.env.API_URL || "http://localhost:4000";
const PROXY_SECRET = process.env.PROXY_SHARED_SECRET || "";
export const dynamic = "force-dynamic";
/** Vercel sets x-real-ip / x-forwarded-for (first entry = visitor). */
const clientIp = (req: Request) => (req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown").trim().slice(0, 64);

async function proxy(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const url = new URL(req.url);
  const target = `${API_URL}/${path.map(encodeURIComponent).join("/")}${url.search}`;
  try {
    const res = await fetch(target, {
      method: req.method,
      headers: {
        "content-type": req.headers.get("content-type") ?? "application/json",
        ...(req.headers.get("authorization") ? { authorization: req.headers.get("authorization")! } : {}),
        // Per-IP rate limits on the API: pass the visitor IP, authenticated by a secret shared with the API (PROXY_SHARED_SECRET on both).
        ...(PROXY_SECRET ? { "x-hb-proxy-secret": PROXY_SECRET, "x-hb-client-ip": clientIp(req) } : {}),
      },
      body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.text(),
      cache: "no-store",
    });
    const headers: Record<string, string> = { "content-type": res.headers.get("content-type") ?? "application/json" };
    for (const h of ["cache-control", "x-content-type-options", "content-security-policy", "retry-after"]) { const v = res.headers.get(h); if (v) headers[h] = v; }
    return new Response(res.body, { status: res.status, headers });
  } catch {
    return Response.json({ error: "api unreachable" }, { status: 502 });
  }
}
export { proxy as GET, proxy as POST };