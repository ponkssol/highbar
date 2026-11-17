---
title: "Bags vs Jupiter Studio: Two Meteora Launchpads Compared on Fees, Fee Sharing, Vesting and Anti-Sniping"
slug: bags-vs-jupiter-studio
meta_description: "Bags vs Jupiter Studio from official docs: fee modes and 100-earner fee sharing vs 1% or 2% fees, vesting, anti-sniping and locked DAMM v2 liquidity."
primary_keyword: bags vs jupiter studio
secondary_keywords:
  - jupiter studio vs bags
  - bags.fm vs jupiter studio
  - bags or jupiter studio
  - meteora launchpad comparison
  - bags fee sharing vs jupiter studio
date: 2026-11-17
publish_at: "2026-11-17T17:29:00+07:00"
faq:
  - question: "Do Bags and Jupiter Studio use the same infrastructure?"
    answer: "Largely. Bags' program IDs page lists Meteora DBC for the curve and Meteora DAMM v2 after migration, plus its own Fee Share programs. Jupiter's docs say Studio tokens graduate into a Meteora DAMM v2 pool."
  - question: "Which one lets me share fees with a team?"
    answer: "Bags. Its launch guide allows up to 100 fee earners per token, identified by wallet or by X, Kick or GitHub account. Jupiter Studio pays the creator's 50% of the fee to the deployer wallet."
  - question: "Which has anti-sniping?"
    answer: "Jupiter Studio, in custom mode: the fee starts at 99% and steps down to the normal fee over 1 to 5 minutes. Bags' fee docs say no current config type uses a base-fee scheduler."
  - question: "What are the graduation thresholds?"
    answer: "Bags graduates at 85 SOL in most modes, 80 SOL in Low Float and about 100 SOL in Drop Mode. Studio requires at least 15,000 USDC raised, or the SOL or JUP equivalent; meme mode graduates at a 75,000 USDC market cap."
---

