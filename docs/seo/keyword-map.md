# Keyword map

Researched 10 November 2026 for highbar.capital. This file is the map the public pages were written against. It is not a ranking report and it does not contain invented search volumes.

## How this was researched

Web search for the language people use in 2026 when they compare Solana memecoin launchpads, plus the Chrome Web Store listing for highbar's own extension. No keyword-volume tool was queried. Where a third party published a count, it is quoted with the page and the window that page used. Everywhere else, "popular" means the phrase shows up as titles, headings and product names across several independent pages, not that a volume number exists.

highbar's own figures (fees, tiers, the anti-sniper schedule, the extension fee) are not in this file as marketing claims. They live in `packages/shared` and are rendered by the guides from those constants.

## What is actually being searched

Three clusters are visibly active. A fourth is smaller but has real products behind it.

1. **The category.** "Solana token launchpad", "Solana memecoin launchpad" and "launch a memecoin on Solana" are the head terms. Every 2026 roundup uses them in the title or the H1. pump.fun is the default proper noun inside that cluster. Roundups treat it as the venue with the most launches, and they spend the rest of the page on alternatives.
2. **The alternative query.** "pump.fun alternative", and the sibling comparisons "pump.fun vs LetsBonk / bonk.fun", "Bags", "Believe", "Moonshot / Moonit" and "Meteora DBC". This is commercial investigation: the searcher already knows the bonding-curve launch and wants a different engine, fee or graduation. LetsBonk (now bonk.fun) is the name that briefly led the conversation in mid-2025. Meteora DBC is the infrastructure name that shows up once people notice Bags, Jupiter Studio, Moonshot and Believe are not separate curve programs.
3. **The feature query.** "Anti-sniper", "anti-snipe" and "dynamic fee" on a new launch. It is narrower than the category. Moonit comparisons mention an optional anti-snipe. Believe's own FAQ describes a fee that starts high and falls. Meteora's fee scheduler is the primitive. There are fewer dedicated pages than for "pump.fun alternative", which is why a single honest page can cover it without competing with a crowd of listicles.
4. **Trade from the timeline.** "Trade Solana from X / Twitter" and "Solana Chrome extension" are a product category, not a launchpad category. Sniperoo, MevX, Raindrop and SlipZero all advertise buying from X or from the page you are already on. highbar's Chrome listing, "Highbar – Trade Solana from X", is in that set. The listing checked on 10 November 2026 was version 0.4.1, updated 5 November 2026.

Phrases that look tempting and were not given their own page: "best Solana launchpad", "safe launchpad", "rug-proof", "anti-bundle", "guaranteed" and anything about a live $HIGHER price. They either ask for a ranking we will not invent, or they ask for a safety claim the product does not make. $HIGHER is not launched.

## Primary keywords

