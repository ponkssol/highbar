---
title: "Heaven vs Pump.fun: No Bonding Curve vs the Classic Curve, Fees and Creator Rewards Compared"
slug: heaven-vs-pump-fun
meta_description: "Heaven vs pump.fun: virtual-SOL AMM vs bonding curve, protocol and creator fees, migration, reviewed creator fees and sniper resistance compared."
primary_keyword: heaven vs pump.fun
secondary_keywords:
  - pump.fun vs heaven
  - heaven fees vs pump.fun
  - heaven launchpad fees
  - heaven xyz vs pump fun
  - pump.fun alternative no bonding curve
date: 2026-11-16
publish_at: "2026-11-16T16:19:00+07:00"
faq:
  - question: "What is the biggest difference between Heaven and pump.fun?"
    answer: "Pump.fun uses a bonding curve that graduates to PumpSwap. Heaven has no bonding curve: each pool trades on Heaven's own AMM from launch as though it were seeded with 35 SOL of virtual SOL, so there is no migration."
  - question: "Which is cheaper to trade?"
    answer: "Pump.fun's fees page lists 1.25% on curve trades plus an app Platform Fee in its own apps. Heaven's fees page lists a 1% protocol fee below $100k market cap and a separate creator fee of 0.1% or 1% depending on the coin's category."
  - question: "How do creators earn on Heaven?"
    answer: "Community coins earn a 0.1% creator fee. Creator coins earn 1%, but once they pass $100k in volume Heaven reviews them and holds the fee until the review is done."
  - question: "Does either platform stop snipers?"
    answer: "Neither stops them. Heaven lists a 6-second linear fee decay for sniper resistance on standard pools. Pump.fun's public docs do not describe a launch-time anti-sniper fee."
---

