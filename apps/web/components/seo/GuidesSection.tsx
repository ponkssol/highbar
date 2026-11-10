import Link from "next/link";
import { articlePath } from "@/lib/articles";
import { pickPublished } from "@/lib/guidePicks";

/** Small server-rendered list of published guides. Renders nothing when none of the slugs are public yet. */
export function GuidesSection({ slugs, id }: { slugs: readonly string[]; id: string }) {
  const articles = pickPublished(slugs);
  if (!articles.length) return null;
  return (
    <section aria-labelledby={`${id}-title`} data-testid="guides-section" className="mt-6 border-t border-border pt-6 text-sm text-ink-3">
      <h2 id={`${id}-title`} className="text-base font-semibold tracking-tight text-ink">Guides</h2>
      <ul className="mt-3 flex max-w-3xl flex-col gap-2">
        {articles.map((a) => (
          <li key={a.slug}>
            <Link href={articlePath(a)} className="text-ink-2 underline decoration-border underline-offset-2 hover:text-ink">{a.title}</Link>
          </li>
        ))}
      </ul>
      <p className="mt-3">
        <Link href="/articles" className="text-ink-2 underline decoration-border underline-offset-2 hover:text-ink">All guides</Link>
      </p>
    </section>
  );
}
