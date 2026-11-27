import { NextResponse, type NextRequest } from "next/server";
import { isPublishedArticle } from "./lib/articles";
import { fetchPending, visitorIp } from "./lib/pendingToken";
import { DEFAULT_UI, canonicalPath, isAppRoute, isV2Path } from "./lib/uiVersion";

/** Real 404 status for unknown token mints and lock ids. The pages call notFound(), but the root loading boundary has already
 *  streamed a 200 by then, so the status is decided here: the id is checked against the API (cached for a minute) and an unknown
 *  one is rewritten to a path no route matches, which renders app/not-found.tsx with status 404. API errors fall through to the page.
 *  A token the API has no row for is only a 404 when GET /tokens/:mint/pending says "unknown" (no pool of ours on-chain): a fresh
 *  mint the indexer has not written yet ("pending") goes to the page, which shows TokenPending (noindex), on any link, refresh or
 *  visitor, not only the launch redirect. A row miss is remembered for 10 s, but only to skip the row lookup, never as a 404 by
 *  itself. Timeouts / rate limits on the pending check also go to the page, which decides. /token/<mint>?new=1 (the launch page's
 *  redirect right after confirmation) skips both checks. */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|md)$).*)"],
  runtime: "nodejs",
};

const TTL_MS = 60_000, MISS_TTL_MS = 10_000, MAX = 5000;
const seen = new Map<string, { ok: boolean; at: number }>();
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

async function exists(kind: "tokens" | "locks", id: string): Promise<boolean | null> {
  const key = `${kind}:${id}`, hit = seen.get(key);
  if (hit && Date.now() - hit.at < (hit.ok ? TTL_MS : MISS_TTL_MS)) return hit.ok;
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

function withNoindex(res: NextResponse) {
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

/** Preview at `/v2`, `?ui=v2|classic`, or the hb-ui cookie. Canonical app routes stay classic unless DEFAULT_UI is "v2". */
function switchUi(req: NextRequest): NextResponse | null {
  const path = req.nextUrl.pathname;
  const q = req.nextUrl.searchParams.get("ui");
  if (q === "v2" || q === "classic") {
    const dest = req.nextUrl.clone();
    dest.searchParams.delete("ui");
    if (q === "classic") dest.pathname = isV2Path(path) ? canonicalPath(path) : path;
    else if (!isV2Path(path)) dest.pathname = isAppRoute(path) ? (path === "/" ? "/v2" : `/v2${path}`) : "/v2";
    const res = NextResponse.redirect(dest);
    res.cookies.set("hb-ui", q, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return res;
  }
  const cookie = req.cookies.get("hb-ui")?.value;
  const pref = cookie === "v2" || cookie === "classic" ? cookie : DEFAULT_UI;
  if (!isV2Path(path) && isAppRoute(path) && pref === "v2") {
    const dest = req.nextUrl.clone();
    dest.pathname = path === "/" ? "/v2" : `/v2${path}`;
    // Promotion keeps the public URL. An explicit cookie preview shows /v2 in the address bar.
    if (DEFAULT_UI === "v2" && cookie !== "v2") return NextResponse.rewrite(dest);
    return NextResponse.redirect(dest);
  }
  return null;
}

async function unknownV2(req: NextRequest): Promise<NextResponse | null> {
  const parts = req.nextUrl.pathname.split("/");
  const kind = parts[2];
  const id = parts[3];
  if ((kind === "guides" || kind === "articles") && id && !isPublishedArticle(id)) return NextResponse.rewrite(new URL("/_hb-not-found", req.url));
  if (kind !== "token" && kind !== "locks") return null;
  if (!id) return null;
  if (kind === "locks") return BASE58.test(id) ? null : NextResponse.rewrite(new URL("/_hb-not-found", req.url));
  if (!BASE58.test(id)) return NextResponse.rewrite(new URL("/_hb-not-found", req.url));
  if (req.nextUrl.searchParams.get("new") === "1") return null;
  if ((await exists("tokens", id)) !== false) return null;
  if ((await fetchPending(id, visitorIp(req.headers))) === "unknown") return NextResponse.rewrite(new URL("/_hb-not-found", req.url));
  return null;
}

export async function middleware(req: NextRequest) {
  const switched = switchUi(req);
  if (switched) return switched;
  if (isV2Path(req.nextUrl.pathname)) {
    const headers = new Headers(req.headers);
    headers.set("x-hb-index", "no");
    const missing = await unknownV2(req);
    if (missing) return withNoindex(missing);
    return withNoindex(NextResponse.next({ request: { headers } }));
  }
  const [, seg, id] = req.nextUrl.pathname.split("/");
  if (seg !== "articles" && seg !== "token" && seg !== "locks") return NextResponse.next();
  // A guide whose publish_at is still in the future, or an unknown slug, is a real 404. notFound() in the page
  // would be too late: app/loading.tsx has already streamed a 200. Same rewrite the token routes use.
  if (seg === "articles") {
    if (!id) return NextResponse.next();
    return isPublishedArticle(id) ? NextResponse.next() : NextResponse.rewrite(new URL("/_hb-not-found", req.url));
  }
  if (!id) return NextResponse.next();
  const kind = seg === "token" ? "tokens" : "locks";
  // A just-created lock can lag behind the RPC: address-shaped lock ids go to the page, which shows LockPending (noindex) and retries.
  if (kind === "locks") return BASE58.test(id) ? NextResponse.next() : NextResponse.rewrite(new URL("/_hb-not-found", req.url));
  if (!BASE58.test(id)) return NextResponse.rewrite(new URL("/_hb-not-found", req.url));
  if (req.nextUrl.searchParams.get("new") === "1") return NextResponse.next(); // just launched, see TokenPending
  if ((await exists(kind, id)) !== false) return NextResponse.next();
  // no row: a 404 only when the chain has no pool of ours for this mint either
  if ((await fetchPending(id, visitorIp(req.headers))) === "unknown") return NextResponse.rewrite(new URL("/_hb-not-found", req.url));
  return NextResponse.next();
}
