/** Page metadata, canonical URLs and JSON-LD for the server-rendered routes. Server components only: SITE_URL is a runtime server env. */
import type { Metadata } from "next";

export const SITE_NAME = "highbar";
export const X_URL = "https://x.com/highbar_capital";
export const siteUrl = () => (process.env.SITE_URL || "https://highbar.capital").replace(/\/+$/, "");
export const absUrl = (path: string) => `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;

/** Sitewide keywords; pages put their own in front. */
export const DEFAULT_KEYWORDS = [
  "Solana token launchpad", "launch a Solana memecoin", "memecoin launchpad", "Solana bonding curve", "built on Meteora",
  "Meteora launchpad", "Meteora DBC", "Meteora DAMM v2", "anti-sniper fee", "Dev Lock", "Jupiter Lock",
];
/** Default share card (same as the root layout's). Routes with an opengraph-image file use that instead. */
const OG_IMAGE = { url: "https://highbar.capital/og/og-main.png", width: 1200, height: 630, alt: "highbar: Rise above the bar" };
const TW_IMAGE = { url: "https://highbar.capital/og/og-main-twitter.png", width: 1200, height: 675, alt: "highbar: Rise above the bar" };

export interface PageMetaInput {
  /** Page name without the brand; the title becomes "<title> | highbar" (or `absoluteTitle` as is). */
  title?: string; absoluteTitle?: string; description: string; path: string; keywords?: string[]; noindex?: boolean;
  /** false: the route has its own opengraph-image / twitter-image files, do not set images here. */
  images?: boolean;
}
export function pageMeta({ title, absoluteTitle, description, path, keywords = [], noindex = false, images = true }: PageMetaInput): Metadata {
  const full = absoluteTitle ?? `${title} | ${SITE_NAME}`;
  return {
    metadataBase: new URL(siteUrl()),
    title: { absolute: full },
    description,
    keywords: [...new Set([...keywords, ...DEFAULT_KEYWORDS])],
    alternates: { canonical: path },
    robots: noindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: { type: "website", siteName: SITE_NAME, title: full, description, url: path, ...(images ? { images: [OG_IMAGE] } : {}) },
    twitter: { card: "summary_large_image", site: "@highbar_capital", title: full, description, ...(images ? { images: [TW_IMAGE] } : {}) },
  };
}

/** Root JSON-LD (rendered from the home page, so app/layout.tsx stays byte for byte). */
export const siteJsonLd = () => [
  { "@context": "https://schema.org", "@type": "Organization", "@id": `${siteUrl()}/#organization`, name: SITE_NAME, url: siteUrl(), logo: absUrl("/icon.png"), sameAs: [X_URL],
    description: "highbar is a Solana token launchpad built on Meteora: tiered Meteora DBC bonding curves that graduate to Meteora DAMM v2." },
  { "@context": "https://schema.org", "@type": "WebSite", "@id": `${siteUrl()}/#website`, name: SITE_NAME, url: siteUrl(), publisher: { "@id": `${siteUrl()}/#organization` },
    description: "Launch a Solana memecoin on a Meteora bonding curve with an anti-sniper fee, Dev Lock and locked DAMM v2 liquidity." },
];
export const breadcrumbJsonLd = (items: [string, string][]) => ({
  "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: absUrl(path) })),
});
/** Serialized for a <script type="application/ld+json">: "<" escaped so text from token metadata can never close the tag. */
export const jsonLdString = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

/** Cut text to `max` characters on a word boundary. */
export function clip(s: string, max: number) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).replace(/[\s,.;:]+$/, "")}…`;
}
