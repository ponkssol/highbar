---
title: "Boop.fun Fees Explained: The 2% Post-Graduation Split, Holder Rewards and Pre-Graduation\
  \ Fees"
slug: boop-fun-fees-explained
meta_description: "Boop.fun fees from official docs: pre-graduation platform fees, the 2% post-graduation\
  \ split, 62.5% holder rewards, and how Highbar compares."
primary_keyword: boop.fun fees
secondary_keywords:
  - boop fun fees
  - boop.fun holder rewards
  - boop.fun trading fee
  - boop.fun fee delegation
  - boop.fun vs Highbar fees
date: 2026-11-21
publish_at: "2026-11-21T08:52:00+07:00"
faq:
  - question: "What is Boop.fun's post-graduation trading fee?"
    answer: "Official deployment and rewards pages describe a 2% fee on post-graduation trades.\
  \ 62.5% of that fee goes to token holders or fee delegates, 6.25% to BOOP stakers,\
  \ 6.25% to a buyback bank, 12.5% to future rewards, and 12.5% to the platform."
  - question: "Who receives fees before a Boop token graduates?"
    answer: "The official token-deployment page says that before graduation, all fees go to the\
  \ platform."
  - question: "What is fee delegation?"
    answer: "By default, the holder portion is shared among holders. Official FAQs and the deployment\
  \ page say you can instead route that portion to an X account at launch. Recipients\
  \ claim through Boop's official fee-claim flow."
  - question: "How do Highbar's fees compare?"
    answer: "Highbar charges 1% on the curve and 1% in the DAMM v2 pool. The creator earns 0.4%\
  \ to 0.6% on the curve and 0.6% to 0.7% after graduation with the LP rebate. Highbar\
  \ does not pay 62.5% of a 2% fee to holders."
---

Boop.fun's official fee rules change at graduation, and the post-graduation split is the feature most people search for. This explainer uses Boop's [token deployment](https://docs.boop.fun/token-deployment-101), [rewards](https://docs.boop.fun/rewards), [graduation](https://docs.boop.fun/graduation) and [fee-claim](https://docs.boop.fun/claiming-ur-fee-rewards) pages, checked on 16 November 2026, and compares those published splits with the [Highbar docs](/docs). Fee tables are mechanics, not income forecasts. Boop is not affiliated with Highbar.

## Before graduation, fees go to the platform

The official deployment page is direct: before graduation, all fees go to the platform. This article does not invent a pre-graduation percentage, because that page does not state one. If you are trading a Boop token that has not graduated, read the live confirmation screen rather than assuming the 2% post-graduation table already applies.

Graduation itself is described in two official ways, and this explainer reports both. The [bonding-curve page](https://docs.boop.fun/the-boop-bonding-curve) says the curve accumulates about 86 SOL, or about 75% of supply, before a Meteora pool is created with the final 20%. The graduation page describes a market cap of about 400 SOL, then 80 SOL plus remaining tokens moving to the pool and 6 SOL going to the team, and it notes that the curve needs about 80 SOL and 206,900,000 tokens, "not exactly 400 SOL." Use the live docs, not a single remembered figure.

The official graduation page also said, on the day this was checked, that graduation rewards were paused as the Temple of Moon takes over. That pause is about those graduation rewards, not a reason to ignore the post-graduation trading-fee split below. Re-read the live page before you treat either as current.

## The 2% post-graduation split

Once a token has graduated, official deployment docs describe a 2% fee on trades, handed out as follows (the rewards page discusses the same holder and staker shares):

| Recipient | Share of the 2% fee |
| --- | --- |
| Token holders, or fee delegates | 62.5% |
| BOOP stakers | 6.25% |
| BOOP buyback bank | 6.25% |
| Future rewards and incentives | 12.5% |
| Platform | 12.5% |

Official rewards docs say holder rewards, once the token has graduated, go directly to holders' wallets with no claim required, with shares based on the percentage of supply each holder has. Stakers collect their 6.25% through the official staking page. Official docs also say that when they talk about trading fees, they mean the SOL portion.

Fee delegation changes who receives the holder portion. Official FAQs say that at launch you can send that portion to an X account instead of to holders. The official claim page also describes connecting X, GitHub, Instagram or TikTok to claim delegated rewards, including a "share on X to claim" step when SOL rewards are waiting. Delegation is a routing choice, not a safety feature.

## Supply set-asides, stated carefully

Official pages do not all use the same supply language. Deployment docs put roughly 75% of supply on the curve, about 20% in the Meteora pool, 0.5% to BOOP stakers at graduation and 4.5% burned. The rewards page says 5% of supply is airdropped to stakers at graduation. Both describe roughly 5% leaving that path; they are not worded the same way. This article does not pick a winner.

## How Highbar's 1% table compares

Highbar, per its [docs](/docs), charges 1% on the Meteora Dynamic Bonding Curve. Meteora keeps 0.2% of the trade. The creator earns 0.4%, 0.496% or 0.6% by tier. After graduation the DAMM v2 pool charges 1%, and with the creator LP rebate the creator ends up with 0.6% to 0.7% of volume. There is no 62.5% holder-reward split and no official-app fee on the website. The [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) adds 0.02% of the SOL amount on extension trades.

On a trader-facing comparison, Boop's documented post-graduation fee is 2% and Highbar's DAMM v2 fee is 1%. On a creator-share comparison, Highbar pays the creator a published percentage of volume; Boop's official post-graduation table pays the largest slice to holders or delegates, not to the deployer as a 0.6% creator share. Those are different jobs. See [memecoin creator fees](/articles/memecoin-creator-fees-solana-launchpad) for how to read a share as a share, and [Meteora launchpad platforms compared](/articles/meteora-launchpad-platforms-compared) for other Meteora front ends.

If you want Boop's holder-reward design, stay on Boop's official pages. If you want Highbar's tiered creator share and locked DAMM v2 liquidity, open the [docs](/docs) and the [launch page](/launch) and read the live tier before you sign. Neither fee table makes a token safe, and neither stops sniper bots.

Figures in this article were checked on 16 November 2026 against the official pages linked above.

Those pages change, so re-read them before you launch or trade, and do not treat this guide as a substitute for the live docs.

If a figure here disagrees with an official page, the official page is the one that binds.

Highbar is a small, new launchpad. Nothing in this article is a reason to buy or sell a token, and no launchpad can guarantee demand.

Locked liquidity and a creator fee share are design choices. They do not make a token safe, and they do not stop sniper bots on their own.

Always confirm fee rates, graduation targets and liquidity rules on the live docs, or on the on-chain config, immediately before you sign.

A useful way to use a comparison like this is to write down the three rules you actually care about — the curve fee, the creator share, and what happens to liquidity at graduation — and check those three lines on each official page, rather than choosing a launchpad by name or by a social-media clip.

If you are launching, prepare the token name, ticker, image and any links first, then read the fee table for the exact config you are about to sign, including whether an anti-sniper or app fee applies. If you are trading, check the mint, the pool, and the live fee on the confirmation screen.

None of the platforms compared here is affiliated with Highbar, and a factual comparison is not a recommendation to use one of them, or to buy any token that has already launched.
