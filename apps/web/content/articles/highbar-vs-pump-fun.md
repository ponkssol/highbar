---
title: "Highbar vs Pump.fun: Fees, Graduation, Creator Payouts and Anti-Sniper Compared"
slug: highbar-vs-pump-fun
meta_description: "Highbar vs pump.fun: curve fees, the pump.fun app Platform Fee, graduation targets, creator payouts, locked liquidity and anti-sniper options compared."
primary_keyword: highbar vs pump.fun
secondary_keywords:
  - pump.fun vs highbar
  - pump.fun comparison
  - pump.fun alternative Meteora
  - pump.fun creator fee vs highbar
  - pump.fun graduation vs highbar
date: 2026-11-12
publish_at: "2026-11-12T08:34:00+07:00"
faq:
  - question: "What is the main difference between Highbar and pump.fun?"
    answer: "Pump.fun runs its own bonding curve and graduates coins to PumpSwap. Highbar launches every token on a Meteora Dynamic Bonding Curve and graduates it to a Meteora DAMM v2 pool, with the creator choosing an 85, 150 or 250 SOL target."
  - question: "Which is cheaper to trade on the curve?"
    answer: "Pump.fun's fees page lists a 1.25% curve fee, plus a 0.45% Platform Fee (0.40% with a referral code) on trades in its own web and mobile apps. Highbar's docs list a 1% curve fee with no extra app fee on the website."
  - question: "Which pays creators more?"
    answer: "It depends on the phase. On the curve, pump.fun pays creators 0.30% and Highbar 0.4% to 0.6% by tier. After graduation, pump.fun's creator fee ranges from 0.95% down to 0.05% by market cap, while Highbar creators get 0.6% to 0.7% of volume including the LP rebate."
  - question: "Does Highbar have more users than pump.fun?"
    answer: "No. Pump.fun is by far the largest Solana launchpad. MemeFees, using DefiLlama data, put it at 80.8% of Solana launchpad fees in the 30 days to 10 November 2026. Highbar is new and much smaller."
  - question: "Does Highbar's anti-sniper fee stop bots?"
    answer: "No. It is optional and only makes the first 60 seconds more expensive, starting at 25% and decaying to about 1%. It does not stop bots or Jito bundles."
---

