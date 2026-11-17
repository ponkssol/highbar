---
title: "Bags vs Pump.fun: Fee Modes, Fee Sharing, Graduation and Liquidity Compared (2026)"
slug: bags-vs-pump-fun
meta_description: "Bags vs pump.fun from official docs: 2% Default mode vs 1.25% curve, fee sharing with up to 100 earners, Meteora DAMM v2 vs PumpSwap, and app fees."
primary_keyword: bags vs pump.fun
secondary_keywords:
  - pump.fun vs bags
  - bags.fm vs pump.fun
  - bags fm or pump fun
  - bags launchpad vs pump.fun fees
  - bags fee sharing vs pump.fun creator fee
date: 2026-11-17
publish_at: "2026-11-17T09:48:00+07:00"
faq:
  - question: "Is Bags cheaper than pump.fun for traders?"
    answer: "It depends on the mode. Bags' Default mode charges 2% on the curve and 2% after migration. Pump.fun charges 1.25% on the curve, plus a 0.45% Platform Fee (0.40% with a referral) on trades placed in its own web or mobile app. Bags' 1% Fee Mode charges only 0.25% on the curve."
  - question: "Can I split creator fees with collaborators on pump.fun?"
    answer: "Pump.fun's fees page describes a creator fee that goes to the creator, to holders through Holder Rewards, or to a charity. Bags' Token Launch v2 is built around fee sharing, with up to 100 fee earners identified by wallet or by X, Kick or GitHub account."
  - question: "Where do Bags and pump.fun tokens trade after graduation?"
    answer: "Bags lists Meteora DAMM v2 as the post-migration pool for its tokens. Pump.fun migrates graduated coins to a protocol-owned canonical pool on PumpSwap."
  - question: "Does either have an anti-sniper fee?"
    answer: "Bags' fee docs say no current config type uses a base-fee scheduler. We did not find an anti-sniper option in pump.fun's fees or bonding-curve docs."
---

