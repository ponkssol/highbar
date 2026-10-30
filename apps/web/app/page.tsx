import type { Metadata } from "next";
import { HomeView } from "@/components/HomeView";
import { HomeIntro } from "@/components/HomeIntro";
import { JsonLd } from "@/components/JsonLd";
import { getHomeTokens, getStats } from "@/lib/seoData";
import { pageMeta, siteJsonLd } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  absoluteTitle: "highbar | Solana token launchpad built on Meteora",
  description: "Launch a Solana memecoin on a Meteora DBC bonding curve that graduates to DAMM v2, with an anti-sniper fee and Dev Lock. Trade new tokens on highbar.",
  path: "/",
  keywords: ["Solana launchpad", "Solana memecoin launchpad", "Meteora DBC bonding curve", "DAMM v2 migration", "buyback and burn"],
});

/** Server wrapper: stats and the token list are fetched here (cached 60 s) so the first HTML has real content; the client view keeps polling. */
export default async function Home() {
  const [stats, tokens] = await Promise.all([getStats(), getHomeTokens()]);
  return (
    <>
      <JsonLd data={siteJsonLd()} />
      <HomeView initialStats={stats} initialTokens={tokens} intro={<HomeIntro />} />
    </>
  );
}