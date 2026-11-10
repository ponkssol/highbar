import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocLink, DocSection, DocsHero, Note } from "@/components/docs/Docs";
import { DocsToc } from "@/components/docs/DocsToc";
import { JsonLd } from "@/components/JsonLd";
import { ArticleBody, markdownHeadings } from "@/components/seo/ArticleBody";
import { TopBar } from "@/components/TopBar";
import { LinkButton } from "@/components/ui";
import { articlePath, getArticle, isPublishedArticle, listPublishedArticles } from "@/lib/articles";
import { isPublished, publishTimeMs } from "@/lib/publish";
import { absUrl, breadcrumbJsonLd, fullTitle, pageMeta } from "@/lib/seo";

/** Publish checks run on each request, so an article appears as soon as publish_at passes, without another deploy. */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article || !isPublished(article)) return { title: { absolute: fullTitle("Page not found") }, robots: { index: false, follow: false } };
  return pageMeta({
    title: article.title,
    description: article.metaDescription,
    path: articlePath(article),
    keywords: [article.primaryKeyword, ...article.secondaryKeywords],
    ogType: "article",
    published: new Date(publishTimeMs(article)).toISOString(),
    modified: new Date(publishTimeMs(article)).toISOString(),
  });
}

const RISK = "This page describes how the software works. It is not a recommendation to buy, sell or launch a token. Tokens can go to zero. An anti-sniper fee only makes the earliest trades more expensive. It does not stop bundles, and it does not make a launch safe. Locked liquidity cannot be pulled from the graduated pool. It does not stop a holder from selling tokens they own.";

export default async function ArticlePage({ params }: Params) {
  const { slug } = await params;
  if (!isPublishedArticle(slug)) notFound();
  const article = getArticle(slug);
  if (!article) notFound();
  const toc = [...markdownHeadings(article.body), { id: "related", label: "More guides" }, { id: "faq", label: "FAQ" }];
  const related = listPublishedArticles().filter((a) => a.slug !== article.slug).slice(0, 4);
  const url = absUrl(articlePath(article));
  const published = new Date(publishTimeMs(article)).toISOString();
  const jsonLd = [
    { "@context": "https://schema.org", "@type": "Article", headline: article.title, description: article.metaDescription, datePublished: published, dateModified: published, inLanguage: "en", mainEntityOfPage: url, url, author: { "@id": absUrl("/#organization") }, publisher: { "@id": absUrl("/#organization") }, keywords: article.primaryKeyword },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: article.faq.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) },
    breadcrumbJsonLd([["Home", "/"], ["Guides", "/articles"], [article.title, articlePath(article)]]),
  ];
  return (
    <div className="flex flex-col gap-4 pb-8">
      <TopBar />
      <nav aria-label="Breadcrumb" className="text-[13px] text-ink-3">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li><Link href="/" className="hover:text-ink">Home</Link></li>
          <li aria-hidden className="text-ink-3">/</li>
          <li><Link href="/articles" className="hover:text-ink">Guides</Link></li>
          <li aria-hidden className="text-ink-3">/</li>
          <li><span className="text-ink-2" aria-current="page">{article.title}</span></li>
        </ol>
      </nav>
      <DocsHero eyebrow="Guide" title={article.title}>
        <p>{article.metaDescription}</p>
        <p className="mt-3 text-[13px] text-ink-3">Published <time dateTime={published}>{published.slice(0, 16).replace("T", " ")} UTC</time></p>
      </DocsHero>
      <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-8">
        <div><DocsToc items={toc} /></div>
        <div className="flex min-w-0 flex-col gap-4">
          <JsonLd data={jsonLd} />
          <Note>{RISK}</Note>
          <section className="rounded-lg border border-border bg-surface p-5 shadow-card md:p-7">
            <ArticleBody markdown={article.body} />
          </section>
          <DocSection id="related" eyebrow="Next" title="More guides">
            <ul className="flex flex-col gap-2">
              {related.map((a) => <li key={a.slug}><DocLink href={articlePath(a)}>{a.title}</DocLink></li>)}
              <li><DocLink href="/articles">All guides</DocLink></li>
              <li><DocLink href="/docs">Full documentation</DocLink>, including the public on-chain addresses.</li>
            </ul>
            <div className="mt-1 flex flex-wrap gap-2">
              <LinkButton href="/launch">Launch a token</LinkButton>
              <LinkButton href="/docs" variant="secondary">Read the docs</LinkButton>
            </div>
          </DocSection>
          <DocSection id="faq" eyebrow="Questions" title="FAQ">
            {article.faq.map((f) => (
              <details key={f.question} className="group rounded-md border border-border px-4 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-ink [&::-webkit-details-marker]:hidden">
                  {f.question}<span aria-hidden className="text-ink-3 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2">{f.answer}</p>
              </details>
            ))}
          </DocSection>
        </div>
      </div>
    </div>
  );
}
