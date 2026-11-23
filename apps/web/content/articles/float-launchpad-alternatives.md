---
title: "Float Launchpad Alternatives (2026): StonkFun, Jupiter Studio, Bags, Pump.fun and Highbar Compared"
slug: float-launchpad-alternatives
meta_description: "Float launchpad alternatives from official docs: StonkFun, Jupiter Studio, Bags, pump.fun and Highbar, matched to what you wanted from Float."
primary_keyword: float launchpad alternatives
secondary_keywords:
  - float launchpad alternative
  - floatlaunch alternatives
  - launchpads like float
  - stock paired memecoin launchpad
  - float vs highbar
date: 2026-11-18
publish_at: "2026-11-18T08:47:00+07:00"
faq:
  - question: "What is the closest alternative to Float for stock-paired coins?"
    answer: "StonkFun is the nearest match we found. Its homepage lists pairs with xStocks, PreStocks, Tessera, Sunrise and Backpack tokens, and like Float it launches on Raydium LaunchLab. Its developer page says half of the pool's 1% fee, 0.5% of every trade, is forwarded to the creator on a LaunchLab launch."
  - question: "Does a Float creator earn trading fees?"
    answer: "Not on a standard coin. Float's docs say the creator share is 0% on every standard coin. A builder launch sends 50% of what Float collects to a fee wallet chosen at launch, capped by Raydium at 0.5% of each trade before graduation."
  - question: "Can I launch with USDC instead of SOL somewhere else?"
    answer: "Yes. Jupiter Studio's docs list USDC, SOL or JUP as quote tokens, and pump.fun's fee page covers SOL, USDC and other supported pair assets. Highbar is SOL-only."
  - question: "Is Highbar a replacement for Float?"
    answer: "Only if you do not need a stock or token pair. Highbar launches SOL-paired tokens on a Meteora Dynamic Bonding Curve with a 1% fee, a creator share of 0.4% to 0.6% by tier, and graduation into a permanently locked Meteora DAMM v2 pool."
---

