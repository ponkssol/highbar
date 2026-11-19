---
title: "Priority Fees, Jito Tips and Slippage: What You Actually Pay on a Solana Memecoin Trade"
slug: solana-priority-fees-memecoin-trading
meta_description: "Every cost on a Solana memecoin trade, explained: base fee, priority fee, Jito tip, pool fee, app fee, slippage and price impact, with a worked example."
primary_keyword: solana priority fee memecoin
secondary_keywords:
  - jito tip explained
  - solana slippage memecoin
  - price impact vs slippage
  - solana trading fees breakdown
  - priority fee vs jito tip
date: 2026-11-19
publish_at: "2026-11-19T17:40:00+07:00"
faq:
  - question: "What is a priority fee on Solana?"
    answer: "An optional fee, on top of the 5,000-lamport base fee per signature, that raises the chance your transaction is scheduled ahead of others. Solana's docs calculate it as compute unit price times compute unit limit divided by 1,000,000, in lamports, and all of it goes to the validator."
  - question: "What is the difference between a priority fee and a Jito tip?"
    answer: "A priority fee is part of Solana's own fee system. A Jito tip is a separate SOL transfer to a Jito tip account, used by Jito's block engine. Jito's docs suggest roughly a 70/30 split between priority fee and tip when sending a single transaction through Jito, and say only the tip matters for bundles."
  - question: "Is slippage a fee?"
    answer: "No. Slippage tolerance is the worst price you will accept, set as a percentage. The price impact of your own trade and any movement before it lands are real costs, but slippage tolerance itself only decides whether the trade goes through or fails."
  - question: "Does Highbar add a fee on top of the pool fee?"
    answer: "Not on the website: Highbar's docs say you pay only the pool's trading fee. The Highbar Chrome extension adds 0.02% of the SOL amount on extension transactions, shown before you confirm."
---

A memecoin trade on Solana carries more costs than the fee shown next to the token. Some go to the network, some to the pool, some to the app you use, and one, price impact, does not show up as a fee at all. This guide lists each layer, where it comes from, and how to keep it under control. It complements our guide to [trading Solana from X](/articles/trade-solana-from-x-chrome-extension), which covers wallet safety.

We run Highbar, a Solana launchpad with a Chrome extension. This is an explainer, not trading advice.

## The cost stack on a Solana memecoin trade

| Layer | Who sets it | Who receives it | Typical size |
| --- | --- | --- | --- |
| Base fee | Solana | 50% burned, 50% validator | 5,000 lamports per signature |
| Priority fee | You or your app | Validator | From zero to well above the base fee |
| Jito tip | You or your app | Validators and stakers via Jito | Minimum 1,000 lamports for bundles |
| Pool trading fee | The launchpad or pool config | Creator, platform, protocol, LPs | Often 0.3% to 2% |
| App or extension fee | The interface | The interface | 0% to about 1% |
| Price impact | Pool depth vs your trade size | Not a fee; it moves the price | Grows with size |

## Base fee and priority fee

Solana's [fee docs](https://solana.com/docs/core/fees) are short. Every transaction pays a **base fee** of 5,000 lamports per signature, half burned and half paid to the validator. On top of that you can add a **prioritization fee**:

> priority fee (lamports) = compute unit price (micro-lamports) × compute unit limit ÷ 1,000,000

All of it goes to the validator. The docs say it "increases the likelihood that the current leader schedules your transaction ahead of competing ones." It is not a guarantee of landing, and paying more than you need simply costs more. Setting a sensible compute unit limit matters, because the price is multiplied by the limit you request, not only the units you use.

## Jito tips

