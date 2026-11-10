import Link from "next/link";
import type { ReactNode } from "react";
import { DocsHero, DocLink, DocSection, Note } from "@/components/docs/Docs";
import { DocsToc, type TocItem } from "@/components/docs/DocsToc";
import { JsonLd } from "@/components/JsonLd";
import { TopBar } from "@/components/TopBar";
import { LinkButton } from "@/components/ui";
import { isListedPath } from "@/lib/articles";
import { EXTENSION_NAME, EXTENSION_STORE_URL, GUIDES, guideByPath, guideDateLabel, type GuideEntry } from "@/lib/guideCatalog";
import { absUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";

export interface GuideFaq { q: string; a: string }

const RISK = "This page describes how the software works. It is not a recommendation to buy, sell or launch a token. Tokens can go to zero. An anti-sniper fee only makes the earliest trades more expensive. It does not stop bundles, and it does not make a launch safe. Locked liquidity cannot be pulled from the graduated pool. It does not stop a holder from selling tokens they own.";

const EXTRA_LINKS: Record<string, { h1: string; description: string }> = {
  "/docs": { h1: "Full documentation", description: "Tiers, fees, the public on-chain addresses and the FAQ." },
  "/launch": { h1: "Launch form", description: "Create a token on a Meteora DBC curve." },
  "/locks": { h1: "Dev token locks", description: "Every public creator lock and its unlock date." },
};

export function Guide({ path, eyebrow, toc, faqs, lede, cta, children }: {
  path: string;
  eyebrow: string;
  toc: TocItem[];
  faqs: GuideFaq[];
  lede: ReactNode;
  cta?: ReactNode;
  children: ReactNode;
}) {
  const g = guideByPath(path);
  const crumbs: [string, string][] = g.kind === "article"
    ? [["Home", "/"], ["Guides", "/articles"], [g.label, g.path]]
    : [["Home", "/"], [g.label, g.path]];
  const fullToc = [...toc, { id: "related", label: "Keep reading" }, { id: "faq", label: "FAQ" }];
  const related = g.related.map((p) => {
    const found = GUIDES.find((x) => x.path === p);
    if (found) return { path: found.path, h1: found.h1, description: found.description };
    const extra = EXTRA_LINKS[p];
    return extra ? { path: p, ...extra } : null;
  }).filter((x): x is { path: string; h1: string; description: string } => !!x && isListedPath(x.path));
  return (
    <div className="flex flex-col gap-4 pb-8">
      <TopBar />
      <nav aria-label="Breadcrumb" className="text-[13px] text-ink-3">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {crumbs.map(([name, href], i) => (
            <li key={href} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden className="text-ink-3">/</span>}
              {i === crumbs.length - 1 ? <span className="text-ink-2" aria-current="page">{name}</span> : <Link href={href} className="hover:text-ink">{name}</Link>}
            </li>
          ))}
        </ol>
      </nav>
      <DocsHero eyebrow={eyebrow} title={g.h1}>
        <div className="flex flex-col gap-2">{lede}</div>
        <p className="mt-3 text-[13px] text-ink-3">Updated <time dateTime={g.updated}>{guideDateLabel(g.updated)}</time></p>
      </DocsHero>
      <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-8">
        <div><DocsToc items={fullToc} /></div>
        <div className="flex min-w-0 flex-col gap-4">
          <JsonLd data={guideJsonLd(g, crumbs, faqs)} />
          <Note>{RISK}</Note>
          {children}
          <DocSection id="related" eyebrow="Next" title="Keep reading">
            <ul className="flex flex-col gap-2">
              {related.map((r) => (
                <li key={r.path}><DocLink href={r.path}>{r.h1}</DocLink><span className="text-ink-3">. {r.description}</span></li>
              ))}
            </ul>
            <div className="mt-1 flex flex-wrap gap-2">{cta ?? <DefaultCtas />}</div>
          </DocSection>
          <DocSection id="faq" eyebrow="Questions" title="FAQ">
            {faqs.map((f) => (
              <details key={f.q} className="group rounded-md border border-border px-4 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-ink [&::-webkit-details-marker]:hidden">
                  {f.q}<span aria-hidden className="text-ink-3 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2">{f.a}</p>
              </details>
            ))}
          </DocSection>
        </div>
      </div>
    </div>
  );
}