Float stands out among Solana launchpads, and the reason is easy to see in [Float's docs](https://www.floatlaunch.xyz/docs): every coin is paired with something, such as a tokenized stock, a pre-IPO token, a bridged privacy coin, SOL or USDC, and holder rewards are paid in that paired token. That design is not for everyone. Some creators want a personal fee share on every coin. Some want a different quote token. Some just want a plain SOL launch.

This guide lists Float launchpad alternatives by the reason you might be looking. Every competitor fact comes from that platform's own pages, read on 18 November 2026. We run Highbar, one of the options below, and none of the other platforms is affiliated with us.

## What Float does, in one paragraph

According to its docs, rechecked on 23 November 2026, Float coins launch on Raydium LaunchLab with a fixed 1,000,000,000 supply, no mint or freeze authority and a starting market cap of about $20,000. At about 7.5x, roughly $150,000, a coin graduates into a Raydium pool locked with Raydium's Burn & Earn. New standard coins pay a flat 1% trading fee. Builder launches can pick 1%, 2% or 2.5%, and standard coins launched earlier at 2% or 2.5% keep their rate. Raydium keeps 0.25% while a coin is on its curve, and Float splits the rest on standard coins: 17.5% to holders, 30% to $FLOAT buyback and burn, 15% to traders by score, 15% to $FLOAT holders and 22.5% to the treasury. Standard coins pay 0% to their creator. A builder launch sends 50% to a fee wallet instead. Our [Float launchpad explainer](/articles/float-launchpad-explained) covers the background, and the live docs win where it differs.

## Float launchpad alternatives at a glance

| If you want... | Look at | Why, per official pages |
| --- | --- | --- |
| Stock or other token pairs, with a creator share | StonkFun | Pairs listed on its homepage; LaunchLab launch forwards 0.5% of each trade to the creator |
| A USDC, SOL or JUP quote and optional vesting | Jupiter Studio | Quote token chosen at launch; 1% or 2% lifetime fee split 50/50 |
| Fee sharing with collaborators | Bags | Fee-share configs, seven SOL fee modes, admin-configured custom quotes |
| A simple launch with no creation fee | pump.fun | No platform fee to create; 1.25% curve fee with a 0.30% creator fee |
| A SOL pair with a tiered creator share | Highbar | 85, 150 or 250 SOL target; creator 0.4% to 0.6% on the curve |

## StonkFun: the closest match for paired coins

StonkFun's [homepage](https://www.stonkfun.xyz/) describes "coins paired with anything" and filters by issuers such as xStocks, PreStocks, Tessera, Sunrise and Backpack, plus currencies and custom pairs. Its [developer page](https://www.stonkfun.xyz/developers) says a LaunchLab launch is charged a 1% curve fee attributed to StonkFun's platform, and that half of it, 0.5% of every trade, is forwarded to the creator automatically. That is the main economic difference from a standard Float coin, which pays the creator nothing.

The same page warns developers that a pool built outside its own builder is only adopted if it matches the published launch shape. If you build your own transactions, read that section before you sign.

Like any stock-paired coin, a StonkFun coin depends on a third-party issuer. Float's own risk section explains why that matters: issuers can pause transfers or add rules, and a coin is not a share in any company.

## Jupiter Studio: different quote tokens, vesting and anti-sniping

If what drew you to Float was launching against something other than SOL, Jupiter Studio covers USDC, SOL or JUP. Per Studio's [launch guide](https://docs.jup.ag/user-docs/launch/studio/launching-a-token), meme mode launches in USDC from a 5,000 USDC market cap and graduates at 75,000 USDC, after roughly 15,390 USDC is raised. Custom mode lets you set the market caps, a creator vesting allocation of 0% to 80%, and an optional anti-sniping fee that starts at 99% and falls over one to five minutes.

Studio's [fees page](https://docs.jup.ag/user-docs/launch/studio/graduation-and-fees) says the 1% or 2% transaction fee applies for the token's whole life, split 50% to the creator and 50% to Jupiter. Graduated LP on current configs is permanently locked in a Meteora DAMM v2 pool. Studio does not offer stock pairs.

## Bags: shared fees and custom quotes

Bags is built around fee sharing. Its [fee modes page](https://docs.bags.fm/how-to-guides/customize-token-fees) lists seven SOL modes. The Default is 2% on the curve and 2% after migration, with half of the curve fee to the platform pool and half to a gross claimers pool. On new SOL fee-share v2 configs, the [deployer fees page](https://docs.bags.fm/how-to-guides/deployer-fees) says the wallet that pays for the config takes 25% of that claimers pool. Most modes graduate at 85 SOL into a Meteora DAMM v2 pool.

Bags also supports custom quote tokens, but only ones its administrators configure. The docs we read do not mention stocks, so check the supported list before you plan around a pair.

## Pump.fun: the default, now with more pairs

Pump.fun's [fees page](https://pump.fun/docs/fees), last updated 16 November 2026, says creating a coin has no platform fee for any pairing. Coins can pair with SOL, USDC or another supported asset on its custom pairs list. On the curve, SOL and USDC coins pay 1.25%: 0.30% to the creator, 0.95% protocol and no LP fee. Graduation to PumpSwap costs 0.015 SOL. After graduation the fees follow a market-cap schedule. There are no holder rewards in the Float sense.

## Highbar: a SOL-only option with a tiered creator share

Highbar is narrower than Float. Every token is paired with SOL. Per the [Highbar docs](/docs), each launch uses one of six fixed Meteora Dynamic Bonding Curve configs, with a 1% fee on every curve trade. Meteora keeps 0.2%. The rest is split by tier:

| Tier | Graduates at | Creator on the curve | Platform on the curve |
| --- | --- | --- | --- |
| Standard | 85 SOL | 0.4% | 0.4% |
| Higher | 150 SOL | 0.496% | 0.304% |
| Max | 250 SOL | 0.6% | 0.2% |

At graduation the pool migrates to a Meteora DAMM v2 pool whose liquidity is locked permanently. With the creator LP rebate, creators receive 0.6% to 0.7% of post-graduation volume. An optional anti-sniper fee starts at 25% and decays to about 1% over 60 seconds, and it is off by default. It only makes early buys more expensive. It does not stop bots, bundles or rug pulls. Locked liquidity is not a guarantee of price or safety. Every token has a fixed 1,000,000,000 supply, mint authority off and immutable metadata. For how the venues line up, see our [Jupiter Studio vs Highbar comparison](/articles/jupiter-studio-vs-highbar) and the [Raydium LaunchLab fees explainer](/articles/raydium-launchlab-fees-explained).

What Highbar does not have: stock pairs, holder rewards paid in a paired token, or fee sharing between several wallets. If any of those is the reason you use Float, Highbar is not the alternative you want.

## How to choose

1. **Decide whether the pair matters.** If the coin should be tied to a stock ticker, stay with Float or look at StonkFun.
2. **Decide who should be paid.** Float rewards holders and traders on standard coins. StonkFun, Studio, pump.fun and Highbar publish a creator share. Bags lets you split it.
3. **Check graduation and liquidity.** Float and StonkFun graduate into Raydium. Studio, Bags and Highbar graduate into Meteora DAMM v2.
4. **Read the fee you will sign.** Fees change. The confirmation screen is the number that counts.

No launchpad choice makes a coin a good investment. Most new coins lose value.

## Next steps

To compare SOL tiers, open the [Highbar launch page](/launch) and the [docs](/docs). If you trade from your timeline, the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) lets you trade and launch Solana tokens from posts on X, with keys stored on your device. This is not investment advice.