If you are deciding where to launch a Solana memecoin, pump.fun is the obvious benchmark. It is the biggest launchpad by a wide margin and the one every alternative gets measured against. Highbar is one of those alternatives, and it is ours, so this comparison sticks to numbers each platform publishes: [pump.fun's fees page](https://pump.fun/docs/fees) and [bonding curve guide](https://pump.fun/docs/bonding-curve), and the [Highbar docs](/docs). Where pump.fun is the better choice, we say so.

Checked on 12 November 2026. Fees change; the live pages are what count.

## The one-minute summary

| | Pump.fun | Highbar |
| --- | --- | --- |
| Curve | Pump.fun's own constant-product curve | Meteora Dynamic Bonding Curve |
| Graduates to | PumpSwap (pump.fun's AMM) | Meteora DAMM v2 |
| Graduation target | Fixed market-cap threshold | 85, 150 or 250 SOL, creator picks |
| Create a coin | No platform fee | No platform fee listed; optional dev buy up to 20 SOL |
| Curve trading fee | 1.25% | 1% |
| App fee | 0.45% in pump.fun's apps (0.40% with referral) | None on the website |
| Creator on the curve | 0.30% | 0.4%, 0.496% or 0.6% by tier |
| Graduation fee | 0.015 SOL | 1% of SOL raised on Standard and Higher, 0% on Max |
| Anti-sniper option | None documented | Optional decaying fee |
| Audience | Largest on Solana | Small and new |

The rest of this article explains each row.

## How each platform works

**Pump.fun.** Per its [bonding curve guide](https://pump.fun/docs/bonding-curve), every coin starts on a constant-product curve with virtual reserves. When the coin's market cap reaches the graduation threshold, the curve closes and the liquidity moves atomically to PumpSwap, where it becomes the canonical pool. Pump.fun says it does not seed or remove that liquidity after graduation and that the pool is owned by the protocol.

**Highbar.** Highbar has no launchpad program of its own. Each launch creates a pool on Meteora's Dynamic Bonding Curve using one of six fixed configs: three tiers, each with anti-sniper on or off. When the curve holds its tier's SOL target, it migrates to a Meteora DAMM v2 pool together with 20% of the supply, and the liquidity is locked forever in two positions, one for the creator and one for the platform. Our explainer on [Meteora DBC](/articles/meteora-dynamic-bonding-curve-explained) goes deeper.

## Fees for traders

### On the curve

Pump.fun's [fees page](https://pump.fun/docs/fees) lists a 1.25% total fee on curve trades: 0.30% creator, 0.95% protocol and 0% LP. Since 17 October 2026, trades placed through pump.fun's own web app or mobile app also carry a Platform Fee of 0.45%, or 0.40% for wallets that applied a referral code. The page says that fee does not apply on Terminal or third-party interfaces, which may charge their own.

Highbar charges 1% on every curve trade. Meteora keeps 0.2% of the trade and the rest is split between the creator and the platform by tier. The docs state that traders never pay an extra app fee on top of that 1%. Trades placed through the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) add 0.02% of the SOL amount.

So a curve buy in the pump.fun app costs about 1.70% before network fees, and a curve buy on the Highbar website costs 1%.

### After graduation

This is where pump.fun can be cheaper. PumpSwap fees on a canonical pool depend on market cap. They start at 1.25% below 420 SOL and step down to 0.30% above 98,240 SOL. Highbar's DAMM v2 pool charges a flat 1%. For a large graduated coin, pump.fun's pool fee is lower. Our [pump.fun fees explainer](/articles/pump-fun-fees-explained) has the full tier table.

## Graduation targets

Pump.fun uses one threshold for every coin. Highbar lets the creator choose:

| Highbar tier | Migrates at | Approx. market cap at migration | Locked LP to creator / platform |
| --- | --- | --- | --- |
| Standard | 85 SOL | 420.75 SOL | 20% / 80% |
| Higher | 150 SOL | 742.5 SOL | 40% / 60% |
| Max | 250 SOL | 1,250 SOL | 50% / 50% |

A higher target means deeper liquidity at migration and a bigger creator share, but also that more SOL has to be raised before graduation. Many tokens on every platform never graduate at all.

## What creators earn

| Phase | Pump.fun creator fee | Highbar creator share |
| --- | --- | --- |
| Bonding curve | 0.30% of each trade | 0.4% (Standard), 0.496% (Higher), 0.6% (Max) |
| Graduation | None | Higher tier only: 50% of the 1% migration fee (0.75 SOL) |
| After graduation | 0.95% at 420–1,470 SOL market cap, stepping down to 0.05% at the top tier | 0.6%, 0.65% or 0.7% of volume, including the creator LP rebate |

Pump.fun's creator fee peaks just after graduation and then falls as a coin grows. Highbar's post-graduation share stays the same at every market cap. Pump.fun also lets creators redirect the creator fee to holders (Holder Rewards) or to a charity, which Highbar doesn't offer. All of these are fee mechanics. They pay nothing unless people trade. Our guide to [creator fees on a Solana launchpad](/articles/memecoin-creator-fees-solana-launchpad) has worked examples.

## Anti-sniper and early trading

Pump.fun's fee and curve pages describe no anti-sniper fee. Highbar offers one as an option, off by default. When it is on, the fee starts at 25% and decays exponentially to about 1% over 60 seconds. The creator's dev buy in the launch transaction pays the normal fee.

Be clear about what this does. It makes the earliest buys more expensive. It does not stop bots, and it does not stop Jito bundles, where several transactions land together in one block. Treat it as a cost lever, not a shield.

## Token facts

Highbar tokens all share one setup: 1,000,000,000 supply, 6 decimals, mint authority off, immutable metadata, no team allocation and no presale. Creators get tokens only by buying them, and can then lock them publicly with Dev Lock, which uses Jupiter Lock and can't be cancelled.

Pump.fun's [create guide](https://pump.fun/docs/create-coin) says there is no liquidity to seed, no presale and no team allocation, and that name, symbol and image are immutable once created.

## Where pump.fun is clearly ahead

- **Audience.** [MemeFees](https://memefees.com/chains/solana), using DefiLlama data, put pump.fun at 80.8% of Solana launchpad fees in the 30 days to 10 November 2026. No fee table offsets that.
- **Tooling and options.** Custom pairs, Holder Rewards, charity coins, a mobile app and a terminal.
- **Fees on large coins.** PumpSwap's lowest tier is 0.30%.

## Where Highbar differs

- A creator-chosen graduation target of 85, 150 or 250 SOL.
- A 1% curve fee with no app fee on the website.
- A higher creator share on the curve and a fixed share after graduation.
- Locked DAMM v2 liquidity split into creator and platform positions.
- An optional anti-sniper fee, and public Dev Lock pages.

## Which should you pick?

Pick pump.fun if reach matters most and you are fine with its fee schedule. Consider Highbar if you want to set your own graduation bar, a creator share in both phases and locked Meteora liquidity, and you accept a much smaller audience. Neither platform can make a token succeed. Read both sources, then try the [Highbar launch form](/launch) to see each tier's numbers before you sign.
