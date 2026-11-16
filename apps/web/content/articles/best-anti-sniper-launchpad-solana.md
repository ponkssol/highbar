---
title: "Best Anti-Sniper Launchpad on Solana? Pump.fun, Jupiter Studio, Heaven, Bags and Highbar Compared"
slug: best-anti-sniper-launchpad-solana
meta_description: "Best anti-sniper launchpad on Solana? Pump.fun, Bonk.fun, Jupiter Studio, Heaven, Bags and Highbar compared, plus what these fees cannot do."
primary_keyword: best anti-sniper launchpad Solana
secondary_keywords:
  - anti sniper launchpad solana
  - pump.fun anti sniper
  - jupiter studio anti sniper
  - heaven launchpad sniper resistance
  - meteora dbc fee scheduler
date: 2026-11-16
publish_at: "2026-11-16T15:03:00+07:00"
faq:
  - question: "Does pump.fun have an anti-sniper fee?"
    answer: "Pump.fun's public fees and bonding curve pages do not describe a launch-time anti-sniper fee. Curve trades pay the standard 1.25% fee from the first trade."
  - question: "Which launchpads offer a decaying anti-sniper fee?"
    answer: "Among the platforms in this comparison, Jupiter Studio (custom mode), Heaven and Highbar document one. Meteora DBC supports fee schedulers that any DBC launchpad can configure."
  - question: "Can an anti-sniper fee stop bots completely?"
    answer: "No. A decaying fee makes buying in the first seconds or minutes more expensive. Bots can still buy, and coordinated Jito bundles can still land in the first block."
  - question: "How does Highbar's anti-sniper fee work?"
    answer: "It is optional and off by default. When on, the fee starts at 25% and decays exponentially over 60 one-second steps to about 1%. The creator's dev buy in the launch transaction pays the normal fee."
  - question: "Who receives the extra anti-sniper fee?"
    answer: "It depends on the platform. Jupiter's Studio docs say creators get 50% of the higher fee. On Highbar, the curve fee is shared between creator, platform and Meteora by tier."
---

Sniper bots buy in the first seconds of a launch, often before any human has loaded the page. Several Solana launchpads now offer some form of "anti-sniper" setting, and creators search for the best one. This guide compares what each major platform actually documents, then explains what these settings can and cannot do. We run Highbar, one of the platforms below, so we stick to published facts and say where others do more.

Checked on 16 November 2026.

## First, what "anti-sniper" means

Almost every anti-sniper option on Solana works the same way: the trading fee starts very high at launch and falls over a short window. Being first gets expensive, so the incentive to race shrinks. Meteora's [DBC fees overview](https://docs.meteora.ag/core-products/dbc/fees/overview) describes this directly: linear or exponential fee schedulers can start high and decay, with a 99% maximum total fee cap.

What it does **not** do: stop anyone from buying. A bot willing to pay the fee still gets in. Coordinated Jito bundles, where several wallets buy inside one block, are a separate problem a fee schedule does not solve. Our explainer on [sniper bots on Solana](/articles/sniper-bots-solana-memecoin-launches) covers the difference.

## Anti-sniper options by launchpad

| Launchpad | Anti-sniper option | Window | Who controls it |
| --- | --- | --- | --- |
| Pump.fun | None documented | n/a | n/a |
| Bonk.fun / Raydium LaunchLab | None documented for launches | n/a | n/a |
| Bags | No current fee mode uses a base-fee scheduler | n/a | n/a |
| Jupiter Studio | Optional, custom mode only | First minutes (1–5 min) | Creator |
| Heaven | Built into standard pools; configurable on Pro Pools | 6 s linear decay (standard) | Heaven / project |
| Highbar | Optional, off by default | 60 s exponential decay | Creator |

Sources are linked in each section below.

## Pump.fun

