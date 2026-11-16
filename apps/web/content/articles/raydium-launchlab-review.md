---
title: "Raydium LaunchLab Review (2026): Modes, Fees, Graduation and When to Use a Front\
  \ End"
slug: raydium-launchlab-review
meta_description: "A Raydium LaunchLab review from official docs: JustSendit vs LaunchLab mode, layered\
  \ fees, 85 SOL graduation, LP handling and how Highbar compares."
primary_keyword: Raydium LaunchLab review
secondary_keywords:
  - Raydium launchpad review
  - JustSendit vs LaunchLab
  - Raydium LaunchLab 2026
  - LaunchLab vs Highbar
date: 2026-11-17
publish_at: "2026-11-17T19:05:00+07:00"
faq:
  - question: "What is Raydium LaunchLab?"
    answer: "LaunchLab is Raydium's on-chain bonding-curve program. A token trades on a curve\
  \ and, when the quote vault reaches its target, graduates into a Raydium CPMM pool.\
  \ Front ends such as Bonk.fun, StonkFun and Float use LaunchLab platform configs."
  - question: "What is the difference between JustSendit and LaunchLab mode?"
    answer: "Raydium's creation guide describes JustSendit as a quick launch with a fixed 85 SOL\
  \ target and no vesting, and LaunchLab mode as a longer setup with a custom target\
  \ (24 SOL minimum), a configurable share of supply on the curve, and optional vesting."
  - question: "How do LaunchLab fees work?"
    answer: "Each curve swap can pay a Raydium protocol trade fee, a platform fee and a creator\
  \ fee, all set in the platform's config. Raydium's fee comparison page lists 1%\
  \ as the default LaunchLab curve fee and 0.25% as the usual CPMM fee after graduation."
  - question: "How does Highbar differ from LaunchLab?"
    answer: "Highbar launches on a Meteora Dynamic Bonding Curve with a flat 1% fee and a published\
  \ creator share by tier, and it graduates into a locked Meteora DAMM v2 pool at\
  \ 85, 150 or 250 SOL."
---

