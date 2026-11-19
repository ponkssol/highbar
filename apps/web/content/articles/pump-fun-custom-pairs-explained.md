---
title: "Pump.fun Custom Pairs Explained: Launching Coins Paired With Stocks, USDC and Other Tokens (2026)"
slug: pump-fun-custom-pairs-explained
meta_description: "Pump.fun custom pairs explained from the official docs: which assets you can pair with, the flat 1.25% / 0.30% fee schedule, holder rewards and the risks."
primary_keyword: pump.fun custom pairs
secondary_keywords:
  - pump.fun supported pair assets
  - pump.fun pair with usdc
  - pump.fun stock paired coins
  - pump.fun custom pair fees
  - pump.fun secondary pair asset
date: 2026-11-19
publish_at: "2026-11-19T12:25:00+07:00"
faq:
  - question: "What are pump.fun custom pairs?"
    answer: "Pump.fun lets a coin launch against an asset other than SOL. Its Supported Pair Assets page, also called the Custom Pairs list, names the eligible assets, such as USDC, xStocks tokens, wrapped BTC and ETH, fan tokens and some pump.fun coins."
  - question: "What fees does a pump.fun custom pair coin pay?"
    answer: "Per pump.fun's fees page (updated 16 November 2026), a coin paired with anything other than SOL or USDC pays a flat 1.25% on the bonding curve (0.30% creator, 0.95% protocol) and 0.30% on its canonical PumpSwap pool (0.05% creator, 0.05% protocol, 0.20% LP), whatever its market cap."
  - question: "Can I pair a pump.fun coin with another pump.fun coin?"
    answer: "Where the platform permits, yes, but only one hop deep. A coin launched against a Supported Pair Asset can serve as the pair for a new coin. A coin launched against that second coin cannot be used as a pair in turn."
  - question: "Does Highbar support custom pairs?"
    answer: "No. Every Highbar token trades against SOL on a Meteora bonding curve and graduates to a SOL-paired Meteora DAMM v2 pool."
---

Most people think of pump.fun as a SOL-paired launchpad, but its rules now allow coins priced in other assets too: USDC, tokenized stocks, wrapped coins and even other pump.fun coins. The official name is **Supported Pair Assets**, and the platform also calls it the **Custom Pairs list**. This guide explains what the pump.fun custom pairs feature is, how its fees differ from a normal SOL launch, and the risks the docs spell out.

Sources: pump.fun's [Supported Pair Assets page](https://pump.fun/docs/custom-pairs) (last updated 9 October 2026) and [fees page](https://pump.fun/docs/fees) (last updated 16 November 2026), both read on 19 November 2026. We run Highbar, a different launchpad, and we are not affiliated with pump.fun. This is not investment advice.

## What pump.fun custom pairs are

Under pump.fun's fees page, a coin can launch paired with:

1. **SOL**,
2. **USDC**,
3. **another Supported Pair Asset** on the Custom Pairs list, or
4. where the platform permits, **another pump.fun coin** that was itself launched against a Supported Pair Asset.

Coins paired with SOL or USDC use pump.fun's tiered fee schedules. Coins paired with anything else are "Custom Pair coins" and use a flat schedule, covered below.

## What is on the pump.fun custom pairs list

The list is long, 155 assets in the version we read, and it changes without notice. On 19 November it included, among others:

- **USDC**, issued by Circle.
- **xStocks tokens** from Backed Assets (JE) Limited, such as APPLX, TSLAX, NVDAX, SPYX and GLDX.
- **Tokenized equities from Backpack Securities** listed through Sunrise (Wormhole Labs), such as NKE and HOOD.
- **Wrapped or bridged assets**, such as WBTC and ETH via Wormhole Portal, XRP via Hex Trust and NEAR and ZEC via NEAR Omni Bridge.
- **PAXG** from Paxos and **fan tokens** such as PSG and AFC from Chiliz.
- **Community tokens and memecoins**, including coins launched on pump.fun and other platforms' tokens, such as STONK.

Pump.fun's notices are blunt. Listing "is not endorsement." The Pump Entities "do not audit, verify, or monitor" any listed asset. You must accept the issuer's and listing provider's terms before using an asset, and RWA tokens carry issuer-imposed jurisdiction limits. Most importantly: "Only the token at the Solana contract address shown is the Supported Pair Asset." A token with the same symbol at a different address is not.

## Pump.fun custom pair fees

Here is the flat schedule pump.fun publishes for Custom Pair coins, which applies whatever the market cap:

