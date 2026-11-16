---
title: "Bonk.fun (LetsBonk) Fees Explained: LaunchLab Platform Rates, LP Burn and Creator\
  \ Share"
slug: bonk-fun-fees-explained
meta_description: "Bonk.fun (LetsBonk) fees from Raydium's public LaunchLab configs: 1.25% or 1% platform\
  \ rates, a 0 creator fee on the curve, and what happens to LP."
primary_keyword: bonk.fun fees
secondary_keywords:
  - letsbonk fees
  - letsbonk.fun trading fee
  - Bonk.fun creator fees
  - Bonk.fun vs Highbar fees
date: 2026-11-17
publish_at: "2026-11-17T17:49:00+07:00"
faq:
  - question: "What is the Bonk.fun trading fee on the curve?"
    answer: "Bonk.fun uses Raydium LaunchLab configs. In Raydium's public platform list, checked\
  \ on 16 November 2026, two letsbonk.fun configs show a 1.25% platform fee rate and\
  \ one shows a 1% platform fee rate. A Raydium protocol trade fee can also apply."
  - question: "Does the creator earn fees on the Bonk.fun curve?"
    answer: "The same platform list shows a creator fee rate of 0 on all three letsbonk.fun configs\
  \ we found. We could not find a Bonk.fun docs page that states a different on-chain\
  \ curve creator rate."
  - question: "What is the fee after a Bonk.fun coin graduates?"
    answer: "LaunchLab graduates into a Raydium CPMM pool. Raydium's fee comparison page lists\
  \ 0.25% as the usual fee on a CPMM pool after graduation."
  - question: "How do Highbar's fees compare?"
    answer: "Highbar charges 1% on the curve, with the creator earning 0.4%, 0.496% or 0.6% by\
  \ tier, and no extra app fee on the website. After graduation the DAMM v2 pool also\
  \ charges 1%."
---

"What are the fees on Bonk.fun?" is a harder question than it looks, because Bonk.fun (LetsBonk) does not publish a single official fee schedule the way pump.fun does. The rates that actually hit a trade live in Raydium LaunchLab platform configs. This guide reads those configs from Raydium's own documentation and public list, checked on 16 November 2026, and then compares them with Highbar, the launchpad we run.

If Bonk.fun later publishes its own fee page, that page should be read alongside the on-chain config. Until then, the config is the source used here.

## How Bonk.fun charges a fee

