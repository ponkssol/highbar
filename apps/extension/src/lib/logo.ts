/** Token logo candidates for the CA popup, best first (pure, tested). The worker fetches them in order and turns the first
 *  that is a real image into a small data URL. Order: pump.fun's own image CDN and the coin's image_uri (pump coins), the
 *  Jupiter icon, the DexScreener image, the metadata uri's image. IPFS links get gateway fallbacks: ipfs.io answers 403 to a
 *  lot of clients (that is why $ONBOARD showed its letter), pump.fun's Pinata gateway serves the same CIDs. */
export const IPFS_GATEWAYS = ["https://pump.mypinata.cloud/ipfs/", "https://ipfs.io/ipfs/", "https://cf-ipfs.com/ipfs/"] as const;
export const MAX_LOGO_TRIES = 10;
/** wsrv.nl, a free open source image proxy (images.weserv.nl) that answers with CORS: for logo hosts that send no CORS header
 *  (axiom-cdn.io, many self hosted metadata servers). Only the image URL goes there, resized to 64 px PNG. */
export const IMG_PROXY = "https://wsrv.nl/";
export const proxied = (url: string) => `${IMG_PROXY}?${new URLSearchParams({ url, w: "64", h: "64", fit: "cover", output: "png" }).toString()}`;

const CID = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{50,})$/;
/** "<cid>[/path]" when the URL names IPFS content (ipfs://, a /ipfs/ path on any gateway, or a <cid>.ipfs.<gateway> host). */
export function ipfsPath(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const m = /^ipfs:\/\/(?:ipfs\/)?([^?#]+)/i.exec(url);
  if (m) return CID.test(m[1].split("/")[0]) ? m[1] : null;
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  const p = /^\/ipfs\/([^?#]+)/.exec(u.pathname);
  if (p && CID.test(p[1].split("/")[0])) return p[1];
  const sub = /^([a-z0-9]+)\.ipfs\./.exec(u.hostname);
  if (sub && CID.test(sub[1])) return `${sub[1]}${u.pathname === "/" ? "" : u.pathname}`;
  return null;
}
/** The URL itself (when https) followed by the same content on each gateway. */
export function withGateways(url: string | null | undefined): string[] {
  if (!url) return [];
  const out: string[] = [];
  if (/^https:\/\//i.test(url)) out.push(url);
  const p = ipfsPath(url);
  if (p) for (const g of IPFS_GATEWAYS) out.push(g + p);
  return out;
}
/** pump.fun's image CDN (what pump.fun's own pages show, resized, with the coin's image as its source). */
export function pumpImageUrl(mint: string, imageUri?: string | null): string {
  const q = new URLSearchParams({ variant: "86x86" });
  const p = ipfsPath(imageUri);
  if (p) q.set("ipfs", p.split("/")[0]);
  if (imageUri && /^https:\/\//.test(imageUri)) q.set("src", imageUri);
  return `https://images.pump.fun/coin-image/${encodeURIComponent(mint)}?${q.toString()}`;
}
/** A smaller DexScreener CDN rendition (its URLs carry width/height). */
export function dexImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === "cdn.dexscreener.com" && u.searchParams.has("width")) { u.searchParams.set("width", "128"); u.searchParams.set("height", "128"); }
    return u.toString();
  } catch { return null; }
}

export interface LogoSources { mint: string; /** pump.fun knows the coin (coins-v2 answered) */ pump?: boolean; pumpImage?: string | null; jupIcon?: string | null; dexImage?: string | null; metaImage?: string | null }
/** Candidate URLs in order, no repeats, at most MAX_LOGO_TRIES. */
export function logoCandidates(s: LogoSources): string[] {
  const list = [
    ...(s.pump ? [pumpImageUrl(s.mint, s.pumpImage), ...withGateways(s.pumpImage)] : []),
    ...withGateways(s.jupIcon),
    ...withGateways(dexImageUrl(s.dexImage)),
    ...withGateways(s.metaImage),
  ];
  const direct = [...new Set(list.filter((u) => /^https:\/\//.test(u)))];
  // the same images through the proxy, for hosts without CORS (not IPFS gateways or pump.fun's CDN, those answer with CORS)
  const viaProxy = [...new Set([s.jupIcon, s.dexImage, s.metaImage, s.pumpImage])]
    .filter((u): u is string => typeof u === "string" && /^https:\/\//.test(u) && !ipfsPath(u) && !/^https:\/\/(images\.pump\.fun|cdn\.dexscreener\.com)\//.test(u)).slice(0, 2).map(proxied);
  const out = [...new Set([...direct.slice(0, MAX_LOGO_TRIES - viaProxy.length), ...viaProxy])];
  return out.slice(0, MAX_LOGO_TRIES);
}
