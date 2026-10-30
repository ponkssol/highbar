import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { store } from "./store.js";
import { BadRequest, imageMatches, label, link, text } from "./security/validate.js";

/** @handle or bare handle -> profile URL; otherwise a validated http(s) link. */
export function social(v: unknown, kind: "website" | "twitter" | "telegram"): string {
  const s = text(v, 200);
  if (!s) return "";
  const h = /^@?([A-Za-z0-9_]{1,32})$/.exec(s);
  if (h && kind === "twitter") return `https://x.com/${h[1]}`;
  if (h && kind === "telegram") return `https://t.me/${h[1]}`;
  return link(s, kind);
}

/** Token metadata + logo hosting and an image proxy, stored in Postgres.
 *  POST /metadata stores the logo and Metaplex-style JSON in media_files and returns a public uri (SITE_URL/hb-api/meta/<id>.json).
 *  GET /img/:mint resolves the token uri -> metadata JSON -> image (own files from media_files, remote ones fetched once), cached in logo_cache. */
const SITE = () => (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const MAX = 2 * 1024 * 1024;
const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
const MIME: Record<string, string> = { ...Object.fromEntries(Object.entries(EXT).map(([k, v]) => [v, k])), json: "application/json" };
const ID = /^[a-f0-9]{24}$/;
const uriHash = (uri: string) => crypto.createHash("sha1").update(uri).digest("hex");

/** uri_hash -> has image; loaded from logo_cache at startup, kept current on writes. */
const logoIdx = new Map<string, boolean>();
export async function initMedia() { for (const [k, v] of await store.logoIndex()) logoIdx.set(k, v); }

const gateway = (u: string) => u.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${u.slice(7)}` : u.startsWith("ar://") ? `https://arweave.net/${u.slice(5)}` : u;
async function fetchBuf(url: string, max = MAX): Promise<{ buf: Buffer; type: string }> {
  const m = url.match(/\/hb-api\/(meta|media)\/([a-f0-9]{24})\.(json|png|jpg|webp|gif)$/);
  if (m) { const f = await store.getMedia(m[2], m[3]); if (!f) throw new Error("own media missing"); return { buf: f.data, type: f.type }; }
  const r = await fetch(gateway(url), { signal: AbortSignal.timeout(8000), redirect: "follow" });
  if (!r.ok) throw new Error(`fetch ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > max) throw new Error("too large");
  return { buf, type: (r.headers.get("content-type") ?? "").split(";")[0] };
}

const miss = new Map<string, number>(); // mint -> retry-after ms (negative cache)
export async function resolveImage(mint: string): Promise<{ buf: Buffer; type: string } | null> {
  const t = await store.getToken(mint);
  if (!t?.uri || t.mint !== mint) return null;
  const key = uriHash(t.uri);
  const c = await store.getLogo(key);
  if (c) return c.data && c.type ? { buf: c.data, type: c.type } : null;
  if ((miss.get(mint) ?? 0) > Date.now()) return null;
  try {
    const meta = JSON.parse((await fetchBuf(t.uri, 256 * 1024)).buf.toString("utf8"));
    const src = typeof meta?.image === "string" ? meta.image : "";
    if (!src) { await store.putLogo(key, t.uri, null, null); logoIdx.set(key, false); return null; }
    const img = await fetchBuf(src);
    if (!img.type.startsWith("image/")) throw new Error("not an image");
    await store.putLogo(key, t.uri, img.type, img.buf); logoIdx.set(key, true);
    return img;
  } catch { miss.set(mint, Date.now() + 5 * 60_000); return null; }
}

export function registerMedia(app: FastifyInstance) {
  app.post("/metadata", { bodyLimit: 4 * 1024 * 1024 }, async (req, reply) => {
    const b = (req.body ?? {}) as { name?: string; symbol?: string; description?: string; website?: string; twitter?: string; telegram?: string; image?: string };
    let name: string, symbol: string, description: string, links: Record<string, string>;
    try {
      name = label(b.name, "name", 32); symbol = label(b.symbol, "symbol", 10); description = text(b.description, 1000);
      links = Object.fromEntries(Object.entries({ website: social(b.website, "website"), twitter: social(b.twitter, "twitter"), telegram: social(b.telegram, "telegram") }).filter(([, v]) => v));
      if (b.image !== undefined && typeof b.image !== "string") throw new BadRequest("image must be a data URL");
    } catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
    const id = crypto.randomBytes(12).toString("hex");
    let image = "";
    if (b.image) {
      const m = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(b.image);
      const ext = m ? EXT[m[1]] : undefined;
      if (!m || !ext) return reply.code(400).send({ error: "image must be a png, jpeg, webp or gif data URL" });
      const buf = Buffer.from(m[2], "base64");
      if (buf.length > MAX) return reply.code(413).send({ error: "image larger than 2 MB" });
      if (!imageMatches(m[1], buf)) return reply.code(400).send({ error: "image content does not match its type" });
      await store.putMedia(id, ext, m[1], buf);
      image = `${SITE()}/hb-api/media/${id}.${ext}`;
    }
    const json = { name, symbol, description, image, ...links,
      properties: image ? { files: [{ uri: image, type: MIME[image.split(".").pop()!] }], category: "image" } : undefined };
    await store.putMedia(id, "json", "application/json", Buffer.from(JSON.stringify(json)));
    return { uri: `${SITE()}/hb-api/meta/${id}.json`, image };
  });
  app.get("/meta/:file", async (req, reply) => {
    const [id, ext] = (req.params as { file: string }).file.split(".");
    const f = ID.test(id) && ext === "json" ? await store.getMedia(id, "json") : undefined;
    if (!f) return reply.code(404).send({ error: "not found" });
    return reply.header("cache-control", "public, max-age=3600").type("application/json").send(f.data);
  });
  app.get("/media/:file", async (req, reply) => {
    const [id, ext] = (req.params as { file: string }).file.split(".");
    const f = ID.test(id) && ext !== "json" && MIME[ext] ? await store.getMedia(id, ext) : undefined;
    if (!f) return reply.code(404).send({ error: "not found" });
    return reply.header("cache-control", "public, max-age=31536000, immutable").header("x-content-type-options", "nosniff").type(MIME[ext]).send(f.data);
  });
  app.get("/img/:mint", async (req, reply) => {
    const img = await resolveImage((req.params as { mint: string }).mint);
    if (!img) return reply.code(404).header("cache-control", "public, max-age=300").send({ error: "no image" });
    return reply.header("cache-control", "public, max-age=86400").header("x-content-type-options", "nosniff").header("content-security-policy", "default-src 'none'; style-src 'unsafe-inline'").type(img.type).send(img.buf);
  });
}
export type TokenLinks = { website?: string; twitter?: string; telegram?: string };
const linksCache = new Map<string, { links: TokenLinks; at: number }>(); // uri_hash -> links (ok: 1h, miss: 5 min)
/** Social links from the token's metadata JSON (website/twitter/telegram, also under extensions). Only valid http(s) URLs are returned; anything else is dropped. */
export async function resolveLinks(uri: string): Promise<TokenLinks> {
  if (!uri) return {};
  const key = uriHash(uri);
  const c = linksCache.get(key);
  if (c && Date.now() - c.at < (Object.keys(c.links).length ? 60 * 60_000 : 5 * 60_000)) return c.links;
  let links: TokenLinks = {};
  try {
    const meta = JSON.parse((await fetchBuf(uri, 256 * 1024)).buf.toString("utf8"));
    const ext = meta && typeof meta.extensions === "object" ? meta.extensions : {};
    for (const k of ["website", "twitter", "telegram"] as const) {
      const v = typeof meta?.[k] === "string" && meta[k] ? meta[k] : ext?.[k];
      try { const u = social(v, k); if (u) links[k] = u; } catch { /* invalid link: hide it */ }
    }
  } catch { links = {}; }
  if (linksCache.size > 5000) linksCache.clear();
  linksCache.set(key, { links, at: Date.now() });
  return links;
}
/** Public logo URL only when the image is already cached; otherwise resolve it in the background and report none (no 404s in the UI). */
const pending = new Set<string>();
export function imageUrl(mint: string, uri: string): string | null {
  if (!uri) return null;
  const has = logoIdx.get(uriHash(uri));
  if (has !== undefined) return has ? `/hb-api/img/${mint}` : null;
  if (!pending.has(mint) && (miss.get(mint) ?? 0) <= Date.now()) { pending.add(mint); void resolveImage(mint).finally(() => pending.delete(mint)); }
  return null;
}
