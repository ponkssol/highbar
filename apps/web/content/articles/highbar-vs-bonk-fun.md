---
title: "Highbar vs Bonk.fun (LetsBonk): Fees, Graduation, Creator Rewards and Liquidity Compared"
slug: highbar-vs-bonk-fun
meta_description: "Highbar vs Bonk.fun (LetsBonk): curve fees, creator share, graduation, what happens to liquidity and anti-sniper options, from each platform's own data."
primary_keyword: highbar vs bonk.fun
secondary_keywords:
  - bonk.fun vs highbar
  - letsbonk alternative
  - bonk.fun alternative
  - bonk.fun fees
  - letsbonk vs highbar
date: 2026-11-16
publish_at: "2026-11-16T08:37:00+07:00"
faq:
  - question: "What is the main difference between Highbar and Bonk.fun?"
    answer: "Bonk.fun is a platform on Raydium LaunchLab and graduates coins to a Raydium CPMM pool. Highbar launches on a Meteora Dynamic Bonding Curve and graduates to a Meteora DAMM v2 pool, with the creator choosing an 85, 150 or 250 SOL target."
  - question: "Does Bonk.fun pay creators on the bonding curve?"
    answer: "The letsbonk.fun configs in Raydium's public LaunchLab platform list show a creator fee rate of 0. Highbar's docs list a curve creator share of 0.4%, 0.496% or 0.6% depending on tier."
  - question: "Which has the lower curve fee?"
    answer: "Raydium's platform list shows a 1.25% platform fee rate on two letsbonk.fun configs, and MemeFees lists LetsBONK.fun at 1.5% per trade including Raydium's protocol fee. Highbar charges 1% on the curve with no extra app fee on its website."
  - question: "Is Bonk.fun bigger than Highbar?"
    answer: "Yes. MemeFees, using DefiLlama data, listed LetsBONK.fun at about $27.4K in fees on 15 November 2026. Highbar is new and much smaller."
  - question: "Does Highbar's anti-sniper fee stop bots?"
    answer: "No. It is optional and only makes buying in the first 60 seconds more expensive, starting at 25% and decaying to about 1%. It does not stop bots or Jito bundles."
---

