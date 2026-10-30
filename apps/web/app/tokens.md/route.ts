import { tokensMd, TEXT_HEADERS } from "@/lib/llms";
import { siteUrl } from "@/lib/seo";
import { getAllTokens } from "@/lib/seoData";

export const dynamic = "force-dynamic"; // the token list itself is cached for 60 s (lib/seoData)

/** Every token as a Markdown table (name, ticker, mint, URL, tier, status, created date). Linked from /llms.txt. */
export async function GET() {
  const tokens = await getAllTokens();
  return new Response(tokensMd(siteUrl(), tokens), { status: tokens ? 200 : 503, headers: TEXT_HEADERS("text/markdown") });
}
