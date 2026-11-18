---
title: "Bonding Curve Graduation Targets Explained: Choosing 85, 150 or 250 SOL on a Meteora DBC Launch"
slug: bonding-curve-graduation-target-explained
meta_description: "What a bonding curve graduation target is, how it sets market cap and liquidity at migration, and how Highbar's 85, 150 and 250 SOL tiers compare."
primary_keyword: bonding curve graduation target
secondary_keywords:
  - solana bonding curve migration threshold
  - meteora dbc migration threshold
  - graduation market cap solana
  - highbar tiers explained
  - which tier should I pick
date: 2026-11-18
publish_at: "2026-11-18T15:28:00+07:00"
faq:
  - question: "What is a graduation target on a bonding curve?"
    answer: "It is the amount of quote token the curve must collect before it migrates to a regular pool. Meteora's DBC docs say that when the quote reserve reaches the configured migration threshold, curve trading stops and the pool becomes eligible to create a DAMM pool."
  - question: "What are Highbar's graduation targets?"
    answer: "Standard migrates at 85 SOL, Higher at 150 SOL and Max at 250 SOL, per the Highbar docs. The approximate market caps at migration are 420.75, 742.5 and 1,250 SOL."
  - question: "Does a higher target pay the creator more?"
    answer: "Per trade, yes. On the curve the creator earns 0.4% on Standard, 0.496% on Higher and 0.6% on Max, and after migration 0.6%, 0.65% or 0.7% including the LP rebate. A higher target also takes more buying to reach, and a token may never get there."
  - question: "What happens if a token never reaches its target?"
    answer: "It keeps trading on its bonding curve. Graduation is triggered by the curve filling, not by time."
---

Every bonding-curve launch has a finish line. When the curve has collected enough of the quote token, it stops trading as a curve and moves its liquidity into a regular pool. That finish line is the graduation target, also called the migration threshold. It is one of the few numbers a creator chooses that changes almost everything after launch: the market cap at migration, how deep the new pool is, and how fees are split. This guide explains how it works on a Meteora Dynamic Bonding Curve and how to think about Highbar's three tiers.

## What graduation means on Meteora DBC

Meteora's [DBC migration docs](https://docs.meteora.ag/core-products/dbc/migration-and-liquidity), read on 18 November 2026, describe the sequence: traders buy and sell against a virtual pool, and when the quote reserve reaches the configured migration threshold, normal curve trading stops and the pool becomes eligible to create a DAMM pool. New configs must migrate to DAMM v2. At migration, DBC uses the configured quote threshold, the base tokens set aside for the new pool, the price discovered by the curve, and the configured split of liquidity between partner and creator.

In plain words: the target is how much SOL buyers must put in before the token gets a real pool, and the config decides who owns that pool's liquidity. Our [Meteora DBC explainer](/articles/meteora-dynamic-bonding-curve-explained) covers the curve itself, and the [DAMM v2 explainer](/articles/meteora-damm-v2-explained-token-graduation) covers what happens in the new pool.

## Highbar's three targets

Highbar uses six fixed Meteora DBC configs: three tiers, each with the anti-sniper fee on or off. Per the [Highbar docs](/docs), the tier sets the target and the fee split.

| Tier | Migrates at | Approx. market cap at migration | Creator on the curve | Platform on the curve | Meteora |
| --- | --- | --- | --- | --- | --- |
| Standard | 85 SOL | 420.75 SOL | 0.4% | 0.4% | 0.2% |
| Higher | 150 SOL | 742.5 SOL | 0.496% | 0.304% | 0.2% |
| Max | 250 SOL | 1,250 SOL | 0.6% | 0.2% | 0.2% |

Every curve trade pays 1% whichever tier you pick. Higher is stored on-chain as 62% of the non-Meteora fee because the program only accepts whole numbers, which is where 0.496% comes from.

## What changes at migration

