---
title: "StonkFun vs Pump.fun: Paired-Asset LaunchLab Launches Compared With the Pump.fun\
  \ Curve"
slug: stonkfun-vs-pump-fun
meta_description: "StonkFun vs pump.fun from official pages: quote assets, 1% vs 1.25% curve fees, creator\
  \ share, graduation venues and the pump.fun app Platform Fee."
primary_keyword: StonkFun vs pump.fun
secondary_keywords:
  - pump.fun vs StonkFun
  - StonkFun alternative to pump.fun
  - stock pair vs pump.fun
  - StonkFun vs pump.fun fees
date: 2026-11-19
publish_at: "2026-11-19T19:28:00+07:00"
faq:
  - question: "What is the main difference between StonkFun and pump.fun?"
    answer: "Pump.fun uses its own bonding curve and graduates coins to PumpSwap. StonkFun uses\
  \ Raydium LaunchLab and can pair a coin with many quote tokens, including tokenized\
  \ stocks, then follows LaunchLab's CPMM graduation path."
  - question: "Which curve fee is higher?"
    answer: "Pump.fun's fees page lists 1.25% on the curve, plus a 0.45% or 0.40% Platform Fee\
  \ in its official apps. StonkFun's developer docs describe a 1% LaunchLab fee with\
  \ 0.5% forwarded to the creator."
  - question: "Do both pay the creator on the curve?"
    answer: "Yes, on the official pages cited here. Pump.fun lists a 0.30% creator fee as part\
  \ of the 1.25% curve fee. StonkFun describes a 0.5% automatic forward out of its\
  \ 1% LaunchLab fee."
  - question: "Where does Highbar fit?"
    answer: "Highbar is a third path: a SOL-only Meteora DBC launch with a 1% curve fee, a published\
  \ creator share by tier, and locked DAMM v2 liquidity. It has no stock pairs."
---

StonkFun and pump.fun are both Solana launchpads, but they are built on different programs and they are not equally useful if you wanted a tokenized-stock pair. This comparison uses [pump.fun's fees page](https://pump.fun/docs/fees) and [bonding curve page](https://pump.fun/docs/bonding-curve), and StonkFun's [developer](https://www.stonkfun.xyz/developers), [rewards](https://www.stonkfun.xyz/rewards) and [revenue](https://www.stonkfun.xyz/revenue) pages, checked on 16 November 2026. Highbar, the launchpad we run, is a short third column at the end.

## At a glance

| | Pump.fun | StonkFun |
| --- | --- | --- |
| Curve | Pump.fun bonding curve | Raydium LaunchLab |
| Graduates to | PumpSwap, pool owned by the protocol | A Raydium CPMM path |
| Quote assets | SOL, USDC, Custom Pairs, or, where permitted, another pump.fun coin | Many quotes, including tokenized stocks |
| Curve fee | 1.25% (0.30% creator, 0.95% protocol, 0% LP) | 1%, with 0.5% forwarded to the creator, per the developer docs |
| Extra app fee | 0.45% or 0.40% in the official apps, from 17 October 2026 | Not described on the official pages cited here |
| Graduation fee | 0.015 SOL per coin | Not listed as a separate flat fee on those StonkFun pages |

## Pairs and issuer risk

Pump.fun supports SOL, USDC, Custom Pair assets, and, where the platform permits, another pump.fun coin. Custom Pair coins use a flat fee schedule, described on the fees page. StonkFun's distinctive surface is a wide quote list that includes tokenized stocks. A stock-paired coin is not a share, and the issuer can pause transfers. Pump.fun Custom Pairs can carry similar issuer dependence; the official pump.fun pages, not this article, are the source for those assets.

If the whole reason for the search is "I want a stock ticker as the quote," StonkFun is the closer product. If the reason is "I want the default pump.fun SOL or USDC flow," pump.fun is the closer product.

## Fees

Pump.fun's curve fee is 1.25%, including a 0.30% creator fee (or Holder Rewards, or a charity recipient). Graduation costs 0.015 SOL. After graduation, canonical PumpSwap fees are tiered by market cap, down to 0.30% at the top of the SOL table. Trades in the official apps also carry the Platform Fee. Our [pump.fun fees explainer](/articles/pump-fun-fees-explained) has the tables.

StonkFun's developer docs describe a 1% LaunchLab fee and a 0.5% automatic creator forward. After graduation, a typical LaunchLab CPMM fee is 0.25% per Raydium's fee comparison page, which is lower than many PumpSwap tiers and lower than pump.fun's official-app total once the Platform Fee is included. Reward launches can add a 1% or 3% transfer tax. About 60% of platform revenue buys and burns $STONK, which is not a promise about a launched coin. See [StonkFun fees explained](/articles/stonkfun-fees-explained).

Both official sources describe a creator earning on the curve, at different rates and on different programs. That is the fairest point of similarity in the table.

## Graduation

Pump.fun migrates atomically to a protocol-owned PumpSwap pool when market cap hits the official threshold; the bonding curve page does not state the number, so this article does not invent one. StonkFun follows LaunchLab into a CPMM pool; the developer docs tell builders to use a live pricing response rather than hard-coding a raise. Do not assume both platforms share an 85 SOL target.

## Where Highbar fits

Highbar is not a stock-pair launchpad and not a pump.fun clone. It launches SOL-paired tokens on a Meteora DBC, charges 1% on the curve with a published creator share, and locks DAMM v2 liquidity at 85, 150 or 250 SOL. The optional anti-sniper fee does not stop bots. See the [docs](/docs), the [launch page](/launch), or the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed).

## Bottom line

Pick pump.fun for its official-app audience, a 0.30% creator fee and a PumpSwap venue, and budget the app Platform Fee. Pick StonkFun for LaunchLab paired-asset launches and an official 0.5% creator forward, and read the reward-tax warnings. Pick Highbar only if you wanted a SOL-paired Meteora launch all along. Read the official pages for both products, and the live fee on the confirmation screen, before you sign. Confirm the quote asset and the venue on that same screen, and do not assume the two platforms share a graduation target in SOL or USDC.

Figures in this article were checked on 16 November 2026 against the official pages linked above.

Those pages change, so re-read them before you launch or trade, and do not treat this guide as a substitute for the live docs.

If a figure here disagrees with an official page, the official page is the one that binds.

Highbar is a small, new launchpad. Nothing in this article is a reason to buy or sell a token, and no launchpad can guarantee demand.

Locked liquidity and a creator fee share are design choices. They do not make a token safe, and they do not stop sniper bots on their own.

Always confirm fee rates, graduation targets and liquidity rules on the live docs, or on the on-chain config, immediately before you sign.

A useful way to use a comparison like this is to write down the three rules you actually care about — the curve fee, the creator share, and what happens to liquidity at graduation — and check those three lines on each official page, rather than choosing a launchpad by name or by a social-media clip.

If you are launching, prepare the token name, ticker, image and any links first, then read the fee table for the exact config you are about to sign, including whether an anti-sniper or app fee applies. If you are trading, check the mint, the pool, and the live fee on the confirmation screen.

None of the platforms compared here is affiliated with Highbar, and a factual comparison is not a recommendation to use one of them, or to buy any token that has already launched.

Take your time, read the confirmation screen, and only sign if the live fee and destination pool match what you expected to pay.
