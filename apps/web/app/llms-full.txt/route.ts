import { publishedArticlesMarkdown } from "@/lib/articles";
import { docsMarkdown } from "@/lib/docsMarkdown";
import { TEXT_HEADERS } from "@/lib/llms";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic"; // SITE_URL is a runtime env

/** The full /docs page as Markdown. */
export function GET() {
  const site = siteUrl();
  const articles = publishedArticlesMarkdown(site);
  return new Response(`${docsMarkdown(site)}${articles ? `\n${articles}\n` : ""}`, { headers: TEXT_HEADERS("text/plain") });
}
