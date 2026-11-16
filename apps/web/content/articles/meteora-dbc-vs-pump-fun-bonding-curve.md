---
title: "Meteora DBC vs Pump.fun Bonding Curve: How the Two Launch Models Really Differ"
slug: meteora-dbc-vs-pump-fun-bonding-curve
meta_description: "Meteora DBC vs the pump.fun bonding curve: curve design, fees, anti-sniper schedulers, graduation to DAMM v2 vs PumpSwap, and what it means for creators."
primary_keyword: meteora dbc vs pump.fun
secondary_keywords:
  - pump.fun bonding curve vs meteora
  - meteora dynamic bonding curve vs pump.fun
  - pump.fun bonding curve explained
  - DAMM v2 vs PumpSwap
  - meteora dbc launchpad
date: 2026-11-16
publish_at: "2026-11-16T09:52:00+07:00"
faq:
  - question: "Is Meteora DBC a launchpad like pump.fun?"
    answer: "Not exactly. Pump.fun is a single launchpad with its own curve and its own AMM. Meteora DBC is a permissionless program that many launchpads use, each with its own configs for fees, targets and liquidity."
  - question: "Where do tokens go after graduation?"
    answer: "Pump.fun coins migrate to a canonical PumpSwap pool. Meteora DBC tokens migrate to a Meteora DAMM v2 pool, which Meteora's docs say is the required target for new launches."
  - question: "Which curve has lower fees?"
    answer: "It depends on the launchpad. Pump.fun's fees page lists 1.25% on curve trades plus an app Platform Fee in its own apps. On DBC, each launchpad sets its fee; Meteora's docs set a 0.25% minimum base fee. Highbar uses 1%."
  - question: "Can a DBC launch have an anti-sniper fee?"
    answer: "Yes, if the launchpad configures one. DBC supports linear and exponential fee schedulers that start high and decay. Highbar's optional version starts at 25% and falls to about 1% over 60 seconds. It reduces the early advantage but does not stop bots."
---

