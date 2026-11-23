---
title: "Is Pump.fun's Bonding Curve \"Nearly Optimal\"? Toly's Spam-Filter Argument, the Pushback and What It Means for Launchpads"
slug: pump-fun-bonding-curve-nearly-optimal
meta_description: "Toly called pump.fun's bonding curve nearly optimal as a spam filter. What he said, the main pushback, and what it means when you pick a Solana launchpad."
primary_keyword: pump.fun bonding curve
secondary_keywords:
  - toly pump.fun bonding curve
  - pump.fun bonding curve nearly optimal
  - bonding curve spam filter
  - pump.fun graduation 85 sol
  - solana launchpad bonding curve
date: 2026-11-23
publish_at: "2026-11-23T11:19:00+07:00"
faq:
  - question: "What did Toly say about pump.fun's bonding curve?"
    answer: "On 18 November 2026, Solana co-founder Anatoly Yakovenko (Toly) described pump.fun's bonding curve as nearly optimal for filtering token launches, as reported by Crypto Briefing and TokenPost. In a later post on X he said the goal of a bonding curve is a spam filter and that fancier auctions are only marginally better."
  - question: "Why do some people disagree?"
    answer: "Critics such as an X account called The White Whale argued that the curve favours the fastest early buyers, because most of the supply is sold at prices far below the graduation price. That is a third-party analysis, not a pump.fun figure."
  - question: "When does a pump.fun coin graduate?"
    answer: "Crypto Briefing describes graduation at roughly 85 SOL of real net buying, with about 79.3% of supply sold on the curve. Pump.fun's fees page lists a 0.015 SOL fee when a coin graduates to PumpSwap."
  - question: "Is a Meteora DBC curve different?"
    answer: "Meteora's Dynamic Bonding Curve lets each launchpad set its own config, including the migration target. On Highbar, creators choose 85, 150 or 250 SOL, and the token graduates into a Meteora DAMM v2 pool with locked liquidity."
---

Few things in Solana memecoin culture get argued about as much as the pump.fun bonding curve. This week the debate got a headline: Solana co-founder Anatoly Yakovenko, known as Toly, called it **"nearly optimal"**. This article sets out what he said, the strongest pushback, and what a creator or trader can actually take from it when choosing where to launch.

We run Highbar, a Solana launchpad built on Meteora's Dynamic Bonding Curve, so we have a view. We have tried to quote both sides fairly and link the sources. We are not affiliated with pump.fun.

## What Toly said

