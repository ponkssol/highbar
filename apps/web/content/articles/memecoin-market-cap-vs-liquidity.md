---
title: "Market Cap vs Liquidity on a Solana Memecoin: What the Numbers Really Mean"
slug: memecoin-market-cap-vs-liquidity
meta_description: "Why a memecoin's market cap is not money you can sell into: how market cap and liquidity are calculated, with graduation math and a price impact example."
primary_keyword: memecoin market cap vs liquidity
secondary_keywords:
  - solana memecoin liquidity explained
  - market cap vs liquidity crypto
  - bonding curve market cap
  - price impact memecoin
  - memecoin liquidity ratio
date: 2026-11-19
publish_at: "2026-11-19T19:01:00+07:00"
faq:
  - question: "How is a memecoin's market cap calculated?"
    answer: "Price times total supply. Pump.fun's fees page, for example, calculates market cap as the current price in SOL or USDC multiplied by 1 billion tokens. It says nothing about how much anyone could actually sell for."
  - question: "What does liquidity mean for a Solana memecoin?"
    answer: "The assets sitting in the pool or bonding curve that trades execute against, usually SOL on one side and the token on the other. Deeper liquidity means a given trade moves the price less."
  - question: "Why is liquidity so much smaller than market cap?"
    answer: "Because market cap values every token at the last price, while the pool only holds a slice of the supply. On a Highbar Standard launch, about 84 SOL and 20% of supply enter the pool at graduation, against a market cap of about 420.75 SOL."
  - question: "Is a token with locked liquidity safe?"
    answer: "No. Locked liquidity means nobody can withdraw the pool's funds, which removes one specific risk. Price can still fall, holders can still sell, and demand can disappear."
---

Two numbers sit at the top of every memecoin page: **market cap** and **liquidity**. They are often treated as the same kind of thing, a measure of how "big" a token is. They are not. Market cap is a valuation; liquidity is what is actually there to trade against. Knowing the difference is one of the simplest ways to avoid overpaying or being unable to exit at the price you see.

We run Highbar, a Solana launchpad. The figures below come from official docs read on 19 November 2026 and are explanations, not predictions.

## What market cap is