| Keyword | Intent | Why it looks active | Target URL |
| --- | --- | --- | --- |
| Solana token launchpad | Commercial | Head term on the 2026 roundups. The product category highbar is actually in. | `/solana-launchpad` |
| pump.fun alternative | Commercial comparison | Dedicated alternative and "vs" articles across Jumpbit, MadeOnSol, Clusterz, Trenchpilot, GraphDex, BLIX. | `/pump-fun-alternative` |
| launch a memecoin on Solana | Transactional | The job to be done behind the category term: create the token, not read about the market. | `/launch-a-memecoin` |
| anti-sniper token launch | Commercial | Feature term used by launchpads that sit on a decaying fee. Fewer pages than the category, so one precise page is enough. | `/anti-sniper-launch` |
| trade Solana from X | Transactional | A live Chrome-extension category (Sniperoo, MevX, Raindrop, SlipZero, and highbar's own listing). | `/trade-solana-from-x` |
| Meteora DBC | Informational | Infrastructure term. Jumpbit, MemeFees, Clusterz and Trenchpilot all explain it as the curve under several consumer launchpads, not as a site you visit. | `/articles/meteora-dbc-explained` |

## Secondary keywords

These are covered inside the primary pages. They do not get a separate URL, so the site does not publish two pages for the same question.

| Keyword | Intent | Covered on |
| --- | --- | --- |
| Solana bonding curve, graduation, DAMM v2 | Informational | `/articles/meteora-dbc-explained`, `/solana-launchpad` |
| Solana launchpad fees, creator fees | Informational | `/articles/highbar-fees` |
| pump.fun vs bonk.fun, LetsBonk, Bags, Believe, Moonshot, Jupiter Studio | Comparison | `/articles/solana-launchpads-compared` |
| anti-sniper fee, fee scheduler | Informational | `/articles/anti-sniper-fee` |
| locked liquidity, Dev Lock, Jupiter Lock | Informational | `/articles/locked-liquidity-and-dev-lock` |
| buy Solana token from Twitter, contract address on X | Informational | `/articles/trade-from-the-timeline` |
| memecoin launchpad | Commercial, broad | Home, `/solana-launchpad`. Not a separate page. |
| bonk.fun alternative | Commercial | A section of the comparison article, not its own landing page. The intent is the same as "pump.fun alternative" plus one more name. |

## Intent and the page that should rank

- Someone who wants to **understand the category** lands on `/solana-launchpad`, then the docs (`/docs`, including `#public-addresses`) if they want every account.
- Someone who wants to **switch from pump.fun** lands on `/pump-fun-alternative`. The long comparison stays on `/articles/solana-launchpads-compared` so the two URLs do not repeat the same outline.
- Someone who wants to **create a token** lands on `/launch-a-memecoin` and is sent to `/launch` to sign.
- Someone who wants the **fee toggle** lands on `/anti-sniper-launch`. The formula and the "this is not bundle-proof" argument live on `/articles/anti-sniper-fee`.
- Someone who wants the **extension** lands on `/trade-solana-from-x`. The "check the mint before you buy" habit lives on `/articles/trade-from-the-timeline`.
- `/articles` is the index. It should not try to rank for a head term of its own.

## Figures other people published

Quoted so this file can be audited. They are not highbar statistics, and the guides repeat only a couple of them, with the same attribution.

- Jumpbit, "Best Solana memecoin launchpads (October 2026)", says pump.fun handled about 33,000 to 49,000 launches a day from August to mid-October 2026, and attributes that range to pump.fun statistics. The same page describes Meteora DBC as the curve Bags, Jupiter Studio and others run on, with fees set by the launcher and graduation to DAMM v2. https://jumpbit.io/en/resources/best/launchpads
- Trenchpilot, "The other launchpads in 2026", describes pump.fun as about 78% of new Solana tokens from November 2025 to October 2026, bonk.fun (LetsBonk) on Raydium LaunchLab, and Bags plus other sites on Meteora DBC. https://trenchpilot.com/learn/launchpads/other-launchpads
- Clusterz documents the same three engines and names pump.fun, bonk.fun, Raydium LaunchLab, Meteora DBC, Bags, Moonshot and Jup Studio. https://clusterz.fun/docs/launchpads/
- MadeOnSol's comparison table (checked 10 November 2026) includes pump.fun, bonk.fun, Moonit, Bags, Believe and others, and says moon.it had been showing a maintenance page since about August 2026. https://madeonsol.com/compare-launchpads
- Believe's own FAQ, last updated April 2025, says a project is listed by posting on X with `@launchcoin`, a ticker and a name, that the coin graduates to Meteora at a $100k market cap, and that a dynamic fee starts high and falls to 2%, split evenly. The date on that FAQ is old relative to this research. https://believe.app/faqs
- Bags documents a Solana launch flow and fee sharing at https://docs.bags.fm/how-to-guides/launch-token and serves token pages on bags.fm.
- MemeFees' Meteora DBC review (page dated against an 17 October 2026 check in search snippets) describes DBC as infrastructure: integrators set the fee, Meteora takes 20% of the DBC trading fee and 0.2% of liquidity at migration. highbar's own config uses that 20% protocol share and that 0.2% cut. Confirm the rest against Meteora, not against a review. https://memefees.com/reviews/meteora-dbc
- Chrome Web Store, "Highbar – Trade Solana from X", id `oioebamfkpahdnjkbbmldepkackabhed`, version 0.4.1, updated 5 November 2026, checked 10 November 2026. https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed

Competing extension pages used only to confirm the query exists: Sniperoo (Chrome Web Store), MevX, https://raindropext.com/ and https://slipzero.app/. Their performance claims were not copied.

## What the pages must not say

- That highbar is anti-bundle, bundle-proof, sniper-proof, rug-proof or safe. The anti-sniper fee makes early buys more expensive. Locked DAMM v2 liquidity cannot be withdrawn. Neither statement is a promise about price or about bundles.
- A search volume, a market-share percentage, or a fee for a competitor, unless the sentence names the page it came from and the date. Prefer sending the reader to that page.
- That $HIGHER is live, listed or buyable. The code and the docs both say it is not launched. Cashback is paid in SOL until then.
- Testimonials, ratings, install counts, partnerships or "as seen in" lines. The Chrome listing had a tiny public rating when checked. It is not used as social proof.
- A claim that another launchpad is a scam, dead, or dishonest. Volume moving from one venue to another is not that claim.

## On-site map

| URL | Role |
| --- | --- |
| `/` | Product home. Already indexed. Links to the launchpad page and the guides. |
| `/launch` | The form. Transactional, already indexed. |
| `/docs`, `/docs#public-addresses` | Canonical reference, including the six DBC configs. |
| `/solana-launchpad` | Primary commercial page. |
| `/pump-fun-alternative` | Comparison landing. |
| `/launch-a-memecoin` | How to launch. |
| `/anti-sniper-launch` | Feature landing. |
| `/trade-solana-from-x` | Extension landing. |
| `/articles` | Index. |
| `/articles/meteora-dbc-explained` | DBC and DAMM v2. |
| `/articles/highbar-fees` | Fee walkthrough. |
| `/articles/solana-launchpads-compared` | Sourced landscape. |
| `/articles/anti-sniper-fee` | Schedule and limits. |
| `/articles/locked-liquidity-and-dev-lock` | Pool lock vs Dev Lock. |
| `/articles/trade-from-the-timeline` | How to check a mint on X. |
