---
title: "LetsBonk (Bonk.fun) Alternatives in 2026: Pump.fun, Highbar, Bags, Studio and Float\
  \ Compared"
slug: letsbonk-alternatives
meta_description: "LetsBonk (Bonk.fun) alternatives compared from official docs: pump.fun, Highbar,\
  \ Bags, Jupiter Studio and Float, on fees, graduation and creator share."
primary_keyword: letsbonk alternatives
secondary_keywords:
  - bonk.fun alternatives
  - letsbonk.fun alternative
  - Bonk.fun vs pump.fun alternative
  - best alternative to letsbonk
date: 2026-11-17
publish_at: "2026-11-17T16:22:00+07:00"
faq:
  - question: "What is LetsBonk?"
    answer: "LetsBonk, still often called Bonk.fun, is a Solana launchpad front end that uses\
  \ Raydium LaunchLab platform configs. Coins graduate into a Raydium CPMM pool."
  - question: "Does Bonk.fun pay creators on the bonding curve?"
    answer: "Raydium's public LaunchLab platform list, checked on 16 November 2026, shows a creator\
  \ fee rate of 0 on the letsbonk.fun configs. We could not find a Bonk.fun docs page\
  \ that states a different on-chain curve creator rate."
  - question: "What are the main alternatives?"
    answer: "Creators often compare Bonk.fun with pump.fun, Highbar, Bags, Jupiter Studio and,\
  \ for paired-asset launches, Float. Each uses different infrastructure and pays\
  \ creators differently."
  - question: "Is Highbar a Bonk.fun alternative?"
    answer: "It can be, if you want a SOL-paired Meteora launch with a published creator share\
  \ and locked DAMM v2 liquidity. It is much smaller, and it is not a Raydium LaunchLab\
  \ front end."
---

LetsBonk, still widely searched as Bonk.fun, is one of the better-known Raydium LaunchLab front ends. If you are looking for a LetsBonk alternative, you are usually trying to change one of three things: the fee a trader pays, whether the creator earns on the curve, or the venue the coin graduates into. This guide compares the options using each platform's official docs or, for Bonk.fun, Raydium's public config data, and includes Highbar, the launchpad we run.

Checked on 16 November 2026. Configs and fee pages change, so confirm on the live pages before you launch or trade.

## What you are leaving if you leave Bonk.fun

Bonk.fun does not run its own curve program. It owns platform configs inside [Raydium LaunchLab](https://docs.raydium.io/products/launchlab/overview). Per Raydium's [PlatformConfig docs](https://docs.raydium.io/products/launchlab/platform-config), each swap can pay a protocol trade fee, a platform `fee_rate` and a `creator_fee_rate`. In Raydium's public [platform list](https://launch-mint-v1.raydium.io/main/platforms?page=1&pageSize=100), checked on 16 November 2026, three letsbonk.fun configs appear: two with a 1.25% platform fee rate and a creator fee rate of 0, and one with a 1% platform fee rate, also with a creator fee rate of 0. On the 1.25% configs, almost all of the LP minted at graduation is burned (`burnScale` 999,999 out of 1,000,000). The 1% config instead locks LP to the platform.

We could not find an official Bonk.fun docs page that states a graduation target or a creator payout schedule that differs from those on-chain rates, so this article does not invent either figure. After graduation, Raydium's [fee comparison page](https://docs.raydium.io/reference/fee-comparison) lists 0.25% as the usual fee on a CPMM pool. Our earlier [Bonk.fun vs pump.fun](/articles/bonk-fun-vs-pump-fun) comparison goes deeper on the two large front ends.

## Pump.fun

Pump.fun is the usual first alternative, and for many people it is the one they came from. It uses its own bonding curve and graduates to PumpSwap. The official [fees page](https://pump.fun/docs/fees) lists a 1.25% curve fee, including a 0.30% creator fee, a 0.015 SOL graduation fee, and, from 17 October 2026, a 0.45% (or 0.40% with a referral code) Platform Fee on trades placed in the pump.fun web or mobile app, but not on Terminal. If your reason for leaving Bonk.fun is "I want the creator to earn on the curve," pump.fun does that on its published schedule. If your reason is "I want a lower fee in the official app," the Platform Fee works against that, unless you trade elsewhere.

## Bags and Jupiter Studio

Both of these launch on a Meteora Dynamic Bonding Curve, like Highbar, rather than on LaunchLab.

Bags, per its [fee-mode docs](https://docs.bags.fm/how-to-guides/customize-token-fees), offers seven SOL fee modes. Default is a 2% fee, graduating at 85 SOL into a DAMM v2 pool, with 25% of post-migration fees compounded back into the pool. New SOL fee-share v2 configs give the deployer 25% of the gross claimers pool, and the remaining claimers share can be split with wallets or social accounts. Bags also supports custom quote tokens. It is the more configurable Meteora option, at the cost of a more complicated fee table.

Jupiter Studio, per its [user docs](https://docs.jup.ag/user-docs/launch/studio), offers Meme and Custom modes. The transaction fee is 1% in Meme mode, or 1% or 2% in Custom mode, split 50/50 between the creator and Jupiter for the lifetime of the token, including after graduation to a Meteora DAMM v2 pool. The minimum amount raised to graduate is 15,000 USDC, or the equivalent in SOL or JUP; Meme mode graduates at a 75,000 USDC market cap. Current configs lock all LP permanently; some older launches unlock 50% after a year. Custom mode can also vest up to 80% of supply, starting at graduation, and can turn on anti-sniper protection, with a higher fee in the first minutes after launch.

## Float, if you want a paired asset

Float is only a close alternative if the thing you wanted was a coin paired with a tokenized stock, a pre-IPO token, or another quote asset. It launches on Raydium LaunchLab, like Bonk.fun, and graduates at about $150,000 into a Raydium pool locked with Burn & Earn. On a standard Float coin the creator share is 0%, which is the same on-chain idea as Bonk.fun's zero creator fee rate, with a very different split of the rest. A builder launch is Float's path if you want a personal share. See [Float's docs](https://www.floatlaunch.xyz/docs).

## Highbar

Highbar is a smaller Meteora launchpad with six fixed configs rather than Bags- or Studio-style customization. The curve fee is 1%, with no extra app fee on the website. The creator earns 0.4%, 0.496% or 0.6% of each curve trade by tier, and after graduation, with the creator LP rebate, 0.6%, 0.65% or 0.7% of volume. Graduation is at 85, 150 or 250 SOL, chosen at launch, into a locked DAMM v2 pool. An optional anti-sniper fee starts at 25% and decays to about 1% over 60 seconds; it makes early buys more expensive and does not stop bots. Read the [docs](/docs) and our [Meteora launchpad guide](/articles/meteora-launchpad-platforms-compared).

Highbar will not give you Bonk.fun's audience. It will give you a published creator share and locked DAMM v2 liquidity, which is the comparison that matters if those were the gaps. This article also leaves out daily volume rankings, because those figures come from third-party trackers and change too quickly to treat as a reason to pick a launchpad.

## How to choose

Pick pump.fun if you want the largest official-app audience and a 0.30% curve creator fee, and you accept the app Platform Fee. Pick Bags or Studio if you want a Meteora curve with more knobs (fee sharing, custom quotes, vesting). Pick Float only if you want a paired asset. Pick Highbar if you want fixed, published SOL tiers and a creator cut on both phases. Then read the live official docs for every platform you are considering, not this summary alone, before you sign a transaction. You can also open the [launch page](/launch) or the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) once you know which set of rules you want to launch under today.
