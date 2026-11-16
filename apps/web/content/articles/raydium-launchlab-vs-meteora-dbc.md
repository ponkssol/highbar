---
title: "Raydium LaunchLab vs Meteora DBC: Two Solana Bonding Curves Compared"
slug: raydium-launchlab-vs-meteora-dbc
meta_description: "Raydium LaunchLab vs Meteora DBC: fees, graduation venues, liquidity locks, creator\
  \ share and which launchpads use each curve, from official docs."
primary_keyword: Raydium LaunchLab vs Meteora DBC
secondary_keywords:
  - LaunchLab vs Meteora
  - Meteora DBC vs Raydium LaunchLab
  - Raydium vs Meteora launchpad
  - CPMM vs DAMM v2
date: 2026-11-17
publish_at: "2026-11-17T20:31:00+07:00"
faq:
  - question: "What is the core difference between LaunchLab and Meteora DBC?"
    answer: "Both are bonding-curve programs for new Solana tokens. LaunchLab graduates into a\
  \ Raydium CPMM pool. Meteora DBC graduates into a Meteora DAMM v2 pool (or another\
  \ configured DAMM venue). Launchpads sit on top and choose the fees and targets."
  - question: "Which launchpads use each curve?"
    answer: "Bonk.fun, StonkFun and Float use Raydium LaunchLab configs. Bags, Jupiter Studio\
  \ and Highbar use Meteora DBC. Pump.fun uses its own bonding curve, not either of\
  \ these."
  - question: "Which curve has the lower post-graduation trading fee by default?"
    answer: "Raydium's fee comparison page lists 0.25% as the usual fee on a CPMM pool after LaunchLab\
  \ graduation. Highbar's DAMM v2 pools charge 1%. Other DBC launchpads set their\
  \ own post-migration fees."
  - question: "Does either program stop sniper bots?"
    answer: "No. Meteora DBC can be configured with a decaying fee scheduler, which is what Highbar\
  \ uses for its optional anti-sniper fee. That makes early buys more expensive; it\
  \ does not stop bots. Raydium's creation guide does not list an equivalent scheduler\
  \ for LaunchLab."
---

