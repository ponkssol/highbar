import type { Metadata } from "next";
import { V2Guides, type GuideCard } from "@/components/v2/GuidesPage";
import { listPublishedArticles } from "@/lib/articles";

function guideBucket(title: string, keyword: string): GuideCard["bucket"] {
  const s = `${title} ${keyword}`.toLowerCase();
  if (/safe|verify|authority|wallet|scam|check|burner/.test(s)) return "Safety";
  if (/trade|buy|fee|priority|slippage|chart|price/.test(s)) return "Trading";
  return "Launching";
}

export const metadata: Metadata = { title: "Guides" };

export default function Page() {
  const landings: GuideCard[] = [
    { slug: "solana-launchpad", title: "Solana token launchpad", date: "Landing", blurb: "Launch a Solana token on a Meteora curve.", bucket: "Launching", href: "/solana-launchpad" },
    { slug: "launch-a-memecoin", title: "Launch a memecoin", date: "Landing", blurb: "Step through a highbar launch.", bucket: "Launching", href: "/launch-a-memecoin" },
    { slug: "pump-fun-alternative", title: "pump.fun alternative", date: "Landing", blurb: "How highbar compares.", bucket: "Trading", href: "/pump-fun-alternative" },
    { slug: "anti-sniper-launch", title: "Anti-sniper launch", date: "Landing", blurb: "The decaying launch fee.", bucket: "Safety", href: "/anti-sniper-launch" },
    { slug: "trade-solana-from-x", title: "Trade Solana from X", date: "Landing", blurb: "The highbar extension.", bucket: "Trading", href: "/trade-solana-from-x" },
  ];
  const guides: GuideCard[] = [
    ...landings,
    ...listPublishedArticles().map((a) => ({
      slug: a.slug,
      title: a.title,
      date: a.date,
      blurb: a.metaDescription,
      bucket: guideBucket(a.title, a.primaryKeyword),
    })),
  ];
  return <V2Guides guides={guides} />;
}
