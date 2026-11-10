import { articlePath, listPublishedArticles } from "@/lib/articles";
import { publishTimeMs } from "@/lib/publish";
import { siteUrl } from "@/lib/seo";

/** Regenerated on each request. Only articles whose publish_at has passed are included. */
export const dynamic = "force-dynamic";

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function GET() {
  const site = siteUrl();
  const items = listPublishedArticles().map((a) => {
    const link = `${site}${articlePath(a)}`;
    return [
      "<item>",
      `<title>${xml(a.title)}</title>`,
      `<link>${xml(link)}</link>`,
      `<guid>${xml(link)}</guid>`,
      `<pubDate>${new Date(publishTimeMs(a)).toUTCString()}</pubDate>`,
      `<description>${xml(a.metaDescription)}</description>`,
      "</item>",
    ].join("");
  }).join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>highbar guides</title><link>${xml(`${site}/articles`)}</link><description>Guides to launching and trading on highbar.</description>${items}</channel></rss>`;
  return new Response(body, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=60, s-maxage=300" } });
}
