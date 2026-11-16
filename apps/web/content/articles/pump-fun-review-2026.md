---
title: "Pump.fun Review (2026): Fees, Graduation, App Platform Fee and How Highbar Compares"
slug: pump-fun-review-2026
meta_description: "A pump.fun review from its official fees and bonding-curve docs: 1.25% curve fees,\
  \ PumpSwap tiers, the app Platform Fee and how Highbar differs."
primary_keyword: pump.fun review
secondary_keywords:
  - pump.fun review 2026
  - is pump.fun good
  - pump.fun fees review
  - pump.fun vs Highbar
date: 2026-11-17
publish_at: "2026-11-17T13:47:00+07:00"
faq:
  - question: "What is pump.fun?"
    answer: "Pump.fun is a Solana launchpad where every coin starts on a bonding curve and, once\
  \ market cap hits the platform's graduation threshold, migrates automatically to\
  \ a PumpSwap pool owned by the protocol."
  - question: "What fee does pump.fun charge on the curve?"
    answer: "Pump.fun's fees page, last updated 16 November 2026 when we checked it, lists a 1.25%\
  \ curve fee: 0.30% creator, 0.95% protocol and 0% LP."
  - question: "What is the pump.fun Platform Fee?"
    answer: "From 17 October 2026, trades placed through the pump.fun web or mobile app carry\
  \ a Platform Fee of 0.45%, or 0.40% if the wallet has applied a referral code, on\
  \ top of the pool fees. It does not apply on Terminal or third-party interfaces."
  - question: "How does Highbar compare with pump.fun?"
    answer: "Highbar launches on a Meteora Dynamic Bonding Curve, charges 1% on the curve with\
  \ no extra app fee on its website, lets the creator pick an 85, 150 or 250 SOL graduation\
  \ target, and locks liquidity in a Meteora DAMM v2 pool."
---

Pump.fun is still the Solana launchpad most people mean when they say "launchpad." A useful review in 2026 has to cover more than the curve: the official fee schedule now includes tiered PumpSwap fees and, since 17 October 2026, a separate Platform Fee inside the pump.fun apps. This review uses [pump.fun's fees page](https://pump.fun/docs/fees) (last updated 16 November 2026 when we checked it) and its [bonding curve page](https://pump.fun/docs/bonding-curve). Highbar, the launchpad we run, is included as a smaller Meteora alternative, not as a claim that it has replaced pump.fun.

## What pump.fun does well

The product is easy to explain. You create a coin, it starts on a constant-product bonding curve, and anyone can buy or sell from the first second. Pump.fun's bonding curve page describes this as a way to solve the cold-start problem: no order book and no market-makers are required, because the price is a function of the virtual reserves. When market cap hits the graduation threshold, the curve closes and liquidity migrates atomically to PumpSwap. Graduation is automatic and irreversible.

The fees page says there is no platform fee to create a coin, for any pairing. You pay the Solana network fee and the small SOL deposit needed for the token's on-chain accounts. Coins can be paired with SOL, USDC, a Custom Pair asset, or, where the platform permits, another pump.fun coin.

That simplicity, plus the size of the audience, is why pump.fun remains the default starting point for many creators. Size is not a reason to skip the fee table.

## Fees, including the app Platform Fee

On the bonding curve, every trade pays 1.25%: 0.30% creator, 0.95% protocol and 0% LP. The creator fee applies to coins that were on the curve or PumpSwap from 13 May 2025. It can be redirected to holders (Holder Rewards) or, where the creator opted in, to a charity. Fees are collected in the quote asset, never in the coin being traded.

Graduation costs 0.015 SOL per coin. For a SOL-paired coin it is deducted from the bonding curve. After graduation, canonical PumpSwap fees are tiered by market cap (price times one billion tokens). At the bottom of the SOL table the total is 1.250%; at 98240 SOL and up it is 0.300%. Non-canonical PumpSwap pools pay a flat 0.3%. Custom Pair coins use a flat 1.25% on the curve and 0.30% on the canonical pool, unless Holder Rewards were set at launch.

The change most people are searching for sits on top of those pool fees. From 17 October 2026, trades placed through the pump.fun web or mobile app carry a Platform Fee of 0.45%, or 0.40% with a referral code. It is shown as a separate line and does not apply to Terminal or third-party interfaces. From 16 November 2026 it also applies to Pack purchases and Collectible sales in the mobile app, at the same rates. Our guide to [pump.fun fees](/articles/pump-fun-fees-explained) sets the tables out in full.

Cashback mode is no longer available for new launches. The fees page is part of pump.fun's Terms of Use, so it is the schedule that binds when you use the platform. The figures in this review were checked on 16 November 2026.

## Graduation and liquidity

Pump.fun's bonding curve page says the migrated SOL and tokens become the canonical PumpSwap pool, that pump.fun does not seed or remove this liquidity after graduation, and that the pool is owned by the protocol. This article does not add a graduation market-cap figure, because that page describes a threshold without stating the number. If you need the live threshold, read it on pump.fun itself.

## Holder Rewards, Custom Pairs and other modes

A creator may, at launch, send the creator fee to holders instead. On a SOL- or USDC-paired Holder Rewards coin the rate follows the same tiered creator fee; only the recipient changes. On a Custom Pair coin, the creator can set a flat Holder Rewards rate from 0.01% up to a platform maximum (3% at the time of the fees page we checked). Holder Rewards are paid net of distribution costs, to wallets holding at least the minimum eligible amount, and the fees page states they are not guaranteed. Cashback mode is no longer available for new launches.

These options are useful, and they also make a one-line fee summary incomplete. Always check whether the coin in front of you is a standard, Holder Rewards, Custom Pair or charity coin before you assume the 0.30% creator figure.

## Where Highbar differs

Highbar is much smaller, and it is built on different infrastructure: a Meteora Dynamic Bonding Curve that graduates to a Meteora DAMM v2 pool with permanently locked liquidity. The creator picks an 85, 150 or 250 SOL target. The curve fee is 1%, with no extra app fee on the website, and the creator earns 0.4%, 0.496% or 0.6% by tier. An optional anti-sniper fee starts at 25% and decays to about 1% over 60 seconds; it makes early buys more expensive and does not stop bots. For a side-by-side of the two curve models, see [Meteora DBC vs the pump.fun bonding curve](/articles/meteora-dbc-vs-pump-fun-bonding-curve) and our [pump.fun alternatives checklist](/articles/pump-fun-alternatives-compare-solana-launchpads).

Two honest points. After graduation, a large pump.fun coin can trade at a lower total pool fee than Highbar's flat 1% DAMM v2 fee. And pump.fun has the larger audience. Highbar's advantages, where they exist, are the published creator share, the chosen graduation target, locked DAMM v2 positions and the lack of an extra website app fee — not reach.

## Bottom line

Pump.fun remains the default Solana launchpad in 2026: a simple curve, a 0.30% creator fee, a protocol-owned PumpSwap pool after graduation, and, in its own apps, an extra Platform Fee you should budget for. Read the [fees page](https://pump.fun/docs/fees) before you trade. To compare a Meteora launch with a 1% curve fee and locked DAMM v2 liquidity, see the [Highbar docs](/docs), the [launch page](/launch), or the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed). A review is not a reason to buy any coin, and no launchpad can guarantee demand.
