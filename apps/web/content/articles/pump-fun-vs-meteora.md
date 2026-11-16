---
title: "Pump.fun vs Meteora Launchpads: PumpSwap Versus a DBC-to-DAMM v2 Path"
slug: pump-fun-vs-meteora
meta_description: "Pump.fun vs Meteora launchpads: the official pump.fun curve and PumpSwap path compared\
  \ with DBC launchpads such as Bags, Jupiter Studio and Highbar."
primary_keyword: pump.fun vs Meteora
secondary_keywords:
  - Meteora vs pump.fun
  - pump.fun vs Meteora DBC
  - PumpSwap vs DAMM v2
  - Meteora launchpad alternative
date: 2026-11-18
publish_at: "2026-11-18T13:59:00+07:00"
faq:
  - question: "Is Meteora a pump.fun alternative?"
    answer: "Meteora is infrastructure, not a single launchpad. Several launchpads, including\
  \ Bags, Jupiter Studio and Highbar, use a Meteora Dynamic Bonding Curve and graduate\
  \ tokens into a Meteora DAMM v2 pool. Pump.fun uses its own curve and PumpSwap."
  - question: "What fees does pump.fun charge compared with a Meteora launchpad?"
    answer: "Pump.fun charges 1.25% on its curve, plus a 0.45% or 0.40% Platform Fee in its official\
  \ apps. Meteora DBC launchpads set their own fees on top of Meteora's rules; Highbar\
  \ charges 1% on the curve with no extra website app fee."
  - question: "Where does liquidity go after graduation?"
    answer: "A pump.fun coin migrates to a PumpSwap pool owned by the protocol. A typical Meteora\
  \ DBC launch migrates to a DAMM v2 pool. What happens to that LP — locked, compounded,\
  \ or partly unlockable — is set by the launchpad."
  - question: "Which Meteora launchpad is this article about?"
    answer: "The program-level facts come from Meteora's DBC docs. Launchpad-level facts are taken\
  \ from Bags, Jupiter Studio and Highbar's official docs, and are labelled as such."
---

