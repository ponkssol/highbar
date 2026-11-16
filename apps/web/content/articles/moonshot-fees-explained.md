---
title: "Moonshot Fees Explained: 0.5% and 0.3% Coin Fees, App Tiers and Creator Payouts"
slug: moonshot-fees-explained
meta_description: "Moonshot fees from official docs: 0.5% pre-bond and 0.3% post-bond coin fees, 2.5%\
  \ or 1% app tiers, hourly creator payouts, and how Highbar compares."
primary_keyword: Moonshot fees
secondary_keywords:
  - Moonshot creator fees
  - Moonshot trading fees
  - Moonshot app fee
  - Moonshot bonding fees
  - Moonshot vs Highbar fees
date: 2026-11-20
publish_at: "2026-11-20T16:31:00+07:00"
faq:
  - question: "What is Moonshot's trading fee on the coin itself?"
    answer: "Official creator-fee docs list a 0.5% dynamic fee on every transaction before the\
  \ coin bonds and a 0.3% fee after it bonds."
  - question: "How much of that fee does the creator get?"
    answer: "Up to 50% of those fees: 0.25% of each pre-bond trade, and up to 0.15% of each post-bond\
  \ trade, set in the create form. Official docs say payouts are processed hourly\
  \ if the unpaid balance exceeds $1."
  - question: "What does the Moonshot app charge traders?"
    answer: "The official trade-fees page lists 2.5% with a minimum of about $0.99 on trades of\
  \ $2 to $100, and 1% on trades of $100 or more, plus network and routing costs shown\
  \ before confirmation."
  - question: "Does Highbar charge an app fee like that?"
    answer: "No extra fee on the Highbar website. The Highbar Chrome extension adds 0.02% of the\
  \ SOL amount on extension trades. The launchpad itself charges 1% on the curve and\
  \ 1% in the DAMM v2 pool."
---

Moonshot publishes two fee tables that are easy to flatten into one number. One is the dynamic fee on the coin, and the share a creator can take of it. The other is the fee the Moonshot app charges on buys and sells. This explainer keeps them separate, using the official [creator fees](https://support.moonshot.com/coins/create/creator-fees) and [trade fees](https://support.moonshot.com/trade/fees) pages, checked on 16 November 2026, and compares only those published figures with the [Highbar docs](/docs).

## The coin fee, and the creator's share

Official creator-fee docs describe a dynamic trading fee of **0.5%** on every transaction before the coin bonds, and **0.3%** on every transaction once it has bonded. Bonding, per the [bonding page](https://support.moonshot.com/coins/create/bonding), begins at a $1 million market cap.

The creator can earn up to 50% of those fees:

- **0.25%** of every pre-bond trade.
- **Up to 0.15%** of every post-bond trade, configurable in the create form.

Payouts are processed and sent hourly if the unpaid balance exceeds $1. A 0.25% or 0.15% share is not a return, and official pages do not forecast volume. If you are comparing creator shares across launchpads, start with [memecoin creator fees](/articles/memecoin-creator-fees-solana-launchpad) and then re-read each official table, because the bases are not identical.

## The app fee traders actually confirm

The official trade-fees page says every Moonshot trade has a small fee in two parts: a Moonshot fee, and a crypto fee that covers network processing and routing to the available price. Price impact is called out separately as not a fee. You see an exact breakdown before you confirm.

Published tiers, based on trade size:

| Trade size | Fee |
| --- | --- |
| $2–$100 | 2.5%, with a minimum of about $0.99 |
| $100+ | 1% |

Default slippage tolerance is dynamic, up to 5%. Official docs say a $100 buy may therefore receive $95–$105, and that you can change slippage in the buy/sell settings. Deposits and withdrawals can also incur a fee from MoonPay; Moonshot points to [MoonPay's fee documentation](https://support.moonpay.com/customers/docs/all-supported-payment-methods#what-are-the-fees-with-moonpay) rather than republishing it. Sends do not take a Moonshot administrative fee, though the network fee still applies, and sending to a new Solana user can include a one-time rent cost.

The important practical point is that a trader in the official app can pay the 2.5% or 1% app fee as well as whatever the coin's 0.5% or 0.3% dynamic fee represents in that route. This article does not invent a combined all-in percentage, because official pages tell you to read the confirmation screen instead.

## How Highbar's fees compare

Highbar charges a 1% fee on the Meteora Dynamic Bonding Curve. Meteora keeps 0.2% of the trade. The creator earns 0.4%, 0.496% or 0.6% by tier. After graduation the DAMM v2 pool also charges 1%, and with the creator LP rebate the creator ends up with 0.6%, 0.65% or 0.7% of volume. Standard and Higher pay a 1% migration fee (Higher also receives half of that fee, 0.75 SOL); Max pays 0%. There is no extra fee on the Highbar website. The [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) adds 0.02% of the SOL amount on extension trades.

On a like-for-like creator-share comparison, Highbar's documented curve share (0.4%–0.6%) is higher than Moonshot's documented 0.25% pre-bond share, and Highbar's post-graduation share (0.6%–0.7%) is higher than Moonshot's documented post-bond maximum of 0.15%. That does not make Highbar "better." Moonshot's app is a different product, with its own 2.5% / 1% trader fee and a $1 million bonding rule. Highbar is a small SOL-paired Meteora launchpad. For a broader fee landscape that includes pump.fun's 1.25% curve fee and official-app Platform Fee, see [pump.fun fees explained](/articles/pump-fun-fees-explained).

If you are launching or trading on Moonshot, trust the official support pages and the confirmation screen. If you are considering Highbar, read the [docs](/docs) and the live figures on [Launch](/launch) before you sign.

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

Read the confirmation screen for the live fee, the quote asset and the destination pool, and only sign if those three lines match the official page you just checked.

A launchpad comparison is a map of published rules, not a forecast. Volume, attention and token price are not implied by any fee table in this article.

If you want a second check after you launch, confirm the mint, the program and the pool on a block explorer, and keep the official docs open while you do it.
