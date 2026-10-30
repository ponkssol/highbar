import type { Metadata } from "next";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { DocsHero } from "@/components/docs/Docs";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "API docs",
  description: "Public API docs for highbar, the Solana token launchpad built on Meteora, are coming soon. Until then, see the docs for how launches work.",
  path: "/docs/api",
  keywords: ["highbar API", "Solana launchpad API"],
});

/** Placeholder until the public API docs are ready. The sidebar API link and links.ts keep pointing here. */
export default function ApiDocsPage() {
  return (
    <div className="flex flex-col gap-4 pb-8">
      <TopBar />
      <DocsHero eyebrow="Developers" title="API">
        <div className="flex flex-col items-start gap-3" data-testid="api-soon">
          <span className="num inline-flex h-6 items-center rounded-full border border-gold-line bg-gold-soft px-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-gold-text">Soon</span>
          <p>Public API docs are coming soon.</p>
          <Link href="/docs" className="text-sm text-ink-3 underline-offset-4 hover:text-ink hover:underline">Back to the docs</Link>
        </div>
      </DocsHero>
    </div>
  );
}