Bags and Jupiter Studio are two of the best-documented launchpads built on Meteora. Both start tokens on Meteora's Dynamic Bonding Curve and graduate them into Meteora DAMM v2 pools. The differences are in what each adds on top: Bags is built around fee sharing and fee modes, while Studio focuses on quote-token choice, vesting, anti-sniping and Jupiter's audience. This comparison uses Bags' [fee modes](https://docs.bags.fm/how-to-guides/customize-token-fees), [launch guide](https://docs.bags.fm/how-to-guides/launch-token), [deployer fees](https://docs.bags.fm/how-to-guides/deployer-fees) and [program IDs](https://docs.bags.fm/principles/program-ids) pages, and Jupiter's [launching a token](https://docs.jup.ag/user-docs/launch/studio/launching-a-token) and [graduation and fees](https://docs.jup.ag/user-docs/launch/studio/graduation-and-fees) pages, checked on 17 November 2026.

We run Highbar, a third Meteora launchpad, covered briefly at the end. Neither Bags nor Jupiter is affiliated with Highbar.

## Bags vs Jupiter Studio in one table

| | Bags | Jupiter Studio |
| --- | --- | --- |
| Curve and pool | Meteora DBC, then DAMM v2 | Bonding curve, then Meteora DAMM v2 |
| Quote tokens | SOL, plus admin-reviewed custom quotes | USDC, SOL or JUP |
| Fee options | Seven SOL modes, 0.25% to 10% on the curve | 1% (meme) or 1% / 2% (custom) |
| Default fee | 2% on the curve and after migration | 1% in meme mode |
| Creator's cut | Gross claimers pool; deployer takes 25% of it on new SOL v2 configs | 50% of the fee, for the token's life |
| Fee sharing | Up to 100 earners, wallets or X, Kick, GitHub accounts | Deployer wallet only |
| Graduation | 85 SOL in most modes | At least 15,000 USDC raised or equivalent |
| Liquidity after graduation | DAMM v2 pool; Default mode compounds 25% of fees into it | All LP permanently locked on current configs |
| Anti-sniping | No current base-fee scheduler | Optional in custom mode, 99% decaying over 1–5 min |
| Supply locks and vesting | Low Float locks 96% of supply, Drop Mode 85% | Creator vesting of 0% to 80%, from graduation |

## Setting up a launch

Studio keeps it short. You connect a wallet on studio.jup.ag, choose meme or custom mode, and enter an image, name and symbol. You review the configuration, add an optional banner, description and links, then sign a message and approve the launch transaction. The token is live on the curve immediately.

Bags is built for configuration. Token Launch v2 requires a fee-share config with explicit basis points for each recipient. You choose a fee mode with `bagsConfigType`, or Default is used. Bags documents the flow for its TypeScript SDK and CLI, including lookup tables for long recipient lists. The config is saved when it is created and cannot be changed after launch.

## Fees for traders

Studio charges one fee for the token's whole life: 1% in meme mode, or 1% or 2% in custom mode, on the curve and in the DAMM v2 pool. It cannot be changed after launch.

Bags' fee depends on the mode. Default is 2% before and after migration. The ~0% Fee Mode charges 1% on the curve, then 0.25%. The 1% Fee Mode flips that: 0.25% on the curve, then 1%. Low Float starts at 2% after migration and decays toward a 0.5% floor as market cap grows. Paper Hand Tax Mode charges 10% throughout. Our [Bags fees explainer](/articles/bags-fm-fees-explained) covers each mode.

## Fees for creators

On Studio, the creator gets 50% of the fee and Jupiter gets the other 50%. That is 0.5% of each trade at 1%, or 1% at 2%, before and after graduation. You claim from the Studio token page with the deployer wallet.

On Bags, the fee splits into a platform pool, a gross claimers pool and, after migration in most modes, a compounding share. In Default mode the claimers pool is 1% of each curve trade and 0.75% after migration. On newly created SOL fee-share v2 configs, the wallet that pays for the config takes 25% of that pool, and the configured recipients share the remaining 75%. If one wallet is both, it keeps the whole pool. Bags itself warns that its "Creator" column means the gross claimers pool, not one person's final payout.

So a solo creator in Bags' Default mode and a creator on a 2% Studio token both receive about 1% of each curve trade. After graduation the Studio creator keeps 1% while the Bags Default creator receives 0.75%, because part of the fee is compounded into liquidity.

## Anti-sniping

Studio offers anti-sniping in custom mode only, off by default. When it is on, the fee starts at 99% and steps down, linearly or exponentially, over 1 to 5 minutes to the normal fee. It applies to buys and sells, and jup.ag shows a warning while it may still apply.

Bags' docs say no current config type uses a base-fee scheduler, so there is no decaying launch fee today. For context on what these fees do, see [anti-sniper fees on Solana launches](/articles/anti-sniper-fee-solana-token-launch). They raise the cost of early trades but do not stop bots.

## Graduation and liquidity

Studio graduates once the curve raises the amount set at launch, with a floor of 15,000 USDC or the equivalent. Meme mode graduates at a 75,000 USDC market cap, about 15,390 USDC raised. All LP tokens from the graduated pool are permanently locked on every current config. Some older launches unlock 50% of LP one year after graduation.

Bags graduates SOL-quoted tokens at 85 SOL in most modes, 80 SOL in Low Float and about 100 SOL in Drop Mode, into a DAMM v2 pool. The fee pages we read do not state LP lock terms for that pool. Custom-quote thresholds are set in the quote token, not converted to USD.

## Where Highbar fits

Highbar runs on the same Meteora programs with a smaller set of fixed choices. Per the [Highbar docs](/docs):

- Six fixed configs: three graduation targets (85, 150 or 250 SOL), each with the anti-sniper fee on or off.
- A 1% curve fee. Meteora keeps 0.2% and the creator earns 0.4%, 0.496% or 0.6% by tier. No extra app fee on the website.
- Graduated liquidity locked forever in two permanent DAMM v2 positions, with the creator receiving 0.6% to 0.7% of post-graduation volume including the LP rebate.
- An optional anti-sniper fee that starts at 25% and decays to about 1% over 60 seconds.

Highbar has no fee sharing, no USDC or JUP quotes and no vesting, and its audience is much smaller. Our [Meteora launchpad platforms compared](/articles/meteora-launchpad-platforms-compared) piece places all three side by side.

## Which should you choose?

- **Bags** if you are launching with collaborators who should share fees, or you want a specific fee mode or locked-supply design.
- **Jupiter Studio** if you want a USDC or JUP pair, creator vesting, a minutes-long anti-sniping window, a Studio token page with visibility on Jupiter's AlphaScan and permanently locked LP.
- **Highbar** if you want a SOL pair, a short fixed tier table and a 60-second anti-sniper option.

Preview Highbar tiers without signing on the [launch page](/launch), or trade from your timeline with the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed). Whatever you choose, re-read the live docs before you sign. This is not investment advice.