A lot of "launchpad vs launchpad" arguments are really arguments about the curve underneath. Raydium LaunchLab and Meteora's Dynamic Bonding Curve are the two programs most Solana launchpads now sit on, besides pump.fun's own curve. This article compares the programs, using [Raydium's LaunchLab overview](https://docs.raydium.io/products/launchlab/overview), [PlatformConfig docs](https://docs.raydium.io/products/launchlab/platform-config) and [fee comparison](https://docs.raydium.io/reference/fee-comparison), and Meteora's [DBC fee docs](https://docs.meteora.ag/core-products/dbc/fees/overview). Highbar, the launchpad we run, is one DBC configuration, not the only one.

## What both programs do

Both give a new token a place to trade before it has a normal liquidity pool. Buyers and sellers trade against a curve. When a target is reached, the program migrates the collected quote and a share of the token supply into a pool, and the curve stops. That shared idea is where the similarity ends.

LaunchLab graduates into a Raydium CPMM pool and, per Raydium's overview, revokes the base mint's mint authority at graduation. Meteora DBC graduates into a DAMM v2 pool (Highbar and several other launchpads use this path). Meteora's fee docs also note a fixed 0.2% protocol liquidity migration fee during migration, which reduces the liquidity that arrives in the new pool by 20 basis points.

## Fees

LaunchLab fees are layered. A swap can pay Raydium's protocol trade fee, a platform `fee_rate` and a `creator_fee_rate`. The platform that launched the token sets the last two, within Raydium's caps (5% platform, 0.5% creator). The default curve fee on Raydium's comparison page is 1%; the usual CPMM fee after graduation is 0.25%. Front ends often differ: letsbonk.fun configs we checked on 16 November 2026 showed a 1.25% or 1% platform fee and a 0 creator fee.

Meteora DBC fees are also configurable, but the building blocks are different. Trading fee equals a required base fee plus an optional dynamic fee. The base fee can be fixed, or it can follow a linear or exponential scheduler, which is how decaying anti-sniper fees are built. The bonding-phase base fee has a 0.25% minimum and the total trading fee is capped at 99%. Of the trading fee, the protocol receives 20%. The rest is split between a partner (the launchpad) and a creator, using `creator_trading_fee_percentage`. A referral, when present, receives 20% of the protocol fee, not an extra charge on top.

Highbar's published configuration is one point in that design space: a 1% curve fee, of which Meteora keeps 0.2% of the trade, and the creator earns 0.4%, 0.496% or 0.6% by tier. After graduation Highbar's DAMM v2 pool also charges 1%. That is not "the Meteora fee"; it is Highbar's chosen DAMM v2 fee. Bags and Jupiter Studio pick different numbers, which is why you should read the launchpad's docs, not only Meteora's.

## Graduation targets and liquidity

On Raydium's own site, JustSendit uses a fixed 85 SOL target and LaunchLab mode allows a custom target with a 24 SOL minimum. Third-party LaunchLab platforms set their own raise amounts; do not assume every LaunchLab coin graduates at 85 SOL. At migration, LP is burned and/or locked to the platform according to `burn_scale` and `platform_scale`. The non-burned share, since the 17 August 2026 upgrade, is a platform-owned locked position represented by a Fee Key NFT.

DBC launchpads also choose their own targets. Highbar offers 85, 150 or 250 SOL. Bags' default SOL mode graduates at 85 SOL (Drop Mode is about 100 SOL, Low Float at 80 SOL). Jupiter Studio's minimum amount raised is 15,000 USDC, or the equivalent in SOL or JUP. Highbar locks DAMM v2 liquidity forever in two positions, one for the creator and one for the platform. Studio's current configs also lock all LP permanently; some older Studio launches unlock 50% after a year. The lock policy is a launchpad choice on top of the program.

For a longer treatment of each side, see [Raydium LaunchLab fees explained](/articles/raydium-launchlab-fees-explained) and [Meteora DBC explained](/articles/meteora-dynamic-bonding-curve-explained).

## Anti-sniping and flexibility

Meteora DBC explicitly supports high early fees that decay by time. Highbar's optional anti-sniper fee uses that: 25% decaying to about 1% over 60 seconds, off by default. It does not stop bots or bundles. Raydium's creation guide does not list a comparable built-in scheduler for LaunchLab launches on raydium.io. A front end could still apply its own off-chain or on-chain rules; this article only states what the official LaunchLab creation guide documents.

LaunchLab mode is more flexible on supply, curve share, quote asset and vesting. DBC is more flexible on fee schedulers, partner/creator splits, collect-fee mode and, depending on the launchpad, quote assets and vesting (Studio, for example, allows vesting of up to 80% of supply). Highbar deliberately uses six fixed configs rather than exposing every DBC knob.

## Which to pick

Pick a LaunchLab front end if you want a Raydium CPMM venue after graduation, a typical 0.25% post-graduation fee, and, in some configs, burned LP. Pick a Meteora DBC launchpad if you want a DAMM v2 venue, a partner/creator fee split, and, where the launchpad offers it, a decaying anti-sniper scheduler. Then pick the launchpad on that program whose published rules you actually want — Bags, Studio and Highbar are not interchangeable just because they share DBC.

## Bottom line

If you want a Raydium CPMM venue, LaunchLab front ends, and a typical 0.25% post-graduation fee, LaunchLab is the program in front of you. If you want a Meteora DAMM v2 venue, a configurable or decaying fee, and launchpads such as Bags, Studio or Highbar, DBC is the program. Read the launchpad's config, not only the program docs. To see Highbar's fixed tiers, use the [docs](/docs), the [launch page](/launch), or the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed).

Figures in this article were checked on 16 November 2026 against the official pages linked above.

Those pages change, so re-read them before you launch or trade, and do not treat this guide as a substitute for the live docs.

If a figure here disagrees with an official page, the official page is the one that binds.

Highbar is a small, new launchpad. Nothing in this article is a reason to buy or sell a token, and no launchpad can guarantee demand.
