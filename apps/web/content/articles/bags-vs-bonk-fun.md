---
title: "Bags vs Bonk.fun (LetsBonk): Fee Modes, Creator Share, Graduation and Liquidity Compared (2026)"
slug: bags-vs-bonk-fun
meta_description: "Bags vs Bonk.fun (LetsBonk): Meteora DBC fee modes vs Raydium LaunchLab configs. Fees, creator share, graduation and liquidity from official sources."
primary_keyword: bags vs bonk.fun
secondary_keywords:
  - bags vs letsbonk
  - bonk.fun vs bags.fm
  - bags fm fees
  - letsbonk fees
  - bags vs bonk fun creator fees
date: 2026-11-23
publish_at: "2026-11-23T15:28:00+07:00"
faq:
  - question: "What is the main difference between Bags and Bonk.fun?"
    answer: "Bags launches on a Meteora bonding curve and graduates into a Meteora DAMM v2 pool, with fee modes that send part of every trade to a pool of fee claimers. Bonk.fun uses Raydium LaunchLab configs that, in Raydium's public list checked on 23 November 2026, set the creator fee rate to 0, and graduates into a Raydium CPMM pool."
  - question: "What does Bags charge by default?"
    answer: "Bags' docs say the Default mode charges 2% on every trade. Before migration, 1% goes to the platform pool and 1% to the gross claimers pool. After migration, 0.5% is compounded into liquidity and 0.75% goes to each pool."
  - question: "What does Bonk.fun charge?"
    answer: "Raydium's public platform list shows two letsbonk.fun configs with a 1.25% platform fee rate and one with 1%, all with a 0 creator fee rate. Raydium's protocol fee applies on top on the curve, and graduated pools usually trade on Raydium's 0.25% CPMM tier."
  - question: "When do tokens graduate?"
    answer: "Bags' docs say most SOL fee modes graduate at 85 SOL, with Low Float at 80 SOL and Drop Mode at about 100 SOL. We did not find an official Bonk.fun graduation target, so we do not quote one."
---

Bags and Bonk.fun (LetsBonk) are both popular places to launch a Solana memecoin, but they are built on different rails and make very different choices about who earns from trading. Bags runs on a Meteora Dynamic Bonding Curve with configurable fee modes and fee sharing. Bonk.fun runs on Raydium LaunchLab with platform configs that route the curve fee to the platform.