Bags and pump.fun both let anyone launch a Solana token on a bonding curve, but they are built for different creators. Pump.fun is the simple, high-volume default. Bags is a Meteora-based launchpad designed around fee sharing and a menu of fee modes. This comparison sticks to pump.fun's [fees page](https://pump.fun/docs/fees) and [bonding curve page](https://pump.fun/docs/bonding-curve), and Bags' [fee modes](https://docs.bags.fm/how-to-guides/customize-token-fees), [launch guide](https://docs.bags.fm/how-to-guides/launch-token) and [deployer fees](https://docs.bags.fm/how-to-guides/deployer-fees) pages, all checked on 17 November 2026.

We run Highbar, another Meteora launchpad, and include it briefly at the end. Neither Bags nor pump.fun is affiliated with us.

## Bags vs pump.fun in one table

| | Bags (Default mode) | Pump.fun |
| --- | --- | --- |
| Curve engine | Meteora DBC | Pump.fun bonding curve (constant product) |
| Curve fee | 2% (1% platform pool, 1% claimers pool) | 1.25% (0.30% creator, 0.95% protocol) |
| Graduates at | 85 SOL in most modes | A market-cap threshold (not printed on the curve page) |
| After graduation | Meteora DAMM v2, 2% fee with 25% compounded into liquidity | Canonical PumpSwap pool, tiered 1.25% down to 0.30% |
| Fee sharing | Up to 100 earners, wallets or X, Kick, GitHub accounts | Creator, Holder Rewards or charity |
| Other fee modes | Six more, from 0.25% to 10% on the curve | Standard, Holder Rewards, Custom Pair |
| Extra app fee | None described in the docs we read | 0.45% in the pump.fun apps (0.40% with referral) |
| Quote assets | SOL, plus reviewed custom quotes | SOL, USDC, Custom Pair assets |

## Two different ideas of a launch

Pump.fun's pitch is speed. You create a coin with no platform fee, it trades on a curve from the first second, and when it hits the graduation threshold the pool migrates atomically to PumpSwap. The bonding curve page says graduation is automatic and irreversible, with no human step.

Bags puts more weight on the setup before launch. Its program IDs page lists Meteora's Dynamic Bonding Curve for the curve, Meteora DAMM v2 after migration, and Bags' own Fee Share programs. Token Launch v2 requires a fee-share configuration, and the fee mode you pick is saved when that config is created. That is more work. It also lets you do things pump.fun does not.

## Fees compared

### On the curve

Pump.fun charges 1.25% on every curve trade. The creator gets 0.30%, the protocol 0.95%, and nothing goes to LP. Fees are collected in the quote asset, never in the coin.

Bags' Default mode charges 2% on the curve, split evenly between the platform pool and the gross claimers pool. Other modes change that. The ~0% Fee Mode charges 1% on the curve, the 1% Fee Mode only 0.25%, and Paper Hand Tax Mode a flat 10%. If you compare "Bags fees" with pump.fun, say which mode you mean. Our [Bags fees explainer](/articles/bags-fm-fees-explained) covers each one.

### The pump.fun app fee

Since 17 October 2026, trades placed through the pump.fun web or mobile app carry a Platform Fee of 0.45%, or 0.40% with a referral code, on top of the pool fees. It does not apply on Terminal or third-party interfaces. A trader buying on the curve in the pump.fun app therefore pays about 1.70%, which is still below Bags' 2% Default mode but above its 1% and 0.25% modes.

### After graduation

Pump.fun's canonical PumpSwap fee depends on market cap. For SOL-paired coins it is 1.25% below 420 SOL and falls in steps to 0.30% at 98,240 SOL and above. Bags' Default mode stays at 2% after migration, with 25% of the fee compounded back into liquidity and the rest split between the platform and claimers pools. Low Float mode starts at 2% after migration and decays toward a 0.5% floor as market cap grows.

## Creator earnings and fee sharing

On pump.fun, the creator receives 0.30% of each curve trade, then a tiered creator fee on PumpSwap. At launch, the creator can redirect that fee to holders (Holder Rewards) or opt in to a charity. The creator is one wallet.

On Bags, the curve fee feeds a gross claimers pool. Per the deployer fees page, newly created SOL fee-share v2 configs give the wallet that pays for the config 25% of that pool, and the configured recipients split the remaining 75%. The launch guide allows up to 100 fee earners per token, identified by wallet or by X, Kick or GitHub account. If the deployer is also the only recipient, it receives the whole claimers pool, which is 1% of each curve trade in Default mode.

That is the real difference. If you are launching with a streamer, an artist or a team, Bags has the tools. If you are launching alone and want the simplest possible flow, pump.fun's fixed creator fee is easier to reason about.

## Graduation and liquidity

Bags documents its thresholds per mode: 85 SOL for most, 80 SOL for Low Float and about 100 SOL for Drop Mode. Custom-quote launches use a quote-denominated threshold set for that quote. Tokens then move to Meteora DAMM v2.

Pump.fun says the migrated SOL and tokens become the canonical PumpSwap pool, owned by the protocol, and that pump.fun does not seed or remove that liquidity afterwards. Graduation costs 0.015 SOL per coin.

## Anti-sniping

Neither platform offers a decaying anti-sniper fee in the docs we read. Bags' fee page says no current config type uses a base-fee scheduler, so its `enableFirstSwapWithMinFee` flag has no effect today. We did not find an anti-sniper option on pump.fun's fees or bonding-curve pages. For background, see our explainer on [sniper bots in Solana memecoin launches](/articles/sniper-bots-solana-memecoin-launches).

## How Highbar compares

Highbar uses the same Meteora engine as Bags, with a much smaller set of choices. Per the [Highbar docs](/docs):

- Every curve trade pays 1%. Meteora keeps 0.2% and the creator earns 0.4%, 0.496% or 0.6% depending on the tier.
- The creator picks a graduation target of 85, 150 or 250 SOL.
- After graduation, liquidity sits in a Meteora DAMM v2 pool and is locked forever, in two permanent positions for the creator and the platform. The pool fee is 1%, and with the LP rebate the creator receives 0.6% to 0.7% of volume.
- An optional anti-sniper fee starts at 25% and decays to about 1% over 60 seconds. It raises the cost of the earliest buys and does not stop bots or Jito bundles.
- The website adds no app fee on top of the 1% curve fee.

Highbar has no fee sharing, no custom quotes and a far smaller audience than either platform. It is a fit if you want a SOL pair, a short fixed tier table and an optional anti-sniper window.

## Which should you choose?

- **Bags** if fee sharing with collaborators is the point, or you want a specific fee mode such as a low curve fee or a locked-supply mode.
- **Pump.fun** if you want the biggest audience and the simplest flow, and you are fine with one creator wallet and the in-app Platform Fee for traders.
- **Highbar** if you want a 1% curve fee, a graduation target you choose and locked DAMM v2 liquidity, and you are launching from your own wallet.

Fee pages change, so re-read them before you sign. You can preview Highbar tiers without signing on the [launch page](/launch), or trade from X with the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed). No launchpad can make a token graduate or trade, and this is not investment advice.