Bonk.fun, still often called LetsBonk, is one of the few Solana launchpads with a real community behind it and a steady flow of new coins. Highbar is a much smaller launchpad, and it is ours. If you are choosing between the two, the useful question is not which is "better" but which set of rules suits your launch. This comparison uses each platform's own published data: Raydium's public [LaunchLab platform list](https://launch-mint-v1.raydium.io/main/platforms?page=1&pageSize=100) and [PlatformConfig docs](https://docs.raydium.io/products/launchlab/platform-config) for Bonk.fun, and the [Highbar docs](/docs) for Highbar.

Checked on 16 November 2026. Configs and fee pages change, so confirm on the live pages before you launch.

## Highbar vs Bonk.fun at a glance

| | Bonk.fun (letsbonk.fun configs) | Highbar |
| --- | --- | --- |
| Curve program | Raydium LaunchLab | Meteora Dynamic Bonding Curve |
| Graduates to | Raydium CPMM pool | Meteora DAMM v2 pool |
| Curve platform fee | 1.25% (two configs), 1% (one config) | 1% total, shared with creator and Meteora |
| Creator fee on the curve | 0 on chain | 0.4%, 0.496% or 0.6% by tier |
| Graduation target | About 85 SOL raised (third-party data) | 85, 150 or 250 SOL, creator picks |
| Liquidity after graduation | Almost all LP burned on the 1.25% configs | Locked forever in two DAMM v2 positions |
| Anti-sniper option | None documented | Optional decaying fee |
| Audience | Large, BONK community | Small and new |

The sections below explain each row and where the numbers come from.

## How Bonk.fun works

Bonk.fun does not run its own curve program. It is a front end that owns "platform configs" inside Raydium LaunchLab. Per Raydium's [PlatformConfig docs](https://docs.raydium.io/products/launchlab/platform-config), each LaunchLab swap pays up to three layered fees: Raydium's protocol trade fee, the platform's `fee_rate` and the platform's `creator_fee_rate`. Rates are stored in millionths, so 12500 means 1.25%.

In Raydium's public platform list, checked today, there are three letsbonk.fun configs. Two show a `feeRate` of 12500 (1.25%) and a `creatorFeeRate` of 0. One shows a `feeRate` of 10000 (1%) and also a creator fee rate of 0. MemeFees, which tracks launchpads using DefiLlama data, lists (in the competitor table on its [Moonshot page](https://memefees.com/launchpads/moonshot)) LetsBONK.fun at 1.5% per trade with 0% to the creator on the curve, which matches a 1.25% platform fee plus the 0.25% LaunchLab protocol fee it lists for Raydium.

When a LaunchLab curve completes, it creates a Raydium CPMM pool. [SOLTidy's November comparison](https://soltidy.com/blog/solana-launchpads-compared) puts Bonk.fun's graduation at 85 SOL raised, the same as Raydium's own JustSendit mode.

## How Highbar works

Highbar has no launchpad program of its own. Every launch creates a pool on Meteora DBC using one of six fixed configs: three tiers (Standard, Higher, Max), each with the anti-sniper fee on or off. When the curve holds its tier's SOL target, it migrates to a Meteora DAMM v2 pool together with 20% of the supply. For the mechanics, see our [Meteora DBC explainer](/articles/meteora-dynamic-bonding-curve-explained).

## Fees for traders

### On the curve

On Bonk.fun's 1.25% configs, a trader pays the platform fee plus Raydium's protocol fee. On Highbar, every curve trade pays 1%. Meteora keeps 0.2% of the trade and the rest is split between the creator and the platform by tier. Highbar's docs state that traders never pay an extra app fee on top of the 1% on the website. Trades placed through the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) add 0.02% of the SOL amount, shown before you confirm.

### After graduation

Raydium's [fee comparison page](https://docs.raydium.io/reference/fee-comparison) lists 0.25% as the usual fee on a CPMM pool after graduation. Highbar's DAMM v2 pool charges 1% on every trade. So once a coin has graduated, trading a Bonk.fun coin is usually cheaper. That is a real advantage for active traders, and it is worth saying plainly.

## Creator rewards

This is where the two differ most.

- **Bonk.fun:** the letsbonk.fun configs carry a creator fee rate of 0, so creators earn nothing on chain from curve trades. Those configs also set the post-graduation CPMM creator to an address from Bonk.fun's own config, which per Raydium's [creator fee docs](https://docs.raydium.io/products/launchlab/creator-fees) makes that address the recipient of any CPMM creator fees. We could not find a Bonk.fun page that says how much, if any, of that reaches token creators. Bonk.fun's [revenue page](https://revenue.bonk.fun/) describes platform-level allocations, not a creator payout schedule.
- **Highbar:** creators earn 0.4% (Standard), 0.496% (Higher) or 0.6% (Max) of every curve trade. On Higher, the creator also gets half of the 1% migration fee. After graduation, creators receive 0.6%, 0.65% or 0.7% of volume through their locked LP position plus the creator LP rebate. Fees are claimed from Portfolio, Claim fees.

Our guide to [creator fees on a Solana launchpad](/articles/memecoin-creator-fees-solana-launchpad) walks through how those numbers add up.

## Graduation and liquidity

On Bonk.fun's 1.25% configs, the `burnScale` is 999,999 out of 1,000,000, meaning almost all of the LP minted at graduation is burned. Burned LP cannot be withdrawn by anyone. The 1% config instead shows `platformScale` 1,000,000, so that LP is locked to the platform.

On Highbar, the DAMM v2 liquidity is locked forever in two positions: one for the creator and one for the platform. The creator share is 20% on Standard, 40% on Higher and 50% on Max. The positions earn fees but the liquidity itself cannot be pulled.

Burned and locked both mean the pool's liquidity stays put. Neither says anything about price, and neither makes a token safe to buy.

## Anti-sniper options

Neither Raydium's LaunchLab creation guide nor Bonk.fun's public configs describe an anti-sniper fee for letsbonk.fun launches. Highbar offers one as an option. When it is on, the fee starts at 25% and decays exponentially to about 1% over 60 seconds. The creator's dev buy in the launch transaction pays the normal fee.

Be clear about what that does. It makes buying in the first seconds more expensive, which reduces the advantage of being first. It does not stop bots, and it does not stop Jito bundles that land in the first block. Our article on [sniper bots on Solana](/articles/sniper-bots-solana-memecoin-launches) explains the difference.

## Audience

Bonk.fun has a large, active community and a recognisable brand. [MemeFees' launchpad table](https://memefees.com/launchpads) listed it at about $27.4K in fees on 15 November 2026 per DefiLlama, ranking it among the top Solana launchpads by fees that day. Highbar is new and much smaller. For many creators that audience matters more than any fee row, and that is a fair reason to choose Bonk.fun.

## Which should you pick?

- **Pick Bonk.fun** if your coin fits the BONK community, you want Raydium liquidity and lower post-graduation pool fees, and you do not need an on-chain curve creator fee.
- **Consider Highbar** if you want a creator fee on both sides of graduation, a graduation target you choose, a locked creator LP position and an optional anti-sniper fee, and you accept a smaller audience.

Whichever you choose, no launchpad can make a coin succeed. If you want to see the Highbar options without signing anything, the [launch page](/launch) shows a live preview of each tier, and the [docs](/docs) list every fee and the six config addresses.
