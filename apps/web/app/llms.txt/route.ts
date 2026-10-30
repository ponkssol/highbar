import { llmsTxt, TEXT_HEADERS } from "@/lib/llms";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic"; // SITE_URL is a runtime env

/** llmstxt.org summary of highbar for AI crawlers and agents. */
export function GET() {
  return new Response(llmsTxt(siteUrl()), { headers: TEXT_HEADERS("text/plain") });
}
