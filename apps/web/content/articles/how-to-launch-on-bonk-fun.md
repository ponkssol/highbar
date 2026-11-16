---
title: "How to Launch on Bonk.fun (LetsBonk): What the On-Chain Configs Actually Tell You"
slug: how-to-launch-on-bonk-fun
meta_description: "How to launch on Bonk.fun (LetsBonk): what Raydium LaunchLab configs show about fees,\
  \ creator share and LP, and how Highbar's launch flow differs."
primary_keyword: how to launch on Bonk.fun
secondary_keywords:
  - how to launch on letsbonk
  - letsbonk.fun launch
  - Bonk.fun launch guide
  - launch on Bonk.fun vs Highbar
date: 2026-11-18
publish_at: "2026-11-18T15:16:00+07:00"
faq:
  - question: "Does Bonk.fun publish an official step-by-step launch guide?"
    answer: "We could not find a Bonk.fun docs page that walks through the launch form step by\
  \ step. What can be verified is that launches use Raydium LaunchLab platform configs,\
  \ which are public."
  - question: "What fee should I expect if I launch on Bonk.fun?"
    answer: "Raydium's public platform list, checked on 16 November 2026, showed letsbonk.fun\
  \ configs with a 1.25% or 1% platform fee rate and a creator fee rate of 0."
  - question: "Does the creator earn on the Bonk.fun curve?"
    answer: "The configs we checked have a creator fee rate of 0, so the creator earns nothing\
  \ on chain from curve trades. We could not find a Bonk.fun page that states a different\
  \ rate."
  - question: "How is launching on Highbar different?"
    answer: "On Highbar you pick a Standard, Higher or Max tier, optionally turn on the anti-sniper\
  \ fee, and can add a dev buy of up to 20 SOL. The creator earns 0.4%, 0.496% or\
  \ 0.6% of each curve trade by tier."
---

A "how to launch on Bonk.fun" guide should be honest about its sources. Bonk.fun, also searched as LetsBonk, is a popular front end, but we could not find an official Bonk.fun documentation page that walks through the launch form the way Raydium, Float or Highbar document their own flows. What can be documented, and checked, is the on-chain LaunchLab config that will actually charge your traders and, if you are the creator, decide whether you earn on the curve. This guide starts there, using Raydium's [LaunchLab overview](https://docs.raydium.io/products/launchlab/overview), [PlatformConfig docs](https://docs.raydium.io/products/launchlab/platform-config) and public [platform list](https://launch-mint-v1.raydium.io/main/platforms?page=1&pageSize=100), checked on 16 November 2026.

If Bonk.fun later publishes a launch guide, read that first and treat this page as a config checklist, not as a replacement for the official form.

## What you are launching on

A Bonk.fun coin is a Raydium LaunchLab token. The front end owns platform configs inside LaunchLab. When the curve's quote vault reaches its target, LaunchLab creates a Raydium CPMM pool and curve trading stops. The front end can set the platform fee, the creator fee and how LP is split at graduation, within Raydium's caps.

On 16 November 2026 the public platform list showed three letsbonk.fun configs: two with a 1.25% platform fee rate and a creator fee rate of 0, and one with a 1% platform fee rate, also with a creator fee rate of 0. On the 1.25% configs, almost all of the LP minted at graduation is burned. On the 1% config, LP is locked to the platform. After graduation, Raydium lists 0.25% as the usual CPMM fee.

That is the economic picture you are signing up for, even if the website makes the launch feel like a one-button flow.

## A practical checklist before you sign

Because we cannot cite an official Bonk.fun form walkthrough, the useful "how to" is a pre-launch checklist.

1. Open the official Bonk.fun or letsbonk.fun launch page and read any fee or terms text it shows on the confirmation screen. If the screen disagrees with the config, stop and find out why.
2. Look up the letsbonk.fun config you will actually use in Raydium's public platform list. Read `feeRate`, `creatorFeeRate`, `burnScale`, `platformScale` and `platformCpCreator`.
3. Remember that a creator fee rate of 0 means you will not earn on chain from curve trades. If a creator share is the reason you picked this front end, this config may not do that job.
4. Budget LaunchLab's one-time costs, from Raydium's [fee comparison](https://docs.raydium.io/reference/fee-comparison): about 0.115 SOL to launch and about 0.04 SOL at graduation, plus any extra the front end charges, which we could not verify from an official Bonk.fun fee page.
5. Do not assume a graduation target in SOL unless the official page or the on-chain raise amount states it. This article does not invent one.

Our [Bonk.fun fees explainer](/articles/bonk-fun-fees-explained) and [Raydium LaunchLab fees](/articles/raydium-launchlab-fees-explained) guides cover the same fields in more detail.

## How the same launch looks on Highbar

Highbar documents its own flow in the [docs](/docs). You open the [launch page](/launch), connect a wallet, add a name (up to 32 bytes), a ticker (up to 10 bytes), an image and optional links, pick Standard, Higher or Max, choose whether the anti-sniper fee is on (it is off by default), and optionally add a dev buy of up to 20 SOL in the same transaction. The curve fee is 1%, with a creator share of 0.4%, 0.496% or 0.6% by tier. Graduation is at 85, 150 or 250 SOL into a locked Meteora DAMM v2 pool. The anti-sniper fee, if on, starts at 25% and decays to about 1% over 60 seconds; it makes early buys more expensive and does not stop bots. The [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) can also launch from posts on X.

Highbar is much smaller than Bonk.fun. The reason to compare them at launch time is the published creator share and the documented LP lock, not the size of the audience.

## Bottom line

To launch on Bonk.fun, use the official site, then verify the LaunchLab config you are about to sign: the fee rate, the 0 creator fee we saw on the public list, and the LP burn or platform lock. If you want a documented Meteora flow with a published creator cut, use Highbar's launch page instead, and read the Highbar docs immediately before you sign a launch transaction.

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
