import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";
import { getAllLocks, getAllTokens } from "@/lib/seoData";
import type { ApiToken } from "@/lib/api";

/** The API's row update time (pool state or metadata last changed), else the launch time. */
const tokenMod = (t: ApiToken & { updatedAt?: number }) => t.updatedAt || t.createdAt || 0;

// Rebuilt at most once a minute (the API reads are cached for 60 s). One file holds up to ~45k URLs; split with generateSitemaps past that.
export const revalidate = 60;

/** Public pages only: portfolio, settings and rewards are personal and noindex. lastModified is real: the token's API
 *  row update (or launch), the lock's creation; static pages carry none rather than a made-up date. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = siteUrl();
  const [tokens, locks] = await Promise.all([getAllTokens(), getAllLocks()]);
  const newest = tokens?.reduce((m, t) => Math.max(m, tokenMod(t)), 0) || 0;
  const statics: MetadataRoute.Sitemap = [
    { url: `${site}/`, changeFrequency: "hourly", priority: 1, ...(newest ? { lastModified: new Date(newest) } : {}) },
    { url: `${site}/launch`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${site}/leaderboard`, changeFrequency: "hourly", priority: 0.8, ...(newest ? { lastModified: new Date(newest) } : {}) },
    { url: `${site}/locks`, changeFrequency: "daily", priority: 0.7 },
    { url: `${site}/open-book`, changeFrequency: "daily", priority: 0.7 },
    { url: `${site}/docs`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${site}/docs/api`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${site}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${site}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];
  const tok: MetadataRoute.Sitemap = (tokens ?? []).map((t) => {
    const at = tokenMod(t);
    return { url: `${site}/token/${t.mint}`, changeFrequency: "daily", priority: 0.6, ...(at ? { lastModified: new Date(at) } : {}) };
  });
  const lk: MetadataRoute.Sitemap = (locks ?? []).map((l) => {
    const at = l.lockedAt ? l.lockedAt * 1000 : 0;
    return { url: `${site}/locks/${l.id || l.escrow}`, changeFrequency: "weekly", priority: 0.4, ...(at ? { lastModified: new Date(at) } : {}) };
  });
  return [...statics, ...tok, ...lk];
}
