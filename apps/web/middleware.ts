import { NextResponse, type NextRequest } from "next/server";

/** Real 404 status for unknown token mints and lock ids. The pages call notFound(), but the root loading boundary has already
 *  streamed a 200 by then, so the status is decided here: the id is checked against the API (cached for a minute) and an unknown
 *  one is rewritten to a path no route matches, which renders app/not-found.tsx with status 404. API errors fall through to the page. */
export const config = { matcher: ["/token/:mint", "/locks/:id"], runtime: "nodejs" };

const TTL_MS = 60_000, MAX = 5000;
const seen = new Map<string, { ok: boolean; at: number }>();
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

async function exists(kind: "tokens" | "locks", id: string): Promise<boolean | null> {
  const key = `${kind}:${id}`, hit = seen.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.ok;
  const secret = process.env.PROXY_SHARED_SECRET;
  const r = await fetch(`${process.env.API_URL || "http://localhost:4000"}/${kind}/${id}`, {
    cache: "no-store", headers: secret ? { "x-hb-proxy-secret": secret } : {}, signal: AbortSignal.timeout(4000),
  }).catch(() => null);
  if (!r || (r.status !== 404 && !r.ok)) return null; // unknown: let the page decide
  await r.body?.cancel().catch(() => {});
  if (seen.size >= MAX) seen.delete(seen.keys().next().value as string);
  seen.set(key, { ok: r.ok, at: Date.now() });
  return r.ok;
}

export async function middleware(req: NextRequest) {
  const [, seg, id] = req.nextUrl.pathname.split("/");
  if (!id) return NextResponse.next();
  const kind = seg === "token" ? "tokens" : "locks";
  // A just-created lock can lag behind the RPC: address-shaped lock ids go to the page, which shows LockPending (noindex) and retries.
  if (kind === "locks") return BASE58.test(id) ? NextResponse.next() : NextResponse.rewrite(new URL("/_hb-not-found", req.url));
  const ok = BASE58.test(id) ? await exists(kind, id) : false;
  if (ok === false) return NextResponse.rewrite(new URL("/_hb-not-found", req.url));
  return NextResponse.next();
}
