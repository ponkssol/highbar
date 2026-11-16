---
title: "Bonk.fun (LetsBonk) Review (2026): LaunchLab Fees, LP Burn and What Creators Actually\
  \ Earn"
slug: bonk-fun-review
meta_description: "A Bonk.fun (LetsBonk) review from Raydium's public LaunchLab configs: 1.25% or 1%\
  \ platform fees, a 0 creator curve rate, LP burn and how Highbar compares."
primary_keyword: Bonk.fun review
secondary_keywords:
  - letsbonk review
  - letsbonk.fun review 2026
  - is Bonk.fun good
  - Bonk.fun vs Highbar
date: 2026-11-18
publish_at: "2026-11-18T16:38:00+07:00"
faq:
  - question: "What is Bonk.fun?"
    answer: "Bonk.fun, still often called LetsBonk, is a Solana launchpad front end that uses\
  \ Raydium LaunchLab platform configs and graduates coins into a Raydium CPMM pool."
  - question: "What are the fees on Bonk.fun?"
    answer: "Raydium's public platform list, checked on 16 November 2026, showed letsbonk.fun\
  \ configs with a 1.25% or 1% platform fee rate and a creator fee rate of 0. After\
  \ graduation, Raydium lists 0.25% as the usual CPMM fee."
  - question: "Is liquidity locked or burned?"
    answer: "On the two 1.25% configs we checked, almost all LP minted at graduation is burned.\
  \ On the 1% config, LP is locked to the platform."
  - question: "How does Highbar compare?"
    answer: "Highbar is smaller, runs on Meteora DBC, charges 1% on the curve with a published\
  \ creator share by tier, and locks liquidity in a DAMM v2 pool. It does not match\
  \ Bonk.fun's audience."
---

Bonk.fun, still searched as LetsBonk, is one of the LaunchLab front ends with a real community around it. A review in 2026 should not pretend it has the same kind of official docs as pump.fun or Meteora. The facts that can be checked sit in Raydium's public LaunchLab configs and fee pages. This review uses those, checked on 16 November 2026, plus Bonk.fun's public [revenue page](https://revenue.letsbonk.fun/), and then compares Highbar, the launchpad we run, without pretending Highbar has the same reach.

## What the product is

Bonk.fun is a front end on [Raydium LaunchLab](https://docs.raydium.io/products/launchlab/overview). It does not run a separate bonding-curve program. Tokens trade on a LaunchLab curve and graduate into a Raydium CPMM pool. That is a solid, well-documented piece of infrastructure, and it is the main reason the product works at all.

What we could not find is a Bonk.fun documentation page that states a graduation target, a creator payout schedule, or a step-by-step launch flow. A review should say that plainly, rather than filling the gap with figures from blogs.

## Fees and liquidity, from the public configs

Raydium's public [platform list](https://launch-mint-v1.raydium.io/main/platforms?page=1&pageSize=100) showed three letsbonk.fun configs on the day we checked:

- Two with a 1.25% platform fee rate, a 0 creator fee rate, and almost all graduation LP burned (`burnScale` 999,999 / 1,000,000).
- One with a 1% platform fee rate, a 0 creator fee rate, and LP locked to the platform.

Traders also pay Raydium's protocol trade fee on the curve. After graduation, Raydium's [fee comparison](https://docs.raydium.io/reference/fee-comparison) lists 0.25% as the usual CPMM fee, which is low compared with Highbar's 1% DAMM v2 fee and is a genuine point in Bonk.fun's favour for active traders of a graduated coin.

The 0 creator fee rate is the genuine point against it, if you are a creator who expected an automatic curve cut. We could not find a Bonk.fun page that says a different on-chain rate, or that explains how much, if any, of a post-graduation CPMM creator fee reaches the token creator. The revenue page describes platform-level data, not that schedule. Our [Bonk.fun fees explainer](/articles/bonk-fun-fees-explained) is the longer version of this section.

Burned LP cannot be withdrawn by anyone, which is a strong liquidity rule. Platform-locked LP, on the 1% config, is a different rule: the platform holds it. Check which config a coin used before you treat those as the same thing.

## What this review is not

This is not a volume ranking, and it is not a prediction about which coins will do well. Third-party fee and volume trackers change by the day, and they are not Bonk.fun's official docs, so they are left out. The review also does not treat a burned LP position as a promise that a coin will hold its price. Burned LP cannot be pulled; it also cannot create buyers.

## Who it suits

Bonk.fun suits traders who want a LaunchLab / Raydium CPMM venue and, after graduation, a typically low 0.25% pool fee, and who are comfortable reading a public config rather than a long official handbook. It is a weaker fit for creators whose main requirement is a published, automatic creator share on the curve. Pump.fun publishes a 0.30% creator fee; Highbar publishes 0.4% to 0.6% by tier. Those are the official comparisons, not a ranking of which coin will do well.

## Where Highbar compares, honestly

Highbar is a Meteora launchpad with six fixed configs, a 1% curve fee, no extra website app fee, a published creator share, an optional decaying anti-sniper fee that does not stop bots, and permanently locked DAMM v2 liquidity at 85, 150 or 250 SOL. It is new and small. It will not give you Bonk.fun's audience. It will give you a fee table you can read in the [docs](/docs). See also [Bonk.fun vs pump.fun](/articles/bonk-fun-vs-pump-fun).

## Bottom line

Bonk.fun is a substantial LaunchLab front end with a low typical post-graduation CPMM fee and, in the configs we checked, a 0 creator fee on the curve and mostly burned LP. Read the live config, not the vibe. To compare a documented Meteora alternative, use the [Highbar docs](/docs), the [launch page](/launch), or the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed). A review is not a reason to buy or sell a coin.

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
