---
title: "How to Launch on StonkFun: Stock-Paired Tokens, Fees and Reward Coins (2026 Guide)"
slug: how-to-launch-on-stonkfun
meta_description: "How to launch on StonkFun step by step: pick a quote token, pool fee and launch type, what fees and reward taxes mean, and how Highbar compares."
primary_keyword: how to launch on Stonk
secondary_keywords:
  - StonkFun launchpad
  - stonk launchpad solana
  - StonkFun fees
  - StonkFun reward coin
  - launch token paired with stock
date: 2026-11-11
publish_at: "2026-11-11T15:31:00+07:00"
faq:
  - question: "What is StonkFun?"
    answer: "StonkFun is a Solana launchpad where a new coin can be paired with almost any token, including tokenized stocks, currencies, commodities, SOL or another coin. Its developer page says launches run on Raydium LaunchLab."
  - question: "What fee does a StonkFun coin charge?"
    answer: "The StonkFun launch form offers a 1% or 2% pool fee. For the 1% default it says roughly 0.5% goes to the creator and about 0.5% to the platform. Raydium's public platform list shows StonkFun configs with a 1% platform fee rate."
  - question: "What is a StonkFun reward coin?"
    answer: "Per StonkFun's rewards page, newer reward launches are funded by a transfer tax of 1% or 3% on every transfer, set at launch, and pay holders pro rata in the quote token."
  - question: "What happens to liquidity after a StonkFun coin graduates?"
    answer: "Raydium's platform list shows StonkFun's configs lock the whole graduated CPMM LP position to the platform, with nothing burned and no creator share of the LP."
  - question: "How is launching on Highbar different?"
    answer: "Highbar tokens pair with SOL on Meteora DBC. The creator picks an 85, 150 or 250 SOL target, can turn on an optional anti-sniper fee, and the token graduates into a Meteora DAMM v2 pool with permanently locked liquidity."
---

"How to launch on Stonk" is one of the fastest-rising launchpad searches this month, and it makes sense. StonkFun lets you pair a new Solana coin with almost anything, from tokenized S&P 500 shares to another memecoin, and tokenized stocks are a hot topic ahead of Solana Breakpoint. This guide walks through a StonkFun launch using the platform's own pages, explains the fees and reward taxes, and compares it with Highbar, the launchpad we run.

