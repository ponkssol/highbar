---
title: "Pump.fun vs Raydium LaunchLab: Two Ways to Launch a Solana Coin Compared"
slug: pump-fun-vs-raydium-launchlab
meta_description: "Pump.fun vs Raydium LaunchLab: bonding curves, fees, graduation venues, creator share\
  \ and front ends, from each platform's official docs."
primary_keyword: pump.fun vs Raydium LaunchLab
secondary_keywords:
  - Raydium LaunchLab vs pump.fun
  - JustSendit vs pump.fun
  - pump.fun vs raydium launchpad
  - LaunchLab alternative to pump.fun
date: 2026-11-18
publish_at: "2026-11-18T11:18:00+07:00"
faq:
  - question: "Is Raydium LaunchLab a pump.fun alternative?"
    answer: "It can be. Pump.fun uses its own bonding curve and graduates coins to PumpSwap. LaunchLab\
  \ is Raydium's bonding-curve program and graduates coins to a Raydium CPMM pool.\
  \ You can launch on raydium.io or through a LaunchLab front end."
  - question: "Which curve fee is lower?"
    answer: "Pump.fun's fees page lists 1.25% on the curve, plus a 0.45% or 0.40% Platform Fee\
  \ in its official apps. Raydium's fee comparison page lists 1% as the default LaunchLab\
  \ curve fee, but a front end can set a different platform fee rate."
  - question: "Where does each coin graduate?"
    answer: "A pump.fun coin migrates to a PumpSwap pool owned by the protocol. A LaunchLab coin\
  \ migrates to a Raydium CPMM pool, with LP burned and/or locked to the platform\
  \ according to the config."
  - question: "How does Highbar compare with both?"
    answer: "Highbar uses neither program. It launches on a Meteora Dynamic Bonding Curve and\
  \ graduates to a locked Meteora DAMM v2 pool, with a 1% curve fee and a published\
  \ creator share by tier."
---

"Pump.fun vs Raydium LaunchLab" is a slightly uneven comparison, because one name is a consumer launchpad and the other is mostly infrastructure. People still search it that way, because launching on raydium.io, or on a LaunchLab front end such as Bonk.fun, is the usual alternative to launching on pump.fun. This article compares the two using [pump.fun's fees page](https://pump.fun/docs/fees) and [bonding curve page](https://pump.fun/docs/bonding-curve), and Raydium's [LaunchLab overview](https://docs.raydium.io/products/launchlab/overview), [creation guide](https://docs.raydium.io/user-flows/creating-a-launchlab-token) and [fee comparison](https://docs.raydium.io/reference/fee-comparison). Highbar, the launchpad we run, is a third path on Meteora.

Checked on 16 November 2026.

## What you are actually comparing

Pump.fun is a full product: a website, a mobile app, a Terminal, a bonding curve and, after graduation, PumpSwap. LaunchLab is Raydium's on-chain bonding-curve program. You can use it on Raydium's own create page, in JustSendit or LaunchLab mode, or through a platform that owns a LaunchLab `PlatformConfig`. Bonk.fun, StonkFun and Float all sit on that program. So a fair comparison is either "pump.fun vs launching on raydium.io" or "pump.fun vs a specific LaunchLab front end." The program-level facts below apply to both readings.

## Curves and graduation

Pump.fun's curve is a constant-product AMM with virtual reserves. When market cap hits the platform's graduation threshold, the curve closes and liquidity migrates atomically to PumpSwap. Pump.fun says it does not seed or remove that liquidity afterwards, and that the pool is owned by the protocol. The bonding curve page does not state the threshold number, so this article does not invent one. Graduation costs 0.015 SOL per coin.

LaunchLab also uses a curve priced in a quote asset, usually SOL. When the quote vault reaches its target, LaunchLab creates a Raydium CPMM pool and revokes the base mint's mint authority. On Raydium's own site, JustSendit uses a fixed 85 SOL target and LaunchLab mode allows a custom target with a 24 SOL minimum, plus optional vesting. Third-party platforms set their own raise amounts. At migration, LP is burned and/or locked to the platform, with the non-burned share represented by a Fee Key NFT since the 17 August 2026 upgrade.

## Fees

Pump.fun charges 1.25% on the curve (0.30% creator, 0.95% protocol, 0% LP). After graduation, canonical PumpSwap fees are tiered by market cap, from 1.250% down to 0.300% on the SOL table. Trades in the pump.fun web or mobile app also carry a 0.45% Platform Fee, or 0.40% with a referral code, from 17 October 2026, which does not apply on Terminal. See our [pump.fun fees explainer](/articles/pump-fun-fees-explained).

LaunchLab fees are layered: a Raydium protocol trade fee, a platform `fee_rate` and a `creator_fee_rate`. Raydium lists 1% as the default curve fee and 0.25% as the usual CPMM fee after graduation. A front end can set different rates, within a 5% platform cap and a 0.5% creator cap. One-time costs are about 0.115 SOL to launch and about 0.04 SOL at graduation. Our [Raydium LaunchLab fees](/articles/raydium-launchlab-fees-explained) guide is the checklist for reading a config.

The practical result: a large graduated LaunchLab coin on a typical CPMM pool can be cheaper to trade (0.25%) than a small graduated pump.fun coin still sitting in a high PumpSwap tier, and cheaper than a trade placed in the pump.fun app once the Platform Fee is included. A pump.fun creator, though, has a published 0.30% curve creator fee, which a LaunchLab front end may set to 0.

## Where Highbar sits

Highbar uses a Meteora Dynamic Bonding Curve, not pump.fun's curve and not LaunchLab. The curve fee is 1% with no extra website app fee, the creator earns 0.4%, 0.496% or 0.6% by tier, and graduation is at 85, 150 or 250 SOL into a locked DAMM v2 pool. The optional anti-sniper fee starts at 25% and decays to about 1% over 60 seconds; it does not stop bots. Highbar is much smaller than either of the two names in the title. See the [docs](/docs).

## Bottom line

Pick pump.fun if you want its official-app audience, a published 0.30% creator fee, and a PumpSwap venue, and you are willing to budget the app Platform Fee. Pick LaunchLab, on raydium.io or through a front end, if you want a Raydium CPMM venue, a typical 0.25% post-graduation fee, and, in LaunchLab mode, vesting or a custom target — and then read that front end's config. Pick Highbar if you want fixed Meteora tiers and a published creator share. Start at the [launch page](/launch) or the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) only after that choice is clear.

Figures in this article were checked on 16 November 2026 against the official pages linked above.

Those pages change, so re-read them before you launch or trade, and do not treat this guide as a substitute for the live docs.

If a figure here disagrees with an official page, the official page is the one that binds.

Highbar is a small, new launchpad. Nothing in this article is a reason to buy or sell a token, and no launchpad can guarantee demand.

Locked liquidity and a creator fee share are design choices. They do not make a token safe, and they do not stop sniper bots on their own.

Always confirm fee rates, graduation targets and liquidity rules on the live docs, or on the on-chain config, immediately before you sign.

A useful way to use a comparison like this is to write down the three rules you actually care about — the curve fee, the creator share, and what happens to liquidity at graduation — and check those three lines on each official page, rather than choosing a launchpad by name or by a social-media clip.

If you are launching, prepare the token name, ticker, image and any links first, then read the fee table for the exact config you are about to sign, including whether an anti-sniper or app fee applies. If you are trading, check the mint, the pool, and the live fee on the confirmation screen.

None of the platforms compared here is affiliated with Highbar, and a factual comparison is not a recommendation to use one of them, or to buy any token that has already launched.