Searches for "pump.fun vs Meteora" mix up a product with a liquidity layer. Pump.fun is a launchpad with its own bonding curve and its own AMM, PumpSwap. Meteora is a liquidity layer that many launchpads use. The useful comparison is therefore pump.fun versus a Meteora DBC launchpad — Bags, Jupiter Studio, Highbar, and others. This article keeps those layers separate, using [pump.fun's fees](https://pump.fun/docs/fees) and [bonding curve](https://pump.fun/docs/bonding-curve) pages, Meteora's [DBC fee docs](https://docs.meteora.ag/core-products/dbc/fees/overview), plus the official docs of [Bags](https://docs.bags.fm/how-to-guides/customize-token-fees), [Jupiter Studio](https://docs.jup.ag/user-docs/launch/studio) and [Highbar](/docs).

Checked on 16 November 2026.

## Pump.fun's path, in one picture

A pump.fun coin starts on pump.fun's constant-product curve and, when market cap hits the official graduation threshold, migrates atomically to a PumpSwap pool owned by the protocol. The curve fee is 1.25%, including a 0.30% creator fee. Graduation costs 0.015 SOL. After graduation, canonical PumpSwap fees are tiered by market cap, from 1.250% down to 0.300% on the SOL table. Trades in the official apps also carry a 0.45% or 0.40% Platform Fee from 17 October 2026. The official bonding curve page does not publish the threshold number, so this article does not invent one.

That path is simple, and it is used by a very large audience. Simplicity is the product.

## The Meteora DBC path

A DBC launch also starts on a bonding curve, but the curve is Meteora's. Trading fee equals a base fee plus an optional dynamic fee. The base fee can be fixed or can follow a linear or exponential scheduler, which is how decaying anti-sniper fees are built. The protocol receives 20% of the trading fee. The rest is split between a partner (the launchpad) and a creator. When the curve reaches the launchpad's target, it can migrate to a DAMM v2 pool. Meteora also takes a fixed 0.2% protocol liquidity migration fee at that point.

What a trader or creator actually sees depends on the launchpad:

- **Bags**, per its fee-mode docs, offers seven SOL modes. Default is a 2% fee, graduating at 85 SOL, with 25% of post-migration fees compounded into the pool. Fee sharing with many recipients is the distinctive feature.
- **Jupiter Studio**, per its user docs, charges 1% in Meme mode, or 1% or 2% in Custom mode, split 50/50 with the creator for the life of the token, including after graduation. The minimum amount raised is 15,000 USDC, or the equivalent in SOL or JUP. Current configs lock all LP. Custom mode can vest up to 80% of supply and can turn on anti-sniper protection for the first minutes after launch.
- **Highbar** uses six fixed configs. The curve fee is 1%, with a creator share of 0.4%, 0.496% or 0.6% by tier, no extra website app fee, and graduation at 85, 150 or 250 SOL into a DAMM v2 pool whose liquidity is locked forever. The optional anti-sniper fee starts at 25% and decays to about 1% over 60 seconds; it does not stop bots.

Those three products share a program and almost nothing else. Our [Meteora launchpad guide](/articles/meteora-launchpad-platforms-compared) is the wider map.

## Differences that actually matter

**Creator share.** Pump.fun publishes 0.30% on the curve. Studio publishes 50% of a 1% or 2% fee for life. Highbar publishes 0.4% to 0.6% on the curve and 0.6% to 0.7% after graduation with the rebate. Bags publishes a claimers pool that can be shared, with a separate 25% deployer share on new SOL v2 configs. You cannot treat "Meteora" as one creator rate.

**After graduation, the fee can go either way.** A large pump.fun coin can trade at 0.30% on PumpSwap. A Highbar coin stays at 1% on DAMM v2. A Bags Low Float coin can decay toward 0.5%. Studio keeps the 1% or 2% chosen at launch. There is no single "Meteora is cheaper" or "pump.fun is cheaper" line.

**App fees.** Pump.fun's Platform Fee applies in its official apps. Highbar adds nothing on the website and 0.02% on [extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) trades. Studio and Bags should be checked on their own fee pages for any interface surcharge; this article does not invent one.

**Liquidity policy.** Pump.fun says the PumpSwap pool is owned by the protocol and that it does not seed or remove the liquidity. DBC launchpads set their own lock and compounding rules on the DAMM v2 pool. Read the launchpad, not only Meteora.

## Bottom line

Pump.fun is one product with a published curve, a PumpSwap venue and an official-app Platform Fee. "Meteora" is a set of launchpads on a shared program, and you have to pick one. If the one you want is Highbar, the rules are in the [docs](/docs) and on the [launch page](/launch). If it is Bags or Studio, start from their official docs instead. See also our [pump.fun alternatives checklist](/articles/pump-fun-alternatives-compare-solana-launchpads).

Figures in this article were checked on 16 November 2026 against the official pages linked above.

Those pages change, so re-read them before you launch or trade, and do not treat this guide as a substitute for the live docs.

If a figure here disagrees with an official page, the official page is the one that binds.

Highbar is a small, new launchpad. Nothing in this article is a reason to buy or sell a token, and no launchpad can guarantee demand.

Locked liquidity and a creator fee share are design choices. They do not make a token safe, and they do not stop sniper bots on their own.

Always confirm fee rates, graduation targets and liquidity rules on the live docs, or on the on-chain config, immediately before you sign.

A useful way to use a comparison like this is to write down the three rules you actually care about — the curve fee, the creator share, and what happens to liquidity at graduation — and check those three lines on each official page, rather than choosing a launchpad by name or by a social-media clip.

If you are launching, prepare the token name, ticker, image and any links first, then read the fee table for the exact config you are about to sign, including whether an anti-sniper or app fee applies. If you are trading, check the mint, the pool, and the live fee on the confirmation screen.
