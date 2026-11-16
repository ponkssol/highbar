---
title: "Pump.fun App Fee Explained: The 0.45% Platform Fee Added on 17 October 2026"
slug: pump-fun-app-fee-explained
meta_description: "Pump.fun's app Platform Fee explained: 0.45%, or 0.40% with a referral code, charged\
  \ from 17 October 2026 on web and mobile trades, not on Terminal."
primary_keyword: pump.fun app fee
secondary_keywords:
  - pump.fun platform fee
  - pump.fun 0.45% fee
  - pump.fun app trading fee
  - pump.fun platform fee vs Highbar
date: 2026-11-17
publish_at: "2026-11-17T15:08:00+07:00"
faq:
  - question: "What is the pump.fun Platform Fee?"
    answer: "From 17 October 2026, every trade placed through the pump.fun web app or mobile app\
  \ carries a Platform Fee of 0.45% of the trade, or 0.40% if the wallet has applied\
  \ another user's referral code, in addition to protocol, creator or Holder Rewards,\
  \ and LP fees."
  - question: "Does the Platform Fee apply on pump.fun Terminal?"
    answer: "No. Pump.fun's fees page says the Platform Fee is not charged on trades placed through\
  \ Terminal or any third-party interface. Those interfaces may charge their own fees."
  - question: "Is the Platform Fee part of the 1.25% curve fee?"
    answer: "No. It is charged on top of the bonding-curve or PumpSwap fees. On a curve trade\
  \ placed in the app, you pay the 1.25% pool fee plus the Platform Fee."
  - question: "Does Highbar charge a similar app fee?"
    answer: "Highbar's docs say traders never pay an extra app fee on top of the 1% curve fee\
  \ on the website. Trades placed through the Highbar Chrome extension add 0.02% of\
  \ the SOL amount, shown before you confirm."
---

The most common pump.fun fee question in late 2026 is no longer "what is the curve fee?" It is "why is there another line on my trade?" That line is the Platform Fee. This article explains it from [pump.fun's official fees page](https://pump.fun/docs/fees), last updated 16 November 2026 when we checked it, and then compares it with what Highbar, the launchpad we run, charges on its website and in its Chrome extension.

## What the Platform Fee is

From **17 October 2026**, every trade you place through the pump.fun web app or the pump.fun mobile app carries a Platform Fee, in addition to the protocol, creator or Holder Rewards, and LP fees, and in addition to any cross-chain, bridge or third-party fees that may also apply.

| Rate | Who pays it |
| --- | --- |
| 0.45% of the trade | A wallet with no referral code applied |
| 0.40% of the trade | A wallet that has applied another user's referral code |

The fee is collected in the asset you spend on a purchase or receive on a sale (SOL or USDC), deducted from the amount you spend or from your proceeds, and shown as a separate line before you confirm. For a conditional order it is charged when the order executes, at the rate that applied when you placed the order. It also applies to the first purchase made when you create a coin in the app.

Where you have applied a referral code, part of the Platform Fee is routed to the referrer (the share is set by pump.fun and may change) and the rest is retained by pump.fun. Where you have not, the whole fee is retained by pump.fun. Pump.fun may reduce or waive the fee for particular wallets, programmes or periods; a reduction confers no right and may be withdrawn.

## Where it does not apply

The fees page is clear on the exception that matters for many traders: the Platform Fee is **not** charged on trades placed through Terminal or any third-party interface. If you access the contracts through another app, you may still pay that app's own fees. Always read the confirmation screen in the interface you are actually using.

The Platform Fee also does not apply to perpetual contracts traded through pump.fun's Perpetuals Feature (which has its own builder fee) or to event contracts on the Prediction Markets Feature. Those are separate products with their own rules on the same fees page.

## Packs and Collectibles

From **16 November 2026**, pump.fun charges the Platform Fee when you buy a Pack through the pump.fun mobile app and when you sell a Collectible through it, at the same 0.45% / 0.40% rates. On a Pack purchase the fee is on top of the Pack price, paid in USDC in the same transaction. On a sale it is deducted from the proceeds. It is not charged on the automatic buyback described in the Packs Terms, or when you redeem a Collectible for a physical item. Packs are sold by a third-party Pack Provider, not by pump.fun, and that provider may charge its own fees.

## How it stacks with the curve and PumpSwap fees

This is the part that surprises people. The Platform Fee does not replace the 1.25% bonding-curve fee or the tiered PumpSwap fee. It sits on top, and only in the apps.

A worked example, using official rates only: a SOL-paired curve buy placed in the web app pays the 1.25% curve fee (0.30% creator, 0.95% protocol, 0% LP) plus a 0.45% Platform Fee if no referral code is applied. The same buy placed through Terminal pays the 1.25% curve fee without that Platform Fee. After graduation, a canonical PumpSwap trade in the app pays the tiered pool fee for that market cap plus the Platform Fee. Our [pump.fun fees explainer](/articles/pump-fun-fees-explained) has the full PumpSwap tables.

Fees on the fees page are part of pump.fun's Terms of Use. Pump.fun may change them by updating the page.

## How Highbar handles app fees

Highbar does not add a Platform Fee on website trades. The [docs](/docs) state that traders never pay an extra app fee on top of the 1% curve fee. The 1% is shared by the creator, the platform and Meteora (the creator earns 0.4%, 0.496% or 0.6% by tier). Trades placed through the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) add 0.02% of the SOL amount, shown before you confirm. That 0.02% is a different kind of charge: it applies only to extension transactions, not to website trades.

Highbar is much smaller than pump.fun and graduates tokens to a locked Meteora DAMM v2 pool rather than PumpSwap. The fee comparison is still useful if you are choosing an interface, not only a curve. For the wider product difference, see our [pump.fun alternatives checklist](/articles/pump-fun-alternatives-compare-solana-launchpads).

## What to check before you confirm a trade

1. Look at the confirmation screen in the interface you are actually using. If the Platform Fee is listed, you are in the web or mobile app (or buying a Pack / selling a Collectible there).
2. Add the Platform Fee to the pool fee, not instead of it. A 1.25% curve trade in the app is not a 1.25% trade once the Platform Fee is included.
3. If you have a referral code applied, confirm that the 0.40% rate is the one shown. If you do not, expect 0.45%.
4. If you are using Terminal or another interface, do not assume the fee is zero overall: that interface may charge something of its own.
5. Re-read the [fees page](https://pump.fun/docs/fees) if some time has passed. Pump.fun may change the schedule by updating that page.

## Bottom line

The pump.fun Platform Fee is a 0.45% (or 0.40%) surcharge on trades, Packs and Collectible sales placed in the official apps, on top of already published pool fees, from 17 October 2026. It does not apply on Terminal. Read the confirmation line before you sign, and read the [fees page](https://pump.fun/docs/fees) for the binding schedule. To compare Highbar's 1% website fee and 0.02% extension fee, see the [docs](/docs) and the [launch page](/launch).