Market cap is **price × total supply**. Pump.fun's [fees page](https://pump.fun/docs/fees) states it plainly: market cap "is calculated as the current price of the token in SOL or USDC multiplied by 1 billion tokens." Boop's [graduation page](https://docs.boop.fun/graduation) gives the same idea in USD terms: token price in SOL × SOL's USD price × total supply.

The price in that formula is the price of the **last trade**, or the current marginal price on the curve. Market cap values every token in existence at that price, including tokens no one is selling, tokens in the pool and tokens that are locked.

For most launchpad tokens, total supply is fixed at creation. On Highbar, the [docs](/docs) say every token has a supply of 1,000,000,000, 6 decimals and mint authority off, so no new tokens can be minted. That makes market cap and "fully diluted" value the same number.

## What liquidity is

Liquidity is what trades execute against:

- **On a bonding curve**, it is the SOL the curve has collected plus the tokens it still has to sell. Each buy moves the price up the curve and each sell moves it back down.
- **After graduation**, it is the pool's reserves. On Highbar, the token moves to a Meteora DAMM v2 pool with SOL on one side and the token on the other.

Liquidity determines **price impact**: how far your own trade moves the price. Deep liquidity absorbs a trade; thin liquidity lets one trade swing the price.

## Graduation math: why market cap is about 5× the SOL in the pool

Highbar's docs publish both numbers for each tier, which makes the relationship easy to see. At graduation, "the SOL raised, minus the migration fee, goes into the new pool together with 20% of the token supply."

| Tier | SOL target | Migration fee | SOL into the pool | Tokens into the pool | Approx. market cap at migration |
| --- | --- | --- | --- | --- | --- |
| Standard | 85 SOL | 0.85 SOL | 84.15 SOL | 200,000,000 | 420.75 SOL |
| Higher | 150 SOL | 1.5 SOL | 148.5 SOL | 200,000,000 | 742.5 SOL |
| Max | 250 SOL | 0 | 250 SOL | 200,000,000 | 1,250 SOL |

The price in the new pool is SOL ÷ tokens. On Standard, that is 84.15 ÷ 200,000,000 SOL per token. Multiply by 1 billion tokens and you get 420.75 SOL, exactly the market cap the docs list. Because only 20% of supply sits in the pool, market cap is five times the SOL side of the pool. Counting both sides at that price, the pool holds about 168 SOL of value, roughly 40% of the market cap. (The docs also say Meteora keeps a fixed 0.2% of migrated liquidity, so the real figures are fractionally lower.)

Boop's docs show the same pattern: graduation at "~400 SOL" market cap with about 80 SOL migrated alongside the remaining ~20% of tokens.

## Price impact: a worked example

Here is why the gap matters when you sell. Take a freshly graduated Standard pool with 84.15 SOL and 200,000,000 tokens, and treat it as a simple constant-product pool, ignoring fees. Meteora describes DAMM v2 as a configurable constant-product AMM, so this is an approximation.

- **Sell 10,000,000 tokens (1% of supply).** At the quoted price they are "worth" 4.21 SOL. The pool pays out about 84.15 × 10 ÷ 210 = **4.01 SOL**, roughly 4.8% less.
- **Sell 50,000,000 tokens (5% of supply).** Quoted value 21.04 SOL. The pool pays about **16.83 SOL**, 20% less, before fees.

A wallet holding 5% of a 420-SOL-market-cap token does not have 21 SOL. It has whatever the pool will pay, and the pool pays less the more you sell. Before graduation the curve behaves similarly: selling moves the price back down the curve.

## Five ways market cap misleads

1. **Thin pools inflate it.** A small buy into a thin pool can raise the price, and so the market cap, by a lot.
2. **Locked tokens count.** Tokens in a Dev Lock or other escrow are in the market cap but can't be sold until they unlock.
3. **Concentrated holders.** If a few wallets hold most of the supply, the market cap reflects a price that their own selling would not survive.
4. **Different quote assets.** A coin paired with something other than SOL may show a SOL market cap derived through other pools, which pump.fun's own docs call "indicative only."
5. **Units change.** A market cap shown in SOL moves with SOL's price when you convert to USD, even if the token's SOL price stands still.

## What to look at instead

- **Liquidity in SOL**, compared with the size you plan to trade.
- **Liquidity ÷ market cap**, as a rough depth ratio. A falling ratio means price has outrun the pool.
- **Whether liquidity can be withdrawn.** On Highbar, the DAMM v2 liquidity is locked forever in two permanent positions, so that liquidity cannot be withdrawn. That removes one specific risk. It does not stop price falling, and it is not a guarantee the token is safe. Our [DAMM v2 explainer](/articles/meteora-damm-v2-explained-token-graduation) covers how those positions work.
- **The curve's progress**, for tokens that have not graduated. Highbar's progress bar shows the SOL the curve holds against its tier target; our [Meteora DBC guide](/articles/meteora-dynamic-bonding-curve-explained) explains the curve itself.
- **Holder spread**, part of the [pre-trade checklist](/articles/how-to-check-a-solana-token-before-buying).

## For creators: choosing a target

A higher graduation target means more SOL goes into the pool at migration, which is what makes later trades move the price less. That is why Highbar's tiers trade a higher bar (150 or 250 SOL) for deeper post-migration liquidity and a larger creator share. You can compare the tiers on the [launch page](/launch) before signing. If you trade from X, the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) shows market cap, volume and liquidity together, per its store listing.

## Summary

Market cap is price × supply, a valuation of every token at the last price. Liquidity is what a trade can actually execute against, and on a newly graduated launchpad token it is a fraction of the market cap: on Highbar Standard, about 84 SOL and 20% of supply against roughly 420.75 SOL. Read both numbers, size trades to the pool, and remember that neither tells you where the price will go.
