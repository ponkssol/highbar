---
title: "Raydium LaunchLab Explained: Fees, 85 SOL Graduation and Creator Fees in 2026"
slug: raydium-launchlab-fees-explained
meta_description: "Raydium LaunchLab fees explained: JustSendit vs LaunchLab mode, layered curve fees, 85 SOL graduation, CPMM migration and how Highbar on Meteora compares."
primary_keyword: Raydium LaunchLab fees
secondary_keywords:
  - Raydium LaunchLab
  - how to launch on Raydium LaunchLab
  - LaunchLab bonding curve
  - LaunchLab vs Highbar
  - JustSendit Raydium
date: 2026-11-11
publish_at: "2026-11-11T14:02:00+07:00"
faq:
  - question: "What is Raydium LaunchLab?"
    answer: "LaunchLab is Raydium's bonding-curve launch program. Tokens trade on a curve until a quote target is reached, then migrate to a Raydium CPMM pool. Raydium's own UI and third-party launchpads such as Bonk.fun, StonkFun and Float use it."
  - question: "What does it cost to launch on LaunchLab?"
    answer: "Raydium's fee comparison page lists about 0.115 SOL for a LaunchLab launch: roughly 0.015 SOL of bonding-curve account rent plus a 0.1 SOL LaunchLab fee."
  - question: "When does a LaunchLab token graduate?"
    answer: "In JustSendit mode the target is fixed at 85 SOL. In LaunchLab mode the creator sets it, with a minimum of 24 SOL, according to Raydium's docs."
  - question: "Do LaunchLab creators earn fees?"
    answer: "Only if the platform config enables a creator fee. Raydium caps the curve creator fee at 0.5%. After graduation, CPMM creator fees go to the recorded pool creator, which can be the platform rather than the token creator."
  - question: "How does Highbar differ from LaunchLab?"
    answer: "Highbar runs on Meteora DBC, charges a 1% curve fee with a fixed creator share by tier, lets creators choose 85, 150 or 250 SOL targets, and graduates into a Meteora DAMM v2 pool with permanently locked liquidity."
---

