# Adding articles

Guides under `/articles` are Markdown files. Shipping a new batch is a deploy of those files. After that, each article appears on its own at `publish_at`, with no further deploy.

## Where files go

Put one file per article in `apps/web/content/articles/`:

```
apps/web/content/articles/<slug>.md
```

The file name and the `slug` field must match. `index.md` in that folder is a batch note for people editing the repo. It is not a page, not a sitemap URL, and not listed in `/llms.txt`.

The site reads the directory on each request (`force-dynamic` on `/articles`, `/articles/[slug]`, `/rss.xml`, `/llms.txt` and `/llms-full.txt`). The sitemap is rebuilt about once a minute (`revalidate` of 60 on `app/sitemap.ts`) and includes an article only after it is public. A future `publish_at` does not need a second deploy: the next request after that instant shows the article.

## Frontmatter

```yaml
---
title: "How to Launch a Solana Memecoin: A Step-by-Step Guide"
slug: how-to-launch-a-solana-memecoin
meta_description: "One or two sentences for the meta description and the index card."
primary_keyword: how to launch a Solana memecoin
secondary_keywords:
  - create a Solana token
  - Solana token launchpad
date: 2026-11-10
publish_at: "2026-11-10T13:00:00+07:00"
faq:
  - question: "Do I need to write a smart contract?"
    answer: "No. You fill in the form and sign one transaction."
---
```

| Field | Required | Use |
| --- | --- | --- |
| `title` | yes | H1 and document title. The site adds ` \| highbar Meteora Launchpad`. |
| `slug` | yes | URL `/articles/<slug>`. Lowercase words and hyphens. Must match the file name. |
| `meta_description` | yes | Meta description, Open Graph, index card, RSS. |
| `primary_keyword` | yes | First keyword. Also stored on the Article JSON-LD. |
| `secondary_keywords` | yes | List of strings. Can be empty, but the key must be a list. |
| `date` | yes | `YYYY-MM-DD`. Used when `publish_at` is omitted. |
| `publish_at` | no | ISO 8601 **with a timezone**, quoted, for example `"2026-11-10T13:47:00+07:00"` or a `Z` time. Quote it so the file keeps the offset you wrote. |
| `faq` | yes | At least one `question` / `answer` pair. Rendered on the page and as FAQPage JSON-LD. The answer text on the page is the same string as the JSON-LD. |

## publish_at

- If `publish_at` is in the future, the article is hidden. `/articles/<slug>` returns 404 (and a noindex title, not the article title). It is left out of the index, the sitemap, `/rss.xml`, `/llms.txt`, `/llms-full.txt`, the docs "Guides" list, related links, and JSON-LD `hasPart`.
- Links in other pages that point at an article which is not public yet render as plain text, so the URL is not advertised early.
- When the clock passes `publish_at`, the next request includes it. Nothing is rebuilt by hand.
- If `publish_at` is missing, the article becomes public at `00:00:00Z` on `date`. A date of today is already public. A date of tomorrow stays hidden until that UTC midnight.
- `publish_at` without a timezone is rejected when the file is read. Fix the file; do not rely on the server's local zone.
- If a deploy happens after a scheduled time, that article is public immediately. The schedule does not delay something whose time has already passed.

The 2026-11-10 batch uses WIB (`+07:00`), from 13:00 to 19:45, forty-five minutes apart, in the order listed in `content/articles/index.md`.

## What else is generated

You do not register a route, a sitemap row, or an llms line.

- `/articles` lists public articles, oldest publish time first.
- `/articles/<slug>` renders the Markdown (headings, lists, tables, links) with the site header, a table of contents, the FAQ, Article JSON-LD, FAQPage JSON-LD and a breadcrumb.
- `/rss.xml` is the same public set.
- `/llms.txt` adds a link line per public article. `/llms-full.txt` appends the full Markdown and FAQ.
- The sitemap adds each public article with `lastModified` set to its publish instant.

## Writing rules

Match the facts in `packages/shared` and the docs. Fee percentages, tier targets (85 / 150 / 250 SOL), the anti-sniper schedule (25% to about 1% over 60 seconds, off by default) and the extension fee (0.02% of the SOL amount on extension transactions only) come from that code.

Do not write that Highbar is anti-bundle, bundle-proof, rug-proof, sniper-proof or guaranteed safe. The anti-sniper fee makes early buys more expensive. Locked DAMM v2 liquidity cannot be withdrawn. Neither claim is a promise about price, bundles or demand. `$HIGHER` is not live.

Link other guides with root-relative paths, `[label](/articles/<slug>)`, and the site with `/docs`, `/launch`, `/locks`. The Chrome extension listing, checked reachable on 10 November 2026, is `https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed`. If that URL stops resolving, remove the link instead of leaving a dead one.

## Check

From `apps/web`:

```
pnpm test
pnpm typecheck
```

`lib/articles.test.ts` locks the 2026-11-10 schedule: nothing is public at 05:59 UTC, only the first guide is public at 06:00 UTC (13:00 WIB), and all ten are public at 12:45 UTC (19:45 WIB).
