---
title: "Meteora DAMM v2 vs Raydium CPMM: What Changes After a Token Graduates"
slug: meteora-damm-v2-vs-raydium-cpmm
meta_description: "Meteora DAMM v2 vs Raydium CPMM after graduation: official fee defaults, how liquidity\
  \ is locked, and how Highbar and LaunchLab launchpads use each pool."
primary_keyword: DAMM v2 vs Raydium CPMM
secondary_keywords:
  - Meteora DAMM v2 vs CPMM
  - CPMM vs DAMM v2 fees
  - where tokens graduate Solana
  - LaunchLab vs Meteora after graduation
date: 2026-11-19
publish_at: "2026-11-19T14:06:00+07:00"
faq:
  - question: "What is the usual trading fee on each pool after graduation?"
    answer: "Raydium's fee comparison page lists 0.25% as the usual fee on a CPMM pool after a\
  \ LaunchLab graduation. Highbar's DAMM v2 pools charge 1%. Other DBC launchpads\
  \ set their own DAMM v2 fees."
  - question: "Which launchpads graduate to which pool?"
    answer: "Raydium LaunchLab front ends, including Bonk.fun, StonkFun and Float, graduate to\
  \ a Raydium CPMM pool. Bags, Jupiter Studio and Highbar graduate to a Meteora DAMM\
  \ v2 pool. Pump.fun graduates to PumpSwap, which is neither of these."
  - question: "Is liquidity locked on both?"
    answer: "It depends on the launchpad. LaunchLab burns and/or locks LP to the platform. Highbar\
  \ locks two DAMM v2 positions forever. Studio's current configs lock all LP; some\
  \ older Studio launches unlock 50% after a year."
  - question: "Is a lower post-graduation fee always better?"
    answer: "A lower fee is cheaper for traders. It is not a reason, on its own, to prefer a launchpad,\
  \ because creator share, lock policy and the curve you started on also change."
---

Graduation is the moment a launchpad question becomes a pool question. Two of the most common destinations on Solana are a Raydium CPMM pool, used by LaunchLab, and a Meteora DAMM v2 pool, used by DBC launchpads such as Bags, Jupiter Studio and Highbar. This comparison uses Raydium's [LaunchLab overview](https://docs.raydium.io/products/launchlab/overview) and [fee comparison](https://docs.raydium.io/reference/fee-comparison), Meteora's [DBC fee docs](https://docs.meteora.ag/core-products/dbc/fees/overview), and the official docs of the launchpads named below. It is not a comparison of pump.fun's PumpSwap, which is a third venue.

Checked on 16 November 2026.

## How a token arrives in each pool

A LaunchLab token arrives in a CPMM pool when the curve's quote vault hits its target. Raydium says graduation also revokes the base mint's mint authority. LP is then split by `platform_scale` and `burn_scale`: burned LP cannot be withdrawn, and the non-burned share, since 17 August 2026, is a platform-owned locked position represented by a Fee Key NFT.

A DBC token arrives in a DAMM v2 pool when the launchpad's target is reached. Meteora takes a fixed 0.2% protocol liquidity migration fee at that point, which reduces the liquidity that lands in the new pool by 20 basis points. The DAMM v2 pool then follows the fee, compounding and lock settings in the launchpad's config, not the DBC virtual-pool settings. Our [DAMM v2 explainer](/articles/meteora-damm-v2-explained-token-graduation) covers positions and fee schedulers.

## Fees after graduation

This is the number traders look at first. Raydium lists **0.25%** as the usual CPMM fee after a LaunchLab graduation. That is a low, simple default, and it is a real advantage for active traders of a typical LaunchLab coin.

DAMM v2 fees are set by the launchpad:

- Highbar charges **1%**, of which Meteora keeps 0.2% of the trade, with the rest going to locked LP positions and, via the creator LP rebate, to the creator (0.6%, 0.65% or 0.7% of volume by tier).
- Jupiter Studio keeps the **1% or 2%** chosen at launch, split 50/50 with the creator, and says that structure does not change after graduation.
- Bags' Default mode stays at **2%** after migration, with 25% of that fee compounded back into the pool; Low Float decays from 2% toward a 0.5% floor as market cap grows.

So "DAMM v2 is more expensive than CPMM" is often true for Highbar and Studio, and is not a universal Meteora rule. Always read the launchpad.

## Locks, compounding and who can claim

On a typical LaunchLab graduation, traders get the 0.25% fee, and LP is burned or held by the platform. Post-graduation CPMM creator fees go to the recorded pool creator, which may be the platform if it set `platform_cp_creator`.

On Highbar, nobody can pull the DAMM v2 liquidity; the creator and the platform each hold a permanent position and claim fees. Studio's current configs also lock all LP; some older launches let 50% unlock after a year, claimed on the Studio page. Bags can compound a share of fees back into the pool, which is a different mechanism from a lock: compounding changes pool depth over time, a lock changes who can withdraw.

Locked or burned LP is not a promise about price. It only answers the question "can someone pull the liquidity?"

## Which venue fits which goal

Pick a LaunchLab / CPMM path if you want the usual 0.25% post-graduation fee and a Raydium venue, and you are satisfied with that front end's creator and LP rules. Pick a DAMM v2 path if you want a Meteora venue, a launchpad-defined fee and, depending on the product, a creator LP position, compounding, or a lifetime 50/50 split. Then pick the launchpad. Highbar's rules are in the [docs](/docs); Bags' and Studio's are in theirs. For the curve-level comparison, see [LaunchLab vs Meteora DBC](/articles/raydium-launchlab-vs-meteora-dbc).

## Bottom line

After graduation, a typical LaunchLab CPMM pool is cheaper to trade than a Highbar or Studio DAMM v2 pool, and DAMM v2 launchpads are more different from each other than the program names suggest. Read the pool fee and the lock policy together, and confirm both on the official pages on the same day that you launch or trade a coin. To see Highbar's locked 1% DAMM v2 pool, use the [docs](/docs), the [launch page](/launch), or the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed).

Figures in this article were checked on 16 November 2026 against the official pages linked above.

Those pages change, so re-read them before you launch or trade, and do not treat this guide as a substitute for the live docs.

If a figure here disagrees with an official page, the official page is the one that binds.

Highbar is a small, new launchpad. Nothing in this article is a reason to buy or sell a token, and no launchpad can guarantee demand.

Locked liquidity and a creator fee share are design choices. They do not make a token safe, and they do not stop sniper bots on their own.

Always confirm fee rates, graduation targets and liquidity rules on the live docs, or on the on-chain config, immediately before you sign.

A useful way to use a comparison like this is to write down the three rules you actually care about — the curve fee, the creator share, and what happens to liquidity at graduation — and check those three lines on each official page, rather than choosing a launchpad by name or by a social-media clip.

If you are launching, prepare the token name, ticker, image and any links first, then read the fee table for the exact config you are about to sign, including whether an anti-sniper or app fee applies. If you are trading, check the mint, the pool, and the live fee on the confirmation screen.

None of the platforms compared here is affiliated with Highbar, and a factual comparison is not a recommendation to use one of them, or to buy any token that has already launched.

Take your time, read the confirmation screen, and only sign if the live fee and destination pool match what you expected to pay.
