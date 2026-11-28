import Link from "next/link";
import { articlePath } from "@/lib/articles";
import { pickPublished } from "@/lib/guidePicks";

/** Small server-rendered list of published guides. Renders nothing when none of the slugs are public yet.
 *  variant "cards" is the home-page grid from the mockup. */
export function GuidesSection({ slugs, id, variant = "list" }: { slugs: readonly string[]; id: string; variant?: "list" | "cards" }) {
  const articles = pickPublished(slugs);
  if (!articles.length) return null;
  if (variant === "cards") {
    return (
      <section className="sec" aria-labelledby={`${id}-title`}>
        <div className="head"><div><div className="bul">Guides</div><h2 id={`${id}-title`} className="h2">Know the curve <span>before you climb.</span></h2></div><Link className="btn sm" href="/articles"><b>All guides</b><i>→</i></Link></div>
        <div className="gd" data-testid="guides-section">
          {articles.map((a, i) => (
            <Link key={a.slug} href={articlePath(a)}><span className="idx">{`{0${i + 1}}`}</span><h4>{a.title}</h4><span className="dim mono" style={{ fontSize: 12 }}>Read guide →</span></Link>
          ))}
        </div>
      </section>
    );
  }
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