Most Solana memecoins start life on a bonding curve, but not all curves are the same. Pump.fun runs its own curve and its own AMM. Meteora's Dynamic Bonding Curve (DBC) is a shared program that many launchpads build on, including Jupiter Studio, Bags, Moonshot and Highbar, the launchpad we run. Searching "Meteora DBC vs pump.fun" usually means you want to know what actually changes for a creator or trader. This guide answers that from the two primary sources: pump.fun's [bonding curve guide](https://pump.fun/docs/bonding-curve) and [fees page](https://pump.fun/docs/fees), and Meteora's [DBC documentation](https://docs.meteora.ag/core-products/dbc/what-is-dbc).

Checked on 16 November 2026.

## The core difference: one product vs a toolkit

**Pump.fun** is one launchpad with one set of rules. Every coin uses the same constant-product curve with virtual reserves, the same graduation threshold and the same fee schedule. When the curve completes, the liquidity moves automatically to a canonical pool on PumpSwap, pump.fun's own AMM.

**Meteora DBC** is infrastructure. Per Meteora's [What is DBC page](https://docs.meteora.ag/core-products/dbc/what-is-dbc), a launchpad or partner first creates a config that defines the quote mint, the curve, the fees, the token type, the migration target and the liquidity distribution. Creators then launch from that config. The program runs at the public mainnet address `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`.

So "Meteora DBC vs pump.fun" is really "pump.fun's fixed rules vs whatever rules your DBC launchpad picked". Two DBC tokens from different launchpads can behave very differently.

## Curve design

### Pump.fun's curve

Pump.fun's [bonding curve guide](https://pump.fun/docs/bonding-curve) describes a constant-product formula with virtual reserves. Buys push the price up, sells push it down, and there is no liquidity to seed. Every coin follows the same shape.

### DBC's curve

DBC starts with a virtual pool and lets the config shape the price path. Meteora's docs say a launch can use a single curve segment or up to 16 segments. Every buy adds quote tokens such as SOL or USDC to the pool, and when the configured quote threshold is reached the launch graduates. This is why DBC launchpads can offer different targets: Highbar, for example, uses 85, 150 or 250 SOL depending on the tier the creator picks.

## Fees on the curve

| | Pump.fun | Meteora DBC |
| --- | --- | --- |
| Who sets the fee | Pump.fun | Each launchpad in its config |
| Curve fee | 1.25% (0.30% creator, 0.95% protocol) | Config-defined, 0.25% minimum base fee, 99% cap |
| App fee | 0.45% Platform Fee in pump.fun's web and mobile apps (0.40% with referral) since 17 October 2026 | Depends on the front end |
| Example | n/a | Highbar: 1%, no extra app fee on the website |

The pump.fun figures come from its [fees page](https://pump.fun/docs/fees), which says the Platform Fee does not apply on Terminal or third-party interfaces. The DBC bounds come from Meteora's [DBC fees overview](https://docs.meteora.ag/core-products/dbc/fees/overview). On Highbar, Meteora keeps 0.2% of each trade and the rest is split between the creator and the platform by tier, per the [Highbar docs](/docs).

## Anti-sniper fee schedulers

This is one of the clearest technical differences. Pump.fun's public docs do not describe a launch-time anti-sniper fee. DBC has one built in: Meteora's fees overview lists linear and exponential fee schedulers that can start with a high fee and decay over time, plus optional dynamic fees that react to volatility. The older rate limiter mode is deprecated for new configs.

Whether a DBC token uses a scheduler depends on the launchpad. Highbar offers it as an option: the fee starts at 25% and decays exponentially to about 1% over 60 seconds, and the creator's dev buy pays the normal fee. Jupiter Studio offers a 1 to 5 minute window in custom mode, per Jupiter's docs as summarised in our [Jupiter Studio vs Highbar comparison](/articles/jupiter-studio-vs-highbar).

A decaying fee makes being first more expensive. It does not stop bots or Jito bundles, and nobody should describe it as protection. Our explainer on the [anti-sniper fee](/articles/anti-sniper-fee-solana-token-launch) shows the decay table and its limits.

## Graduation: PumpSwap vs DAMM v2

**Pump.fun.** When the curve completes, the liquidity migrates atomically and irreversibly to a canonical PumpSwap pool. Pump.fun charges 0.015 SOL at graduation and says it does not seed or remove liquidity afterwards. PumpSwap fees then follow market-cap tiers, from 1.25% below 420 SOL down to 0.30% above 98,240 SOL, per its fees page.

**Meteora DBC.** Meteora's [migration docs](https://docs.meteora.ag/core-products/dbc/migration-and-liquidity) say new DBC configs and pools must migrate to DAMM v2, which uses position NFTs, configurable fees, compounding options and vesting support. The config decides how the migrated liquidity is split and whether it is locked.

On Highbar, the SOL raised (minus the migration fee) goes into the DAMM v2 pool with 20% of the supply, and the liquidity is locked forever in two positions, one for the creator and one for the platform. The DAMM v2 pool charges 1%. For more on that, see [Meteora DAMM v2 explained](/articles/meteora-damm-v2-explained-token-graduation).

### What this means for post-graduation fees

For a coin that grows large, pump.fun's tiered PumpSwap fee falls well below 1%, so trading it is cheaper than trading a Highbar token in its 1% DAMM v2 pool. Just after graduation the comparison is closer. Neither is "better" in general; it depends on the coin's size.

## Creator economics

| | Pump.fun | Highbar on DBC |
| --- | --- | --- |
| Creator on the curve | 0.30% | 0.4%, 0.496% or 0.6% by tier |
| Creator after graduation | 0.95% in the 420–1,470 SOL band, stepping down to 0.05% | 0.6%, 0.65% or 0.7% incl. creator LP rebate |
| How it is paid | Creator fee in the pool's quote asset | Claimed from Portfolio; LP rebate paid automatically |

Other DBC launchpads make different choices. Meteora's docs say trading fees, migration fees, surplus and liquidity can all be split between partner and creator at different stages, which is why one DBC launchpad can pay creators far more or less than another.

## Which model suits you?

- **Pump.fun's model** suits creators who want the largest audience and a single, familiar rule set. Its reach is the biggest advantage on Solana.
- **A DBC launchpad** suits creators who want different choices: a different graduation target, an anti-sniper scheduler, locked LP positions or a different fee split. The trade-off is that you need to read each launchpad's config, because "built on Meteora" alone tells you little.

## How to check any DBC token yourself

1. Find the config account the pool was created from. Launchpads that publish them, like Highbar on its [docs page](/docs), make this easy.
2. Read the fee schedule: base fee, scheduler and duration.
3. Check the migration target and the LP split after graduation.
4. Look at who can claim the post-graduation position fees.

Holder concentration, early buyers and the creator's history matter just as much as the config.

If you want to try the DBC model, the Highbar [launch page](/launch) previews each tier without signing, and the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) lets you trade Solana tokens from posts on X. Either way, a curve is a pricing rule, not a prediction.