Raydium LaunchLab sits underneath more launchpads than most traders realise. Bonk.fun, StonkFun and Float all launch coins on it, and [MemeSonar's DefiLlama-based tracker](https://memesonar.app/solana-launchpads) showed LaunchLab volume up 88% in the week to 9 November 2026. If you search "Raydium LaunchLab fees", the honest answer is "it depends on which platform launched the token". This guide explains why, using [Raydium's documentation](https://docs.raydium.io/products/launchlab/overview), and compares LaunchLab with Highbar, which runs on Meteora instead.

Checked on 11 November 2026. Raydium's docs carry a changelog and the program has changed several times this year.

## What LaunchLab is

LaunchLab is Raydium's on-chain bonding-curve program. A token trades on a curve priced in a quote asset (usually SOL). When the curve's quote vault reaches its target, the launch graduates: LaunchLab creates a Raydium CPMM pool from the collected quote and the remaining tokens, and curve trading stops. Per Raydium's [overview](https://docs.raydium.io/products/launchlab/overview), graduation also revokes the base mint's mint authority.

There are two ways to use it:

1. **Raydium's own launch page** at raydium.io/launchpad/create.
2. **Through a platform**: a third-party launchpad that owns a `PlatformConfig` inside LaunchLab and sets its own fees and liquidity rules.

## Two creation modes on Raydium's site

Raydium's [creation guide](https://docs.raydium.io/user-flows/creating-a-launchlab-token) describes two paths:

| | JustSendit | LaunchLab mode |
| --- | --- | --- |
| Setup | About 1 minute | About 5 minutes |
| Supply | Fixed default | Configurable |
| SOL target | 85 SOL, fixed | 24 SOL minimum, custom |
| Share of supply on the curve | Default | 51–80% |
| Vesting | None | Optional, with cliff and unlock period |

JustSendit is the pump.fun-style quick launch. LaunchLab mode suits structured launches that need vesting or a different target. Raydium warns that supply and curve allocation can't be changed after launch, and that setting the SOL target too high risks never graduating.

## How LaunchLab fees work

This is the part that confuses people. Per Raydium's [PlatformConfig docs](https://docs.raydium.io/products/launchlab/platform-config), every curve swap can pay three separate fees:

- **Protocol trade fee**, set in Raydium's global config, paid to Raydium.
- **Platform fee** (`fee_rate`), set by the platform that launched the token, paid to that platform.
- **Creator fee** (`creator_fee_rate`), also set by the platform, paid to the token creator's vault.

Raydium caps the platform fee at 5% (the cap was raised to that level on 26 August 2026) and the creator fee at 0.5%. Raydium's [fee comparison page](https://docs.raydium.io/reference/fee-comparison) lists 1% as the default LaunchLab curve fee and 0.25% as the usual fee on the CPMM pool after graduation.

Because platforms choose their own rates, two LaunchLab tokens can carry quite different fees. Raydium publishes every platform's settings in a public [platform list](https://launch-mint-v1.raydium.io/main/platforms?page=1&pageSize=100). For example, two letsbonk.fun configs in that list show a 1.25% platform fee rate and a 0 creator fee rate, while the StonkFun configs show a 1% platform fee rate and 0 creator fee rate.

### One-time costs

From the [fee comparison page](https://docs.raydium.io/reference/fee-comparison):

| Event | Cost |
| --- | --- |
| Launch | About 0.115 SOL (0.1 SOL LaunchLab fee + about 0.015 SOL rent) |
| Graduation to CPMM | About 0.04 SOL, paid from curve reserves |

## What happens to liquidity at graduation

At migration, LaunchLab splits the new CPMM LP tokens using the platform's `platform_scale` and `burn_scale`. Since the 17 August 2026 upgrade, Raydium's docs say the non-burned share becomes one platform-owned, locked position represented by a Fee Key NFT, and the burned share can never be withdrawn. Settable examples in the docs include 90% burned and 10% locked to the platform, or a full burn.

### Creator fees after graduation

Raydium's [creator fee docs](https://docs.raydium.io/products/launchlab/creator-fees) say post-graduation creator revenue comes from CPMM creator fees, paid to the **recorded pool creator**. That is the original launcher unless the platform sets `platform_cp_creator`, in which case it is the platform's address. So whether a creator earns after graduation depends on the platform. Check the platform config before launching.

## LaunchLab vs Highbar

Highbar is built on Meteora's Dynamic Bonding Curve rather than LaunchLab. From the [Highbar docs](/docs):

| | Raydium LaunchLab | Highbar |
| --- | --- | --- |
| Curve program | Raydium LaunchLab | Meteora DBC |
| Graduation venue | Raydium CPMM | Meteora DAMM v2 |
| Target | 85 SOL (JustSendit) or 24 SOL+ custom | 85, 150 or 250 SOL by tier |
| Curve fee | Protocol + platform + optional creator fee | 1% flat, no extra app fee on the website |
| Creator on the curve | 0 to 0.5%, platform decides | 0.4%, 0.496% or 0.6% by tier |
| Liquidity after graduation | Burned and/or platform-locked | Locked forever, split between creator and platform positions |
| Anti-sniper option | None listed in Raydium's creation guide | Optional fee, 25% decaying to about 1% over 60 s |
| Vesting | Optional in LaunchLab mode | Not at launch; creators can add a Dev Lock |

A few fair points. LaunchLab is far more flexible: custom supply, curve share, quote asset and vesting. Highbar deliberately isn't: every launch uses one of six fixed Meteora configs, which makes tokens easier to compare and check. And LaunchLab has much more volume and many front ends, while Highbar is new and small. If you want to understand the Meteora side, read our explainers on [Meteora DBC](/articles/meteora-dynamic-bonding-curve-explained) and [DAMM v2 graduation](/articles/meteora-damm-v2-explained-token-graduation).

## Checklist before launching on any LaunchLab front end

1. Find the platform's config in Raydium's public platform list.
2. Read `feeRate` and `creatorFeeRate` (both in millionths).
3. Check `burnScale` and `platformScale` to see what happens to LP.
4. Check `platformCpCreator` to see who gets post-graduation creator fees.
5. Read the platform's own docs, if it publishes any.

## Bottom line

Raydium LaunchLab is infrastructure, and its fees are layered: a Raydium protocol fee, a platform fee and an optional creator fee, followed by CPMM fees after graduation. The platform you launch through decides most of the numbers. Read the config, not the marketing. If you prefer fixed, published tiers on Meteora, compare Highbar's [docs](/docs) and [launch page](/launch), or use the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) to trade from X.