Many trading tools also send transactions through Jito's block engine. Jito's [docs](https://docs.jito.wtf/lowlatencytxnsend/) describe a **tip**: a SOL transfer to a Jito tip account that is redistributed to validators and their stakers. A few practical points from those docs:

- Bundles need a minimum tip of 1,000 lamports, and in busy periods that may not be enough.
- For a single transaction sent through Jito, the docs suggest splitting your total spend roughly **70% priority fee, 30% tip**. For bundles, "only the Jito tip matters."
- Jito publishes a live tip-floor endpoint, so a tool can price tips from current data instead of guessing.
- Jito documents a **sandwich mitigation** option: a transaction that includes an account beginning with `jitodontfront` is rejected from any bundle unless it is placed first, which stops a bundle from putting someone else's trade in front of it.

If your app has a "turbo" or "MEV protection" toggle, it is usually changing one of these settings. Read what it does before turning it on.

## The pool fee

The pool fee is usually the largest fee on a memecoin trade and is set by the launchpad's config:

- **Highbar**: 1% on the Meteora bonding curve, split between the creator, the platform and Meteora, and 1% after graduation in the DAMM v2 pool. If the creator turned on the optional anti-sniper fee, trades in the first minute pay a higher fee that starts at 25% and decays to about 1% after 60 seconds. It is off by default. It only makes those early buys more expensive and does not stop bots or Jito bundles. The trade panel shows the live fee while it decays.
- **Pump.fun**: 1.25% on the curve, and a market-cap-tiered fee on PumpSwap, per its [fees page](https://pump.fun/docs/fees).
- **Bags**: 2% on its Default fee mode, per its [fee modes page](https://docs.bags.fm/how-to-guides/customize-token-fees).

A fee you didn't expect is a reason to stop and re-read, not to sign faster.

## App and extension fees

Interfaces can add their own fee. Pump.fun's fees page says trades through its web or mobile app have carried a 0.45% Platform Fee since 17 October 2026 (0.40% with a referral code). Highbar's [docs](/docs) say the website adds nothing on top of the pool fee, while the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) adds 0.02% of the SOL amount on extension transactions, rounded down to the nearest lamport. The extension's store listing says fees are shown before every trade and that you can set your own priority fee and optionally a custom RPC.

## Slippage vs price impact

These two get confused constantly.

- **Price impact** is how much your own trade moves the price. On a bonding curve or a thin pool, a larger buy pushes the price further up the curve. It is a real cost even though no one "charges" it.
- **Slippage tolerance** is the maximum difference between the quoted price and the price you will accept when the trade lands. If the price moves further than that, for example because other buys landed first, the trade fails.

A high slippage setting does not make a trade cheaper; it just lets it go through at a worse price. On a fast-moving token it can be the difference between buying and buying at the top of someone else's push. Start with a modest setting and raise it only if trades keep failing for a reason you understand.

## A worked example (illustrative)

Say you buy 0.5 SOL of a Highbar token on the curve, more than 60 seconds after launch, through the extension, with a compute unit price of 100,000 micro-lamports and a 200,000-unit limit. These priority settings are examples, not recommendations.

- Base fee, one signature: 0.000005 SOL
- Priority fee: 100,000 × 200,000 ÷ 1,000,000 = 20,000 lamports = 0.00002 SOL
- Pool fee: 1% of 0.5 SOL = 0.005 SOL
- Extension fee: 0.02% of 0.5 SOL = 0.0001 SOL

That is about 0.005125 SOL in fees, roughly 1.03% of the trade, before price impact. The pool fee dominates. On the website the extension line disappears. In the first seconds of an anti-sniper launch, the pool fee line could be many times larger.

## Keeping costs under control

1. **Read the confirmation screen**, which is the only number that binds.
2. **Avoid the first minute** of launches with an anti-sniper fee, unless you have decided the fee is worth it.
3. **Size trades to the pool.** Smaller trades in thin pools cut price impact.
4. **Set priority fees on purpose**, not at the maximum by default.
5. **Know your interface's fee**, and compare it with trading the same pool elsewhere.

For more context on fast early buyers, read our guide to [sniper bots on Solana](/articles/sniper-bots-solana-memecoin-launches). If you are on the other side of the trade, the [launch page](/launch) shows every fee a buyer of your token will pay.

## Summary

The network's share of a Solana memecoin trade is tiny: 5,000 lamports per signature plus whatever priority fee or Jito tip you choose. The pool fee and any app fee are what you mostly pay, and price impact is the cost no table shows. Set priority fees deliberately, keep slippage modest, and trust the confirmation screen over any summary, this one included.
