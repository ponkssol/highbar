---
title: "How to Launch on Meteora DBC: What the Program Does and How to Pick a Launchpad"
slug: how-to-launch-on-meteora
meta_description: "How to launch on a Meteora Dynamic Bonding Curve: what the program controls, how\
  \ Bags, Jupiter Studio and Highbar differ, and the steps on Highbar."
primary_keyword: how to launch on Meteora
secondary_keywords:
  - launch on Meteora DBC
  - Meteora launchpad how to
  - Meteora DBC launch guide
  - launch on Meteora vs Highbar
date: 2026-11-19
publish_at: "2026-11-19T11:27:00+07:00"
faq:
  - question: "Can I launch directly on Meteora without a launchpad?"
    answer: "Meteora's DBC docs describe a configuration account that a launchpad or partner sets.\
  \ Most creators launch through a launchpad that already has a config, such as Bags,\
  \ Jupiter Studio or Highbar, rather than building a config from scratch."
  - question: "Which Meteora launchpad should I use?"
    answer: "Use Bags if you want fee sharing and many fee modes, Jupiter Studio if you want a\
  \ 50/50 fee split and optional vesting, or Highbar if you want six fixed SOL tiers\
  \ and a published creator share. Read each official doc before you pick."
  - question: "How do I launch on Highbar?"
    answer: "Open the launch page, connect a wallet, add a name, ticker and image, pick Standard,\
  \ Higher or Max, choose whether the anti-sniper fee is on, optionally add a dev\
  \ buy of up to 20 SOL, and sign."
  - question: "Does the anti-sniper fee stop bots?"
    answer: "No. On Highbar it is optional, off by default, and only makes buying in the first\
  \ 60 seconds more expensive, starting at 25% and decaying to about 1%."
---

"How to launch on Meteora" usually means "how to launch a token on a Meteora Dynamic Bonding Curve through a launchpad." Meteora is the program; Bags, Jupiter Studio, Highbar and others are the products that already hold a DBC config. This guide explains what the program does, how to choose a launchpad from official docs, and then walks through Highbar's own documented steps, because that is the launchpad we run.

Checked on 16 November 2026 against Meteora's [DBC fee docs](https://docs.meteora.ag/core-products/dbc/fees/overview) and the official docs of [Bags](https://docs.bags.fm/how-to-guides/launch-token), [Jupiter Studio](https://docs.jup.ag/user-docs/launch/studio) and [Highbar](/docs).

## What the program will do for any launchpad

A DBC pool is a virtual bonding curve. Buyers and sellers trade against it, the price moves, and when the launchpad's target is reached the pool can migrate to a Meteora DAMM v2 pool, with a 0.2% protocol liquidity migration fee. Trading fees have a 0.25% minimum base and a 99% cap, and 20% of the trading fee goes to Meteora. The launchpad decides the base fee, whether it decays, the creator share, the quote token, the graduation target and what happens to LP after migration. Our [Meteora DBC explainer](/articles/meteora-dynamic-bonding-curve-explained) is the longer version of this paragraph.

You rarely start by creating a raw config unless you are a developer. You start by picking a launchpad whose published config you accept.

## Pick a launchpad first

- **Bags** is the configurable option: seven SOL fee modes, fee sharing with many recipients, custom quotes, and a TypeScript / CLI launch path documented in detail. Default SOL graduation is 85 SOL at a 2% fee.
- **Jupiter Studio** is the Jupiter-ecosystem option: Meme or Custom mode, a 1% or 2% fee split 50/50 with the creator for life, a 15,000 USDC minimum raise (or equivalent in SOL or JUP), optional vesting of up to 80% of supply, optional anti-sniper protection in the first minutes, and a dedicated Studio token page. Current configs lock all LP.
- **Highbar** is the fixed-tier option: Standard, Higher or Max (85, 150 or 250 SOL), a 1% curve fee, a published creator share, optional anti-sniper, optional dev buy, and permanently locked DAMM v2 liquidity.

Those are different products. "Launching on Meteora" without naming one of them is not a complete plan. Our [Meteora launchpad guide](/articles/meteora-launchpad-platforms-compared) compares them at more length.

## What to prepare before you open any launch page

Have the name, ticker, image and any links ready, and read the fee table for the exact config you are about to sign, including whether an anti-sniper or interface fee applies. If you are using Bags or Studio, use their official launch docs for the remaining steps rather than improvising from Highbar's.

## The Highbar steps

1. Open the [launch page](/launch) and connect the wallet that will be the creator wallet. That wallet is the one that later claims fees.
2. Add a name (up to 32 bytes), a ticker (up to 10 bytes), an image and optional links. The ticker HIGHER is reserved, and $HIGHER is not live.
3. Pick a tier. Standard migrates at 85 SOL, Higher at 150 SOL and Max at 250 SOL. The tier also sets the creator share: 0.4%, 0.496% or 0.6% of each curve trade.
4. Decide whether the anti-sniper fee is on. It is off by default. If you turn it on, the trading fee starts at 25% and decays to about 1% over 60 seconds. It does not stop bots. The creator's dev buy in the launch transaction pays the normal minimum fee, not the anti-sniper fee.
5. Optionally add a dev buy of up to 20 SOL, in the same transaction that creates the pool, so you buy first.
6. Sign. The token is live when the transaction confirms. Every Highbar token has a 1,000,000,000 supply, six decimals, mint authority off and immutable metadata.

After launch, fees accrue on-chain and are claimed from Portfolio, Claim fees. If you want to lock your own tokens, Dev Lock uses Jupiter Lock and cannot be cancelled. The [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) can also launch from a post on X, and extension trades add a 0.02% fee on the SOL amount.

## Bottom line

To launch on Meteora, first pick a launchpad whose official fee and lock rules you accept, then follow that launchpad's own steps. If that launchpad is Highbar, the steps above and the [docs](/docs) are the source. If it is Bags or Studio, start from their docs instead, not from this Highbar walkthrough.

Figures in this article were checked on 16 November 2026 against the official pages linked above.

Those pages change, so re-read them before you launch or trade, and do not treat this guide as a substitute for the live docs.

If a figure here disagrees with an official page, the official page is the one that binds.

Highbar is a small, new launchpad. Nothing in this article is a reason to buy or sell a token, and no launchpad can guarantee demand.

Locked liquidity and a creator fee share are design choices. They do not make a token safe, and they do not stop sniper bots on their own.

Always confirm fee rates, graduation targets and liquidity rules on the live docs, or on the on-chain config, immediately before you sign.

A useful way to use a comparison like this is to write down the three rules you actually care about — the curve fee, the creator share, and what happens to liquidity at graduation — and check those three lines on each official page, rather than choosing a launchpad by name or by a social-media clip.

If you are launching, prepare the token name, ticker, image and any links first, then read the fee table for the exact config you are about to sign, including whether an anti-sniper or app fee applies. If you are trading, check the mint, the pool, and the live fee on the confirmation screen.

None of the platforms compared here is affiliated with Highbar, and a factual comparison is not a recommendation to use one of them, or to buy any token that has already launched.