Bonk.fun is a front end on [Raydium LaunchLab](https://docs.raydium.io/products/launchlab/overview). Per Raydium's [PlatformConfig docs](https://docs.raydium.io/products/launchlab/platform-config), every curve swap can pay three layered fees:

- A **protocol trade fee**, set in Raydium's global config, paid to Raydium.
- A **platform fee** (`fee_rate`), set by the platform, paid to that platform.
- A **creator fee** (`creator_fee_rate`), also set by the platform, paid to the token creator's vault.

Rates are stored in millionths, so 12500 means 1.25%. Raydium caps the platform fee at 5% and the creator fee at 0.5%. Raydium's [fee comparison page](https://docs.raydium.io/reference/fee-comparison) lists 1% as the default LaunchLab curve fee, but a platform can set a different `fee_rate`, which is what Bonk.fun does.

## What the letsbonk.fun configs actually say

Raydium publishes every platform's settings in a public [platform list](https://launch-mint-v1.raydium.io/main/platforms?page=1&pageSize=100). On 16 November 2026 that list showed three letsbonk.fun configs:

| Config | Platform fee rate | Creator fee rate | LP at graduation |
| --- | --- | --- | --- |
| Two of the three | 1.25% (`feeRate` 12500) | 0 | Almost all LP burned (`burnScale` 999,999 / 1,000,000) |
| One of the three | 1% (`feeRate` 10000) | 0 | LP locked to the platform (`platformScale` 1,000,000) |

A trader therefore pays the platform fee plus Raydium's protocol trade fee on the curve. The creator earns nothing on chain from those curve trades, because `creator_fee_rate` is 0. After graduation, the usual CPMM fee listed by Raydium is 0.25%, which is lower than Highbar's 1% DAMM v2 fee and is a real advantage for active traders of a graduated Bonk.fun coin.

Who receives any CPMM creator fee after graduation depends on whether the platform sets `platform_cp_creator`. Raydium's [creator fee docs](https://docs.raydium.io/products/launchlab/creator-fees) say post-graduation creator revenue goes to the recorded pool creator, which is the original launcher unless the platform has pointed that role at its own address. We could not find a Bonk.fun page that says how much, if any, of that reaches token creators, so this article does not invent a number. Bonk.fun's [revenue page](https://revenue.letsbonk.fun/) describes platform-level data, not a creator payout schedule.

## One-time LaunchLab costs

Those are the trading fees. LaunchLab also has one-time costs, from Raydium's fee comparison page: about 0.115 SOL to launch (0.1 SOL LaunchLab fee plus about 0.015 SOL rent) and about 0.04 SOL at graduation, paid from curve reserves. Those figures apply to LaunchLab launches in general; a front end could add its own charge, which we could not verify from an official Bonk.fun fee page.

## How this compares with pump.fun's published schedule

Pump.fun does publish a single [fees page](https://pump.fun/docs/fees), which makes the contrast easy to state. Its curve fee is 1.25% including a 0.30% creator fee, plus a 0.015 SOL graduation fee, plus, in the official apps only, a 0.45% or 0.40% Platform Fee from 17 October 2026. Bonk.fun's on-chain creator fee rate is 0, so a creator who wants an automatic curve cut will not find it in the letsbonk.fun configs we checked. A trader who wants to avoid an extra official-app surcharge may prefer a LaunchLab front end, depending on what other fees that front end or the protocol add. Neither comparison is a reason to use one platform; it is a reason to add the lines up.

This article also does not state a Bonk.fun graduation target in SOL. That figure is often repeated on third-party blogs, but it is not on an official Bonk.fun fee page we could cite, so it is omitted.

## How Highbar's fees differ

Highbar runs on a Meteora Dynamic Bonding Curve, not LaunchLab, so the fee is not a stack of protocol, platform and creator rates chosen by a front end. Every curve trade pays 1%. Meteora keeps 0.2% of the trade and the rest is split by tier: the creator receives 0.4% on Standard, 0.496% on Higher and 0.6% on Max. On Higher, the creator also receives half of the 1% migration fee. After graduation the DAMM v2 pool charges 1%, and with the creator LP rebate the creator ends up with 0.6%, 0.65% or 0.7% of volume. The website adds no extra app fee. The [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) adds 0.02% of the SOL amount on extension trades.

The honest trade-off is simple. A graduated Bonk.fun coin is usually cheaper to trade (0.25% on CPMM, per Raydium). A Highbar launch pays the creator on the curve and after graduation, and locks liquidity in two DAMM v2 positions rather than burning or platform-locking LaunchLab LP. Highbar is also much smaller. For the broader comparison, see our [creator fees guide](/articles/memecoin-creator-fees-solana-launchpad) and [Raydium LaunchLab fees explained](/articles/raydium-launchlab-fees-explained).

## How to check a live Bonk.fun coin

Before you trade or launch, look up the coin's platform config in Raydium's public list, or on a block explorer, and read `feeRate`, `creatorFeeRate`, `burnScale`, `platformScale` and `platformCpCreator`. Do not assume every letsbonk.fun coin uses the 1.25% config, because the list contained a 1% config as well.

## Bottom line

Bonk.fun's curve fee is the LaunchLab platform rate on its config — 1.25% or 1% in the list we checked — plus Raydium's protocol fee, with a 0 creator fee rate on those configs and, after graduation, a usual 0.25% CPMM fee. If you want a published creator share on a 1% Meteora curve, compare the [Highbar docs](/docs) and the [launch page](/launch). Read the live config, and Raydium's official fee pages, before you sign a launch or a trade.