function DefaultCtas() {
  return (
    <>
      <LinkButton href="/launch">Launch a token</LinkButton>
      <LinkButton href="/docs" variant="secondary">Read the docs</LinkButton>
    </>
  );
}

export function ExtensionCtas() {
  return (
    <>
      <a href={EXTENSION_STORE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded border border-ink bg-ink px-4 text-sm font-medium text-on-ink hover:opacity-90">Add {EXTENSION_NAME}</a>
      <LinkButton href="/launch" variant="secondary">Launch on the site</LinkButton>
    </>
  );
}

function guideJsonLd(g: GuideEntry, crumbs: [string, string][], faqs: GuideFaq[]) {
  const url = absUrl(g.path);
  const org = { "@id": absUrl("/#organization") };
  const page = g.kind === "article"
    ? { "@context": "https://schema.org", "@type": "Article", headline: g.h1, description: g.description, datePublished: g.published, dateModified: g.updated, inLanguage: "en", mainEntityOfPage: url, url, author: org, publisher: org, about: g.primaryKeyword }
    : {
      "@context": "https://schema.org", "@type": g.kind === "index" ? "CollectionPage" : "WebPage", name: g.h1, description: g.description, url, inLanguage: "en",
      isPartOf: { "@id": absUrl("/#website") }, about: g.primaryKeyword,
      ...(g.kind === "index" ? { hasPart: GUIDES.filter((x) => x.kind !== "index").map((x) => ({ "@type": x.kind === "article" ? "Article" : "WebPage", name: x.h1, url: absUrl(x.path) })) } : {}),
    };
  const extra = g.path === "/trade-solana-from-x" ? [extensionJsonLd()] : [];
  return [
    page,
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    breadcrumbJsonLd(crumbs),
    ...extra,
  ];
}

function extensionJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: EXTENSION_NAME,
    applicationCategory: "BrowserApplication",
    operatingSystem: "Chrome",
    url: EXTENSION_STORE_URL,
    installUrl: EXTENSION_STORE_URL,
    description: "Chrome extension that trades and launches Solana tokens from posts on X. Wallet keys are stored on the device. Extension trades add a 0.02% fee on the SOL amount.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@type": "Organization", name: SITE_NAME, url: absUrl("/") },
    isAccessibleForFree: true,
  };
}

export function GuideIndexBody() {
  const landings = GUIDES.filter((g) => g.kind === "landing");
  const articles = GUIDES.filter((g) => g.kind === "article");
  return (
    <>
      <DocSection id="start" eyebrow="Launchpad" title="Start here">
        <ul className="grid gap-3 sm:grid-cols-2">
          {landings.map((g) => <GuideCard key={g.path} g={g} />)}
        </ul>
      </DocSection>
      <DocSection id="articles" eyebrow="Explainers" title="Articles">
        <ul className="flex flex-col gap-3">
          {articles.map((g) => <GuideCard key={g.path} g={g} />)}
        </ul>
      </DocSection>
    </>
  );
}

function GuideCard({ g }: { g: GuideEntry }) {
  return (
    <li>
      <Link href={g.path} className="block h-full rounded-md border border-border px-4 py-3 transition-colors hover:border-gold-line">
        <div className="hb-eyebrow">{g.kind === "article" ? "Article" : "Page"}</div>
        <h3 className="mt-2 text-[15px] font-semibold text-ink">{g.h1}</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-3">{g.description}</p>
      </Link>
    </li>
  );
}
