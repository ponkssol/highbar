/** Same-origin proxy to the Higher Bar API. Server-only env: API_URL (default http://localhost:4000). */
const API_URL = process.env.API_URL || "http://localhost:4000";
export const dynamic = "force-dynamic";

async function proxy(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const url = new URL(req.url);
  const target = `${API_URL}/${path.map(encodeURIComponent).join("/")}${url.search}`;
  try {
    const res = await fetch(target, {
      method: req.method,
      headers: { "content-type": req.headers.get("content-type") ?? "application/json" },
      body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.text(),
      cache: "no-store",
    });
    return new Response(res.body, { status: res.status, headers: { "content-type": res.headers.get("content-type") ?? "application/json" } });
  } catch {
    return Response.json({ error: "api unreachable" }, { status: 502 });
  }
}
export { proxy as GET, proxy as POST };