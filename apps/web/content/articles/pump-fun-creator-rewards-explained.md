---
title: "Pump.fun Creator Rewards Explained: Creator Fees, Holder Rewards and Charity Coins"
slug: pump-fun-creator-rewards-explained
meta_description: "Pump.fun creator rewards explained: the 0.30% curve creator fee, PumpSwap tiers, Holder Rewards, charity coins, and how Highbar pays creators."
primary_keyword: pump.fun creator rewards
secondary_keywords:
  - pump.fun creator fees
  - pump fun creator rewards how much
  - pump.fun holder rewards
  - pump.fun charity coins
  - pump.fun creator fee after graduation
date: 2026-11-12
publish_at: "2026-11-12T12:39:00+07:00"
faq:
  - question: "How much do pump.fun creators earn?"
    answer: "Per pump.fun's fees page, creators receive 0.30% of every bonding-curve trade. After graduation, the PumpSwap creator fee depends on market cap: 0.30% below 420 SOL, 0.95% from 420 to 1,470 SOL, then stepping down to 0.05% above 98,240 SOL."
  - question: "What are pump.fun Holder Rewards?"
    answer: "A creator can choose at launch to send the creator fee to holders instead. Rewards collect in a vault and are paid out to wallets holding at least the minimum (currently US$20 equivalent), net of distribution costs. Pump.fun says they are not guaranteed."
  - question: "Are pump.fun creator fees paid in SOL or in my coin?"
    answer: "Pump.fun's fees page says every fee is collected in the quote asset of the pool, such as SOL or USDC, never in the coin being traded."
  - question: "Can I change a coin to Holder Rewards later?"
    answer: "The fees page says a Custom Pair coin's Holder Rewards rate can't be changed after launch except through a community takeover, and an existing Cashback coin can be converted to Holder Rewards through a CTO."
  - question: "How do Highbar creator fees compare?"
    answer: "Highbar pays creators 0.4%, 0.496% or 0.6% of each curve trade by tier, and 0.6% to 0.7% of post-graduation volume including its creator LP rebate, per the Highbar docs."
---

