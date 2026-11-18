---
title: "Heaven vs Jupiter Studio: No-Migration AMM vs Meteora Curve, Fees and Creator Earnings Compared"
slug: heaven-vs-jupiter-studio
meta_description: "Heaven vs Jupiter Studio from official docs: free standardized launches on Heaven's own AMM vs Studio's configurable Meteora curve, fees and vesting."
primary_keyword: heaven vs jupiter studio
secondary_keywords:
  - jupiter studio vs heaven
  - heaven launchpad vs jupiter
  - heaven.xyz vs studio.jup.ag
  - heaven creator fees
  - jupiter studio alternative
date: 2026-11-18
publish_at: "2026-11-18T14:17:00+07:00"
faq:
  - question: "What is the main difference between Heaven and Jupiter Studio?"
    answer: "Heaven runs launches on its own AMM from day one, using virtual SOL instead of a bonding curve that migrates. Jupiter Studio launches on a bonding curve that graduates into a Meteora DAMM v2 pool with permanently locked LP on current configs."
  - question: "Which pays creators more?"
    answer: "It depends on the setup. Studio pays the creator 50% of a 1% or 2% lifetime fee. Heaven pays 1% to coins reviewed as Creator coins and 0.1% to Community coins, per its fees page. Fees only exist if people trade."
  - question: "Can I customize the launch on Heaven?"
    answer: "Barely, by design. Heaven's docs say every launch uses the same parameters, and only the logo, name, ticker, description and social links are customizable. Studio's custom mode lets you set market caps, quote token, fee level, vesting and anti-sniping."
  - question: "Does either platform charge to create a token?"
    answer: "Heaven's fees page lists creating a coin as free. Studio's launch guide says you need SOL for the network fee and account rent, under 0.05 SOL, with no initial buy required."
---

