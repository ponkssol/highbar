---
title: "Pump.fun vs Jupiter Studio: Fees, Graduation, Anti-Sniping and Creator Earnings Compared (2026)"
slug: pump-fun-vs-jupiter-studio
meta_description: "Pump.fun vs Jupiter Studio from official docs: 1.25% curve vs 1% or 2% fee, PumpSwap vs locked DAMM v2, app fees, anti-sniping and creator share."
primary_keyword: pump.fun vs jupiter studio
secondary_keywords:
  - jupiter studio vs pump.fun
  - pump.fun or jupiter studio
  - studio.jup.ag vs pump.fun
  - pump.fun vs jupiter launchpad
  - jupiter studio anti sniping vs pump.fun
date: 2026-11-17
publish_at: "2026-11-17T08:34:00+07:00"
faq:
  - question: "Which charges less per trade, pump.fun or Jupiter Studio?"
    answer: "On the bonding curve, pump.fun charges 1.25% per trade and Studio charges 1% in meme mode or 1% or 2% in custom mode. Trades placed in the pump.fun web or mobile app also carry a 0.45% Platform Fee (0.40% with a referral code) since 17 October 2026."
  - question: "Who earns more as a creator?"
    answer: "Pump.fun pays the creator 0.30% of each curve trade, with a tiered creator fee after graduation. Studio splits its transaction fee 50/50, so the creator earns 0.5% at a 1% fee or 1% at a 2% fee, on the curve and after graduation."
  - question: "Is liquidity locked after graduation?"
    answer: "Jupiter's docs say all LP tokens from current Studio graduations are permanently locked. Pump.fun's docs say the graduated PumpSwap pool is owned by the protocol and that pump.fun does not seed or remove that liquidity."
  - question: "Does either platform have an anti-sniper fee?"
    answer: "Studio offers one in custom mode: the fee starts at 99% and steps down to the normal fee over 1 to 5 minutes. We did not find an anti-sniper option in pump.fun's fees or bonding-curve docs. Neither option stops bots outright."
---