This comparison uses Bags' official [Customize Token Fees guide](https://docs.bags.fm/how-to-guides/customize-token-fees) and [API docs](https://docs.bags.fm/llms.txt), and Raydium's public [LaunchLab platform list](https://launch-mint-v1.raydium.io/main/platforms?page=1&pageSize=100) and [protocol docs](https://docs.raydium.io/products/launchlab/overview), all checked on 23 November 2026. We run Highbar, a Meteora DBC launchpad, and include it briefly at the end. We are not affiliated with Bags or Bonk.fun.

## Bags vs Bonk.fun at a glance

| | Bags | Bonk.fun (letsbonk.fun configs) |
| --- | --- | --- |
| Curve | Meteora DBC | Raydium LaunchLab |
| Graduates into | Meteora DAMM v2 | Raydium CPMM |
| Default trading fee | 2% before and after migration | 1.25% or 1% platform fee plus Raydium's protocol fee on the curve |
| Creator side | 1% of each pre-migration trade to the gross claimers pool in Default mode | Creator fee rate 0 on all three configs |
| Fee sharing | Up to 100 fee claimers per config | Not part of the configs |
| Graduation | 85 SOL in most modes | No official target found |
| Fee after graduation | Depends on mode; 2% in Default | Typically 0.25% (CPMM) |

## Fees and who earns them

### Bags fee modes

Bags' docs list **seven SOL fee modes**. If a launch does not choose one, the **Default** mode applies:

| Stage | Total fee | Platform pool | Gross claimers pool | Compounding |
| --- | --- | --- | --- | --- |
| Pre-migration | 2% | 1% | 1% | none |
| Post-migration | 2% | 0.75% | 0.75% | 0.5% |

Other modes change the shape. The "~0% Fee Mode" charges 1% on the curve and 0.25% after migration. The "1% Fee Mode" does the opposite, with 0.25% on the curve and 1% after migration. Low Float locks 96% of supply and lowers the post-migration fee as market cap grows, down to 0.5%. Drop Mode keeps the Default fees but locks 85% of supply.

The "gross claimers pool" is not all for one person. For newly created SOL fee-share v2 configs, Bags gives the **deployer 25%** of that pool, and the configured fee recipients split the other 75%. A fee-share config can include **up to 100** fee claimers, which is how Bags supports splitting fees with collaborators or social accounts. Our guide to [Bags fees](/articles/bags-fm-fees-explained) walks through every mode.

### Bonk.fun configs

Bonk.fun does not publish a single fee page, so the live numbers come from its Raydium LaunchLab platform configs. Raydium's [PlatformConfig docs](https://docs.raydium.io/products/launchlab/platform-config) explain that a swap can pay a protocol fee, a platform fee and a creator fee, stored in millionths. On 23 November 2026 the list showed:

| Config | Platform fee | Creator fee | LP at graduation |
| --- | --- | --- | --- |
| Two letsbonk.fun configs | 1.25% | 0 | 999,999 of 1,000,000 LP burned |
| One letsbonk.fun config | 1% | 0 | Locked to the platform |

A sample letsbonk.fun coin we pulled from Raydium's coin listing carried a Raydium protocol `tradeFeeRate` of 2500, which is 0.25%. After graduation, Raydium's [fee comparison page](https://docs.raydium.io/reference/fee-comparison) lists 0.25% as the typical CPMM fee.

**What it means:** On Bags, creators and their fee claimers earn a share of every trade by default, and traders pay 2% in the Default mode. On Bonk.fun's configs, creators earn nothing on the curve on-chain, and a graduated coin is usually cheaper to trade. Neither is "better". They suit different goals.

## Graduation

Bags' docs say SOL-quoted tokens graduate to a DAMM v2 pool once they raise a set amount of SOL:

| Bags mode | Graduation |
| --- | --- |
| Default, ~0% Fee, 1% Fee, Price, Paper Hand Tax | 85 SOL |
| Low Float | 80 SOL |
| Drop Mode | about 100 SOL |

All seven SOL modes compound part of post-migration fees back into the pool's liquidity: 25% in Default and its variants, 50% in the other three.

For Bonk.fun, we did not find an official graduation target and do not repeat third-party figures. Raydium's docs explain that a LaunchLab launch graduates when the curve's quote vault reaches the threshold set at initialize, after which a CPMM pool is created and the mint authority is revoked.

## Liquidity after graduation

- **Bags:** liquidity moves into a Meteora DAMM v2 pool, and part of every post-migration fee is compounded into that pool, deepening it over time.
- **Bonk.fun:** in two configs, almost all LP is burned at graduation. In the third, the LP share is locked through Raydium's LP-Lock, with its Fee Key going to the platform's NFT wallet, per Raydium's LaunchLab docs.

Burned LP and locked LP both mean the liquidity cannot be withdrawn by the creator. They differ in who, if anyone, can claim fees from it.

## Which fits which goal?

- **You want to split fees with collaborators or creators you name:** Bags' fee-share configs are designed for it.
- **You want a BONK-community launch and low post-graduation fees for traders:** Bonk.fun's CPMM pools typically charge 0.25%.
- **You want supply mostly locked from the start:** Bags' Low Float and Drop Mode lock 96% or 85% of supply.
- **You want a creator share on the curve with a choice of graduation target:** compare Meteora DBC options.

For another comparison of Bonk.fun with the largest launchpad, see [Bonk.fun vs pump.fun](/articles/bonk-fun-vs-pump-fun).

## Where Highbar fits

Like Bags, Highbar launches on a Meteora Dynamic Bonding Curve and graduates into a Meteora DAMM v2 pool. The design choices differ. Per the [Highbar docs](/docs), every curve trade pays **1%**: Meteora keeps 0.2% and the creator earns 0.4%, 0.496% or 0.6% depending on the tier. The tier also sets the graduation target at **85, 150 or 250 SOL**. After graduation the LP is permanently locked in two positions, one for the creator and one for the platform, and a creator LP rebate brings the creator to 0.6% to 0.7% of post-migration volume. An optional anti-sniper fee starts at 25% and decays to about 1% over 60 seconds. It only reduces the early-buy advantage. It does not stop bots, bundles or rug pulls, including coordinated buys inside the launch block. Locked liquidity is not a guarantee of price or safety.

You can compare tiers on the [launch page](/launch) or trade and launch from posts on X with the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed).

## Bottom line

Bags gives creators and their collaborators a share of a 2% default fee through configurable fee-share pools, with graduation at 85 SOL in most modes. Bonk.fun's LaunchLab configs charge a platform fee, set the creator fee to 0 and graduate into cheaper CPMM pools. Read the live docs and configs before you launch or trade, because both can change.
