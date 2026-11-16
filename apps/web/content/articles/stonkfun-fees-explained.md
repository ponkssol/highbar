---
title: "StonkFun Fees Explained: The 1% LaunchLab Fee, 0.5% Creator Forward and Reward Taxes"
slug: stonkfun-fees-explained
meta_description: "StonkFun fees from official developer and rewards pages: the 1% LaunchLab fee, 0.5%\
  \ creator forward, 1% or 3% reward taxes and Highbar's 1% curve fee."
primary_keyword: StonkFun fees
secondary_keywords:
  - StonkFun trading fees
  - StonkFun creator fees
  - StonkFun transfer tax
  - StonkFun vs Highbar fees
date: 2026-11-19
publish_at: "2026-11-19T16:45:00+07:00"
faq:
  - question: "What is the StonkFun trading fee on a LaunchLab launch?"
    answer: "StonkFun's developer docs say the LaunchLab program charges a 1% curve fee to StonkFun's\
  \ platform account, and that half of that fee, 0.5% of every trade, is forwarded\
  \ to the creator automatically."
  - question: "How do StonkFun reward-launch fees work?"
    answer: "The rewards page says newer (v3) reward launches are funded by a 1% or 3% transfer\
  \ tax on every transfer, set at launch. Earlier reward launches were funded by about\
  \ 85% of a 4% pool's trading fees."
  - question: "Where does platform revenue go?"
    answer: "The revenue page says the platform automatically claims its trading fees and uses\
  \ approximately 60% of platform revenue to buy $STONK on the open market and burn\
  \ it, with the rest retained."
  - question: "How do Highbar's fees compare?"
    answer: "Highbar charges a flat 1% on the curve, with no extra app fee on the website, and\
  \ the creator earns 0.4%, 0.496% or 0.6% of each curve trade by tier."
---

StonkFun's fee picture is spread across several official pages rather than a single "fees" URL, which is why people search for a combined explainer. This one uses the [developer](https://www.stonkfun.xyz/developers), [rewards](https://www.stonkfun.xyz/rewards) and [revenue](https://www.stonkfun.xyz/revenue) pages, checked on 16 November 2026, and then compares the result with Highbar, the launchpad we run. If a live page disagrees with a figure here, the live page wins.

## LaunchLab launches: 1% total, 0.5% to the creator

For a LaunchLab launch, the developer docs say the LaunchLab program charges a **1%** curve fee to StonkFun's platform, and that **half of that fee, 0.5% of every trade, is forwarded to the creator** automatically. There is nothing to sign and nothing to poll for that forward. That is a clearer official creator figure than many LaunchLab front ends publish, and it should be read as a LaunchLab platform policy, sitting on top of Raydium's program, not as a Raydium-wide default.

The same page also describes older launches that still have a locked Raydium position and a Fee Key NFT. On those, a fee coin accrues creator fees — about half on the default 1% pool, about three quarters on the 2% tier — on a locked position until they are claimed with the wallet that holds the Fee Key NFT. Reward coins and some other launch types have no creator position, and the claim calls answer 403. A further exception: launches created before the platform's fee shape was unified may accrue into an on-chain vault keyed by creator and quote token, not by launch, so a claim on one mint can sweep that quote for all of them.

This article does not add a launch-form fee table that we did not re-verify on the live form today. If the form shows a 1% or 2% option, treat the confirmation screen and the developer docs as the sources, and stop if they disagree.

## Reward taxes are a separate cost

Newer (v3) reward launches, per the rewards page, are funded by a **1% or 3% transfer tax on every transfer**, set at launch. Earlier reward launches were funded by about 85% of a 4% pool's trading fees. A transfer tax is taken on transfers, including your own sells, and it is not the same line as the 1% LaunchLab trading fee. Holders are paid pro rata in the quote token; a round may also pay in the coin itself.

The developer docs warn that if a taxed launch is not adopted by the platform, the tax still accrues and may never be distributed, because only the platform's withhold authority can withdraw it. That is a fee-related operational risk, and it belongs in a fees article, not only in a developer guide.

## What the platform keeps, and the buyback

The revenue page says the platform automatically claims its trading fees and uses **approximately 60%** of platform revenue to buy $STONK on the open market and burn it, with the rest retained. Using $STONK as a quote token executes a burn without a buyback. The page notes that pricing of exact splits may vary with volatile custom quote tokens. A buyback-and-burn of the platform token is not a promise about any launched coin's price.

## How Highbar's 1% compares

Highbar also advertises a 1% curve fee, but the split is different and the venue is different. Meteora keeps 0.2% of the trade, and the creator earns 0.4%, 0.496% or 0.6% by tier — on Standard, that is the same 0.4% creator number as "half of 0.8% after the protocol share," not the same mechanism as StonkFun's 0.5% of a 1% LaunchLab fee. After graduation Highbar's DAMM v2 pool charges 1%, with a creator rebate that takes the creator to 0.6% to 0.7% of volume. The website adds no extra app fee. The [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) adds 0.02% on extension trades. See the [docs](/docs) and [creator fees on a Solana launchpad](/articles/memecoin-creator-fees-solana-launchpad). Highbar has no stock pairs and no transfer-tax reward mode.

## Bottom line

A StonkFun LaunchLab launch, per the official developer docs, charges a 1% curve fee and forwards 0.5% to the creator. Reward launches can add a 1% or 3% transfer tax, and unaadopted taxed mints are a documented hazard. Read those pages before you launch. To compare a SOL-paired Meteora 1% fee, use the [Highbar docs](/docs) and the [launch page](/launch).

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
