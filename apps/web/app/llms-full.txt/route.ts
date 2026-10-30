import { docsMarkdown } from "@/lib/docsMarkdown";
import { TEXT_HEADERS } from "@/lib/llms";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic"; // SITE_URL is a runtime env

/** The full /docs page as Markdown. */
export function GET() {
  return new Response(docsMarkdown(siteUrl()), { headers: TEXT_HEADERS("text/plain") });
}
