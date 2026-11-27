import type { Metadata } from "next";
import { V2Home } from "@/components/v2/Home";
import { listPublishedArticles } from "@/lib/articles";
import { GUIDE_PICKS, pickPublished } from "@/lib/guidePicks";
import { getHomeTokens, getStats } from "@/lib/seoData";

export const metadata: Metadata = { title: "Dashboard" };

export default async function V2Dashboard() {
  const [stats, tokens] = await Promise.all([getStats(), getHomeTokens()]);
  const guides = pickPublished(GUIDE_PICKS.home).slice(0, 4).map((a) => ({ href: `/guides/${a.slug}`, title: a.title }));
  if (guides.length === 0) {
    for (const a of listPublishedArticles().slice(0, 4)) guides.push({ href: `/guides/${a.slug}`, title: a.title });
  }
  return <V2Home initialStats={stats} initialTokens={tokens} guides={guides} />;
}
