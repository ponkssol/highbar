---
title: "StonkFun vs Bonk.fun: Two Raydium LaunchLab Launchpads Compared on Fees, Pairs and Creator Pay (2026)"
slug: stonkfun-vs-bonk-fun
meta_description: "StonkFun vs Bonk.fun (LetsBonk) from official pages and Raydium's config data: curve fees, creator share, pairs, LP at graduation and where revenue goes."
primary_keyword: stonkfun vs bonk.fun
secondary_keywords:
  - bonk.fun vs stonkfun
  - stonkfun vs letsbonk
  - raydium launchlab launchpads compared
  - stonkfun creator fee
  - bonk.fun fees
date: 2026-11-19
publish_at: "2026-11-19T09:42:00+07:00"
faq:
  - question: "Are StonkFun and Bonk.fun on the same program?"
    answer: "Yes. Both are front ends on Raydium LaunchLab. Each has its own platform configs, which set the platform fee, any creator fee and what happens to LP tokens at graduation."
  - question: "Which pays creators more on the curve, StonkFun or Bonk.fun?"
    answer: "StonkFun's developer page says half of its 1% LaunchLab fee, 0.5% of every trade, is forwarded to the creator automatically. Raydium's platform list showed a creator fee rate of 0 on all three letsbonk.fun configs on 19 November 2026, and we found no official Bonk.fun page describing a creator share."
  - question: "What can I pair a coin with on each launchpad?"
    answer: "StonkFun's homepage filters include xStocks, PreStocks, Tessera, Sunrise, Backpack, currencies, leverage, collectibles, baskets, Solana and custom pairs. Recent Bonk.fun launches in Raydium's API were paired with SOL or BONK."
  - question: "Is either launchpad affiliated with Highbar?"
    answer: "No. Highbar is a separate launchpad on Meteora DBC and DAMM v2. This comparison uses public pages and on-chain config data and is not a recommendation."
---

StonkFun and Bonk.fun look like rivals from different worlds: one is known for coins paired with tokenized stocks and other assets, the other for its ties to the BONK community. Underneath, both are front ends on **Raydium LaunchLab**, which makes a head-to-head comparison unusually clean. The program is the same; the platform configs and policies are what differ. StonkFun has also been in the news this week after its founder posted a platform update on X, so it is a good time to put the two side by side.

