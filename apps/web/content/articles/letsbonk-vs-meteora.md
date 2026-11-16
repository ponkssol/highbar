---
title: "LetsBonk vs Meteora Launchpads: LaunchLab and CPMM Compared With DBC and DAMM v2"
slug: letsbonk-vs-meteora
meta_description: "LetsBonk (Bonk.fun) vs Meteora launchpads: LaunchLab fees and CPMM graduation compared\
  \ with DBC launchpads such as Bags, Jupiter Studio and Highbar."
primary_keyword: letsbonk vs Meteora
secondary_keywords:
  - Bonk.fun vs Meteora
  - letsbonk.fun vs Meteora DBC
  - LaunchLab vs Meteora
  - Bonk.fun vs Highbar
date: 2026-11-18
publish_at: "2026-11-18T17:54:00+07:00"
faq:
  - question: "Does LetsBonk use Meteora?"
    answer: "No. LetsBonk, or Bonk.fun, uses Raydium LaunchLab configs and graduates coins to\
  \ a Raydium CPMM pool. Bags, Jupiter Studio and Highbar are examples of launchpads\
  \ that use a Meteora Dynamic Bonding Curve."
  - question: "Which path has the lower fee after graduation?"
    answer: "Raydium lists 0.25% as the usual CPMM fee after a LaunchLab graduation. Meteora launchpads\
  \ set their own DAMM v2 fees; Highbar's is 1%, while Bags and Studio publish different\
  \ schedules."
  - question: "Which path pays the creator on the curve?"
    answer: "The letsbonk.fun configs we checked on 16 November 2026 have a creator fee rate of\
  \ 0. Highbar, Studio and Bags all document a creator or claimers share on the curve,\
  \ at different rates."
  - question: "Is Highbar the only Meteora alternative to LetsBonk?"
    answer: "No. Bags and Jupiter Studio also launch on Meteora DBC, with different fee and lock\
  \ rules. Highbar is the fixed-tier option we run."
---

"LetsBonk vs Meteora" is, like "pump.fun vs Meteora," a search that compares a front end with a liquidity layer. LetsBonk (Bonk.fun) runs on Raydium LaunchLab. Meteora is the program underneath Bags, Jupiter Studio, Highbar and other DBC launchpads. The useful comparison is LetsBonk versus one of those launchpads, with the two programs in the background. This article uses Raydium's public [platform list](https://launch-mint-v1.raydium.io/main/platforms?page=1&pageSize=100) and [fee comparison](https://docs.raydium.io/reference/fee-comparison), Meteora's [DBC fee docs](https://docs.meteora.ag/core-products/dbc/fees/overview), and the official docs of [Bags](https://docs.bags.fm/how-to-guides/customize-token-fees), [Studio](https://docs.jup.ag/user-docs/launch/studio) and [Highbar](/docs).

Checked on 16 November 2026.

## LetsBonk's path

LetsBonk coins trade on a LaunchLab curve. In the public list we checked, letsbonk.fun configs showed a 1.25% or 1% platform fee rate and a 0 creator fee rate. Two of the configs burn almost all LP at graduation; one locks LP to the platform. After graduation the coin trades on a Raydium CPMM pool, where Raydium lists 0.25% as the usual fee. That low post-graduation fee is the strongest trader-facing number in LetsBonk's design, and it should be said plainly.

The 0 creator fee rate is the strongest creator-facing number, and it should be said just as plainly. We could not find an official Bonk.fun page that states a different on-chain curve creator rate.

## The Meteora DBC path

A DBC launch uses Meteora's curve, with a base fee that can be fixed or can decay on a scheduler, a 20% protocol share of the trading fee, and a partner/creator split of the rest. Graduation is typically into a DAMM v2 pool, with a 0.2% protocol migration fee. Then the launchpad's own rules take over:

- Bags' default SOL mode charges 2% and graduates at 85 SOL, with post-migration compounding and a shareable claimers pool.
- Studio charges 1% or 2%, split 50/50 with the creator for life, graduates at a documented minimum of 15,000 USDC (or equivalent), and locks all LP on current configs.
- Highbar charges 1%, pays the creator 0.4% to 0.6% on the curve by tier, graduates at 85, 150 or 250 SOL, and locks DAMM v2 liquidity forever. The optional anti-sniper fee starts at 25% and decays to about 1% over 60 seconds; it does not stop bots.

Those products are not interchangeable. Our [LaunchLab vs Meteora DBC](/articles/raydium-launchlab-vs-meteora-dbc) comparison covers the programs; this page is about the LetsBonk choice in particular. See also [Bonk.fun vs pump.fun](/articles/bonk-fun-vs-pump-fun).

## A compact comparison

| | LetsBonk (configs checked 16 Nov 2026) | Highbar | Jupiter Studio | Bags default SOL mode |
| --- | --- | --- | --- | --- |
| Program | Raydium LaunchLab | Meteora DBC | Meteora DBC | Meteora DBC |
| Curve / platform fee | 1.25% or 1% platform rate | 1% total | 1% or 2% | 2% |
| Creator on the curve | 0 on chain | 0.4% to 0.6% by tier | 50% of the fee | A share of the claimers pool |
| Graduates to | Raydium CPMM | DAMM v2, locked | DAMM v2, LP locked on current configs | DAMM v2, with compounding |
| Typical post-grad fee | 0.25% usual CPMM, per Raydium | 1% | The same 1% or 2% | Default remains 2%, with 25% compounded |

The table is a starting point, not a substitute for the live docs of each platform.

## How to use the comparison

If you are a trader who wants the lower typical post-graduation fee, a LetsBonk / CPMM coin has a documented 0.25% usual rate, which undercuts Highbar's 1% DAMM v2 fee and may undercut Studio's 1% or 2%. If you are a creator who wants a published curve share, the Meteora launchpads above document one and the letsbonk.fun configs we checked do not. If you want burned LP, some LetsBonk configs do that; if you want a creator-owned locked position plus a platform position, Highbar documents that.

Audience size favours LetsBonk. Documentation completeness favours the Meteora launchpads that publish a fee handbook, and favours Raydium's own docs for the program itself.

## Bottom line

LetsBonk is a LaunchLab front end with a low usual CPMM fee and, in the configs we checked, a 0 creator curve rate. Meteora is not one alternative; Bags, Studio and Highbar are three, with different fees and locks. If Highbar is the one you want to compare, the rules are in the [docs](/docs) and on the [launch page](/launch). You can also trade from X with the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed).

Figures in this article were checked on 16 November 2026 against the official pages linked above.

Those pages change, so re-read them before you launch or trade, and do not treat this guide as a substitute for the live docs.

If a figure here disagrees with an official page, the official page is the one that binds.

Highbar is a small, new launchpad. Nothing in this article is a reason to buy or sell a token, and no launchpad can guarantee demand.

Locked liquidity and a creator fee share are design choices. They do not make a token safe, and they do not stop sniper bots on their own.

Always confirm fee rates, graduation targets and liquidity rules on the live docs, or on the on-chain config, immediately before you sign.

A useful way to use a comparison like this is to write down the three rules you actually care about — the curve fee, the creator share, and what happens to liquidity at graduation — and check those three lines on each official page, rather than choosing a launchpad by name or by a social-media clip.

If you are launching, prepare the token name, ticker, image and any links first, then read the fee table for the exact config you are about to sign, including whether an anti-sniper or app fee applies. If you are trading, check the mint, the pool, and the live fee on the confirmation screen.

None of the platforms compared here is affiliated with Highbar, and a factual comparison is not a recommendation to use one of them, or to buy any token that has already launched.
