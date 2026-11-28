import type { Metadata } from "next";
import { GuidesView, type GuideItem } from "@/components/GuidesView";
import { JsonLd } from "@/components/JsonLd";
import { TopBar } from "@/components/TopBar";
import { articlePath, listPublishedArticles } from "@/lib/articles";
import { publishTimeMs } from "@/lib/publish";
import { absUrl, breadcrumbJsonLd, pageMeta } from "@/lib/seo";

/** The index is rendered per request so a guide appears when its publish_at passes, without a new deploy. */
export const dynamic = "force-dynamic";

const DESCRIPTION = "Guides to launching and trading on highbar: Meteora DBC, fees, anti-sniper launches, locks, and trading Solana from X.";

export const metadata: Metadata = pageMeta({
  title: "Guides",
  description: DESCRIPTION,
  path: "/articles",
  keywords: ["highbar guide", "Solana launchpad guide", "Meteora DBC guide"],
});

export default function ArticlesIndex() {
  const articles = listPublishedArticles();
  const jsonLd = [
    {
      "@context": "https://schema.org", "@type": "CollectionPage", name: "Guides to launching and trading on highbar", description: DESCRIPTION, url: absUrl("/articles"), inLanguage: "en",
      isPartOf: { "@id": absUrl("/#website") },
      hasPart: articles.map((a) => ({ "@type": "Article", name: a.title, url: absUrl(articlePath(a)), datePublished: new Date(publishTimeMs(a)).toISOString() })),
    },
    breadcrumbJsonLd([["Home", "/"], ["Guides", "/articles"]]),
  ];
  const cat = (a: (typeof articles)[number]) => {
    const t = `${a.title} ${a.primaryKeyword}`.toLowerCase();
    if (/\bvs\b|alternative|compare|best /.test(t)) return "Compare";
    if (/sniper|lock|safe|rug|scam|security/.test(t)) return "Safety";
    if (/trad|swap|buy|sell/.test(t)) return "Trading";
    return "Launching";
  };
  const items: GuideItem[] = articles.map((a) => ({ href: articlePath(a), title: a.title, description: a.metaDescription, date: new Date(publishTimeMs(a)).toISOString().slice(0, 10), category: cat(a) }));
  return (
    <div className="jtx">
      <TopBar />
      <JsonLd data={jsonLd} />
      <div className="frame">
        <GuidesView items={items} />
        <p className="dim" style={{ padding: "0 clamp(16px,4vw,56px) 40px", fontSize: 13 }}>There is also an <a href="/rss.xml" className="yl">RSS feed</a> of the guides that are public.</p>
      </div>
    </div>
  );
}
