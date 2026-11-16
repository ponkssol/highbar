---
title: "Heaven Fees Explained: Protocol Fees, Creator vs Community Categories and the Review"
slug: heaven-fees-explained
meta_description: "Heaven fees from official docs: 1% then 0.25% or 0.5% protocol fees, 0.1% or 1% creator\
  \ fees, the $100k review, and how Highbar compares."
primary_keyword: Heaven launchpad fees
secondary_keywords:
  - Heaven fees
  - Heaven creator fee
  - Heaven protocol fee
  - Heaven community vs creator fee
  - Heaven vs Highbar fees
date: 2026-11-21
publish_at: "2026-11-21T14:18:00+07:00"
faq:
  - question: "What is Heaven's protocol fee?"
    answer: "Official fee docs list a 1% protocol fee while a coin trades below $100k market cap,\
  \ then 0.25% for a community coin and 0.5% for a creator coin above that mark. Creating\
  \ a coin is free."
  - question: "What is Heaven's creator fee?"
    answer: "0.1% on a community coin and 1% on a creator coin. Official permissioned-fee docs\
  \ say a self-tagged Creator launch is reviewed after $100k in volume, and a Creator\
  \ tag is not a safety approval."
  - question: "Do standard Heaven launches use a sniper fee?"
    answer: "Official Pro Pools docs, in the standard-versus-Pro comparison table, list a 6-second\
  \ linear decay for sniper resistance on standard pools. That is a short decaying\
  \ fee, not a claim that bots are stopped."
  - question: "How do Highbar's fees compare?"
    answer: "Highbar charges 1% on the curve and 1% in the DAMM v2 pool, with a tiered creator\
  \ share of 0.4% to 0.6% on the curve and 0.6% to 0.7% after graduation with the\
  \ rebate. There is no community-versus-creator review."
---

Heaven publishes two fee categories — protocol fees and creator fees — and then changes both of them after a market-cap line and a review. This explainer follows Heaven's official [fees](https://docs.heaven.xyz/fees) and [permissioned fees](https://docs.heaven.xyz/permissioned) pages, plus the sniper-resistance line in the official [Pro Pools](https://docs.heaven.xyz/pro-pools) comparison table, all checked on 16 November 2026. It then places Highbar's published 1% table next to those rules. Heaven is not affiliated with Highbar.

## Protocol fees

Official fee docs start with a free coin create, then:

| Situation | Protocol fee |
| --- | --- |
| Coin trading below $100k market cap | 1% |
| Community coin trading above $100k | 0.25% |
| Creator coin trading above $100k | 0.5% |

Official docs say protocol fees go to the $LIGHT flywheel. This article does not treat that as a reason to buy $LIGHT, and it does not forecast buybacks.

Heaven's official curve page also describes a virtual-SOL AMM rather than a migrating bonding curve, with a $100k virtual migration cap used by display tools. Trading does not change venue at that cap. The protocol-fee line at $100k market cap and the virtual migration cap are therefore easy to confuse; one is a fee schedule, the other is a display threshold.

## Creator fees, and the review that can change them

Official creator fees are:

| Category | Creator fee |
| --- | --- |
| Community coin | 0.1% |
| Creator coin | 1% |

The permissioned-fee page is the one that decides which row applies. Anyone can launch instantly. The deployer chooses "Creator" or "Community" at launch.

- If they choose **Community**, they skip the review and take the 0.1% community creator fee from the start. Official docs note this path is useful for tools that auto-categorize meme launches.
- If they choose **Creator**, the coin receives an "In review" tag once it passes $100k in volume. The 1% creator fee is held by the contract during review and cannot be accessed yet. After review the launch is grouped as **Creator** (fees are released and can be claimed, or partly routed to the flywheel), **Community** (90% of the held fees go to the flywheel; the remaining 10%, a 0.1% ongoing fee, is claimable), or **Blocked** (100% of collected creator fees go to $LIGHT buybacks).

Official docs are explicit that a "Creator" category is not a safety check or a stamp of approval. It means reviewers have seen proof on the project's X or website that the deployer is the team, artist or builder being claimed. The token keeps trading throughout. Official pages also describe routing a creator fee to an artist's wallet as a product capability. That is a routing feature, not a promised payout.

## Standard-pool sniper resistance

The official Pro Pools page is mostly about a different product — bringing an existing SPL token onto Heaven's AMM with configurable fees — but its comparison table lists **6-second linear decay** as the sniper resistance on standard pools. This explainer reports that official line. A six-second decaying fee makes the first seconds more expensive. It does not stop bots, and it is not the same design as Highbar's optional 60-second fee.

## How Highbar's 1% table compares

Highbar, per the [Highbar docs](/docs), charges 1% on the Meteora Dynamic Bonding Curve. Meteora keeps 0.2% of the trade. The creator earns 0.4%, 0.496% or 0.6% by tier, then 0.6% to 0.7% after graduation with the LP rebate. There is no extra website app fee. The [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) adds 0.02% of the SOL amount on extension trades. There is no community-versus-creator review and no held-fee period.

Compared with Heaven's 0.1% community creator fee, Highbar's published creator share is higher. Compared with Heaven's 1% creator-coin fee, Highbar's curve share is lower and its post-graduation share with rebate is lower than 1%. Those lines only matter after you have already chosen the venue: a virtual-SOL AMM versus a migrating, locked DAMM v2 pool. For the product-level comparison, see [Heaven launchpad review](/articles/heaven-launchpad-review) and [memecoin creator fees](/articles/memecoin-creator-fees-solana-launchpad).

If you are launching on Heaven, trust the official fee and permissioned pages, including the warning that "Creator" is not a quality stamp. If you are considering Highbar, read the [docs](/docs) and the live tier on [Launch](/launch) before you sign.

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
