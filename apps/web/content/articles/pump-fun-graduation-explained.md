---
title: "Pump.fun Graduation Explained: The Curve, the 0.015 SOL Fee and What Happens on PumpSwap"
slug: pump-fun-graduation-explained
meta_description: "Pump.fun graduation explained from official docs: how the curve ends, the 0.015 SOL\
  \ fee, the PumpSwap pool and how Highbar's migration differs."
primary_keyword: pump.fun graduation
secondary_keywords:
  - pump.fun graduate
  - pump.fun PumpSwap
  - pump.fun migration
  - pump.fun graduation fee
date: 2026-11-18
publish_at: "2026-11-18T12:41:00+07:00"
faq:
  - question: "What is pump.fun graduation?"
    answer: "When a coin's market cap on the bonding curve hits pump.fun's graduation threshold,\
  \ the curve is closed and the liquidity is migrated atomically to a PumpSwap pool.\
  \ Pump.fun's bonding curve page says graduation is automatic and irreversible."
  - question: "How much is the pump.fun graduation fee?"
    answer: "Pump.fun's fees page lists 0.015 SOL per coin, for every coin regardless of the asset\
  \ it is paired with. For a SOL-paired coin it is deducted from the bonding curve."
  - question: "What happens to liquidity after graduation?"
    answer: "The bonding curve page says the migrated SOL and tokens become the canonical PumpSwap\
  \ pool, that pump.fun does not seed or remove this liquidity after graduation, and\
  \ that the pool is owned by the protocol."
  - question: "How does Highbar graduation differ?"
    answer: "A Highbar token migrates when the curve holds 85, 150 or 250 SOL, depending on the\
  \ tier the creator picked, into a Meteora DAMM v2 pool. Liquidity is locked forever\
  \ in two positions, and 20% of the supply goes into that pool."
---

"When does a pump.fun coin graduate, and what actually happens?" is one of the most searched questions around the platform, and it is also one of the easiest to get wrong, because unofficial posts like to invent a market-cap number. This explainer uses only [pump.fun's bonding curve page](https://pump.fun/docs/bonding-curve) and [fees page](https://pump.fun/docs/fees) (last updated 16 November 2026 when we checked the fees page), then compares the process with Highbar, the launchpad we run.

## What graduation is

Every pump.fun coin starts on a bonding curve: a constant-product AMM with virtual reserves, no order book and no market-makers. The price is a function of how many tokens are in circulation. When the coin's market cap on that curve hits the graduation threshold, two things happen in one automatic step:

1. The curve is closed. You can no longer trade on it.
2. The entire liquidity pool is migrated atomically to PumpSwap.

Pump.fun's bonding curve page says graduation is automatic and irreversible, and that there is no human step. From that point the coin trades on PumpSwap's deeper liquidity pool. This article does not state a threshold figure in dollars or SOL, because the official bonding curve page describes a threshold without publishing the number. If you need the live threshold, read it on pump.fun itself.

## The 0.015 SOL graduation fee

The fees page lists a flat **0.015 SOL** charge when a coin graduates from pump.fun to PumpSwap, for every coin, regardless of the asset it is paired with. For a SOL-paired coin it is deducted from the bonding curve. For a coin paired with another asset it is paid in SOL by the account that performs the migration (normally pump.fun), unless a user's trade triggers the migration, in which case that user pays it. It is a flat amount, not a percentage of the SOL raised.

## What happens to the liquidity

The bonding curve page is more careful than many recaps. It says the migrated SOL and tokens become the canonical PumpSwap pool, that pump.fun does not seed or remove this liquidity after graduation, and that the pool is owned by the protocol. That is the official wording, and it is the wording this article uses. It is not the same claim as "locked forever in an NFT position," which is how some other venues describe their locks.

After graduation, fees change. Canonical PumpSwap fees are tiered by market cap, calculated as price times one billion tokens. At the low end of the official SOL table the total fee is 1.250%; at 98240 SOL and up it is 0.300%. Non-canonical PumpSwap pools pay a flat 0.3%. Trades placed in the pump.fun web or mobile app still carry the separate 0.45% or 0.40% Platform Fee on top. Our [pump.fun fees explainer](/articles/pump-fun-fees-explained) has the tables.

## What if a coin never graduates?

The official bonding curve page focuses on what happens when the threshold is reached. It does not devote a section to coins that never get there. In practice those coins remain on the curve and can still be bought and sold there, but this article will not invent a pump.fun rule that the docs do not state. If a coin has not graduated, you are still paying the 1.25% curve fee, not the PumpSwap schedule.

## How Highbar's migration differs

Highbar tokens trade on a Meteora Dynamic Bonding Curve. Graduation happens when the curve holds the tier target the creator picked: 85, 150 or 250 SOL. The SOL raised, minus a migration fee (1% on Standard and Higher, 0% on Max; on Higher, half of that fee goes to the creator), goes into a Meteora DAMM v2 pool together with 20% of the supply. Meteora keeps a fixed 0.2% of the migrated liquidity. The new pool's liquidity is locked forever in two positions, one for the creator and one for the platform. For the mechanics, see [Meteora DAMM v2 explained](/articles/meteora-damm-v2-explained-token-graduation) and the [docs](/docs).

Two honest differences. Pump.fun's official-app audience is much larger, so more coins reach whatever the live threshold is. Highbar lets the creator pick the target, publishes what happens to the LP, and does not add an extra website app fee. Neither design makes a coin worth buying, and a completed graduation is not a sign that demand will continue.

## Bottom line

Pump.fun graduation is an automatic move from the bonding curve to a protocol-owned PumpSwap pool, with a 0.015 SOL fee and a new, tiered fee schedule. Read the official pages for the live threshold rather than a number copied from a thread. To compare Highbar's 85, 150 or 250 SOL migration into a locked DAMM v2 pool, use the [docs](/docs), the [launch page](/launch), or the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed).

Figures in this article were checked on 16 November 2026 against the official pages linked above.

Those pages change, so re-read them before you launch or trade, and do not treat this guide as a substitute for the live docs.

If a figure here disagrees with an official page, the official page is the one that binds.

Highbar is a small, new launchpad. Nothing in this article is a reason to buy or sell a token, and no launchpad can guarantee demand.

Locked liquidity and a creator fee share are design choices. They do not make a token safe, and they do not stop sniper bots on their own.

Always confirm fee rates, graduation targets and liquidity rules on the live docs, or on the on-chain config, immediately before you sign.

A useful way to use a comparison like this is to write down the three rules you actually care about — the curve fee, the creator share, and what happens to liquidity at graduation — and check those three lines on each official page, rather than choosing a launchpad by name or by a social-media clip.

If you are launching, prepare the token name, ticker, image and any links first, then read the fee table for the exact config you are about to sign, including whether an anti-sniper or app fee applies. If you are trading, check the mint, the pool, and the live fee on the confirmation screen.
