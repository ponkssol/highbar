---
title: "Pump.fun Fees Explained (2026): Curve, PumpSwap and the New App Fee"
slug: pump-fun-fees-explained
meta_description: "Pump.fun fees explained: the 1.25% curve fee, tiered PumpSwap fees, the 0.015 SOL graduation fee and the app Platform Fee added on 17 October 2026."
primary_keyword: pump.fun fees
secondary_keywords:
  - pump fun fees creator
  - pump fun trading fees
  - pump.fun platform fee
  - PumpSwap fees
  - pump.fun vs Highbar fees
date: 2026-11-11
publish_at: "2026-11-11T08:43:00+07:00"
faq:
  - question: "How much does it cost to create a coin on pump.fun?"
    answer: "Pump.fun's fees page says there is no platform fee to create a coin. You pay only the Solana network fee and the small SOL deposit needed for the token's on-chain accounts."
  - question: "What is the pump.fun bonding curve fee?"
    answer: "Per pump.fun's fees page, curve trades pay 1.25% in total: 0.30% creator fee, 0.95% protocol fee and 0% LP fee. Trades placed in the pump.fun web or mobile app also carry a separate Platform Fee."
  - question: "What is the pump.fun Platform Fee?"
    answer: "From 17 October 2026, trades placed through the pump.fun web app or mobile app carry a Platform Fee of 0.45% of the trade, or 0.40% if the wallet has applied a referral code. Pump.fun says it does not apply on Terminal or third-party interfaces."
  - question: "How do Highbar's fees compare?"
    answer: "On Highbar every curve trade pays 1%, shared by the creator, the platform and Meteora, and the website adds no extra app fee. Trades made through the Highbar Chrome extension add 0.02% of the SOL amount."
---

