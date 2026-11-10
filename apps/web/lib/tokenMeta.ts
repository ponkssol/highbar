/** Description text from a token's own highbar metadata file. Server-only. A miss or a bad response is omitted, never invented. */
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { apiHeaders } from "./api";
import { descriptionFromMeta, ownMetaId } from "./tokenSeo";

const readCached = unstable_cache(async (id: string): Promise<string> => {
  const base = (process.env.API_URL || "http://localhost:4000").replace(/\/+$/, "");
  const r = await fetch(`${base}/meta/${id}.json`, { headers: apiHeaders(), signal: AbortSignal.timeout(2000), cache: "no-store" });
  if (r.status === 404) return "";
  if (!r.ok) throw new Error(`meta ${r.status}`);
  return descriptionFromMeta(await r.json()) ?? "";
}, ["hb-token-meta-desc"], { revalidate: 3600 });

/** The launch description stored for this token, or null when there is none or it cannot be read. */
export const tokenMetadataDescription = cache(async (uri: string | null | undefined): Promise<string | null> => {
  const id = ownMetaId(uri);
  if (!id) return null;
  try {
    const text = (await readCached(id)).trim();
    return text || null;
  } catch {
    return null;
  }
});
