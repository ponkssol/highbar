import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { store } from "./store.js";

/** Token metadata + logo hosting and an image proxy.
 *  POST /metadata stores the logo and Metaplex-style JSON under MEDIA_DIR and returns a public uri (SITE_URL/hb-api/meta/<id>.json).
 *  GET /img/:mint resolves the token uri -> metadata JSON -> image (own files read locally, remote ones fetched once), cached on disk. */
const DIR = path.resolve(process.env.MEDIA_DIR ?? "./data/media");
const CACHE = path.join(DIR, "cache");
fs.mkdirSync(CACHE, { recursive: true });
const SITE = () => (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const MAX = 2 * 1024 * 1024;
const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
const MIME = Object.fromEntries(Object.entries(EXT).map(([k, v]) => [v, k]));
const ID = /^[a-f0-9]{24}$/;
const atomic = (f: string, data: string | Buffer) => { const tmp = `${f}.${process.pid}.tmp`; fs.writeFileSync(tmp, data); fs.renameSync(tmp, f); };

/** Own-hosted uri -> local file path, else null. */
function ownFile(url: string): string | null {
  const m = url.match(/\/hb-api\/(meta|media)\/([a-f0-9]{24})\.(json|png|jpg|webp|gif)$/);
  return m ? path.join(DIR, `${m[2]}.${m[3]}`) : null;
}
const gateway = (u: string) => u.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${u.slice(7)}` : u.startsWith("ar://") ? `https://arweave.net/${u.slice(5)}` : u;
async function fetchBuf(url: string, max = MAX): Promise<{ buf: Buffer; type: string }> {
  const own = ownFile(url);
  if (own) { const ext = path.extname(own).slice(1); return { buf: fs.readFileSync(own), type: ext === "json" ? "application/json" : MIME[ext] }; }
  const r = await fetch(gateway(url), { signal: AbortSignal.timeout(8000), redirect: "follow" });
  if (!r.ok) throw new Error(`fetch ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > max) throw new Error("too large");
  return { buf, type: (r.headers.get("content-type") ?? "").split(";")[0] };
}

const miss = new Map<string, number>(); // mint -> retry-after ms (negative cache)
export async function resolveImage(mint: string): Promise<{ buf: Buffer; type: string } | null> {
  const t = store.tokens().find((x) => x.mint === mint);
  if (!t?.uri) return null;
  const key = crypto.createHash("sha1").update(t.uri).digest("hex");
  const metaF = path.join(CACHE, `${key}.json`);
  if (fs.existsSync(metaF)) {
    const c = JSON.parse(fs.readFileSync(metaF, "utf8")) as { type: string } | { none: true };
    if ("none" in c) return null;
    return { buf: fs.readFileSync(path.join(CACHE, `${key}.img`)), type: c.type };
  }
  if ((miss.get(mint) ?? 0) > Date.now()) return null;
  try {
    const meta = JSON.parse((await fetchBuf(t.uri, 256 * 1024)).buf.toString("utf8"));
    const src = typeof meta?.image === "string" ? meta.image : "";
    if (!src) { atomic(metaF, JSON.stringify({ none: true })); return null; }
    const img = await fetchBuf(src);
    if (!img.type.startsWith("image/")) throw new Error("not an image");
    atomic(path.join(CACHE, `${key}.img`), img.buf); atomic(metaF, JSON.stringify({ type: img.type }));
    return img;
  } catch { miss.set(mint, Date.now() + 5 * 60_000); return null; }
}

export function registerMedia(app: FastifyInstance) {
  app.post("/metadata", { bodyLimit: 4 * 1024 * 1024 }, async (req, reply) => {
    const b = req.body as { name?: string; symbol?: string; description?: string; website?: string; twitter?: string; telegram?: string; image?: string };
    if (!b?.name || !b?.symbol) return reply.code(400).send({ error: "name and symbol required" });
    const id = crypto.randomBytes(12).toString("hex");
    let image = "";
    if (b.image) {
      const m = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(b.image);
      const ext = m ? EXT[m[1]] : undefined;
      if (!m || !ext) return reply.code(400).send({ error: "image must be a png, jpeg, webp or gif data URL" });
      const buf = Buffer.from(m[2], "base64");
      if (buf.length > MAX) return reply.code(413).send({ error: "image larger than 2 MB" });
      atomic(path.join(DIR, `${id}.${ext}`), buf);
      image = `${SITE()}/hb-api/media/${id}.${ext}`;
    }
    const links = Object.fromEntries(Object.entries({ website: b.website, twitter: b.twitter, telegram: b.telegram }).filter(([, v]) => v));
    const json = { name: String(b.name).slice(0, 32), symbol: String(b.symbol).slice(0, 10), description: String(b.description ?? "").slice(0, 1000), image, ...links,
      properties: image ? { files: [{ uri: image, type: MIME[path.extname(image).slice(1)] }], category: "image" } : undefined };
    atomic(path.join(DIR, `${id}.json`), JSON.stringify(json));
    return { uri: `${SITE()}/hb-api/meta/${id}.json`, image };
  });
  app.get("/meta/:file", async (req, reply) => {
    const [id, ext] = (req.params as { file: string }).file.split(".");
    const f = path.join(DIR, `${id}.json`);
    if (!ID.test(id) || ext !== "json" || !fs.existsSync(f)) return reply.code(404).send({ error: "not found" });
    return reply.header("cache-control", "public, max-age=3600").type("application/json").send(fs.readFileSync(f));
  });
  app.get("/media/:file", async (req, reply) => {
    const [id, ext] = (req.params as { file: string }).file.split(".");
    const f = path.join(DIR, `${id}.${ext}`);
    if (!ID.test(id) || !MIME[ext] || !fs.existsSync(f)) return reply.code(404).send({ error: "not found" });
    return reply.header("cache-control", "public, max-age=31536000, immutable").header("x-content-type-options", "nosniff").type(MIME[ext]).send(fs.readFileSync(f));
  });
  app.get("/img/:mint", async (req, reply) => {
    const img = await resolveImage((req.params as { mint: string }).mint);
    if (!img) return reply.code(404).header("cache-control", "public, max-age=300").send({ error: "no image" });
    return reply.header("cache-control", "public, max-age=86400").header("x-content-type-options", "nosniff").header("content-security-policy", "default-src 'none'; style-src 'unsafe-inline'").type(img.type).send(img.buf);
  });
}
/** Public logo URL only when the image is already cached; otherwise resolve it in the background and report none (no 404s in the UI). */
const pending = new Set<string>();
export function imageUrl(mint: string, uri: string): string | null {
  if (!uri) return null;
  const f = path.join(CACHE, `${crypto.createHash("sha1").update(uri).digest("hex")}.json`);
  if (fs.existsSync(f)) { try { return "none" in JSON.parse(fs.readFileSync(f, "utf8")) ? null : `/hb-api/img/${mint}`; } catch { return null; } }
  if (!pending.has(mint) && (miss.get(mint) ?? 0) <= Date.now()) { pending.add(mint); void resolveImage(mint).finally(() => pending.delete(mint)); }
  return null;
}