When the curve fills, the SOL raised, minus any migration fee, goes into a Meteora DAMM v2 pool together with 20% of the token supply. Meteora keeps a fixed 0.2% of the migrated liquidity. The docs then split the locked liquidity into two permanent positions:

| Tier | Migration fee | Creator share of it | Locked LP to creator | Locked LP to platform |
| --- | --- | --- | --- | --- |
| Standard | 1% (0.85 SOL) | 0% | 20% | 80% |
| Higher | 1% (1.5 SOL) | 50% (0.75 SOL) | 40% | 60% |
| Max | 0% | 0% | 50% | 50% |

That liquidity is locked forever. Nobody can pull it. Creators can claim the fees their position earns.

After migration, the DAMM v2 pool charges 1% per trade. Meteora keeps 0.2% and the other 0.8% goes to the locked LP positions. With the creator LP rebate, where the platform forwards part of its own LP fees, creators end up with 0.6% on Standard, 0.65% on Higher and 0.7% on Max of post-migration volume.

## How targets compare across launchpads

Other platforms express their finish lines differently, which makes direct comparison awkward. From each platform's own pages, read on 18 November 2026:

| Launchpad | Graduation rule in its docs |
| --- | --- |
| Bags | 85 SOL in most fee modes; 80 SOL Low Float; about 100 SOL Drop Mode |
| Jupiter Studio | Meme mode graduates at 75,000 USDC market cap, about 15,390 USDC raised; custom mode at least 15,000 USDC raised |
| Moonshot | Bonding begins at a $1 million market cap |
| Float | About 7.5x the starting market cap, roughly $150,000 |

Sources: [Bags fee modes](https://docs.bags.fm/how-to-guides/customize-token-fees), [Studio launch guide](https://docs.jup.ag/user-docs/launch/studio/launching-a-token), [Moonshot bonding](https://support.moonshot.com/coins/create/bonding), [Float docs](https://www.floatlaunch.xyz/docs). SOL-denominated and USD-denominated targets move apart whenever the SOL price moves, so compare them on the day you launch.

## How to choose a target

There is no best tier. Each one is a trade-off between how soon a token can graduate and what the creator and pool look like after.

### Standard (85 SOL)

The lowest bar. A token needs the least buying to graduate, and graduates at the smallest market cap. The creator earns 0.4% on the curve and 0.6% after, and owns 20% of the locked LP. A reasonable fit for a quick community meme where reaching a real pool sooner matters more than the creator's cut.

### Higher (150 SOL)

A middle setting. The creator earns 0.496% on the curve, gets half of the 1.5 SOL migration fee and owns 40% of the locked LP. The new pool starts deeper than on Standard.

### Max (250 SOL)

The highest bar. The creator earns 0.6% on the curve and 0.7% after, there is no migration fee, and the locked LP is split evenly. The pool starts deepest. It also takes the most buying to get there.

### Questions to ask yourself

1. **How much attention do you realistically expect?** A higher target that a token never reaches means it stays on the curve.
2. **Do you care more about graduating or about your fee share?** A lower target favours the first, a higher target the second.
3. **How deep should the first pool be?** Deeper liquidity at migration means smaller price moves for the same trade size.
4. **Will you use the anti-sniper fee?** It is a separate on/off choice in every tier. It is off by default. It starts at 25% and decays to about 1% over 60 seconds, which only makes early buys more expensive and does not stop bots or Jito bundles.

## What a target does not do

A target is a mechanical setting. It does not create demand, it does not make a token safer, and a token that graduates can still fall in value. Locked liquidity cannot be withdrawn, but price can still drop. Treat the tier as a structural choice, not a signal.

## Summary

The graduation target is the SOL amount a curve must collect before it migrates. On Highbar it is 85, 150 or 250 SOL, and it sets the market cap at migration, the creator's fee share before and after, the migration fee and the split of permanently locked DAMM v2 liquidity. Read the full tables in the [docs](/docs), then pick a tier on the [launch page](/launch). You can also start a launch from a post on X with the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed). This is not investment advice.
