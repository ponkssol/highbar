---
title: "Meteora DAMM v2 Explained: What Happens When a Solana Token Graduates"
slug: meteora-damm-v2-explained-token-graduation
meta_description: "Meteora DAMM v2 explained: position NFTs, locked liquidity, fee schedulers and what it means for a token that graduates from a bonding curve."
primary_keyword: Meteora DAMM v2
secondary_keywords:
  - DAMM v2 locked liquidity
  - token graduation Solana
  - position NFT liquidity
  - bonding curve migration
date: 2026-11-10
publish_at: "2026-11-10T15:15:00+07:00"
faq:
  - question: "What is Meteora DAMM v2?"
    answer: "DAMM v2 is Meteora's configurable constant-product AMM for Solana. Liquidity providers hold position NFTs that track liquidity, pending fees, rewards and any locks."
  - question: "What does permanently locked liquidity mean?"
    answer: "It is liquidity that cannot be withdrawn but still supports the pool. It means the locked liquidity cannot be pulled out, not that the token price is protected."
  - question: "Who can claim fees from a locked position?"
    answer: "Fees follow the position NFT, so whoever holds it can claim them. On Highbar, creators claim fees from their locked position and the platform claims fees from its own."
  - question: "What is the trading fee on Highbar after migration?"
    answer: "The DAMM v2 pool charges a 1% fee per trade. Meteora keeps 20% of it (0.2% of the trade) and the remaining 0.8% goes to the locked LP positions."
  - question: "Is a graduated token safer than one still on the curve?"
    answer: "Locked liquidity removes one specific risk, the liquidity being withdrawn. Price risk, concentrated holders and low demand all remain."
---

Graduation is the moment a launchpad token leaves its bonding curve and starts trading in a regular pool. On Highbar and other Meteora-based launchpads, that pool is Meteora's DAMM v2. This article explains what DAMM v2 is, how its positions and locks work, and what changes for a token after it graduates.

## What DAMM v2 is

Meteora describes DAMM v2 as a configurable constant-product AMM for Solana markets. A pool holds two token vaults, tracks a current price and lets traders swap against shared liquidity. Its documentation says it is built for pools that need explicit launch settings, fee behaviour, liquidity ownership and token support in one on-chain program.

A constant-product AMM prices swaps by keeping the product of the two reserves constant, so large trades move the price more than small ones. DAMM v2 can run in a fixed concentrated price range or as a full-range compounding pool. Launchpad graduations use the pool as a place where trading continues once the curve has done its job.

## Liquidity is held as position NFTs

The most distinctive part of DAMM v2 is how ownership is represented. Instead of fungible LP tokens, every liquidity position is backed by a unique position NFT. According to Meteora's documentation, whoever holds the NFT controls the position, and a position tracks:

- how much liquidity belongs to the holder,
- pending trading fees,
- any liquidity-mining rewards,
- and any vesting or permanently locked liquidity.

This has practical effects. A position can be transferred or split. It can contain unlocked, vesting and permanently locked liquidity at the same time. And because fees accrue to the position, locked liquidity can keep earning for its holder even though it cannot be withdrawn.

## Locks and vesting

Meteora's documentation lists permanently locked liquidity as liquidity that cannot be withdrawn but still supports the pool. Vesting liquidity unlocks over a schedule. Those are options in the program. They are not what Highbar configures.

Highbar's six configs set the unlocked LP shares to zero and the permanent locked shares to the split below, one position for the creator and one for the platform. Nobody can withdraw that liquidity. The shares depend on the tier:

| Tier | Locked LP to creator | Locked LP to platform |
| --- | --- | --- |
| Standard | 20% | 80% |
| Higher | 40% | 60% |
| Max | 50% | 50% |

Creators can claim only the fees those positions earn. They cannot withdraw the liquidity itself.

## What happens at graduation on Highbar

Here is the sequence for a token that reaches its tier target:

1. The bonding curve fills to its target of 85, 150 or 250 SOL.
2. The pool migrates to a DAMM v2 pool.
3. The SOL raised, minus the migration fee, goes into the new pool together with 20% of the token supply. Meteora keeps a fixed 0.2% of the migrated liquidity.
4. The liquidity is split into the two permanent positions shown above.

You can read the rest of the mechanics in the [Highbar docs](/docs), and our [Meteora Dynamic Bonding Curve explainer](/articles/meteora-dynamic-bonding-curve-explained) covers the phase before graduation.

## Fees after migration

DAMM v2 splits each trading fee into layers. Meteora's documentation lists a base fee, an optional volatility-based dynamic fee, a protocol fee that defaults to 20% of the trading fee, and an LP fee for positions. Base fee modes include time-based and market-cap-based schedulers, each with linear or exponential decay, which is how a pool can start with a higher launch fee and settle to a lower one.

On Highbar, the after-migration setup is simple. The pool charges a 1% fee on every trade. Meteora keeps 20% of it, which is 0.2% of the trade, and the remaining 0.8% goes to the locked LP positions. A creator LP rebate then passes part of the platform's share back to the creator, so that creators end up with 0.6% on Standard, 0.65% on Higher and 0.7% on Max of post-migration volume. Rebates are paid to the creator wallet without anything to sign, once at least 0.01 SOL has accrued.

## Who claims what

Because fees follow the position NFT, the on-chain rule is simple: whoever holds the NFT can claim. Highbar's documentation notes this directly for LP fees from a creator's locked position. The practical consequences:

- A creator's fee claims depend on holding the position.
- Locked positions keep earning but cannot be emptied.
- Fees come only from actual trading, so a pool with no volume earns nothing.

## What locked liquidity does and does not mean

Locked liquidity is often described as a safety feature, and it does remove one specific thing: the pool's liquidity cannot be pulled out by the creator or the platform. That matters because pulling liquidity is a common way for traders to get stuck.

But it is easy to read too much into it. Locked liquidity does not mean:

- **The price will hold.** A pool with locked liquidity can still trade at a fraction of its earlier price.
- **Holders are not concentrated.** A few wallets can still own much of the supply.
- **There is demand.** A pool needs buyers to be useful.

Treat "locked" as one fact among several, and combine it with checks on holders, the creator and the token page. We cover that in our [guide to checking a Solana token before buying](/articles/how-to-check-a-solana-token-before-buying).

## Why graduation matters for traders

When a token graduates you should expect a few changes:

1. **The venue changes.** Trading moves from the curve to the pool, with a fee that no longer decays or depends on the curve.
2. **Liquidity is measured differently.** The pool depth is set by the SOL migrated plus 20% of supply, not by a curve.
3. **Fee flows change.** Creators earn from LP positions rather than the curve, and the rebate applies.

For most people the practical step is to watch the token page and its pool address and to keep position sizes modest.

## Summary

DAMM v2 is a configurable constant-product AMM in which positions are NFTs, fees follow those NFTs and liquidity can be locked or vested. On Highbar, graduation creates permanent locked positions for the creator and the platform. That is a meaningful structural fact, but it is not a prediction. If you would like to launch or trade with these mechanics, start with the [launch page](/launch) or the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed).