Heaven and Jupiter Studio take opposite views on how much a creator should configure. Heaven standardizes everything and runs coins on its own AMM from the first trade. Studio offers a preconfigured meme mode and a custom mode with quote tokens, market caps, vesting and an anti-sniping fee, all on a Meteora curve. This comparison uses Heaven's pages on [fees](https://docs.heaven.xyz/fees), [permissioned fees](https://docs.heaven.xyz/permissioned), [its curve](https://docs.heaven.xyz/curve), [standardized launches](https://docs.heaven.xyz/standardized) and [permissionless launches](https://docs.heaven.xyz/permissionless), and Jupiter's Studio pages on [launching a token](https://docs.jup.ag/user-docs/launch/studio/launching-a-token) and [graduation and fees](https://docs.jup.ag/user-docs/launch/studio/graduation-and-fees), read on 18 November 2026.

We run Highbar, a Meteora launchpad. Neither Heaven nor Jupiter is affiliated with us.

## Heaven vs Jupiter Studio at a glance

| | Heaven | Jupiter Studio |
| --- | --- | --- |
| Where coins trade | Heaven's own AMM from day one | Meteora bonding curve, then Meteora DAMM v2 |
| Quote token | SOL | USDC, SOL or JUP |
| Cost to launch | Free | Network fee and rent, under 0.05 SOL |
| Configuration | Standardized; only logo, name, ticker, description, links | Meme mode fixed; custom mode adjustable |
| Trading fee | 1% protocol under $100k market cap, then 0.25% or 0.5%; plus creator fee | 1% (meme) or 1% / 2% (custom), for life |
| Creator share | 1% for reviewed Creator coins; 0.1% for Community coins | 50% of the transaction fee |
| Anti-sniping | Not a launch setting | Optional in custom mode: 99% start, 1 to 5 minutes |
| Creator vesting | Not described | 0% to 80% of supply, from graduation |

## How launches work

### Heaven: no migration

Heaven's curve page says there is no bonding curve to migrate from. Each pool behaves as though it were seeded with 35 SOL of virtual liquidity, even though launching is free, and nobody can sell into that virtual SOL. Coins trade on Heaven's AMM from day one. A "virtual migration" cap of $100k exists so screeners can show coins in a familiar way. Heaven says it is still experimenting with the opening virtual SOL amount.

The permissionless page says every launch is free, takes under five seconds and is not monitored or restricted. The standardized page says all launches use the exact same parameters.

### Jupiter Studio: meme or custom

Studio's launch flow has three steps: basics, enhance and share. Meme mode is fixed: USDC quote, 5,000 USDC starting market cap, graduation at 75,000 USDC after about 15,390 USDC is raised, a 1% fee, no anti-sniping and no vesting. Custom mode lets you choose USDC, SOL or JUP, set the starting and graduation market caps with a minimum raise of 15,000 USDC or the equivalent, pick a 1% or 2% fee, add creator vesting and turn on anti-sniping.

When a Studio token graduates, the raised quote tokens and the migrating supply go into a Meteora DAMM v2 pool, and all LP tokens are permanently locked on every current config. Some older launches used configs that unlock 50% of LP after a year. A token that never graduates stays on the curve.

## Fees and creator earnings

### Heaven

Heaven's fees page has two parts. Protocol fees go to its $LIGHT flywheel: 1% while a coin trades under $100k market cap, then 0.25% for a Community coin or 0.5% for a Creator coin. Creator fees are 0.1% for a Community coin and 1% for a Creator coin.

Which category applies is decided by Heaven's permissioned fee system. The deployer chooses Creator or Community at launch. A Community choice skips review. A Creator choice starts Heaven's admin review, which the docs tie to launches passing $100k in volume, and the coin gets an "In review" tag. The 1% creator fee is held by Heaven's contract until the review ends. If the coin is confirmed as Creator, the fees are released. If it is classed as Community, 90% of the fees collected so far go to buybacks and the deployer gets the 0.1% share from then on. Coins classed as Blocked send all creator fees to buybacks. Heaven states clearly that Creator status is not a safety check or stamp of approval.

### Jupiter Studio

Studio's transaction fee applies to every buy and sell for the token's whole life, before and after graduation. It is 1% in meme mode and 1% or 2% in custom mode, fixed at launch, and split 50% to the creator and 50% to Jupiter. The creator claims from the Studio token page with the deployer wallet.

In short, Heaven's top creator rate is higher but depends on admin review. Studio's rate is fixed at launch and does not depend on review.

## Anti-sniping and early trading

Studio's custom mode offers an anti-sniping fee that starts at 99% when trading opens and steps down to the chosen transaction fee over one to five minutes, linear or exponential. It replaces the normal fee, applies to buys and sells, and jup.ag shows a warning while it may apply.

Heaven takes a different view on its permissionless page: the more new deploys there are, the less room there is for automated sniping to be profitable. It does not describe a decaying launch fee in the pages we read.

Neither approach stops bots or Jito bundles. A high early fee makes being first more expensive. It does not prevent buying.

## Who each one suits

- **Heaven** suits creators who want a free, standard launch on one venue and can show they are the real team or artist if they want the 1% creator fee.
- **Jupiter Studio** suits creators who want to pick a quote token, vest their own allocation, or use an anti-sniping fee, and who want a fixed fee split.

For more background, see our [Heaven launchpad review](/articles/heaven-launchpad-review) and [Jupiter Studio vs Highbar](/articles/jupiter-studio-vs-highbar). The live docs win where they differ.

## Where Highbar fits

Highbar sits between the two. Like Studio, it uses a Meteora Dynamic Bonding Curve and graduates into a Meteora DAMM v2 pool with permanently locked liquidity. Like Heaven, it keeps choices short. Per the [Highbar docs](/docs), you pick one of three SOL targets, 85, 150 or 250 SOL, and decide whether the anti-sniper fee is on. Every curve trade pays 1%. Meteora keeps 0.2%, and the creator earns 0.4%, 0.496% or 0.6% by tier with no review step. After graduation, creators receive 0.6% to 0.7% of volume including the creator LP rebate. The optional anti-sniper fee starts at 25% and decays to about 1% over 60 seconds, and it is off by default. It only makes early buys more expensive and does not stop bots or Jito bundles.

Highbar has no USDC or JUP quote and no creator vesting setting; creators who want to commit tokens can use a separate, permanent Dev Lock.

## Bottom line

Heaven is a free, standardized launch on its own AMM with a review-based creator fee. Jupiter Studio is a configurable Meteora launch with a fixed lifetime fee split. Pick the trade-off you want, then read the fee on the confirmation screen. To compare Highbar's tiers, open the [launch page](/launch). If you trade from X, the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) lets you trade Solana tokens from posts with keys stored on your device. This is not investment advice.
