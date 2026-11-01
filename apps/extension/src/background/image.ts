/** Tweet image to a data URL the API's POST /metadata accepts (png, jpeg, webp or gif, at most 2 MB, magic bytes checked). */
import { b64, unb64 } from "../lib/bytes";

export const IMAGE_MAX = 2 * 1024 * 1024;
const TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export function sniff(b: Uint8Array): string | null {
  const ascii = (f: number, t: number) => String.fromCharCode(...b.subarray(f, t));
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((x, i) => b[i] === x)) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 6 && (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a")) return "image/gif";
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

/** A data URL handed in by the drawer (a file the user picked): type and size checked again here. */
export function checkDataUrl(d: string): string {
  const m = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(d);
  if (!m) throw new Error("Use a PNG, JPG, WEBP or GIF image");
  const bytes = unb64(m[2]);
  if (bytes.length > IMAGE_MAX) throw new Error("The image must be 2 MB or smaller");
  if (sniff(bytes) !== m[1]) throw new Error("This file is not a valid PNG, JPG, WEBP or GIF image");
  return d;
}

async function downscale(blob: Blob, max: number, quality: number): Promise<Uint8Array> {
  const bmp = await createImageBitmap(blob);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = new OffscreenCanvas(Math.max(1, Math.round(bmp.width * s)), Math.max(1, Math.round(bmp.height * s)));
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return new Uint8Array(await (await c.convertToBlob({ type: "image/jpeg", quality })).arrayBuffer());
}

export async function imageUrlToDataUrl(url: string): Promise<string> {
  const u = new URL(url);
  if (u.protocol !== "https:" || u.hostname !== "pbs.twimg.com") throw new Error("Only x.com images can be fetched");
  const r = await fetch(u.toString(), { credentials: "omit" });
  if (!r.ok) throw new Error(`Could not load the tweet image (${r.status})`);
  const blob = await r.blob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const type = sniff(bytes);
  if (type && TYPES.has(type) && bytes.length <= IMAGE_MAX && (type === "image/gif" || bytes.length <= 1.5 * 1024 * 1024)) return `data:${type};base64,${b64(bytes)}`;
  for (const [max, q] of [[1000, 0.9], [800, 0.8], [600, 0.7]] as const) {
    const out = await downscale(blob, max, q);
    if (out.length <= IMAGE_MAX) return `data:image/jpeg;base64,${b64(out)}`;
  }
  throw new Error("The tweet image is too large");
}

/** An image URL to a small JPEG data URL (x.com's CSP img-src blocks the api and highbar.capital hosts, and the content script
 *  runs in a closed shadow root on x.com, so the panel only ever gets data URLs). https only, null when it is not an image. */
export async function thumbFromUrl(url: string): Promise<string | null> {
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== "https:" && !(u.protocol === "http:" && (u.hostname === "127.0.0.1" || u.hostname === "localhost"))) return null;
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(u.toString(), { credentials: "omit", signal: ctl.signal });
    if (!r.ok) return null;
    const blob = await r.blob();
    if (blob.size > 8 * 1024 * 1024 || !TYPES.has(sniff(new Uint8Array(await blob.slice(0, 16).arrayBuffer())) ?? "")) return null;
    return `data:image/jpeg;base64,${b64(await downscale(blob, 72, 0.82))}`;
  } catch { return null; } finally { clearTimeout(t); }
}

/** The api's /tokens image is a site relative path ("/hb-api/img/<mint>"). Resolved against x.com it is an HTML page (the broken
 *  icon), so it is resolved against the siteUrl from /config. Absolute https URLs pass, anything else is dropped. */
export function resolveImage(img: string | null | undefined, siteUrl: string): string | null {
  if (!img || typeof img !== "string") return null;
  if (img.startsWith("data:image/")) return img;
  if (img.startsWith("/") && !img.startsWith("//")) return `${siteUrl.replace(/\/$/, "")}${img}`;
  return /^https:\/\//.test(img) ? img : null;
}

/** The image field of a token's metadata JSON (its uri), resolved like above. */
export async function metadataImage(uri: string | null | undefined, siteUrl: string): Promise<string | null> {
  if (!uri || !/^https:\/\//.test(uri)) return null;
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(uri, { credentials: "omit", signal: ctl.signal });
    if (!r.ok) return null;
    const text = await r.text();
    if (text.length > 64 * 1024) return null;
    const j = JSON.parse(text) as { image?: unknown };
    return typeof j.image === "string" ? resolveImage(j.image, siteUrl) : null;
  } catch { return null; } finally { clearTimeout(t); }
}

/** Token image for the Holding panel, first that loads: GET <api>/img/:mint, the /tokens image (site relative, resolved), the
 *  metadata uri's image, then a launch's own image. null means the panel draws the letter placeholder. */
export async function tokenThumb(apiBase: string, mint: string, more: { siteUrl?: string; image?: string | null; uri?: string | null; local?: string | null } = {}): Promise<string | null> {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) return null;
  const site = more.siteUrl ?? "https://highbar.capital";
  const first = await thumbFromUrl(`${apiBase}/img/${mint}`);
  if (first) return first;
  const tried = new Set<string>([`${apiBase}/img/${mint}`]);
  const next = async (u: string | null) => { if (!u || tried.has(u)) return null; tried.add(u); return u.startsWith("data:image/") ? u : thumbFromUrl(u); };
  return (await next(resolveImage(more.image, site))) ?? (await next(await metadataImage(more.uri, site))) ?? (await next(resolveImage(more.local, site)));
}
