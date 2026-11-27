import type { Metadata } from "next";
import Link from "next/link";
import { DocLink, DocSection, DocsHero } from "@/components/docs/Docs";
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
  return (
    <div className="jtx">
      <TopBar />
      <nav aria-label="Breadcrumb" className="text-[13px] text-ink-3">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li><Link href="/" className="hover:text-ink">Home</Link></li>
          <li aria-hidden>/</li>
          <li><span className="text-ink-2" aria-current="page">Guides</span></li>
        </ol>
      </nav>
      <DocsHero eyebrow="Library" title="Guides to launching and trading on highbar">
        <p>Shorter pages for the questions people bring to a Solana launchpad. The long reference is the <DocLink href="/docs">docs</DocLink>. New guides are added as files and appear here at their publish time.</p>
      </DocsHero>
      <JsonLd data={jsonLd} />
      <DocSection id="articles" eyebrow="Published" title="Articles">
        {articles.length === 0 ? <p>No guides are public yet. They show up here when their publish time is reached.</p> : (
          <ul className="flex flex-col gap-3">
            {articles.map((a) => (
              <li key={a.slug}>
                <Link href={articlePath(a)} className="block rounded-md border border-border px-4 py-3 transition-colors hover:border-gold-line">
                  <time dateTime={new Date(publishTimeMs(a)).toISOString()} className="hb-eyebrow">{new Date(publishTimeMs(a)).toISOString().slice(0, 10)}</time>
                  <h2 className="mt-2 text-[15px] font-semibold text-ink">{a.title}</h2>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-3">{a.metaDescription}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p>There is also an <DocLink href="/rss.xml">RSS feed</DocLink> of the guides that are public.</p>
      </DocSection>
    </div>
  );
}
