---
title: "Float vs Bonk.fun (LetsBonk): Two Raydium LaunchLab Launchpads Compared on Fees, Pairs and Creator Share (2026)"
slug: float-vs-bonk-fun
meta_description: "Float vs Bonk.fun (LetsBonk): both run on Raydium LaunchLab. Pairs, curve fees, creator share, graduation and LP handling compared from official sources."
primary_keyword: float vs bonk.fun
secondary_keywords:
  - float launchpad vs letsbonk
  - bonk.fun vs float launchpad
  - float launchpad
  - letsbonk.fun fees
  - raydium launchlab launchpads compared
date: 2026-11-23
publish_at: "2026-11-23T09:51:00+07:00"
faq:
  - question: "Do Float and Bonk.fun use the same launch program?"
    answer: "Yes. Float's docs say its coins launch on Raydium LaunchLab, and Bonk.fun's configs appear as letsbonk.fun entries in Raydium's public LaunchLab platform list. The difference is in each platform's config and what happens to the fees."
  - question: "Which one pays the creator?"
    answer: "Float's docs say standard coins pay their creator 0%, while builder launches send 50% of what Float collects to a fee wallet, capped at 0.5% of each trade before graduation. The three letsbonk.fun configs in Raydium's list, checked on 23 November 2026, show a creator fee rate of 0."
  - question: "What is the trading fee on each?"
    answer: "Float's docs say new standard coins pay 1% per trade and builder launches choose 1%, 2% or 2.5%, with Raydium keeping 0.25% on the curve. The letsbonk.fun configs show a platform fee rate of 1.25% on two configs and 1% on one, and Raydium's protocol fee applies on top."
  - question: "When do Float and Bonk.fun coins graduate?"
    answer: "Float's docs say coins graduate at about $150,000 market cap. We did not find an official Bonk.fun page stating its graduation target, so we do not quote one."
---

Float and Bonk.fun (LetsBonk) look very different on the surface. Float pairs memecoins with tokenized stocks and other assets and shares fees with holders. Bonk.fun is the BONK community's launchpad. Under the hood, both run on [Raydium LaunchLab](https://docs.raydium.io/products/launchlab/overview), so the useful comparison is the configuration each one sets and where the trading fee ends up.

