---
title: "What Percentage of Solana Memecoins Graduate? Graduation Rates, First-Second Graduates and What They Mean"
slug: solana-memecoin-graduation-rate
meta_description: "How many Solana memecoins graduate from the bonding curve? A recent pump.fun day from on-chain data, why most never trade again, and what to check."
primary_keyword: memecoin graduation rate
secondary_keywords:
  - how many memecoins graduate
  - pump.fun graduation rate
  - solana token graduation percentage
  - bonding curve graduation
  - memecoin launch statistics
date: 2026-11-23
publish_at: "2026-11-23T16:53:00+07:00"
faq:
  - question: "What percentage of Solana memecoins graduate?"
    answer: "It is a small fraction. On 21 November 2026 (UTC), the third-party tracker pumpdata.fun counted 36,513 pump.fun launches and 619 graduations, a rate of 1.70%. Rates vary by day and by platform."
  - question: "What does graduation mean?"
    answer: "Graduation is when a token's bonding curve reaches its target and liquidity moves into a regular pool. On pump.fun that pool is on PumpSwap; on Highbar it is a Meteora DAMM v2 pool with permanently locked liquidity."
  - question: "Can a token graduate in one second?"
    answer: "Yes. Pumpdata.fun reported that 74 of the 619 pump.fun graduates on 21 November 2026 graduated within a second of launch, meaning the whole curve was bought before most people could see the coin."
  - question: "Is a graduated token safe to buy?"
    answer: "No. Graduation only means enough money went into the curve. It says nothing about who holds the supply, whether demand will last, or whether the price will hold."
---

Every day tens of thousands of memecoins launch on Solana, and only a sliver of them ever "graduate" from their bonding curve to a regular trading pool. If you trade or launch memecoins, the graduation rate is one of the most useful base rates you can know, because it tells you how unusual a graduation really is and what usually happens to everything else.

This guide uses one recent day of public on-chain data, explains what the numbers do and do not mean, and gives a short checklist for traders and creators. We run Highbar, a Solana launchpad on Meteora. The statistics below are not ours: they come from [pumpdata.fun](https://pumpdata.fun/stats), an independent tracker that counts pump.fun activity from the chain. We have no affiliation with it or with pump.fun, and we have not audited its methodology.

## What "graduation" means

On a bonding-curve launchpad, a new token trades against a formula rather than an order book. Each buy raises the price along the curve. When the curve has collected its target amount, the token **graduates**: the raised SOL and part of the supply move into a regular liquidity pool, and the curve closes.

- On pump.fun, [Crypto Briefing](https://cryptobriefing.com/solana-toly-pumpfun-bonding-curve-nearly-optimal/) describes graduation at roughly 85 SOL of net buying, after which the coin trades on PumpSwap. Pump.fun's [fees page](https://pump.fun/docs/fees) lists a 0.015 SOL graduation fee.
- On Highbar, the creator chooses the target: 85, 150 or 250 SOL. The token then migrates to a Meteora DAMM v2 pool whose liquidity is permanently locked. Our [DAMM v2 graduation explainer](/articles/meteora-damm-v2-explained-token-graduation) covers what happens at that moment.

## One day of numbers

Here is pumpdata.fun's summary for **Saturday 21 November 2026 (UTC)**:

| Metric | Value | vs 7-day average |
| --- | --- | --- |
| Coins launched | 36,513 | −14% |
| Coins graduated | 619 | −27% |
| Graduation rate | 1.70% | |
| SOL traded | 2,937,318 | −17% |
| Wallets that traded | 494,986 | −8% |

Three more figures from the same page stand out:

- **92% of launches had no trade at all in their second hour.** Most coins are effectively abandoned within minutes.
- **74 of the 619 graduates (12.0%) graduated within one second of launch.** The whole curve was bought before most people could see the coin. The rest took a median of 4.5 minutes.
- **101 launches were bought out in their launch block,** which the tracker says was 68% below the average of the previous 30 days.

One day is not a trend. On the partial day of 22 November, the same tracker showed a similar rate of about 1.6% by late evening UTC. Treat these as a snapshot of the order of magnitude: roughly **one or two launches in a hundred** graduate on a typical recent day.

## What the graduation rate tells you

### For traders

A rate under 2% means a coin on the curve is, by default, more likely to stall than to graduate. Graduation itself is the exception, not the rule. That is a reason to size positions accordingly and to treat "it's about to graduate" posts with scepticism.

The first-second graduates are a separate warning. If the entire curve fills in one second, the buyers were almost certainly bots or a coordinated group using bundled transactions. Those wallets may hold a large share of supply at prices far below what later buyers pay. Our guide to [sniper bots on Solana](/articles/sniper-bots-solana-memecoin-launches) explains how to spot that pattern.

### For creators

The base rate is humbling. Launching is easy. Getting enough real buyers to fill a curve is not. A higher graduation target means more SOL must come in, so it is harder to reach, and it also leaves deeper liquidity if you do. That trade-off is the core decision when you pick a tier.

## What graduation does not tell you

It is tempting to read graduation as a stamp of quality. It is not.

- **It does not show who holds the supply.** A coin can graduate with a handful of wallets holding most of it.
- **It does not mean demand will last.** Many graduated coins fade after migration.
- **It does not mean the liquidity is locked.** That depends on the platform and pool. On Highbar the DAMM v2 LP is permanently locked; other platforms burn or lock LP in their own ways. A lock is not a guarantee of price or safety.
- **It does not make a token safe.** Nothing does.

## A short checklist before you trade a graduating coin

1. **Check the time to graduate.** A coin that graduated in seconds deserves extra scrutiny.
2. **Look at the top holders.** If a few fresh wallets hold most of the supply, be careful.
3. **Confirm the contract address.** Copycat tickers appear quickly after a graduation.
4. **Check the pool and its liquidity.** Know where the coin trades after graduation and how deep the pool is.
5. **Read the platform's rules.** Fees, graduation targets and anti-sniper settings differ by launchpad.

## How launchpad design affects early buying

Some launchpads add tools that change the economics of the first seconds. Highbar's optional anti-sniper fee starts at **25%** of the trade and decays to about **1%** over 60 seconds, per the [Highbar docs](/docs). It only makes buying in the opening seconds more expensive. It is not a guarantee against bots, bundling or rug pulls. It does not stop a coordinated group from buying inside the launch block through a Jito bundle, and it cannot make a coin graduate.

Other levers are the graduation target and how fees are shared. On Highbar every curve trade pays 1%, with the creator earning 0.4% to 0.6% depending on tier.

## Watching launches from X

Many launches spread on X before they show up anywhere else. The [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) lets you trade and launch Solana tokens directly from posts. If you use it, run the same checks first: address, holders, time to graduate.

## Summary

On a recent day, about 1.7% of pump.fun launches graduated, 92% saw no trades in their second hour, and 12% of graduates filled their curve within one second. Graduation is rare, it is not a safety signal, and the fastest graduations are often the most concentrated. If you are planning a launch, compare targets and settings on the [launch page](/launch) and pick a bar you can realistically reach.