"What are the fees on pump.fun?" sounds like a one-line question. In 2026 it isn't. A pump.fun trade can involve a creator fee, a protocol fee, an LP fee, a market-cap-based fee tier after graduation and, since 17 October 2026, a separate Platform Fee in the pump.fun apps. This guide takes the numbers from [pump.fun's own fees page](https://pump.fun/docs/fees) (last updated 17 October 2026 when we checked it) and lays them out in plain language. We also explain how Highbar's fees differ, because we are a launchpad too and that's the comparison most readers want.

Fees change. Before you trade or launch, check the live pump.fun page, since it is the version that binds.

## The short version

| Action | Pump.fun fee (per its fees page) |
| --- | --- |
| Create a coin | No platform fee. Network fee and account deposit only |
| Trade on the bonding curve | 1.25% total (0.30% creator, 0.95% protocol, 0% LP) |
| Graduation to PumpSwap | 0.015 SOL per coin |
| Trade on PumpSwap after graduation | 1.25% down to 0.30%, by market cap tier |
| Trade in the pump.fun web or mobile app | Plus a 0.45% Platform Fee (0.40% with a referral code) |

The rest of this article explains each row.

## Creating a coin

According to [pump.fun's fees page](https://pump.fun/docs/fees), creating a coin carries no platform fee for any pairing. You pay the Solana network fee and the SOL deposit the network requires to open the token's accounts. One catch: if you make the first purchase as you create the coin in the pump.fun app, the page says that purchase also carries the Platform Fee described below.

## Bonding curve fees

While a coin is on its bonding curve, every buy and sell pays 1.25%. Pump.fun splits that into three named parts:

- **Creator fee: 0.300%.** Paid to the coin's creator, or to holders if the creator chose Holder Rewards at launch.
- **Protocol fee: 0.95%.** Kept by the pump.fun platform.
- **LP fee: 0%.** Nothing goes back into liquidity during the curve phase.

The fees page says fees are collected in the quote asset of the pool, such as SOL or USDC, never in the coin being traded. That matters if you are a creator: your creator fee arrives in SOL (or USDC), not in your own token.

## The graduation fee

When a coin completes its curve and graduates to PumpSwap, pump.fun charges **0.015 SOL** per coin. For a SOL-paired coin it is deducted from the bonding curve. It is a flat amount, not a percentage of the SOL raised.

## PumpSwap fees after graduation

After graduation the coin trades in its "canonical pool" on PumpSwap, and the fee depends on the coin's market cap. Pump.fun calculates market cap as the token price times one billion tokens. A few rows from the SOL table on the [fees page](https://pump.fun/docs/fees):

| Market cap (SOL) | Creator | Protocol | LP | Total |
| --- | --- | --- | --- | --- |
| 0 – 420 | 0.300% | 0.930% | 0.020% | 1.250% |
| 420 – 1,470 | 0.950% | 0.050% | 0.200% | 1.200% |
| 4,420 – 9,820 | 0.750% | 0.050% | 0.200% | 1.000% |
| 49,120 – 54,030 | 0.300% | 0.050% | 0.200% | 0.550% |
| 98,240 and up | 0.050% | 0.050% | 0.200% | 0.300% |

The full table has 25 SOL tiers and a separate USDC table. Two things stand out. First, the total fee falls as a coin grows, from 1.25% to 0.30%. Second, the creator's share jumps to 0.95% right after the lowest tier and then steps down. Pools on PumpSwap that are not canonical pay a flat 0.3% (0% creator, 0.05% protocol, 0.25% LP).

## The Platform Fee in the pump.fun apps

This is the change most people are searching for. From **17 October 2026**, every trade placed through the pump.fun web app or mobile app carries a Platform Fee **on top of** the fees above:

- **0.45%** of the trade for wallets without a referral code.
- **0.40%** for wallets that have applied another user's referral code.

Per the [fees page](https://pump.fun/docs/fees), it is collected in the asset you spend or receive and shown as a separate line before you confirm. It does **not** apply to trades placed through pump.fun's Terminal or third-party interfaces, although those interfaces may charge their own fees.

So a curve buy in the pump.fun app costs about 1.25% plus 0.45%, or 1.70% before network fees. The same curve trade through a third-party terminal pays the 1.25% plus whatever that terminal charges.

## Other fee modes you may see

Pump.fun's page also covers **Holder Rewards coins** (the creator fee goes to holders, net of distribution costs, and is not guaranteed), **Custom Pair coins** (a flat 1.25% on the curve and 0.30% on PumpSwap) and **Cashback coins**, which are no longer available for new launches.

## How Highbar's fees compare

Highbar is a Solana launchpad built on Meteora's Dynamic Bonding Curve, so the structure is different. From the [Highbar docs](/docs):

- **Curve fee: 1% on every trade.** Meteora keeps 20% of it (0.2% of the trade). The rest is split between creator and platform by tier: the creator gets 0.4% on Standard, 0.496% on Higher and 0.6% on Max.
- **No extra app fee on the website.** The docs state that traders never pay an extra app fee on top of the 1% curve fee.
- **Extension trades.** Trades made through the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) add 0.02% of the SOL amount. The website does not add that fee.
- **Migration fee by tier.** Standard (85 SOL target) and Higher (150 SOL) charge 1% of the SOL raised at graduation. Max (250 SOL) charges none.
- **After graduation:** the Meteora DAMM v2 pool charges 1% per trade, and with the creator LP rebate creators end up with 0.6%, 0.65% or 0.7% of post-migration volume depending on tier.

We covered creator payouts in detail in [how creator fees work on a Solana launchpad](/articles/memecoin-creator-fees-solana-launchpad).

### Where pump.fun is cheaper, and where it isn't

Being fair about it: once a pump.fun coin is large, its PumpSwap fee can fall as low as 0.30%, and Highbar's post-migration pool stays at 1%. Pump.fun also has far more traders and coins, which no fee table changes. On the other side, a curve trade on Highbar's website costs 1%, compared with 1.25% on the pump.fun curve, plus 0.45% when placed in the pump.fun app. Which matters more depends on whether you are trading early curve coins or large graduated ones.

## A quick fee checklist for any launchpad

1. Use the platform's **own** fee page and note its "last updated" date.
2. Separate **curve** fees from **interface** fees; where you click changes what you pay.
3. Check how fees change **after graduation**, and **who receives** each part.

If you are weighing launchpads more broadly, our [framework for comparing pump.fun alternatives](/articles/pump-fun-alternatives-compare-solana-launchpads) covers factors beyond fees, such as graduation venue and liquidity locks.

## Bottom line

Pump.fun's fees in late 2026 are a 1.25% curve fee, a market-cap-tiered PumpSwap fee from 1.25% down to 0.30%, a flat 0.015 SOL graduation fee, and a new 0.40–0.45% Platform Fee for trades placed in its own apps. None of these numbers tells you whether a coin is a good trade. They tell you what each trade costs. Read the [pump.fun fees page](https://pump.fun/docs/fees) and the [Highbar docs](/docs) side by side, and if you decide to launch on Highbar, the [launch page](/launch) shows every tier's fees before you sign.
