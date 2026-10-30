import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

/** Personal pages (portfolio, settings, rewards) are also noindex in their metadata; the API proxy is not crawled except token images. */
const PRIVATE = ["/portfolio", "/settings", "/rewards", "/hb-api/", "/claim", "/cashback", "/referral", "/milestones", "/bar", "/burn", "/higher", "/about"];
const ALLOW = ["/", "/hb-api/img/"];
const AI_BOTS = ["GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-Web", "anthropic-ai", "PerplexityBot", "Google-Extended", "Applebot-Extended", "CCBot", "Bingbot"];

export default function robots(): MetadataRoute.Robots {
  const site = siteUrl();
  return {
    rules: [
      ...AI_BOTS.map((userAgent) => ({ userAgent, allow: ALLOW, disallow: PRIVATE })),
      { userAgent: "*", allow: ALLOW, disallow: PRIVATE },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
