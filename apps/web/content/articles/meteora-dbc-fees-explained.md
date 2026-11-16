---
title: "Meteora DBC Fees Explained: Base Fees, Schedulers, Protocol Share and Migration"
slug: meteora-dbc-fees-explained
meta_description: "Meteora DBC fees from official docs: base and dynamic fees, the 0.25% minimum, 20%\
  \ protocol share, partner/creator splits and the 0.2% migration fee."
primary_keyword: Meteora DBC fees
secondary_keywords:
  - Meteora bonding curve fees
  - DBC fee scheduler
  - Meteora protocol fee 20%
  - DBC vs Highbar fees
date: 2026-11-19
publish_at: "2026-11-19T10:03:00+07:00"
faq:
  - question: "What fees does a Meteora Dynamic Bonding Curve charge?"
    answer: "Meteora's DBC fee docs say the trading fee equals a required base fee plus an optional\
  \ dynamic fee. The protocol receives 20% of the trading fee. The rest is split between\
  \ a partner (the launchpad) and a creator."
  - question: "Is there a minimum DBC fee?"
    answer: "Yes. Bonding-phase trading fees use a 0.25% minimum base fee and a 99% maximum total\
  \ fee cap."
  - question: "What is the migration fee?"
    answer: "DBC supports a migration fee taken from the quote amount at graduation, which can\
  \ be split between partner and creator. DBC also applies a fixed 0.2% protocol liquidity\
  \ migration fee, which reduces the liquidity that goes into the migrated pool by\
  \ 20 basis points."
  - question: "What does Highbar charge on top of those rules?"
    answer: "Highbar's published configuration is a 1% curve fee, of which Meteora keeps 0.2%\
  \ of the trade, and the creator earns 0.4%, 0.496% or 0.6% by tier. That is Highbar's\
  \ config, not a universal Meteora rate."
---

Meteora does not charge "the Meteora fee" in the way a single launchpad does. A Dynamic Bonding Curve has a fee design language, and each launchpad writes a sentence in that language. If you only remember a front end's headline rate, you will miss the protocol share, the scheduler, and the migration fee. This explainer follows Meteora's official [DBC fee docs](https://docs.meteora.ag/core-products/dbc/fees/overview) and then shows how Highbar, the launchpad we run, uses those rules.

Checked on 16 November 2026 against that page.

## The trading fee is two layers

Every DBC swap starts with a trading fee:

**Trading fee = base fee + optional dynamic fee.**

The base fee is required. The dynamic fee is optional and can rise with volatility without permanently raising the base fee. Fee rates are stored as numerators over 1,000,000,000, so 0.25% is 2,500,000. The total trading fee is capped at 99%.

A Token-2022 transfer fee, if a mint has one, is a separate mint fee. It is not the DBC trading fee.

## Base fee modes, including anti-sniper schedulers

DBC has three on-chain base fee modes: a linear scheduler, an exponential scheduler, and a deprecated rate limiter. New configs should use a scheduler. Fixed-fee behavior is also available: on-chain it is a scheduler-style configuration that keeps the base fee constant.

A linear or exponential scheduler is how a launchpad builds a high early fee that decays with time — the usual anti-sniper pattern. Linear is easier to communicate. Exponential drops faster early and then slows. Rate limiter mode, which made large buys pay more, is deprecated for new configs. Meteora's docs suggest a high starting scheduler fee, or dynamic fees, instead.

Bonding-phase fees have a **0.25% minimum base fee** and a **99% maximum** total fee. Those bounds are why a DBC launch can start at a very high anti-sniper rate and still have to land on a legal ending fee.

## Who receives the fee

Meteora splits a DBC trading fee as follows:

| Recipient | What they receive |
| --- | --- |
| Protocol | 20% of the total trading fee |
| Referral, when present | 20% of the protocol fee, not an extra charge on top |
| Partner (the launchpad) | The partner share of the non-protocol fee |
| Creator | The configured share of the non-protocol fee, via `creator_trading_fee_percentage` |

If the creator percentage is 0%, the partner receives the full partner and creator allocation. If it is 20%, the creator receives 20% of that allocation and the partner receives the remaining 80%. Trading fee balances are tracked on the virtual pool and can be claimed as they accrue; they do not have to wait for migration.

This is the section launchpad docs should be mapped onto. "We charge 1%" is not complete until you know how that 1% is split.

## Pool creation and migration fees

Partners can configure a pool creation fee, paid when the virtual pool is created and split between protocol and partner, claimed separately from trading fees.

DBC also supports a **migration fee**, taken from the migration quote amount when the pool graduates, which can be split between partner and creator. On top of that, DBC applies a fixed **0.2% protocol liquidity migration fee**, tracked as protocol migration base and quote fees, which reduces the liquidity that arrives in the migrated pool by 20 basis points. After migration, the DAMM v2 pool has its own fee settings — base fee, optional dynamic fee, market-cap scheduler, compounding — which are not the DBC virtual-pool fees.

## How Highbar uses this design

Highbar's [docs](/docs) publish one configuration in this space. Every curve trade pays 1%. Meteora keeps 0.2% of the trade (20% of the 1% fee). The remaining 0.8% is split by tier: the creator receives 0.4%, 0.496% or 0.6%. On Higher, the creator also receives half of a 1% migration fee. After graduation the DAMM v2 pool charges 1%, and with the creator LP rebate the creator ends up with 0.6%, 0.65% or 0.7% of volume. The optional anti-sniper fee is an exponential-style decay from 25% to about 1% over 60 seconds; it makes early buys more expensive and does not stop bots. The website adds no extra app fee.

Bags and Jupiter Studio write different sentences in the same language, which is why you should read their docs rather than assuming Highbar's 1% is "the Meteora fee." Our [Meteora DBC explainer](/articles/meteora-dynamic-bonding-curve-explained) covers the curve itself; this page is only the fees.

## Bottom line

A Meteora DBC fee has a base, an optional dynamic add-on, a 20% protocol share, a partner/creator split, and a 0.2% protocol migration fee. The launchpad fills in the rest. To see Highbar's filled-in table, use the [docs](/docs), the [launch page](/launch), or the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed).

Figures in this article were checked on 16 November 2026 against the official pages linked above.

Those pages change, so re-read them before you launch or trade, and do not treat this guide as a substitute for the live docs.

If a figure here disagrees with an official page, the official page is the one that binds.

Highbar is a small, new launchpad. Nothing in this article is a reason to buy or sell a token, and no launchpad can guarantee demand.

Locked liquidity and a creator fee share are design choices. They do not make a token safe, and they do not stop sniper bots on their own.

Always confirm fee rates, graduation targets and liquidity rules on the live docs, or on the on-chain config, immediately before you sign.

A useful way to use a comparison like this is to write down the three rules you actually care about — the curve fee, the creator share, and what happens to liquidity at graduation — and check those three lines on each official page, rather than choosing a launchpad by name or by a social-media clip.

If you are launching, prepare the token name, ticker, image and any links first, then read the fee table for the exact config you are about to sign, including whether an anti-sniper or app fee applies. If you are trading, check the mint, the pool, and the live fee on the confirmation screen.
