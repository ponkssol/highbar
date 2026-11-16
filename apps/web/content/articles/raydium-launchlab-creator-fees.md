---
title: "Raydium LaunchLab Creator Fees: Curve Rates, the 0.5% Cap and Who Gets Paid After\
  \ Graduation"
slug: raydium-launchlab-creator-fees
meta_description: "Raydium LaunchLab creator fees from official docs: the 0.5% cap, how front ends set\
  \ the rate, and who receives CPMM creator fees after graduation."
primary_keyword: Raydium LaunchLab creator fees
secondary_keywords:
  - LaunchLab creator fee
  - LaunchLab creator_fee_rate
  - LaunchLab CPMM creator fees
  - LaunchLab vs Highbar creator fees
date: 2026-11-18
publish_at: "2026-11-18T20:44:00+07:00"
faq:
  - question: "How do creator fees work on Raydium LaunchLab?"
    answer: "Each curve swap can pay a creator fee, set by the platform as creator_fee_rate, on\
  \ top of Raydium's protocol trade fee and the platform fee. Raydium caps the creator\
  \ fee at 0.5%."
  - question: "Do all LaunchLab front ends pay the creator on the curve?"
    answer: "No. The rate is set by the platform config. Some front ends, including the letsbonk.fun\
  \ configs we checked on 16 November 2026, set the creator fee rate to 0."
  - question: "Who gets creator fees after graduation?"
    answer: "Raydium's creator fee docs say post-graduation CPMM creator revenue goes to the recorded\
  \ pool creator. That is the original launcher unless the platform has set platform_cp_creator\
  \ to its own address."
  - question: "How do Highbar creator fees compare?"
    answer: "Highbar pays the creator 0.4%, 0.496% or 0.6% of each curve trade by tier, and after\
  \ graduation, with the creator LP rebate, 0.6%, 0.65% or 0.7% of volume. Fees are\
  \ claimed from Portfolio, Claim fees."
---

The most common misunderstanding about Raydium LaunchLab is that "the creator fee" is a single, Raydium-set number. It is not. Raydium provides the slot; the front end fills in the rate, and after graduation a different rule decides who is even allowed to receive CPMM creator fees. This guide follows Raydium's [PlatformConfig docs](https://docs.raydium.io/products/launchlab/platform-config), [creator fee docs](https://docs.raydium.io/products/launchlab/creator-fees) and [fee comparison](https://docs.raydium.io/reference/fee-comparison), with examples from the public [platform list](https://launch-mint-v1.raydium.io/main/platforms?page=1&pageSize=100), checked on 16 November 2026.

## The three-layer curve fee

Every LaunchLab curve swap can pay:

- A **protocol trade fee**, set in Raydium's global config, paid to Raydium.
- A **platform fee** (`fee_rate`), paid to the front end that owns the config. Capped at 5%.
- A **creator fee** (`creator_fee_rate`), paid to the token creator's vault. Capped at **0.5%**.

Rates are stored in millionths. Raydium lists 1% as the default LaunchLab curve fee, but that default is not a guarantee that the creator receives anything. If a platform sets `creator_fee_rate` to 0, the creator earns nothing on chain from curve trades, even if the total fee the trader pays is 1% or 1.25%.

That is not a hypothetical. In the public list we checked, three letsbonk.fun configs showed a creator fee rate of 0. Other platforms set this field differently; you have to read the config for the front end you are actually using. Our [LaunchLab fees explainer](/articles/raydium-launchlab-fees-explained) is the broader fee checklist; this page is only about the creator's line.

## After graduation, the recipient can change

When the curve completes, LaunchLab creates a Raydium CPMM pool. Raydium's creator fee docs say post-graduation creator revenue comes from CPMM creator fees, paid to the **recorded pool creator**. That is the original launcher, unless the platform has set `platform_cp_creator`, in which case it is the platform's address. In that second case, whether any of the fee is later forwarded to the token creator is a front-end policy, and it should be read on that front end's official pages. If those pages do not say, this article will not invent a forwarding schedule.

This is the check most creators skip. A non-zero `creator_fee_rate` on the curve does not automatically mean you receive CPMM creator fees after graduation. A zero curve rate does not automatically mean you receive nothing after graduation either, unless `platform_cp_creator` and the front end's docs say so. Read both fields.

## One-time costs are not creator fees

Raydium's fee comparison page lists about 0.115 SOL to launch and about 0.04 SOL at graduation, paid from curve reserves. Those are protocol/launch costs, not a creator payout. Do not subtract them from a creator-fee estimate unless you are doing your own accounting, and do not treat them as a bonus either.

## How Highbar pays creators instead

Highbar does not use LaunchLab, so there is no `creator_fee_rate` field to look up. The [docs](/docs) publish the split of a flat 1% curve fee: Meteora keeps 0.2% of the trade, and the creator receives 0.4% on Standard, 0.496% on Higher and 0.6% on Max. On Higher, the creator also receives half of the 1% migration fee (0.75 SOL). After graduation, with the creator LP rebate, the creator ends up with 0.6%, 0.65% or 0.7% of post-migration volume. Fees are claimed from Portfolio, Claim fees, by the wallet that launched the token. LP fees follow the position NFT.

The comparison is therefore: LaunchLab can pay a creator up to 0.5% on the curve, or nothing, depending on the front end, and may point post-graduation fees at the platform. Highbar pays a published tiered share on both phases, and is much smaller. See also [how creator fees work on a Solana launchpad](/articles/memecoin-creator-fees-solana-launchpad).

## A five-line checklist

1. Open the platform config in Raydium's public list.
2. Read `creatorFeeRate` (millionths; 5000 would be 0.5%, 0 is zero).
3. Read `platformCpCreator`. If it is set, post-graduation CPMM creator fees go there.
4. Read the front end's own docs for any forwarding policy.
5. Only then decide whether the launch pays you the way you expected.

## Bottom line

On LaunchLab, creator fees are a config field, capped at 0.5% on the curve, and a recipient field after graduation. They are not a Raydium-wide promise. If you want a published share on a Meteora curve, compare the [Highbar docs](/docs) and the [launch page](/launch), or use the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed). Check the live config before you sign.

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