"Pump.fun creator rewards" covers a few different things: the creator fee you earn on your own coin, the option to hand that fee to holders, and the option to give it to charity. This guide explains each one using [pump.fun's fees page](https://pump.fun/docs/fees) (last updated 17 October 2026 when we read it), with a worked example, and then compares how creators are paid on Highbar, the launchpad we run.

We covered pump.fun's trading fees in general in a [separate fees explainer](/articles/pump-fun-fees-explained). This one is only about what reaches creators.

Checked on 12 November 2026.

## The creator fee in one paragraph

On every trade of a pump.fun coin, part of the total fee goes to the coin's creator. Pump.fun calls this the **creator fee**, and its fees page says it applies to all coins that were on the bonding curve or PumpSwap from 13 May 2025. It is collected in the pool's quote asset, such as SOL or USDC, and never in your own coin. The rest of the fee is the protocol fee (to pump.fun) and the LP fee (back into the pool).

## How much: curve and PumpSwap

### On the bonding curve

| Creator fee | Protocol fee | LP fee | Total |
| --- | --- | --- | --- |
| 0.300% | 0.95% | 0% | 1.25% |

This is the same for SOL and USDC coins.

### After graduation

When a coin graduates, it trades in its canonical PumpSwap pool, and the creator fee follows a market-cap schedule. Selected rows for SOL coins:

| Market cap (SOL) | Creator fee | Total fee |
| --- | --- | --- |
| 0 – 420 | 0.300% | 1.250% |
| 420 – 1,470 | 0.950% | 1.200% |
| 1,470 – 2,460 | 0.900% | 1.150% |
| 4,420 – 9,820 | 0.750% | 1.000% |
| 29,470 – 34,380 | 0.500% | 0.750% |
| 49,120 – 54,030 | 0.300% | 0.550% |
| 98,240 and up | 0.050% | 0.300% |

The pattern: the creator fee peaks at 0.95% right above the first tier, then declines as the coin grows. USDC coins use a parallel schedule from 0.30% below 59,000 USDC, 0.95% up to 300,000 USDC, down to 0.05% at 20 million USDC and up. Non-canonical PumpSwap pools pay no creator fee.

### Custom Pair coins

Coins paired with an asset other than SOL or USDC use a flat schedule: 0.30% creator fee on the curve and 0.05% on PumpSwap. The creator can't set it.

## A worked example

Fees are proportional to volume, so here is the arithmetic with round numbers, not a forecast:

- 100 SOL of trading on the curve at 0.30% gives the creator **0.3 SOL**.
- 100 SOL of trading on PumpSwap while the market cap is between 420 and 1,470 SOL, at 0.95%, gives **0.95 SOL**.
- The same 100 SOL once the coin is above 98,240 SOL market cap, at 0.05%, gives **0.05 SOL**.

Most coins never graduate, so for most creators the curve rate is the one that matters.

## Holder Rewards: giving the fee to holders

At launch, a creator can choose to send the creator fee to holders instead. Pump.fun calls these **Holder Rewards coins**. The fees page describes how they work:

- On SOL or USDC coins, holders receive the same tiered creator fee; only the recipient changes.
- On Custom Pair coins, the creator sets a flat Holder Rewards rate at launch, from 0.01% up to a platform maximum (3% at the time of writing), applying on both curve and PumpSwap.
- Rewards accumulate in a vault and are distributed from time to time, pro rata, to wallets holding at least the minimum eligible amount, **currently US$20 equivalent**.
- Before each distribution, pump.fun reserves an amount for network and priority costs: up to US$0.01 per eligible holder on SOL-paired coins and up to US$0.20 on token-paired coins.
- Distributions don't run while the vault is below the reserve plus a minimum (currently US$20), or when the coin has more eligible holders than the platform's limit.

Pump.fun states plainly that Holder Rewards are paid net of costs and **are not guaranteed**. A Custom Pair coin's rate can only change through a community takeover (CTO).

## Charity coins

A creator can also opt in to send the creator fee to a charity. The fees page links a separate [Charity Coins Disclaimer](https://pump.fun/docs/charitycoins) that governs it. If you are buying a coin because it says it supports a cause, check that it is actually set up this way on its page.

## Cashback coins (legacy)

Cashback mode is no longer available for new launches. On existing Cashback coins, the creator fee is credited back to buyers when the trading interface uses the cashback instructions, and paid to the creator when it doesn't. An existing Cashback coin can be converted to a Holder Rewards coin through a CTO.

## What the creator fee doesn't include

- **The Platform Fee.** The 0.45% fee on trades in pump.fun's apps (0.40% with a referral code) is not shared with creators; it goes to pump.fun, with part routed to referrers.
- **Anything in your own coin.** Fees are paid in the quote asset.
- **A promise.** No volume, no fee.

## How Highbar pays creators

Highbar runs on Meteora DBC and graduates tokens to Meteora DAMM v2. From the [Highbar docs](/docs):

| Phase | Highbar creator share |
| --- | --- |
| Curve, Standard (85 SOL target) | 0.4% of each trade |
| Curve, Higher (150 SOL) | 0.496% of each trade |
| Curve, Max (250 SOL) | 0.6% of each trade |
| Graduation, Higher only | Half of the 1% migration fee (0.75 SOL) |
| After graduation | 0.6%, 0.65% or 0.7% of volume, including the creator LP rebate |

Creators claim curve fees and LP fees in SOL from Portfolio, Claim fees, by signing a free message with the launch wallet. The LP rebate, a share of the platform's own locked-LP fees, is sent to the creator wallet automatically, in payouts that start at 0.01 SOL. Our guide to [creator fees on a Solana launchpad](/articles/memecoin-creator-fees-solana-launchpad) has worked examples for each tier.

What Highbar doesn't have: Holder Rewards or charity routing. Highbar traders get 0.05% cashback, paid by the platform from its own share and currently paid in SOL. $HIGHER is not live.

## Pump.fun vs Highbar for creators, briefly

- **Curve phase:** Highbar's 0.4%–0.6% is higher than pump.fun's 0.30%.
- **Just after graduation:** pump.fun's 0.95% band is higher than Highbar's 0.6%–0.7%.
- **Large coins:** pump.fun's creator fee falls to 0.05%; Highbar's share stays fixed.
- **Audience:** pump.fun is far larger, which usually matters more than any rate.

## Bottom line

Pump.fun creators earn 0.30% on the curve and a market-cap-tiered fee after graduation, paid in SOL or USDC, and can redirect it to holders or charity. Read the live [fees page](https://pump.fun/docs/fees) before launching. If you want to compare a fixed creator share across both phases, look at Highbar's [docs](/docs) and [launch form](/launch), or try the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) to launch and trade from X.