Pump.fun and Jupiter Studio are the two names creators most often weigh against each other on Solana. One is the high-volume default. The other is Jupiter's own launch product, with a built-in audience on jup.ag. They solve the same problem in different ways. This comparison uses pump.fun's [fees page](https://pump.fun/docs/fees) (last updated 16 November 2026) and [bonding curve page](https://pump.fun/docs/bonding-curve), plus Jupiter's [launching a token](https://docs.jup.ag/user-docs/launch/studio/launching-a-token) and [graduation and fees](https://docs.jup.ag/user-docs/launch/studio/graduation-and-fees) pages. We checked all of them on 17 November 2026.

We run Highbar, a smaller Meteora launchpad. It has its own short section near the end. Neither pump.fun nor Jupiter is affiliated with Highbar.

## Pump.fun vs Jupiter Studio at a glance

| | Pump.fun | Jupiter Studio |
| --- | --- | --- |
| Launch cost | No platform fee; network fee and account deposit only | Not stated as a platform fee in the docs we read |
| Quote assets | SOL, USDC, Custom Pair assets | USDC, SOL or JUP |
| Curve fee | 1.25% (0.30% creator, 0.95% protocol) | 1% (meme) or 1% / 2% (custom) |
| Creator share | 0.30% on the curve, tiered after graduation | 50% of the fee, for the token's whole life |
| App fee on top | 0.45% in the pump.fun web and mobile apps (0.40% with referral) | None described in the Studio docs |
| Graduation | Market-cap threshold, then PumpSwap | At least 15,000 USDC raised (or SOL/JUP equivalent), then Meteora DAMM v2 |
| Graduation fee | 0.015 SOL | Not described |
| Liquidity after graduation | Protocol-owned PumpSwap pool | All LP permanently locked on current configs |
| Anti-sniping | Not found in the fee or curve docs | Optional in custom mode, 99% decaying over 1–5 minutes |
| Creator vesting | Not offered | 0% to 80% of supply, unlocking after graduation |

## How the curves and graduation differ

Pump.fun describes its curve as a constant-product AMM on virtual reserves. Every buy moves the price up, every sell moves it down, and anyone can trade from the first second. When the coin's market cap hits the graduation threshold, the curve closes and the whole pool migrates atomically to PumpSwap. The bonding-curve page does not print the threshold as a number, so we do not quote one here. Graduation costs 0.015 SOL per coin.

Studio also uses an xy=k curve with a fixed supply of 1,000,000,000 tokens. You choose meme or custom mode. Meme mode is preset: USDC quote, 5,000 USDC starting market cap, graduation at a 75,000 USDC market cap (about 15,390 USDC raised), a 1% fee, no anti-sniping and no vesting. Custom mode lets you pick the quote token, the market caps (the raise must still reach 15,000 USDC or the equivalent), a 1% or 2% fee, anti-sniping and vesting. At graduation the raised quote and the token allocation move into a Meteora DAMM v2 pool.

The practical difference: pump.fun gives you one well-known path. Studio gives you a short menu of settings, and the choices are fixed at launch.

## Fees for traders

On pump.fun, every curve trade pays 1.25%. After graduation, canonical PumpSwap pools use a tiered schedule based on market cap. For SOL-paired coins it starts at 1.25% below 420 SOL and falls to 0.30% from 98,240 SOL. Since 17 October 2026, trades placed in the pump.fun web or mobile app also pay a separate Platform Fee of 0.45%, or 0.40% with a referral code. It does not apply on Terminal or third-party interfaces. Our [pump.fun fees explainer](/articles/pump-fun-fees-explained) walks through the tables.

On Studio, a trade pays the token's transaction fee, 1% or 2%, both on the curve and in the DAMM v2 pool after graduation. The fee is set at launch and cannot be changed. If anti-sniping is on, a higher fee replaces it for the first few minutes.

So a trader buying early on the curve through the official app pays more on pump.fun (1.25% plus the app fee) than on a 1% Studio token. On a very large graduated coin, pump.fun's pool fee can drop below Studio's fixed 1% or 2%.

## Fees for creators

Pump.fun's creator fee is 0.30% of each curve trade, paid in the quote asset. After graduation it follows the PumpSwap tiers. A creator can send that fee to holders instead (Holder Rewards) or, if they opt in, to a charity. Cashback mode is no longer available for new launches.

Studio splits the transaction fee 50% to the creator and 50% to Jupiter, for the life of the token. At 1% that is 0.5% per trade; at 2% it is 1%. You claim from the Studio token page with the deployer wallet. Fees only exist if people trade, so a share of nothing is still nothing.

## Anti-sniping

Studio's anti-sniping is custom-mode only and off by default. When it is on, the fee starts at 99% and steps down over 1 to 5 minutes (1 minute by default), linearly or exponentially, to the normal fee. It applies to buys and sells, and jup.ag shows a warning while it may still apply.

We did not find an equivalent option in pump.fun's fees or bonding-curve docs. For what these fees can and cannot do, see [anti-sniper fees on Solana launches](/articles/anti-sniper-fee-solana-token-launch). In short, they make the first seconds or minutes expensive. They do not stop bots or Jito bundles.

## Liquidity after graduation

Pump.fun says the migrated SOL and tokens become the canonical PumpSwap pool, owned by the protocol, and that pump.fun does not seed or remove it after graduation.

Jupiter says every current Studio config permanently locks all LP tokens from the graduated pool. Some older launches used a config that unlocks 50% of the LP one year after graduation, so check which config a token used.

## Where Highbar fits

Highbar sits closer to Studio technically. It launches on a Meteora Dynamic Bonding Curve and graduates to a Meteora DAMM v2 pool whose liquidity is locked forever, per the [Highbar docs](/docs). The differences are in the details:

- SOL only, with three graduation targets: 85, 150 or 250 SOL.
- A 1% curve fee. Meteora keeps 0.2% and the creator earns 0.4%, 0.496% or 0.6% by tier. No extra app fee on the website.
- After graduation the DAMM v2 pool charges 1%, and with the creator LP rebate the creator receives 0.6% to 0.7% of volume.
- An optional anti-sniper fee that starts at 25% and decays to about 1% over 60 seconds. It is off by default and only reduces the early sniping advantage.
- An optional dev buy of up to 20 SOL in the same transaction that creates the pool.

Highbar does not offer USDC or JUP quotes, a 2% fee or creator vesting, and it does not have Jupiter's or pump.fun's audience. Our [Jupiter Studio vs Highbar](/articles/jupiter-studio-vs-highbar) piece covers that pairing in more depth.

## Which should you pick?

- **Pump.fun** if you want the largest audience, the simplest flow, and the option of Holder Rewards or a non-SOL pair, and you accept a 1.25% curve fee plus the app fee for in-app traders.
- **Jupiter Studio** if you want jup.ag visibility, a USDC or JUP pair, a higher creator share, vesting, or an anti-sniping window measured in minutes.
- **Highbar** if you want a SOL pair, a graduation target you choose, a 1% fee with no app fee on the website, and locked DAMM v2 liquidity, on a much smaller venue.

Before you sign anywhere, read the fee line on the confirmation screen. You can preview Highbar tiers without signing on the [launch page](/launch), and if you trade from your timeline, the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) works on X. No launchpad can make a token succeed, and nothing here is investment advice.
