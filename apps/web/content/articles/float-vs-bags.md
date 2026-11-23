---
title: "Float vs Bags: Paired-Token Launches, Fee Splits and Creator Earnings Compared"
slug: float-vs-bags
meta_description: "Float vs Bags from official docs: stock-paired coins on Raydium LaunchLab vs Meteora fee-share launches, fee splits, creator share and liquidity locks."
primary_keyword: float vs bags
secondary_keywords:
  - float launchpad vs bags
  - bags vs float
  - floatlaunch vs bags.fm
  - float launchpad alternative
  - stock paired memecoin launchpad
date: 2026-11-17
publish_at: "2026-11-17T11:02:00+07:00"
faq:
  - question: "Does a Float creator earn trading fees?"
    answer: "Not on a standard launch. Float's docs say the creator share is 0% on every standard coin. A builder launch sends 50% of the fee Float collects to a fee wallet chosen at launch, with Raydium capping the creator's cut at 0.5% of each trade before graduation."
  - question: "What does a Bags creator earn?"
    answer: "In Bags' Default mode, 1% of each curve trade goes to a gross claimers pool. On new SOL fee-share v2 configs, the wallet that pays for the config takes 25% of that pool and the configured recipients split the rest. If one wallet is both, it receives the whole pool."
  - question: "Can I launch a stock-paired coin on Bags?"
    answer: "Bags supports custom quote tokens that its administrators configure and review, listed through its Supported Custom Quote Tokens endpoint. Its docs we read do not describe stock pairs specifically. Float's docs are built around pairs with tokenized stocks, pre-IPO names, privacy coins, SOL or USDC."
  - question: "Is liquidity locked after graduation?"
    answer: "Float says graduated liquidity moves into a Raydium pool locked forever with Raydium's Burn & Earn. Bags tokens migrate to a Meteora DAMM v2 pool; check the specific config and pool before assuming a lock."
---