Sources, all read on 19 November 2026: StonkFun's [developer page](https://www.stonkfun.xyz/developers), [rewards page](https://www.stonkfun.xyz/rewards), [revenue page](https://www.stonkfun.xyz/revenue) and homepage; Raydium's public LaunchLab [platform list](https://launch-mint-v1.raydium.io/main/platforms), global configs and CPMM configs; Raydium's [platform config docs](https://docs.raydium.io/products/launchlab/platform-config); and the [LetsBONK.fun revenue dashboard](https://revenue.letsbonk.fun/). We run Highbar, which is not affiliated with either launchpad.

## StonkFun vs Bonk.fun at a glance

| | StonkFun | Bonk.fun (LetsBonk) |
| --- | --- | --- |
| Program | Raydium LaunchLab | Raydium LaunchLab |
| Platform fee on the curve | 1% (two configs) | 1.25% (two configs) or 1% (one config) |
| Raydium protocol fee | 0.25% | 0.25% |
| Creator share on the curve | 0.5% of every trade, forwarded off-chain by StonkFun | Creator fee rate 0 in all three configs |
| Pairs | Memes, stocks, currencies, commodities and more | SOL and BONK in recent launches |
| LP at graduation | 100% platform-locked | Almost all burned (1.25% configs) or 100% platform-locked (1% config) |
| Holder rewards | Optional reward launches with a 1% or 3% transfer tax | None documented |
| Where platform revenue goes | About 60% buys and burns $STONK | 51% to "Buy for BNKK" per the dashboard |

Raydium's docs express every rate in units of 1/1,000,000, so a `feeRate` of 10,000 is 1% and 12,500 is 1.25%. The protocol fee comes from LaunchLab's GlobalConfig, which showed a `tradeFeeRate` of 2,500 (0.25%) on every config we read.

## Curve fees: StonkFun vs Bonk.fun

A buy or sell on the bonding curve pays the protocol fee plus the platform fee, plus a creator fee if the platform config sets one. On the configs we read:

- **StonkFun**: 0.25% + 1% = **1.25%** per curve trade.
- **Bonk.fun, 1.25% configs**: 0.25% + 1.25% = **1.5%** per curve trade.
- **Bonk.fun, 1% config**: 0.25% + 1% = **1.25%** per curve trade.

Both platforms have more than one config, and recent launches existed on more than one of them. The number that applies to a coin is the one on the pool's own `platformId`. A front end can also show extra lines, such as referral fees, so read the confirmation screen.

## Creator pay: the biggest difference

This is where StonkFun and Bonk.fun really diverge.

StonkFun's developer page says that on a LaunchLab launch, "half of the pool's 1% fee, 0.5% of every trade, is forwarded to the creator," automatically, with nothing to sign or poll. On-chain, StonkFun's configs carry a creator fee rate of 0, so this is a StonkFun payout policy layered on top of the program, not a Raydium setting. The same page explains that a launch built outside StonkFun's API is only "adopted" if it matches the platform's expected shape; otherwise the pool trades on Raydium but StonkFun never records it and no fee is forwarded.

For Bonk.fun, all three letsbonk.fun configs carried a creator fee rate of 0 on 19 November. We found no official Bonk.fun page describing a separate creator payout, so we do not claim one. After graduation, the CPMM pool config attached to the 1.25% configs charges a 0.75% creator fee on top of a 0.5% trade fee. But the platform config's `platformCpCreator` points to a letsbonk.fun address, and Raydium's docs say that field decides whether the pool records the original creator or a platform-selected address. Do not assume that fee reaches the coin's creator.

## Pairs and holder rewards

StonkFun's tagline is "Launch coins paired with anything," and its homepage filters list xStocks, PreStocks, Tessera, Sunrise, Backpack, currencies, leverage, collectibles, baskets, Solana and custom quotes. It also offers **reward launches**. Its rewards page says newer (v3) reward launches are funded by a transfer tax of 1% or 3% on every transfer, set at launch, and pay holders pro rata in the quote token. That tax is a cost on every transfer, including your own sells, separate from the curve fee. The developer page warns that a taxed mint the platform does not adopt still collects tax that is never distributed.

Bonk.fun's identity is the BONK ecosystem. In Raydium's mint list, recent Bonk.fun launches were quoted in SOL or BONK. We did not find an official Bonk.fun holder-reward mode.

## Liquidity at graduation

Raydium's LP docs say that since its 17 August 2026 upgrade, a migration splits CPMM LP tokens into a platform-owned locked share and a burned share.

- **StonkFun**: `platformScale` 1,000,000, so all LP goes to a platform-owned locked position.
- **Bonk.fun 1.25% configs**: 999,999 of 1,000,000 burned. Burned LP leaves the liquidity in the pool permanently, and Raydium notes no wallet can claim fees on the burned share.
- **Bonk.fun 1% config**: 100% platform-locked.

Neither outcome makes a coin safe to buy. It only describes who can touch the LP.

## Where the platforms' own revenue goes

StonkFun's revenue page says it claims its trading fees automatically and uses about 60% to buy $STONK on the open market and burn it, keeping the rest. The LetsBONK.fun dashboard lists a revenue split of 51% "Buy for BNKK," 10% BONKsol staking, 10% community marketing, 7.67% each to a $GP reserve, hiring/growth and development/integration, 4% marketing and 2% BonkRewards. Both are platform-token flows, not promises about any launched coin's price.

## Which one fits which creator?

- Pick **StonkFun** if you want a non-SOL pair, a documented creator share on curve volume, or an optional holder-reward tax.
- Pick **Bonk.fun** if your coin is aimed at the BONK community, or you want a BONK pair, and you accept a 0 creator fee on the curve configs we read.

Either way, confirm the live fee lines before signing. For background, read our guides on [how to launch on StonkFun](/articles/how-to-launch-on-stonkfun), [Bonk.fun vs pump.fun](/articles/bonk-fun-vs-pump-fun) and [Raydium LaunchLab fees](/articles/raydium-launchlab-fees-explained).

## How Highbar differs from both

Highbar is not on LaunchLab. It launches on Meteora's Dynamic Bonding Curve with a 1% curve fee, and the creator earns 0.4%, 0.496% or 0.6% of each curve trade depending on the tier (85, 150 or 250 SOL). Graduation moves the token to a Meteora DAMM v2 pool whose liquidity is permanently locked, and the creator ends up with 0.6% to 0.7% of post-migration volume with the LP rebate. Pairs are SOL only, there is no transfer tax, and an optional anti-sniper fee starts at 25% and decays to about 1% over 60 seconds. It is off by default. That fee only makes early buys more expensive. It does not stop bots or Jito bundles. Details are in the [Highbar docs](/docs), you can try each tier on the [launch page](/launch), and the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) trades from X.

## Bottom line

StonkFun and Bonk.fun share a program but not a philosophy. StonkFun pays creators 0.5% of curve volume through its own forwarding and lets you pair with almost anything. Bonk.fun charges a higher curve fee on its most-used configs, sets the creator fee to 0 and sends most platform revenue to the BONK treasury. Check the pool's config before you launch or trade. No launchpad can guarantee demand for a coin.
