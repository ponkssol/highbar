/** A few published guides for a page. Slugs that are missing or not public yet are left out. */
import { listPublishedArticles, type Article } from "./articles";

export const GUIDE_PICKS = {
  home: [
    "how-to-launch-a-solana-memecoin",
    "meteora-dynamic-bonding-curve-explained",
    "how-to-check-a-solana-token-before-buying",
    "pump-fun-alternatives-compare-solana-launchpads",
  ],
  launch: [
    "how-to-launch-a-solana-memecoin",
    "memecoin-creator-fees-solana-launchpad",
    "anti-sniper-fee-solana-token-launch",
    "meteora-dynamic-bonding-curve-explained",
  ],
  docs: [
    "meteora-dynamic-bonding-curve-explained",
    "meteora-damm-v2-explained-token-graduation",
    "dev-lock-token-lock-solana-explained",
    "memecoin-creator-fees-solana-launchpad",
  ],
} as const;

/** Published articles for `slugs`, in that order. Future and unknown slugs are skipped. */
export function pickPublished(slugs: readonly string[], now = Date.now()): Article[] {
  const bySlug = new Map(listPublishedArticles(now).map((a) => [a.slug, a]));
  const out: Article[] = [];
  for (const slug of slugs) {
    const article = bySlug.get(slug);
    if (article && !out.some((a) => a.slug === article.slug)) out.push(article);
  }
  return out;
}
