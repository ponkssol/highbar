---
title: "Float vs Pump.fun: Stock-Paired Coins, Fees, Graduation and Creator Share Compared"
slug: float-vs-pump-fun
meta_description: "Float vs pump.fun: quote assets, curve fees, who earns the creator share, graduation\
  \ and liquidity, from each platform's official docs."
primary_keyword: Float vs pump.fun
secondary_keywords:
  - Float launchpad vs pump.fun
  - pump.fun vs Float fees
  - stock paired coin vs pump.fun
  - Float alternative to pump.fun
date: 2026-11-17
publish_at: "2026-11-17T09:56:00+07:00"
faq:
  - question: "What is the biggest difference between Float and pump.fun?"
    answer: "Pump.fun launches coins on its own bonding curve and graduates them to PumpSwap.\
  \ Float launches on Raydium LaunchLab and can pair a coin with a tokenized stock,\
  \ a pre-IPO token, ZEC or XMR, SOL or USDC, then locks graduated liquidity with\
  \ Raydium's Burn & Earn."
  - question: "Which platform pays creators more on a standard launch?"
    answer: "On pump.fun's curve, the official fees page lists a 0.30% creator fee as part of\
  \ the 1.25% total. Float's docs say the creator share on a standard coin is 0%;\
  \ a builder launch is the path if the creator wants a share."
  - question: "What are the trading fees on each curve?"
    answer: "Pump.fun charges 1.25% on the bonding curve. Float lets the creator pick 1%, 2% or\
  \ 2.5%, and Raydium keeps 0.25% of that while the coin is on its curve."
  - question: "Does either platform add an extra app fee?"
    answer: "From 17 October 2026, trades placed in the pump.fun web or mobile app carry a 0.45%\
  \ Platform Fee, or 0.40% with a referral code, on top of the pool fee. It does not\
  \ apply on Terminal. Float's docs do not describe a separate app fee on top of the\
  \ chosen trading fee."
---

People searching "Float vs pump.fun" usually want one thing: is Float just pump.fun with stock tickers, or is the fee and graduation model actually different? It is different, in ways that matter for both creators and traders. This comparison uses [Float's docs](https://www.floatlaunch.xyz/docs) and [pump.fun's fees page](https://pump.fun/docs/fees) (last updated 16 November 2026 when we checked it), plus pump.fun's [bonding curve page](https://pump.fun/docs/bonding-curve). Highbar, the launchpad we run, sits in a third column because some readers are also weighing a Meteora alternative.

Checked on 16 November 2026. Fee pages change, so confirm on the live docs before you launch or trade.

## Float vs pump.fun at a glance

| | Pump.fun | Float |
| --- | --- | --- |
| Curve | Pump.fun bonding curve | Raydium LaunchLab |
| Graduates to | PumpSwap, in a canonical pool owned by the protocol | A Raydium pool locked with Burn & Earn |
| Quote asset | SOL, USDC, a Custom Pair asset, or, where permitted, another pump.fun coin | Tokenized stocks, pre-IPO tokens, ZEC or XMR, SOL or USDC |
| Curve fee | 1.25% (0.30% creator, 0.95% protocol, 0% LP) | 1%, 2% or 2.5%, creator picks; Raydium keeps 0.25% on the curve |
| Creator on a standard launch | 0.30% of each curve trade | 0% |
| Graduation fee | 0.015 SOL per coin | Not listed as a separate flat fee in Float's docs |
| Extra app fee | 0.45% (0.40% with a referral code) in the pump.fun apps, from 17 October 2026 | None described in Float's docs |

## How each launch works

Pump.fun's bonding curve is a constant-product AMM with virtual reserves. Every coin starts there. When market cap hits the graduation threshold published by pump.fun, the curve closes and the liquidity is migrated atomically to PumpSwap. Pump.fun's bonding curve page says the protocol does not seed or remove that liquidity after graduation, and that the pool is owned by the protocol. It does not publish the threshold figure on that page, so this article does not invent one.

Float coins also start on a bonding curve, but the curve is Raydium LaunchLab's. Supply is fixed at 1,000,000,000, with no mint or freeze authority, and a starting market cap of about $20,000. At about 7.5x, roughly $150,000, liquidity moves into a Raydium pool and is locked with Raydium's Burn & Earn, which the docs say means it can never be pulled. Holder rewards on a standard coin are paid in the paired token.

A creator on Float can make a first buy in the launch transaction, capped at 2% of supply on the launch form. That cap does not limit later buys or buys from other wallets. Pump.fun lets you make a first purchase as you create the coin; if you do that in the pump.fun app, the fees page says the Platform Fee applies to that purchase too.

## Fees in more detail

On pump.fun's curve the split is fixed: 0.30% to the creator (or to holders if the creator chose Holder Rewards, or to a charity if the creator opted into a charity coin), 0.95% to the protocol, and 0% LP. After graduation, canonical PumpSwap fees are tiered by market cap. At the low end of the SOL table the total is still 1.250%; once market cap is 98240 SOL and up, the total is 0.300%. Custom Pair coins use a flat schedule instead: 1.25% on the curve and 0.30% on the canonical PumpSwap pool, unless the creator enabled Holder Rewards at a chosen rate.

On top of those pool fees, trades placed through the pump.fun web or mobile app carry the Platform Fee described above. It is shown as a separate line and does not apply to Terminal or third-party interfaces, which may charge their own fees. Our guide to [pump.fun fees](/articles/pump-fun-fees-explained) walks through the SOL and USDC tables.

Float's fee is chosen at launch. The remainder after Raydium's cut is split, on every standard coin, 17.5% to holders, 30% to buying and burning $FLOAT, 15% to a trader airdrop, 15% to a $FLOAT holder airdrop and 22.5% to the treasury. Creators who want a share use a builder launch, which sends 50% of the fee Float collects to a fee wallet chosen at launch (subject to Raydium's 0.5% creator-cut cap before graduation). There are no holder rewards on builder coins.

## Where Highbar fits

Highbar is not a stock-pair launchpad. Every token is paired with SOL on a Meteora Dynamic Bonding Curve and graduates into a locked Meteora DAMM v2 pool at 85, 150 or 250 SOL. The curve fee is 1%, with the creator earning 0.4%, 0.496% or 0.6% by tier, and the website adds no extra app fee. The optional anti-sniper fee starts at 25% and decays to about 1% over 60 seconds; it makes early buys more expensive and does not stop bots. For the Meteora mechanics, see [Meteora DBC explained](/articles/meteora-dynamic-bonding-curve-explained).

## Risks to read before you pick one

Float's docs state that tokenized stocks are issued by third parties, that issuers can pause, move or burn tokens, and that a coin is not a share. The Float program has not had an outside audit yet. Pump.fun's fees page is part of its Terms of Use and is the schedule that binds when you use that platform. Neither page is a reason to treat a new coin as anything other than speculative. Most new coins lose value, and you can lose everything you put in.

## Bottom line

Pump.fun is the larger, simpler SOL or USDC curve with a 0.30% creator fee and, in its own apps, an extra Platform Fee. Float is the Raydium LaunchLab launchpad for paired assets, with a standard-coin split that pays the creator nothing and a builder path if you want a share. If you want a SOL pair, a published creator cut and locked DAMM v2 liquidity, compare Highbar in the [docs](/docs) and on the [launch page](/launch), or trade from X with the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed).
