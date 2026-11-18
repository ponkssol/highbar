---
title: "Moonshot vs Jupiter Studio: App Launches vs Configurable Meteora Launches, Fees and Graduation"
slug: moonshot-vs-jupiter-studio
meta_description: "Moonshot vs Jupiter Studio from official docs: $10 USDC creation vs under 0.05 SOL, creator fee rates, graduation at $1M vs 75,000 USDC, anti-sniping."
primary_keyword: moonshot vs jupiter studio
secondary_keywords:
  - jupiter studio vs moonshot
  - moonshot vs jup studio
  - moonshot creator fee vs jupiter studio
  - moonshot alternative
  - jupiter studio alternative
date: 2026-11-18
publish_at: "2026-11-18T19:35:00+07:00"
faq:
  - question: "Which is cheaper to launch on, Moonshot or Jupiter Studio?"
    answer: "Moonshot's troubleshooting page says creating a coin costs $10, payable only in USDC. Studio's launch guide says you need SOL for the network fee and account rent, under 0.05 SOL in total, with no initial buy required."
  - question: "How much does a creator earn on each?"
    answer: "Moonshot lists 0.25% of every trade before bonding and up to 0.15% after, configurable in the create form. Studio pays the creator 50% of a 1% or 2% fee for the token's whole life, so 0.5% or 1% of each trade."
  - question: "When does a coin graduate?"
    answer: "Moonshot says bonding begins at a $1 million market cap. Studio's meme mode graduates at a 75,000 USDC market cap, about 15,390 USDC raised; custom mode lets the creator set it, with at least 15,000 USDC or the equivalent raised."
  - question: "Does either offer an anti-sniper fee?"
    answer: "Studio's custom mode has a fee starting at 99% that falls to the normal fee over 1 to 5 minutes. It makes early buys more expensive and does not stop bots or Jito bundles. We did not find an anti-sniper setting in Moonshot's create docs."
---