Heaven is one of the few Solana launchpads that openly rejects the pump.fun model. Its docs start by praising pump.fun's original bonding curve, then explain why Heaven does not need one. If you are weighing Heaven against pump.fun, this guide compares the two from their own pages: pump.fun's [fees](https://pump.fun/docs/fees) and [bonding curve](https://pump.fun/docs/bonding-curve) guides, and Heaven's [documentation](https://docs.heaven.xyz/about). At the end we add how Highbar, the launchpad we run, fits.

Checked on 16 November 2026. Heaven says it is still experimenting with some parameters.

## Heaven vs pump.fun at a glance

| | Pump.fun | Heaven |
| --- | --- | --- |
| Launch model | Bonding curve with virtual reserves | Own AMM with 35 virtual SOL, no curve |
| Migration | To a canonical PumpSwap pool | None; "virtual migration" cap at $100k for display |
| Create a coin | No platform fee | Free |
| Trading fee before migration point | 1.25% (0.30% creator, 0.95% protocol) | 1% protocol below $100k market cap |
| App fee | 0.45% in pump.fun's apps (0.40% with referral) | None listed |
| Creator fee | 0.30% on the curve, tiered after graduation | 0.1% (community) or 1% (approved creator) |
| Creator review | No | Yes, for "creator" coins |
| Sniper resistance | None documented | 6-second linear decay on standard pools |
| Audience | Largest on Solana | Smaller |

## How pump.fun works

Per its [bonding curve guide](https://pump.fun/docs/bonding-curve), every pump.fun coin starts on a constant-product curve with virtual reserves. When the coin's market cap reaches the graduation threshold, the curve closes and the liquidity moves atomically to a canonical PumpSwap pool. Pump.fun charges 0.015 SOL at graduation and says it does not seed or remove liquidity afterwards. Our [pump.fun fees explainer](/articles/pump-fun-fees-explained) covers the full fee schedule.

## How Heaven works

Heaven's [curve page](https://docs.heaven.xyz/curve) explains the idea: each pool behaves as though it were seeded with 35 SOL, even though launching is free. Nobody can sell into that virtual SOL, so it acts as a floor. Because the pool already has depth, there is nothing to migrate. Heaven keeps a "virtual migration" cap at $100k market cap so tools such as Axiom's Pulse and Photon's memescope can display tokens the way traders expect.

The same page publishes how the liquidity-to-market-cap ratio thins as a pool grows. For example, at 200 SOL in the pool the table shows a market cap of about $205,714; at 1,000 SOL, about $5.14 million. Heaven says it is still testing the starting amount of virtual SOL.

Heaven also says creators can buy as much dev supply as they want on these rails. That is a design choice worth noting as a trader: check how much the deployer holds.

## Fees compared

### Pump.fun

From pump.fun's [fees page](https://pump.fun/docs/fees):

- **Curve:** 1.25% total, 0.30% to the creator and 0.95% to the protocol.
- **App Platform Fee:** 0.45% on trades in pump.fun's own web and mobile apps since 17 October 2026, or 0.40% with a referral code. It does not apply on Terminal or third-party interfaces.
- **After graduation:** PumpSwap fees follow market-cap tiers, from 1.25% below 420 SOL down to 0.30% above 98,240 SOL.

### Heaven

From Heaven's [fees page](https://docs.heaven.xyz/fees):

| Situation | Protocol fee |
| --- | --- |
| Create a coin | Free |
| Any coin below $100k market cap | 1% |
| Community coin above $100k | 0.25% |
| Creator coin above $100k | 0.5% |

Creator fees are listed separately: 0.1% for a community coin and 1% for a creator coin. Heaven says protocol fees go to its "god flywheel", which buys back and burns its token, $LIGHT. That is Heaven's stated policy, not a price promise. Check the trade screen for the total you will pay.

## Creator rewards: automatic vs reviewed

This is the sharpest difference.

**Pump.fun** pays every creator the same way: 0.30% on curve trades, then a PumpSwap creator fee that peaks at 0.95% in the 420–1,470 SOL market-cap band and steps down as the coin grows. No review.

**Heaven** uses [permissioned creator fees](https://docs.heaven.xyz/permissioned). At launch the deployer chooses Creator or Community. Community coins skip review and earn 0.1%. Creator coins get an "In review" tag once they pass $100k in volume, and the 1% creator fee is held during review. Afterwards a coin is grouped as Creator (fee released), Community (most collected fees go to the flywheel, 10% to the deployer, 0.1% from then on) or Blocked. Heaven is explicit that Creator status is not a safety check; it only means the team saw proof the deployer is who they say they are.

The trade-off: Heaven filters fee-farming on copycat coins and can route fees to the real artist, but a platform decision affects a creator's income. Pump.fun's rules are automatic but pay copycats too.

## Sniper resistance

Heaven's [Pro Pools page](https://docs.heaven.xyz/pro-pools) lists a 6-second linear fee decay for sniper resistance on standard pools, and up to 42 slot-based fee brackets for Pro Pools. Pump.fun's public pages do not describe a launch-time anti-sniper fee. Either way, a fee only makes the earliest buys more expensive; it does not stop bots. See our [sniper bots guide](/articles/sniper-bots-solana-memecoin-launches).

## Which should you choose?

- **Choose pump.fun** for the largest audience and automatic, predictable creator fees.
- **Choose Heaven** if you want no migration, free launches and a review-based creator fee designed to reward original creators.

## Where Highbar fits

Highbar sits between the two. Like pump.fun, it uses a bonding curve and a migration, but on Meteora: tokens start on a Meteora Dynamic Bonding Curve and graduate to a Meteora DAMM v2 pool with liquidity locked forever. From the [Highbar docs](/docs):

- **Graduation target chosen by the creator:** 85, 150 or 250 SOL.
- **1% curve fee**, with 0.4%, 0.496% or 0.6% to the creator by tier, and no extra app fee on the website.
- **Creator share after graduation** of 0.6% to 0.7% including the creator LP rebate, with no review.
- **Optional anti-sniper fee** from 25% decaying to about 1% over 60 seconds. It reduces the early advantage; it does not stop bots or bundles.

Highbar is much smaller than both. Our [DAMM v2 guide](/articles/meteora-damm-v2-explained-token-graduation) explains what locked liquidity does and does not mean. You can preview each tier on the [launch page](/launch), or trade from posts on X with the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed).