Pump.fun's [fees page](https://pump.fun/docs/fees) lists a flat 1.25% on curve trades (0.30% creator, 0.95% protocol) and its [bonding curve guide](https://pump.fun/docs/bonding-curve) describes the curve itself. Neither describes a launch-time anti-sniper fee. Pump.fun's strengths are reach and simplicity, not launch-time fee tooling.

## Bonk.fun and Raydium LaunchLab

Raydium's [creation guide](https://docs.raydium.io/user-flows/creating-a-launchlab-token) does not describe a decaying launch fee. It does list "not making an initial buy" as a pitfall, warning that sniping bots may otherwise capture early tokens at near-zero cost. Bonk.fun's configs in Raydium's public [platform list](https://launch-mint-v1.raydium.io/main/platforms?page=1&pageSize=100) set a flat platform fee rate.

## Bags

Bags builds on Meteora DBC, which supports schedulers, but its [Customize Token Fees](https://docs.bags.fm/how-to-guides/customize-token-fees) page says no current config type uses a base-fee scheduler. Bags focuses on flexible fee modes and fee sharing instead. Our [Bags fees explainer](/articles/bags-fm-fees-explained) covers those modes.

## Jupiter Studio

Jupiter's [Studio docs](https://docs.jup.ag/user-docs/launch/studio) list anti-sniping as one of the adjustable parameters in custom mode, and say creators earn 50% of the higher fee charged right after launch if they turn it on. When we checked Jupiter's launch guide on 11 November, the window was 1 to 5 minutes with a linear or exponential decrease. Meme mode, the quick preset, does not include it.

**Strength:** longest window of the group, and the creator shares in the extra fee.

## Heaven

Heaven skips the bonding curve entirely. Its [Pro Pools page](https://docs.heaven.xyz/pro-pools) lists a **6-second linear decay** for sniper resistance on standard pools, and lets Pro Pools define up to 42 fee brackets based on Solana slots since pool creation (about 400 ms per slot). Read our [Heaven review](/articles/heaven-launchpad-review) for the full model.

**Strength:** on by default for standard launches, and very fine-grained control for Pro Pools.

## Highbar

From the [Highbar docs](/docs), the anti-sniper fee is optional and off by default. When it is on:

| Seconds after launch | 0 s | 10 s | 20 s | 30 s | 45 s | 60 s |
| --- | --- | --- | --- | --- | --- | --- |
| Trading fee | 25% | 14.63% | 8.56% | 5.01% | 2.24% | 1% |

The decay is exponential over 60 one-second steps; each second the fee drops by 5.22% of its current value. After 60 seconds it settles at the normal 1% curve fee. The creator's dev buy in the launch transaction pays the normal minimum fee, not the anti-sniper fee. The choice is baked into one of six fixed Meteora DBC configs whose addresses are published in the docs.

**Strength:** simple, public and predictable, with a live fee shown in the trade panel. **Limit:** a 60-second window is shorter than Jupiter Studio's, and like every option here it reduces the early advantage rather than removing it.

## So which is "best"?

There is no single winner. It depends on what you want:

- **Longest fee-decay window:** Jupiter Studio's custom mode.
- **On by default without any setting:** Heaven's standard pools.
- **Short, steep and transparent, with a dev buy at the normal fee:** Highbar.
- **Biggest audience, no anti-sniper fee:** pump.fun.

## What creators can do beyond fees

1. **Launch at a time you announce, from a link you control.** Fake links in replies are common.
2. **Make a modest dev buy, if any.** Raydium's guide makes the same point about early buys.
3. **Show your commitment publicly.** On Highbar, a [Dev Lock](/docs) puts a countdown on your locked tokens.
4. **Never promise outcomes.** No setting can tell you whether a token will graduate or hold value.

## What traders can do

Check the live fee before you buy in the first minute. On Highbar the trade panel shows the current fee during the decay, and the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) shows fees before every trade from X. On any launchpad, look at early holders and funding links before sizing a position.

If you want to see Highbar's option in context, the [launch page](/launch) previews each tier with anti-sniper on or off, without signing anything.