Raydium LaunchLab is not just another launchpad website. It is the bonding-curve program underneath several well-known Solana front ends, and it is also a launch page on raydium.io. A review has to separate those two uses, because the fee you pay depends on which platform config launched the token. This review follows [Raydium's LaunchLab overview](https://docs.raydium.io/products/launchlab/overview), the [creation guide](https://docs.raydium.io/user-flows/creating-a-launchlab-token), the [PlatformConfig docs](https://docs.raydium.io/products/launchlab/platform-config) and the [fee comparison page](https://docs.raydium.io/reference/fee-comparison). Highbar, the launchpad we run, is a Meteora alternative, not a LaunchLab front end.

## What LaunchLab is

A LaunchLab token trades on a curve priced in a quote asset, usually SOL. When the curve's quote vault reaches its target, LaunchLab creates a Raydium CPMM pool from the collected quote and the remaining tokens, and curve trading stops. Raydium's overview says graduation also revokes the base mint's mint authority.

You can use it in two ways:

1. On Raydium's own launch page, at raydium.io/launchpad/create.
2. Through a platform that owns a `PlatformConfig` inside LaunchLab and sets its own fees and liquidity rules. Bonk.fun, StonkFun and Float all work this way.

If you only read a front end's marketing page, you will miss the on-chain config that actually sets the fee. Raydium publishes those configs in a public [platform list](https://launch-mint-v1.raydium.io/main/platforms?page=1&pageSize=100).

## JustSendit vs LaunchLab mode

On Raydium's own site, the creation guide describes two paths:

| | JustSendit | LaunchLab mode |
| --- | --- | --- |
| Setup | About 1 minute | About 5 minutes |
| Supply | Fixed default | Configurable |
| SOL target | 85 SOL, fixed | 24 SOL minimum, custom |
| Share of supply on the curve | Default | 51–80% |
| Vesting | None | Optional, with cliff and unlock period |

JustSendit is the quick, familiar launch. LaunchLab mode is for structured launches that need vesting or a different target. Raydium warns that supply and curve allocation cannot be changed after launch, and that setting the SOL target too high risks never graduating. That warning is worth taking literally.

## Fees and one-time costs

Every curve swap can pay three fees: Raydium's protocol trade fee, the platform's `fee_rate`, and the platform's `creator_fee_rate`. Raydium caps the platform fee at 5% (the cap was raised on 26 August 2026) and the creator fee at 0.5%. The fee comparison page lists 1% as the default LaunchLab curve fee and 0.25% as the usual CPMM fee after graduation. Platforms can and do set different rates: two letsbonk.fun configs in the public list showed a 1.25% platform fee and a 0 creator fee when we checked on 16 November 2026.

One-time costs, from the same fee comparison page, are about 0.115 SOL to launch (0.1 SOL LaunchLab fee plus about 0.015 SOL rent) and about 0.04 SOL at graduation, paid from curve reserves.

At migration, LaunchLab splits the new CPMM LP using `platform_scale` and `burn_scale`. Since the 17 August 2026 upgrade, Raydium's docs say the non-burned share becomes one platform-owned, locked position represented by a Fee Key NFT, and the burned share can never be withdrawn. Post-graduation creator revenue, per the [creator fee docs](https://docs.raydium.io/products/launchlab/creator-fees), goes to the recorded pool creator, which may be the platform's address if it set `platform_cp_creator`. Check that field before you assume you will earn after graduation. Our earlier guide, [Raydium LaunchLab fees explained](/articles/raydium-launchlab-fees-explained), walks through the same checklist.

## Where Highbar is a fair comparison

Highbar does not use LaunchLab. It launches on a Meteora Dynamic Bonding Curve with six fixed configs, a flat 1% curve fee and a creator share of 0.4%, 0.496% or 0.6% by tier. Graduation is at 85, 150 or 250 SOL into a Meteora DAMM v2 pool whose liquidity is locked forever in two positions. An optional anti-sniper fee starts at 25% and decays to about 1% over 60 seconds; it makes early buys more expensive and does not stop bots. See the [Meteora DBC explainer](/articles/meteora-dynamic-bonding-curve-explained) and the [docs](/docs).

LaunchLab is more flexible: custom supply, curve share, quote asset and vesting, plus many front ends. Highbar is less flexible on purpose, so tokens are easier to compare. After graduation, a typical LaunchLab CPMM pool is cheaper to trade (0.25%) than Highbar's 1% DAMM v2 fee. Highbar is also much smaller. Those are real differences, not slogans.

## Who LaunchLab suits

LaunchLab suits creators who want to launch on Raydium's own page, or through a front end that already has an audience, and who are comfortable reading a platform config to see the real fee and LP split. JustSendit suits a quick 85 SOL launch. LaunchLab mode suits a structured launch that needs vesting or a custom target. It is less suited to someone who wants a single published creator share on a Meteora pool, which is the job Highbar is built for.

## Bottom line

LaunchLab is strong infrastructure, and a good review has to say that the front end, not only Raydium, decides most of the fees and LP rules. Read the platform config, then the creation guide, before you launch. To compare a fixed-tier Meteora launch, use the [Highbar docs](/docs), the [launch page](/launch), or the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed).

Figures in this article were checked on 16 November 2026 against the official pages linked above.

Those pages change, so re-read them before you launch or trade, and do not treat this guide as a substitute for the live docs.

If a figure here disagrees with an official page, the official page is the one that binds.

Highbar is a small, new launchpad. Nothing in this article is a reason to buy or sell a token, and no launchpad can guarantee demand.

Locked liquidity and a creator fee share are design choices. They do not make a token safe, and they do not stop sniper bots on their own.

Always confirm fee rates, graduation targets and liquidity rules on the live docs, or on the on-chain config, immediately before you sign.

A useful way to use a comparison like this is to write down the three rules you actually care about — the curve fee, the creator share, and what happens to liquidity at graduation — and check those three lines on each official page, rather than choosing a launchpad by name or by a social-media clip.