Float and Bags are often mentioned together because both go beyond the plain SOL-paired memecoin. Float pairs every coin with another token, such as a tokenized stock. Bags builds launches around shared creator fees and a choice of fee modes. Underneath they use different engines and pay creators in very different ways. This comparison uses [Float's docs](https://www.floatlaunch.xyz/docs) and Bags' [fee modes](https://docs.bags.fm/how-to-guides/customize-token-fees), [launch guide](https://docs.bags.fm/how-to-guides/launch-token) and [deployer fees](https://docs.bags.fm/how-to-guides/deployer-fees) pages. Bags pages were read on 17 November 2026. Float's fee rules were rechecked on 23 November 2026.

We run Highbar, a SOL-only Meteora launchpad. It is not a substitute for stock pairs, and we say so below. Neither Float nor Bags is affiliated with Highbar.

## Float vs Bags at a glance

| | Float | Bags (Default mode) |
| --- | --- | --- |
| Engine | Raydium LaunchLab | Meteora DBC, then Meteora DAMM v2 |
| Pairs | Tokenized stocks, pre-IPO tokens, ZEC or XMR on Solana, SOL, USDC | SOL, plus admin-reviewed custom quotes |
| Trading fee | 1% on new standard coins; builder launches pick 1%, 2% or 2.5% | 2% (other modes 0.25% to 10% on the curve) |
| Creator share | 0% on standard coins; builder launches get 50% of what Float collects | Gross claimers pool, minus a 25% deployer share on new SOL v2 configs |
| Fee sharing | One builder fee wallet, fixed at launch | Up to 100 earners, by wallet or X, Kick, GitHub account |
| Holder rewards | 17.5% of Float's collection on standard coins, paid in the paired token | Not part of the Default mode split |
| Graduation | About 7.5x the starting cap (roughly $150,000) | 85 SOL in most modes |
| Liquidity after graduation | Raydium pool locked forever with Burn & Earn | Meteora DAMM v2 pool |

## What each is for

Float's docs describe a launchpad where every coin is paired with a token: a tokenized stock like NVIDIA or Tesla, a pre-IPO name, a privacy coin bridged to Solana, or plain SOL or USDC. Holder rewards on standard coins are paid in that paired token. The docs also state plainly that Float is not affiliated with the companies whose stocks are used, and that a coin gives no rights in any company.

Bags' docs are written for creators who want control over fee routing. Token Launch v2 requires a fee-share configuration, and you pick one of seven SOL fee modes, or a custom-quote configuration if Bags has set one up for the quote you want. The fee mode is fixed once the config is created.

If you want a coin tied to a stock ticker, Float is the purpose-built option. If you want to split fees with collaborators, Bags is.

## Fees and where they go

### Float

Float's docs say new standard coins pay a flat **1%** trading fee on every buy and sell. Builder launches can pick 1%, 2% or 2.5%, and standard coins launched earlier at 2% or 2.5% keep their rate. Raydium keeps 0.25% while a coin is on its curve. The rest is collected by the Float program and, on standard coins, split before and after graduation like this:

| Recipient | Share of Float's collection |
| --- | --- |
| Coin holders (paid in the paired token) | 17.5% |
| $FLOAT buyback and burn | 30% |
| Traders, by score (as USDC) | 15% |
| $FLOAT holders (as USDC) | 15% |
| Treasury | 22.5% |
| Creator | 0% |

Builder launches change that split to 50% for a fee wallet chosen at launch, 15% to airdrops, 15% to buyback and 20% to treasury, with no holder rewards. Before graduation Raydium caps a creator's cut at 0.5% of each trade. Float's docs give the result: at the 1% level the builder receives 0.375% of each trade, and at 2% and 2.5% it receives 0.5%. Builder launches are sent by Float's own server after a check that they match a launch made on floatlaunch.xyz.

### Bags

Default mode charges 2% on the curve. Half goes to the platform pool and half to the gross claimers pool. After migration the fee stays at 2%, with 25% compounded into the pool's liquidity and the remainder split evenly. Bags warns that its "Creator" column means the gross claimers pool, not the final payout. On new SOL fee-share v2 configs, the wallet that pays for the config takes 25% of that pool, and the configured recipients share the other 75%. Other modes trade a lower curve fee for a different post-migration fee, or lock most of the supply.

## Creator economics in practice

The difference is structural. A standard Float coin is designed to reward holders, traders and the $FLOAT ecosystem, not the person who launched it. A builder launch is the path for a creator who wants income. Bags is designed from the start around paying the people in the fee-share config.

For a solo creator who wants a personal fee share, Bags' Default mode pays up to 1% of each curve trade if one wallet is both deployer and sole recipient. A Float builder launch pays 0.375% to 0.5% of each curve trade, depending on the fee level. Those are mechanics, not income forecasts. Fees only exist if people trade.

## Risks each platform discloses

Float's risk section is unusually direct. Tokenized stocks are issued by third parties such as xStocks, Sunrise and PreStocks, and those issuers can pause transfers, move or burn tokens, or add transfer rules. If an issuer pauses, trading and rewards for coins paired with it stop. Some pre-IPO tokens add a transfer fee. Float's program has not had an outside audit, and its upgrade authority sits with a 2-of-3 Squads multisig.

Bags' docs warn that fee configs cannot be changed after launch, that thresholds and rates differ by mode, and that a custom-quote threshold is denominated in the quote token rather than converted to USD. A custom quote adds whatever risks that quote token carries.

Our [Float launchpad explainer](/articles/float-launchpad-explained) and [Bags fees explainer](/articles/bags-fm-fees-explained) give more background. Both predate some fee changes, so the live docs win where they differ.

## Where Highbar fits

Highbar does not do stock pairs or fee sharing. Per the [Highbar docs](/docs), every token is SOL-paired on a Meteora Dynamic Bonding Curve with a 1% fee. Meteora keeps 0.2% and the creator earns 0.4%, 0.496% or 0.6% depending on whether the target is 85, 150 or 250 SOL. Graduated liquidity moves into a Meteora DAMM v2 pool and is locked forever, and the creator receives 0.6% to 0.7% of post-graduation volume including the LP rebate. An optional anti-sniper fee starts at 25% and decays to about 1% over 60 seconds. It only reduces the early-buy advantage. It does not stop bots, bundles or rug pulls. Locked liquidity is not a guarantee of price or safety.

If a stock pair is the point, use Float. If shared fees are the point, use Bags. If you want a SOL pair with a published creator share, compare tiers on the [launch page](/launch) before signing anything.

## Bottom line

Float and Bags are not substitutes. Float is a paired-asset launchpad whose standard coins pay holders rather than creators. Bags is a fee-sharing launchpad on Meteora with a menu of fee modes. Read the official pages for the exact config you will sign, and if you trade from your timeline, the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) lets you trade Solana tokens from posts on X. This is not investment advice.