This guide uses [Float's own docs](https://www.floatlaunch.xyz/docs) and Raydium's public [LaunchLab platform list](https://launch-mint-v1.raydium.io/main/platforms?page=1&pageSize=100), both checked on 23 November 2026, plus Raydium's protocol docs. We run Highbar, a Meteora-based launchpad, and compare it briefly at the end. We are not affiliated with Float or Bonk.fun.

## Float vs Bonk.fun at a glance

| | Float | Bonk.fun (letsbonk.fun configs) |
| --- | --- | --- |
| Launch program | Raydium LaunchLab | Raydium LaunchLab |
| Pairs | Tokenized stocks, pre-IPO tokens, ZEC or XMR, SOL or USDC | Set per launch; a sample coin in Raydium's listing was quoted in BONK |
| Curve trading fee | 1% on new standard coins; 1%, 2% or 2.5% on builder launches | Platform fee 1.25% (two configs) or 1% (one config), plus Raydium's protocol fee |
| Creator share | 0% on standard coins; 50% of Float's take on builder launches | Creator fee rate 0 on all three configs |
| Graduation | About $150,000 market cap | No official target found |
| LP after graduation | Locked forever with Raydium Burn & Earn | 999,999 of 1,000,000 burned (two configs) or locked to the platform (one config) |

## Pairs: the biggest product difference

Float's docs say every coin is paired with a token: a tokenized stock like NVIDIA or Tesla, a pre-IPO name, a privacy coin such as ZEC or XMR, or plain SOL or USDC. Holder rewards are paid in the paired token.

That brings risks that a SOL pair does not. Float's risk section notes that tokenized stocks are issued by third parties that can pause transfers or move tokens, and that some pre-IPO tokens charge their own transfer fee: 1% for PreStocks and 0.2% for Tessera. ZEC and XMR on Solana are bridged tokens.

Bonk.fun is closer to a classic memecoin launchpad. In Raydium's live coin listing for one letsbonk.fun platform config, the sample coin we pulled was quoted in BONK, so check a coin's quote token before you trade.

## Fees on the curve

### Float

Float's docs say new standard coins pay a **1%** fee on every buy and sell. Builder launches can pick 1%, 2% or 2.5%, and standard coins launched earlier at 2% or 2.5% keep their rate. Raydium keeps 0.25% while a coin is on its curve. The rest is collected by the Float program and split on-chain when someone presses "Cycle fees". Float says its payout bot does this automatically.

For standard coins, Float splits what it collects like this:

| Share | Goes to |
| --- | --- |
| 17.5% | Holders, in the paired token |
| 30% | Buying back and burning $FLOAT |
| 15% | USDC airdrops to traders by score |
| 15% | USDC airdrops to $FLOAT holders |
| 22.5% | Treasury |

### Bonk.fun

Bonk.fun does not publish one fee page, so the rates live in its LaunchLab configs. Raydium's [PlatformConfig docs](https://docs.raydium.io/products/launchlab/platform-config) explain that each swap can pay a protocol fee to Raydium, a platform fee (`fee_rate`) and a creator fee (`creator_fee_rate`), stored in millionths. On 23 November 2026 the platform list showed three letsbonk.fun configs: two with `feeRate` 12500 (1.25%) and one with 10000 (1%). All three have `creatorFeeRate` 0. The Raydium config attached to the sample coin we checked showed a protocol `tradeFeeRate` of 2500, which is 0.25%.

So on a 1 SOL buy, a trader pays roughly 1% on a new Float standard coin, and roughly the platform rate plus Raydium's protocol fee on a Bonk.fun coin. Always read the live config, because rates can change. Our [Raydium LaunchLab fees guide](/articles/raydium-launchlab-fees-explained) explains how these layers stack.

## Who gets paid

This is where the two differ most.

- **Float standard coins** pay the creator nothing. Float's docs state the creator share is 0% on every standard coin. Holders, airdrops, a $FLOAT buyback and the treasury share the fee instead.
- **Float builder launches** send 50% of what Float collects to a fee wallet chosen at launch, with 15% to airdrops, 15% to the $FLOAT buyback and 20% to the treasury. Before graduation, Raydium caps a creator's cut at 0.5% of each trade, so on the 1% level the builder gets 0.375% of each trade and on 2% or 2.5% it gets 0.5%.
- **Bonk.fun configs** set the on-chain creator fee to 0. Whether creators receive anything after graduation depends on the platform's settings. In two configs, `platformCpCreator` points to a platform wallet. We found no official Bonk.fun page with a creator payout schedule, so we do not quote one.

Nothing in either split is a promise about any token's price, including $FLOAT.

## Graduation and liquidity

Float's docs say coins start at a market cap of about $20,000, graduate at about 7.5x (roughly $150,000), and move liquidity into a Raydium pool locked forever with Raydium's Burn & Earn.

For Bonk.fun we could not find an official graduation target, so we leave it out. What the configs do show is the LP policy. Two configs burn 999,999 of every 1,000,000 LP units at graduation. The third sets `platformScale` to 1,000,000, which under Raydium's [LaunchLab docs](https://docs.raydium.io/products/launchlab/overview) means that share is locked through LP-Lock, with its Fee Key going to the platform's NFT wallet. After graduation, trading moves to a Raydium CPMM pool, typically on the 0.25% fee tier.

## Launch rules worth knowing

Float caps the creator's first buy in the launch transaction at 2% of supply on its launch form. Tickers can be launched once for free. Reusing an existing ticker costs 5 SOL if it is 15 seconds old or less, 4 SOL up to 1 minute, 3 SOL up to 1 hour, 2 SOL up to 6 hours, and 1 SOL after that. If the new coin graduates within 48 hours, the launcher gets the fee back, up to 2 SOL. Float's docs say that refund applies to coins launched from 4 November 2026 at 10:01 PM CST. Float also says its program has not had an outside audit yet, and its upgrade authority sits with a 2-of-3 Squads multisig.

For Bonk.fun, the platform configs set `restrictCurveParam` to 0, so curve parameters are not locked by the platform config itself. Check the coin's own launch state on-chain.

## Which fits which goal?

- **You want holder rewards in a stock or other paired asset:** Float's standard coins are built for that.
- **You are building a product and want a fee wallet:** Float's builder launch is the documented route.
- **You want a BONK-community launch on LaunchLab:** Bonk.fun, with the understanding that the configs we checked pay creators 0 on the curve.
- **You want a SOL pair with a published creator share on the curve:** compare Meteora-based options.

For more on each, see [Float launchpad explained](/articles/float-launchpad-explained) and [Bonk.fun vs pump.fun](/articles/bonk-fun-vs-pump-fun).

## Where Highbar differs

Highbar does not use LaunchLab. Each launch uses one of six fixed Meteora Dynamic Bonding Curve configs, pairs with SOL and graduates into a Meteora DAMM v2 pool with permanently locked liquidity, per the [Highbar docs](/docs). Every curve trade pays 1%. Meteora keeps 0.2% and the creator earns 0.4%, 0.496% or 0.6% of each trade depending on the tier, with migration at 85, 150 or 250 SOL. An optional anti-sniper fee starts at 25% and decays to about 1% over 60 seconds. It only reduces the early-buy advantage. It does not stop bots, bundles or rug pulls, including coordinated buys in the launch block. Locked liquidity is not a guarantee of price or safety.

You can start from the [launch page](/launch) or launch and trade from posts on X with the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed).

## Bottom line

Float and Bonk.fun share a program but not an economic model. Float routes fees to holders, airdrops, a buyback and the treasury, or to a builder's wallet. The Bonk.fun configs charge a platform fee and set the creator fee to 0. Read Float's docs and the live LaunchLab config before you launch or trade, and treat every memecoin as high risk.