Checked on 11 November 2026 on [stonkfun.xyz](https://www.stonkfun.xyz/). StonkFun does not publish a single docs page, so facts below come from its launch, rewards, revenue and developer pages and from Raydium's public data.

## What StonkFun is

StonkFun's homepage describes it as a place to "create and discover onchain coins paired with memes, stocks, currencies, commodities and more". Its [developer page](https://www.stonkfun.xyz/developers) explains that launches run on [Raydium LaunchLab](https://docs.raydium.io/products/launchlab/overview): the coin trades on a bonding curve, and the LaunchLab program charges a 1% curve fee to StonkFun's platform account.

Raydium's public [LaunchLab platform list](https://launch-mint-v1.raydium.io/main/platforms?page=1&pageSize=100) shows two StonkFun configs, one for standard launches and one for reward launches. Both carry a 1% platform fee rate, a 0 on-chain creator fee rate, and a `platformScale` of 1,000,000, which means the full graduated LP position is locked to the platform with nothing burned.

## Step by step: launching a coin on StonkFun

These steps follow the [StonkFun launch form](https://www.stonkfun.xyz/launch).

### 1. Connect a Solana wallet

Open the launch page and connect your wallet. It pays the launch cost, which the form calculates live.

### 2. Choose the pool fee

The form offers **1% or 2%**. It describes 1% as the default and the lowest cost to traders, split roughly 50/50: about 0.5% accrues to the creator and the platform keeps about 0.5%. The fee is part of the coin's setup, so choose deliberately.

### 3. Enter name, symbol and image

Name up to 32 characters, symbol up to 10. The image can be PNG, JPEG or WebP, square, up to 2 MB. StonkFun says image and metadata are stored permanently on Arweave.

### 4. Add links (optional)

Website, X and Telegram links are saved in the token's permanent metadata. Leaving the website blank links to StonkFun.

### 5. Pick the quote token

This is StonkFun's signature step. The form groups quote tokens into categories such as xStocks, PreStocks, Tessera, Sunrise, Currencies, Leverage, Collectibles, Baskets, Solana and Custom. Your coin will trade against the token you choose, and fees and rewards are collected in it.

### 6. Review the summary and sign

The summary shows a starting market cap of $5,000, a supply of 1 billion, the trading fee and the creator's approximate share. StonkFun's own note on that screen is worth repeating: creator fees are approximate and depend on trading that may never happen, and a token can lose all of its value.

## Standard coins vs reward coins

StonkFun supports two launch types:

- **Standard coins** pay the pool fee, with the creator share forwarded to the creator. The developer page says StonkFun forwards a standard launch's creator share to the creator's wallet once the launch is recorded by the platform.
- **Reward coins** pay holders instead. Per the [rewards page](https://www.stonkfun.xyz/rewards), newer reward launches are funded by a **1% or 3% transfer tax on every transfer**, set at launch, and pay holders pro rata in the quote token (or sometimes the coin itself).

A transfer tax applies to every transfer, including your own sells. If you trade a reward coin, factor that in.

### Where platform revenue goes

StonkFun's [revenue page](https://www.stonkfun.xyz/revenue) says the platform claims its trading fees automatically and uses approximately 60% of platform revenue to buy $STONK on the open market and burn it. A separate [flywheel](https://www.stonkfun.xyz/flywheel) takes a share of fees from reward launches to buy back and burn the platform's top tokens by market cap. Neither is a promise about any coin's price.

## Things to check before you launch

1. **Your quote token's issuer.** Tokenized stocks are issued by third parties, and a stock-paired coin gives you no rights in the company.
2. **Quote token liquidity.** Thin quote pools can make trades and rewards volatile.
3. **Who earns after graduation.** On StonkFun's configs, the graduated LP and its fees belong to the platform.
4. **The developer API details**, if you launch programmatically. The developer page warns that a launch built with the wrong settings may not be recorded, which for a reward coin means taxes are never distributed.

## StonkFun vs Highbar

| | StonkFun | Highbar |
| --- | --- | --- |
| Infrastructure | Raydium LaunchLab → Raydium CPMM | Meteora DBC → Meteora DAMM v2 |
| Pair asset | Almost any token | SOL |
| Trading fee | 1% or 2% pool fee | 1% on the curve |
| Creator share | About 0.5% per trade on the 1% tier | 0.4%, 0.496% or 0.6% per curve trade by tier |
| Graduated liquidity | Locked to the platform | Locked forever, split between creator and platform positions |
| Holder rewards | Reward coins via 1% or 3% transfer tax | None; Highbar traders get 0.05% cashback, currently paid in SOL |
| Anti-sniper | Not listed on the launch form | Optional, 25% decaying to about 1% over 60 s |

Highbar facts come from the [Highbar docs](/docs). The fair summary: StonkFun is the more flexible option if you want stock or custom pairs and holder rewards. Highbar is narrower by design: SOL pairs, three fixed tiers, an optional anti-sniper fee, and a creator share of the locked DAMM v2 position after graduation. It is also much smaller. Our step-by-step [Solana memecoin launch guide](/articles/how-to-launch-a-solana-memecoin) shows the Highbar flow if you want to compare.

## Bottom line

Launching on StonkFun takes a few minutes: connect, pick a 1% or 2% pool fee, fill in the token details, choose a quote token and sign. The decisions that matter are the quote token and whether you launch a standard or reward coin. Read StonkFun's pages and Raydium's config data first, and remember no launchpad can make a coin succeed. To compare with Highbar, see the [docs](/docs) and [launch page](/launch), or the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed).