According to [Crypto Briefing](https://cryptobriefing.com/solana-toly-pumpfun-bonding-curve-nearly-optimal/) and [TokenPost](https://www.tokenpost.com/news/technology/60165), Toly said on 18 November 2026 that pump.fun's bonding curve is close to optimal for filtering token launches in a market where supply is effectively infinite. He added that better engineering or business development would barely move the needle, and that alternative auction mechanisms had not produced better results.

In a follow-up [post on X](https://x.com/toly/status/2123469983665820128) on 19 November he made two points about why pump.fun is sticky:

1. The bonding curve is about as good as you can get at filtering an endless stream of launches.
2. The only lever left is returning a larger share of platform profits to users.

In the same thread he framed the curve as a **spam filter**. When it costs almost nothing to launch a token, the number of tokens to evaluate heads toward infinity. The only way to rank them is by something that costs the attacker money, and every method ends up looking like money. A fancier auction, he wrote, is only marginally better than setting a curve cap and looking at whatever graduates.

## How the pump.fun curve works, briefly

A bonding curve is a formula that sets price from how much has been bought. There is no order book. Each buy pushes the price up and each sell moves it down.

Crypto Briefing describes pump.fun's curve as a constant-product design. A coin graduates once it attracts roughly **85 SOL** of real net buying, at which point about **79.3%** of the supply has been sold on the curve. Liquidity then moves to PumpSwap. Pump.fun's own [fees page](https://pump.fun/docs/fees) says creating a coin has no platform fee and that **0.015 SOL** is charged when a coin graduates to PumpSwap.

For the full fee picture, see our guide to [pump.fun fees](/articles/pump-fun-fees-explained).

## The pushback

The most shared counter-argument came from an X account called The White Whale, in a thread replying to Toly. Its claims, which are its own analysis rather than pump.fun data:

- Almost 80% of the supply is sold for 85 SOL.
- The first 20% of supply is very cheap compared with the graduation price.
- The average price paid across the curve is a small fraction of the graduation price, so little of the supply was bought near the price people see at graduation.
- At graduation, curve buyers hold tokens marked far above the SOL actually in the pool.

The argument is that the curve is optimal for the platform and for the fastest wallet in the block, and less so for everyone else. Toly's reply, in the same thread, was "optimal for the users, ironically": users want a higher share of organic runners, and nobody has found a mechanism that delivers it. He also noted that any screening of who should get supply runs into Sybil attacks, since whatever you measure can be faked by someone selling it as a service.

## What both sides agree on

Strip away the tone and there is common ground:

- **A curve is a filter, not a quality guarantee.** Graduating means enough SOL went in. It does not mean a token is good, fair or safe.
- **Early buyers get better prices.** That is how any rising curve works. Whether it is "fair" depends on who those early buyers are.
- **Speed matters.** Bots and coordinated wallets compete for the first slot. A curve alone does not change that.

## What this means when you pick a launchpad

If Toly is right that the curve itself is close to as good as it gets, the differences between launchpads come from everything around the curve. Three questions are worth asking.

### 1. How high is the bar?

The graduation target is the filter's strength. A higher target means more SOL must go in before a coin migrates, and deeper liquidity when it does. On Highbar, the creator chooses that bar: **85 SOL** (Standard), **150 SOL** (Higher) or **250 SOL** (Max), per the [Highbar docs](/docs). Each launch uses a fixed Meteora DBC config and graduates into a Meteora DAMM v2 pool whose liquidity is permanently locked. Locked liquidity cannot be withdrawn, and it is not a guarantee of price or safety. Our explainer on the [Meteora Dynamic Bonding Curve](/articles/meteora-dynamic-bonding-curve-explained) covers how those configs work.

### 2. What happens in the first seconds?

The White Whale's point about the fastest wallet is real. Some launchpads offer a decaying fee to make being first more expensive. Highbar's anti-sniper fee is optional. When it is on, it starts at 25% of the trade and falls to about 1% over 60 seconds. That only reduces the advantage of buying in the opening seconds. It is not a guarantee against bots, bundling or rug pulls, and it does not stop a creator or a group from buying inside the launch block through a Jito bundle, so traders should still check early holder concentration.

### 3. Who gets the platform's cut?

Toly's second point was about returning platform profits to users. That is a fee-split question you can check in each platform's docs. On Highbar, every curve trade pays 1%: Meteora keeps 0.2%, and the creator earns 0.4%, 0.496% or 0.6% of each trade depending on the tier. After graduation, a creator LP rebate brings the creator to 0.6%, 0.65% or 0.7% of post-migration volume. Traders earn 0.05% cashback on trades made through Highbar, paid from the platform's share.

None of this proves one platform "better". It gives you the levers to compare.

## For traders: practical takeaways

- Look at how much of the supply early wallets hold, not just whether a coin graduated.
- Check the graduation target, because 85 SOL and 250 SOL coins have very different liquidity at migration.
- Confirm the contract address before every trade.
- If you trade from X, use a dedicated wallet. The [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) trades and launches Solana tokens from posts, with keys kept on your device, per Highbar's docs.

## For creators

If you want to launch with a different bar or the anti-sniper fee on, you can compare tiers on the [launch page](/launch). Launching a token does not mean anyone will trade it.

## Summary

Toly's case is that a simple bonding curve is about as good a spam filter as anyone has built, and that what remains is how platforms share profits. Critics say the same curve rewards the fastest early buyers. Both can be true. When you choose where to launch or trade, compare the graduation target, the early-trading rules and the fee split, using each platform's own docs.
