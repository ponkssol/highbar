/** Public guide and landing pages. Sitemap, /llms.txt, /docs and the articles index all read this list. */
import type { Metadata } from "next";
import { pageMeta } from "./seo";

export const GUIDE_DATE = "2026-11-10";
/** Chrome Web Store listing checked 10 November 2026 (version 0.4.1, updated 5 November 2026). */
export const EXTENSION_NAME = "Highbar – Trade Solana from X";
export const EXTENSION_STORE_URL = "https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed";
export const EXTENSION_VERSION_CHECKED = "0.4.1";

export type GuideKind = "landing" | "article" | "index";

export interface GuideEntry {
  path: string;
  kind: GuideKind;
  /** Breadcrumb and card label. */
  label: string;
  /** Document title, without the site suffix. */
  title: string;
  h1: string;
  description: string;
  keywords: string[];
  /** Primary query this URL is meant to answer. */
  primaryKeyword: string;
  intent: "commercial" | "transactional" | "informational";
  published: string;
  updated: string;
  related: string[];
}

export const GUIDES: GuideEntry[] = [
  {
    path: "/solana-launchpad",
    kind: "landing",
    label: "Solana launchpad",
    title: "Solana token launchpad",
    h1: "A Solana token launchpad on Meteora",
    description: "Launch a Solana token on highbar. Pick a Meteora DBC tier at 85, 150 or 250 SOL and graduate to a locked DAMM v2 pool.",
    keywords: ["Solana token launchpad", "Solana memecoin launchpad", "Meteora launchpad", "bonding curve launchpad"],
    primaryKeyword: "Solana token launchpad",
    intent: "commercial",
    published: GUIDE_DATE,
    updated: GUIDE_DATE,
    related: ["/launch-a-memecoin", "/pump-fun-alternative", "/articles/meteora-dynamic-bonding-curve-explained", "/docs"],
  },
  {
    path: "/pump-fun-alternative",
    kind: "landing",
    label: "pump.fun alternative",
    title: "pump.fun alternative",
    h1: "A pump.fun alternative on Meteora",
    description: "How highbar compares with a pump.fun-style launch: Meteora DBC, three targets, a 1% curve fee, optional anti-sniper and locked DAMM v2 liquidity.",
    keywords: ["pump.fun alternative", "pump fun alternative", "Solana launchpad comparison", "bonk.fun alternative"],
    primaryKeyword: "pump.fun alternative",
    intent: "commercial",
    published: GUIDE_DATE,
    updated: GUIDE_DATE,
    related: ["/articles/pump-fun-alternatives-compare-solana-launchpads", "/solana-launchpad", "/anti-sniper-launch", "/launch"],
  },
  {
    path: "/launch-a-memecoin",
    kind: "landing",
    label: "Launch a memecoin",
    title: "Launch a memecoin on Solana",
    h1: "Launch a memecoin on Solana",
    description: "Create a Solana memecoin on highbar: name, image, tier, optional anti-sniper fee and a dev buy of up to 20 SOL on a Meteora curve.",
    keywords: ["launch a memecoin on Solana", "create Solana token", "launch memecoin", "Solana token creator"],
    primaryKeyword: "launch a memecoin on Solana",
    intent: "transactional",
    published: GUIDE_DATE,
    updated: GUIDE_DATE,
    related: ["/launch", "/articles/memecoin-creator-fees-solana-launchpad", "/anti-sniper-launch", "/docs"],
  },
  {
    path: "/anti-sniper-launch",
    kind: "landing",
    label: "Anti-sniper launch",
    title: "Anti-sniper token launch",
    h1: "Anti-sniper token launches on Solana",
    description: "On highbar the optional anti-sniper fee starts at 25% and falls to about 1% over 60 seconds. It is off by default and does not make a launch safe.",
    keywords: ["anti-sniper token launch", "anti sniper solana", "sniper fee bonding curve", "fair launch fee"],
    primaryKeyword: "anti-sniper token launch",
    intent: "commercial",
    published: GUIDE_DATE,
    updated: GUIDE_DATE,
    related: ["/articles/anti-sniper-fee-solana-token-launch", "/launch-a-memecoin", "/launch", "/docs"],
  },
  {
    path: "/trade-solana-from-x",
    kind: "landing",
    label: "Trade from X",
    title: "Trade Solana from X",
    h1: "Trade Solana from X",
    description: "Highbar’s Chrome extension trades and launches Solana tokens from posts on X. Keys stay on the device. Extension trades add a 0.02% fee.",
    keywords: ["trade Solana from X", "trade Solana from Twitter", "Solana Chrome extension", "buy memecoin from Twitter"],
    primaryKeyword: "trade Solana from X",
    intent: "transactional",
    published: GUIDE_DATE,
    updated: GUIDE_DATE,
    related: ["/articles/trade-solana-from-x-chrome-extension", "/solana-launchpad", "/launch", "/docs"],
  },
  {
    path: "/articles",
    kind: "index",
    label: "Guides",
    title: "Guides",
    h1: "Guides to launching and trading on highbar",
    description: "Plain-language guides to highbar: Meteora DBC launches, fees and tiers, anti-sniper, locked liquidity, and trading Solana from X.",
    keywords: ["highbar guide", "Solana launchpad guide", "Meteora DBC guide"],
    primaryKeyword: "Solana launchpad guide",
    intent: "informational",
    published: GUIDE_DATE,
    updated: GUIDE_DATE,
    related: ["/docs", "/solana-launchpad", "/launch"],
  },
];

const paths = GUIDES.map((g) => g.path);
if (new Set(paths).size !== paths.length) throw new Error("duplicate guide paths");
for (const g of GUIDES) for (const r of g.related) if (!paths.includes(r) && !r.startsWith("/docs") && !r.startsWith("/launch") && !r.startsWith("/locks") && !r.startsWith("/articles/")) throw new Error(`guide ${g.path} related unknown: ${r}`);

export const guideByPath = (path: string) => {
  const g = GUIDES.find((x) => x.path === path);
  if (!g) throw new Error(`unknown guide ${path}`);
  return g;
};

export function guidePageMeta(path: string): Metadata {
  const g = guideByPath(path);
  return pageMeta({
    title: g.title,
    description: g.description,
    path: g.path,
    keywords: [g.primaryKeyword, ...g.keywords],
    ogType: g.kind === "article" ? "article" : "website",
    published: g.published,
    modified: g.updated,
  });
}

export const guideDateLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Markdown list of every guide, for /llms.txt and /llms-full.txt. */
export function guidesMarkdown(site: string) {
  const lines = GUIDES.map((g) => `- [${g.h1}](${site}${g.path}): ${g.description}`);
  return ["## Guides", "", "Shorter pages for the same facts. The figures match the sections above.", "", ...lines].join("\n");
}