Moonshot and Jupiter Studio both make launching a Solana coin quick, but the experience is very different. Moonshot is an app with a Create tab: fill in a few fields, set a buy amount and creator fee, swipe. Studio is a web launcher with a fixed meme mode and a custom mode that exposes the quote token, market caps, fee level, vesting and anti-sniping. This comparison uses Moonshot's pages on [creating a coin](https://support.moonshot.com/coins/create), [creator fees](https://support.moonshot.com/coins/create/creator-fees), [bonding](https://support.moonshot.com/coins/create/bonding), [trading fees](https://support.moonshot.com/trade/fees) and [troubleshooting](https://support.moonshot.com/coins/create/troubleshooting), and Studio's pages on [launching a token](https://docs.jup.ag/user-docs/launch/studio/launching-a-token) and [graduation and fees](https://docs.jup.ag/user-docs/launch/studio/graduation-and-fees), read on 18 November 2026.

We run Highbar, a SOL-paired Meteora launchpad. Neither Moonshot nor Jupiter is affiliated with us.

## Moonshot vs Jupiter Studio at a glance

| | Moonshot | Jupiter Studio |
| --- | --- | --- |
| How you launch | Create tab in the Moonshot app | studio.jup.ag, meme or custom mode |
| Cost to create | $10, USDC only | Network fee and rent, under 0.05 SOL |
| Quote token | Not stated in the create docs | USDC (meme); USDC, SOL or JUP (custom) |
| Coin fee | 0.5% before bonding, 0.3% after | 1% (meme) or 1% / 2% (custom), for life |
| Creator share | 0.25% pre-bond; up to 0.15% post-bond | 50% of the fee |
| Graduation | Bonding begins at $1M market cap | 75,000 USDC market cap in meme mode; creator-set in custom |
| After graduation | Full liquidity pool; page links Meteora's DBC explainer; LP rule not stated | Meteora DAMM v2, all LP permanently locked on current configs |
| Anti-sniping | Not found in create docs | Optional in custom mode |
| Creator vesting | Not described | 0% to 80% of supply, from graduation |
| Payouts | Hourly, if unpaid balance exceeds $1 | Claim from the Studio token page |

## Launching a coin

### Moonshot

The create flow has five steps: open the Create tab, press Create, customize the coin, set the buy amount and creator fee percentage, and swipe to create. Required fields are ticker, name, image and description. Optional fields are a website, an X username and up to four photos or videos, with one video of up to 30 seconds. The creation fee is $10 in USDC; Moonshot's troubleshooting page says SOL will not work. After launch you can edit the website, X handle, media and creator fee, but not the ticker, name or image.

### Jupiter Studio

Studio's flow has three steps: basics, enhance and share. Connect a wallet, which becomes the deployer wallet for fee claims, choose meme or custom mode, and enter an image, name and symbol. Review the configuration, supply breakdown and estimated raise, add an optional banner, description and links, then sign a message and the launch transaction. No liquidity deposit or initial buy is required. Studio notes that at launch the pool's creator role is transferred to a Jupiter program address that records your wallet as owner, and that this is expected.

## Fees and creator earnings

### Moonshot

Moonshot's creator fee page describes a dynamic fee of 0.5% on every transaction before bonding and 0.3% after. The creator earns up to half: 0.25% pre-bond and up to 0.15% post-bond, set in the create form. Payouts are sent hourly once the balance passes $1.

Moonshot's trading fees page also lists an app fee on each trade, made up of a Moonshot fee and a crypto fee: 2.5% with a minimum of about $0.99 for $2 to $100 trades, and 1% for $100 and above. The docs do not say how the coin's dynamic fee and the app fee combine. Read the breakdown Moonshot shows before confirming.

### Jupiter Studio

Studio's fee is set at launch and cannot change: 1% in meme mode, 1% or 2% in custom mode. It applies to every buy and sell on the curve and after graduation, split 50% to the creator and 50% to Jupiter. So the creator earns 0.5% or 1% of every trade for the token's life. Fees are claimed on the Studio token page with the deployer wallet.

Per trade, Studio's creator share is higher on paper. Whether either produces meaningful income depends entirely on trading volume.

## Graduation and liquidity

Moonshot's bonding page says bonding, the migration from a virtual bonding curve to a full liquidity pool, begins when a coin reaches a $1 million market cap. It links Meteora's DBC explainer for details. Bonded coins get a "Created on Moonshot" badge and, per the page, a higher chance of being verified and featured. The page does not state an LP lock rule, so we do not claim one.

Studio's graduation page says the raised quote tokens and the migrating supply, 21% in meme mode, go into a new Meteora DAMM v2 pool, and all LP tokens are permanently locked on every current config. Some older launches used configs that unlock 50% of LP after one year. A token that never reaches its threshold keeps trading on the curve.

## Anti-sniping and vesting

Studio's custom mode can turn on an anti-sniping fee that starts at 99% and steps down to the chosen fee over one to five minutes, linear or exponential. It replaces the normal fee during that window, and jup.ag shows a warning while it may apply. Custom mode also lets a creator vest 0% to 80% of supply, counted from graduation, with optional cliffs.

We did not find either feature in Moonshot's create docs.

For more on Studio, see our [Jupiter Studio vs Highbar comparison](/articles/jupiter-studio-vs-highbar). For a wider view of Meteora-based launchpads, see [Meteora launchpad platforms compared](/articles/meteora-launchpad-platforms-compared).

## Who each one suits

- **Moonshot** suits creators who already use the Moonshot app, want a short in-app flow and are fine paying $10 in USDC for a modest creator share.
- **Jupiter Studio** suits creators who want to pick a quote token, set their own market caps, vest an allocation or use anti-sniping, with a fixed lifetime fee split.

## Where Highbar fits

Highbar is SOL-only and keeps the choices short. Per the [Highbar docs](/docs), you choose one of three graduation targets, 85, 150 or 250 SOL, and whether the anti-sniper fee is on. Every curve trade pays 1%. Meteora keeps 0.2%, and the creator earns 0.4%, 0.496% or 0.6% by tier. At graduation, liquidity moves into a Meteora DAMM v2 pool and is locked permanently; with the creator LP rebate, creators receive 0.6% to 0.7% of post-graduation volume. The optional anti-sniper fee starts at 25% and decays to about 1% over 60 seconds, and it is off by default. It only makes early buys more expensive and does not stop bots or Jito bundles. An optional dev buy of up to 20 SOL goes into the launch transaction.

## Bottom line

Moonshot is the in-app route with a flat $10 USDC fee and a smaller creator share. Studio is the configurable route with a larger lifetime split, locked LP on current configs and optional anti-sniping. Read the fee you will sign. To compare SOL tiers, open the [Highbar launch page](/launch), and to trade or launch from X, try the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed). This is not investment advice.
