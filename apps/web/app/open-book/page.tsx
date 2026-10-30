import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";
import { JsonLd } from "@/components/JsonLd";
import { OpenBookPlatform } from "@/components/openbook/OpenBookPlatform";
import { getOpenBook, getOpenBookTokens } from "@/lib/seoData";
import { normWindow } from "@/lib/openbook";
import { absUrl, breadcrumbJsonLd, pageMeta } from "@/lib/seo";

const DESCRIPTION = "Every fee, tip and treasury movement across all highbar tokens, reconciled against Solana. See where DBC trading fees, block engine tips and network fees went, with every figure linked to its source.";

export const metadata: Metadata = pageMeta({ title: "Open Book", description: DESCRIPTION, path: "/open-book", keywords: ["highbar fees", "Meteora DBC fee split", "Solana launchpad transparency", "anti-sniper fee"] });

// API reads are cached for 60 s in lib/seoData; the page itself renders per request (window and q come from the URL).
export const revalidate = 60;

type Props = { searchParams: Promise<{ window?: string | string[]; q?: string | string[] }> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Platform-wide Open Book. Totals, treasury wallets, fee flow and the first token page are server-rendered, the rest is interactive. */
export default async function OpenBookPage({ searchParams }: Props) {
  const sp = await searchParams;
  const w = normWindow(one(sp.window)), q = one(sp.q).trim().slice(0, 64);
  const [ob, tokens] = await Promise.all([getOpenBook(w), getOpenBookTokens(q)]);
  const url = absUrl("/open-book");
  const ld = [
    { "@context": "https://schema.org", "@type": "WebPage", "@id": url, url, name: "Open Book | highbar", description: DESCRIPTION, isPartOf: { "@id": absUrl("/#website") } },
    breadcrumbJsonLd([["Home", "/"], ["Open Book", "/open-book"]]),
  ];
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <JsonLd data={ld} />
      <section>
        <TopBar />
        <h1 className="mt-0 font-display text-[24px] font-semibold tracking-wide md:mt-2 md:text-[30px]">Open Book</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-3">Every fee, tip and treasury movement across all highbar tokens, reconciled against chain. Click any number to verify it.</p>
      </section>
      <OpenBookPlatform ob={ob} tokens={tokens} window={w} q={q} />
    </div>
  );
}
