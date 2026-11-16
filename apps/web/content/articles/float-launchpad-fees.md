---
title: "Float Launchpad Fees Explained (2026): Standard Split, Builder Launches and Ticker\
  \ Costs"
slug: float-launchpad-fees
meta_description: "Float launchpad fees explained from its docs: 1%, 2% or 2.5% trading fees, the standard\
  \ and builder splits, Raydium's cut and ticker relaunch costs."
primary_keyword: Float launchpad fees
secondary_keywords:
  - floatlaunch fees
  - Float trading fee split
  - Float builder launch fees
  - Float ticker fee
  - Float vs Highbar fees
date: 2026-11-17
publish_at: "2026-11-17T11:14:00+07:00"
faq:
  - question: "What trading fee does Float charge?"
    answer: "Float's docs say creators pick a trading fee of 1%, 2% or 2.5% on every buy and sell.\
  \ Raydium keeps part of it (0.25% while the coin is on its curve). The rest is collected\
  \ by the Float program and split on chain."
  - question: "Do standard Float coins pay their creator?"
    answer: "No. Float's docs state that the creator share is 0% on every standard coin, old and\
  \ new. The remainder after Raydium's cut goes to holders, a $FLOAT buyback, trader\
  \ and $FLOAT-holder airdrops, and the treasury."
  - question: "What is a Float builder launch?"
    answer: "A builder launch uses the same fee choices, curve and graduation as a standard launch,\
  \ but 50% of the fee Float collects goes to a fee wallet chosen at launch. There\
  \ are no holder rewards on builder coins."
  - question: "How much does it cost to reuse a ticker on Float?"
    answer: "A ticker can be launched once for free. Relaunching it costs 5 SOL within 15 seconds,\
  \ 4 SOL up to one minute, 3 SOL up to one hour, and 2 SOL after that, with a refund\
  \ of up to 2 SOL if the coin graduates within 48 hours, for coins launched from\
  \ 4 November 2026."
  - question: "How do Highbar's fees compare?"
    answer: "Highbar charges a flat 1% on the curve, with no extra app fee on its website. The\
  \ creator earns 0.4%, 0.496% or 0.6% of each curve trade, depending on the tier."
---

Float's fee page is easy to skim and easy to misread. The creator picks 1%, 2% or 2.5%, but that number is not what the creator keeps, and a standard launch and a builder launch share the same sticker rate with very different splits. This guide follows [Float's own docs](https://www.floatlaunch.xyz/docs), checked on 16 November 2026, and then compares the result with Highbar, the launchpad we run.

Float is changing quickly. If a figure below disagrees with the live docs, the docs win.

## The trading fee the creator chooses

Every buy and sell on a Float coin pays the trading fee chosen at launch: **1%, 2% or 2.5%**. Raydium keeps part of it — 0.25% while the coin is on its [LaunchLab](https://docs.raydium.io/products/launchlab/overview) curve. The rest is collected by the Float program and held in Raydium's vaults until someone presses Cycle fees on the coin's page (anyone can, and Float says its payout bot does it automatically). Cycling claims the fees and splits them on chain.

The chosen rate applies before and after graduation. Graduation itself, at about a $150,000 market cap, moves liquidity into a Raydium pool locked with Burn & Earn. Float's fee docs do not list a separate flat graduation fee like pump.fun's 0.015 SOL charge.

## The standard-coin split

For every standard coin, the fee Float collects is split the same way:

| Share | Goes to |
| --- | --- |
| 17.5% | Holders, in the paired token, pro rata |
| 30% | Buying back and burning $FLOAT, the flagship token |
| 15% | USDC airdrops to traders by score |
| 15% | USDC airdrops to $FLOAT holders by average balance |
| 22.5% | Treasury |

The docs are explicit: the creator share is **0%** on every standard coin, old and new. If you launch a standard coin because you want a personal cut of volume, the current split will not do that. Fees go to holders, to airdrops, to a buyback and to the treasury.

Holder payouts are paid in the paired token. Airdrop rules, including trader scoring, $FLOAT-holder snapshots, caps and the way bots are excluded, are described on the same docs page and are worth reading in full before you trade for rewards. Nothing in that split is a promise about $FLOAT's price.

## Builder launches

A builder launch is a different type, aimed at people building a product. It keeps the same fee choices, curve and graduation, with a different split of what Float collects:

| Share | Goes to |
| --- | --- |
| 50% | The builder's fee wallet, chosen at launch and not changeable later |
| 15% | Airdrops |
| 15% | Buying back and burning $FLOAT |
| 20% | Treasury |

There are no holder rewards on builder coins. Before graduation, Raydium caps a creator's cut at 0.5% of each trade: on the 1% level the builder gets its full half (0.375% of each trade); on 2% and 2.5% it gets 0.5% of each trade and the rest is split between airdrops, buyback and treasury in the same 15 : 15 : 20 proportion. After graduation the 50 / 15 / 15 / 20 split applies on every level.

Float says builder launches are sent by its own server after it checks that they match a launch made on floatlaunch.xyz, so another tool cannot bundle a builder launch or add its own instructions, tips or fees. That is a launch-path detail, not a claim that the coin is safe to trade.

## Ticker fees

Tickers are 1 to 10 letters or numbers. Case does not make a new ticker: $Pepe and $PEPE are the same one. Each ticker can be launched once for free. Relaunching an existing ticker costs 5 SOL if it is 15 seconds old or less, 4 SOL up to one minute, 3 SOL up to one hour, and 2 SOL after that. The fee goes to the treasury. If that coin graduates within 48 hours, the launching wallet gets back the fee it paid, up to 2 SOL, automatically, for coins launched from 4 November 2026 at 10:01 PM CST. The docs say there is no refund when the launch bought more than the first-buy cap, or for wallets blocked for abusing launches.

## Two fee details that are easy to miss

The first-buy cap is not a fee, but it sits next to the fee rules. A creator can buy in the launch transaction, capped at 2% of supply on the launch form. The cap does not limit later buys or buys from other wallets. Float also warns that some pre-IPO pair tokens charge a transfer fee on top of trading fees: 1% for PreStocks and 0.2% for Tessera. Those are issuer fees, not Float's trading fee, and they still come out of a trade.

The docs also note that Float's fee tiers are public Raydium LaunchLab platforms, so other apps can launch coins on them outside floatlaunch.xyz. Those coins do not go through the Float program and do not get its fee split or rewards. Only coins listed on Float's site do.

## How this compares with Highbar

Highbar's fee table is simpler, and it is built for a different product: SOL-paired tokens on a Meteora Dynamic Bonding Curve, not stock pairs. Every curve trade pays 1%. Meteora keeps 0.2% of the trade and the creator earns 0.4%, 0.496% or 0.6% by tier, which is the opposite of Float's 0% standard-coin creator share. After graduation the DAMM v2 pool also charges 1%, and with the creator LP rebate the creator ends up with 0.6%, 0.65% or 0.7% of post-migration volume. The website adds no extra app fee. Trades through the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) add 0.02% of the SOL amount. For a wider comparison, see [Float launchpad explained](/articles/float-launchpad-explained) and our guide to [creator fees on a Solana launchpad](/articles/memecoin-creator-fees-solana-launchpad).

## Bottom line

A Float fee has three parts you need to read together: the 1%, 2% or 2.5% rate, whether the coin is standard or builder, and the ticker cost if you are reusing a name. On a standard coin the creator keeps none of the fee. Read the [Float docs](https://www.floatlaunch.xyz/docs) before you launch. To compare a SOL-paired Meteora launch with a published creator share, see the [Highbar docs](/docs) and the [launch page](/launch).