| Venue | Creator fee | Protocol fee | LP fee | Total |
| --- | --- | --- | --- | --- |
| Bonding curve | 0.30% | 0.95% | 0% | 1.25% |
| PumpSwap canonical pool | 0.05% | 0.05% | 0.20% | 0.30% |

Compare that with a SOL-paired coin. Its curve fee is the same 1.25% with a 0.30% creator fee, but after graduation it uses a market-cap-tiered PumpSwap schedule. At 420 to 1,470 SOL of market cap, for example, the creator fee is 0.95% of a 1.20% total, then it steps down as market cap grows. A custom pair coin's creator gets a fixed 0.05% after graduation instead. That is the biggest economic trade-off of the feature.

Other fee rules that matter for custom pairs:

- **Fees are paid in the pair asset**, never in the coin. Pair with a tokenized stock and your creator fees accrue in that token.
- **Holder Rewards option.** A creator can replace the creator fee with a flat Holder Rewards rate set at launch, from 0.01% up to a platform maximum (3% at the time of writing), on both the curve and PumpSwap. It cannot be changed after launch except through a community takeover. Distributions are paid net of costs, need minimum holdings (currently US$20 equivalent) and are not guaranteed, per the fees page.
- **Graduation fee.** Every coin pays 0.015 SOL on graduation. For a non-SOL coin it is paid in SOL by whoever performs the migration, normally pump.fun, unless a user's trade triggers it.
- **Creating is free.** The fees page says there is no platform fee to create a coin "for any pairing," only network fees and the SOL deposit for new accounts.
- **App fee.** Since 17 October 2026, trades through the pump.fun web or mobile app add a 0.45% Platform Fee (0.40% with a referral code).

## Pairing a pump.fun coin with another pump.fun coin

Pump.fun calls this a **Secondary Pair Asset**, and the rules are strict:

- **One hop only.** Coin A launched against SOL can be the pair for Coin B. Coin C cannot pair against Coin B.
- **Eligibility is fixed at launch** and does not change if assets are later added to or removed from the list.
- **Layered risk.** The value of Coin B depends on Coin A's price and liquidity and, through it, on SOL. Prices shown in SOL or USDC are "indicative only."
- **Routing fees.** A trade may route through several pools. On pump.fun's own apps, the protocol fee is charged once on the first pool and the creator and LP fees once on the last. Interfaces that have not adopted the current program "may charge Protocol, Creator and LP fees on every pool," so totals can be a multiple of the table above.

## Risks the pump.fun custom pairs docs call out

- **Assets can be removed without notice.** Removal, or an issuer freezing an asset, "may result in any bonding curve or pool using that asset being frozen or converted."
- **No issuer diligence.** Claims that a token tracks a stock or commodity are the issuer's, not pump.fun's.
- **Market data is third-party.** A stock ticker or price shown next to an RWA token is not the price of the token or of any coin paired with it.
- **Illiquid pair assets.** Creator fees and holder rewards accrue in the pair asset, which may be hard to sell.

## Who pump.fun custom pairs suit

Custom pairs suit communities built around a specific asset, such as a stock, a fan token or another meme, who want the coin priced in that asset. They suit creators less well if post-graduation earnings matter most, because the fixed 0.05% PumpSwap creator fee is far below the tiered SOL schedule at most market caps. Our [pump.fun fees explained](/articles/pump-fun-fees-explained) guide covers the SOL schedule in full. For stock-paired launchpads built on other programs, see [Float launchpad explained](/articles/float-launchpad-explained) and [how to launch on StonkFun](/articles/how-to-launch-on-stonkfun).

## Where Highbar fits

Highbar is deliberately narrower. Every token trades against SOL on a Meteora Dynamic Bonding Curve with a 1% fee, of which the creator earns 0.4%, 0.496% or 0.6% depending on the tier you pick (85, 150 or 250 SOL). At graduation the token moves to a SOL-paired Meteora DAMM v2 pool with permanently locked liquidity, where the creator ends up with 0.6% to 0.7% of volume including the LP rebate. There are no custom pairs and no RWA tokens. The website adds no app fee; the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) adds 0.02% on extension transactions. Full tables are in the [Highbar docs](/docs), and the [launch page](/launch) shows the numbers for each tier before you sign.

## Summary

Pump.fun custom pairs let a coin launch against USDC, tokenized stocks, wrapped assets or one level of other pump.fun coins. Custom pair coins pay a flat 1.25% on the curve and 0.30% after graduation, with only 0.05% to the creator post-graduation, and every fee is paid in the pair asset. Read the live list and fees page before launching, verify the pair asset's contract address, and remember that a listed asset is not an endorsed one.
