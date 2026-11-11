---
title: "Bonk.fun (LetsBonk) vs Pump.fun: Fees, Graduation and Creator Rewards Compared"
slug: bonk-fun-vs-pump-fun
meta_description: "Bonk.fun vs pump.fun in 2026: curve fees, creator fees, graduation and liquidity, from each platform's sources, plus how Highbar compares."
primary_keyword: bonk.fun vs pump.fun
secondary_keywords:
  - letsbonk vs pump.fun
  - letsbonk fees
  - bonk.fun creator rewards
  - letsbonk launchpad
  - pump fun vs bonk
date: 2026-11-11
publish_at: "2026-11-11T11:21:00+07:00"
faq:
  - question: "Is Bonk.fun the same as LetsBonk?"
    answer: "They are the same platform. The bonk.fun site uses the name BONKfun, while Raydium's public LaunchLab platform list names its configs letsbonk.fun."
  - question: "What are the fees on Bonk.fun?"
    answer: "Raydium's public platform list shows two letsbonk.fun configs with a 1.25% platform fee rate and a 0 creator fee rate on the curve, and a third at 1%. Raydium's own LaunchLab protocol fee applies as well."
  - question: "What are the fees on pump.fun?"
    answer: "Pump.fun's fees page lists a 1.25% curve fee (0.30% creator, 0.95% protocol), a 0.015 SOL graduation fee, PumpSwap fees from 1.25% down to 0.30% by market cap, and a 0.40–0.45% Platform Fee on trades in its own apps since 17 October 2026."
  - question: "Do Bonk.fun creators earn a fee on the curve?"
    answer: "Not according to the config data Raydium publishes: the letsbonk.fun configs set the creator fee rate to 0. Pump.fun pays creators 0.30% on curve trades."
  - question: "Where does Highbar fit?"
    answer: "Highbar runs on Meteora DBC rather than LaunchLab or pump.fun's own program. It charges a 1% curve fee, pays creators 0.4% to 0.6% of curve trades by tier, and graduates tokens into a Meteora DAMM v2 pool with permanently locked liquidity."
---

Bonk.fun, still widely called LetsBonk, is having a busy week. [MemeSonar's DefiLlama-based tracker](https://memesonar.app/solana-launchpads) showed Raydium LaunchLab, the program Bonk.fun runs on, at 10% of Solana launchpad volume in the seven days to 9 November 2026, up from 5% the week before. Pump.fun still held 84%. So the "bonk.fun vs pump.fun" question is back, and this guide answers it with the platforms' own data rather than vibes. At the end we add how Highbar, our launchpad, compares.

Checked on 11 November 2026. Configs and fee pages can change at any time.

## The two platforms in one sentence each

- **Pump.fun** runs its own bonding curve and graduates coins to PumpSwap, its own AMM, with fees published on its [fees page](https://pump.fun/docs/fees).
- **Bonk.fun** is a front end on [Raydium LaunchLab](https://docs.raydium.io/products/launchlab/overview): it owns a "platform config" inside Raydium's program, which sets its fee, its creator fee and what happens to liquidity at graduation.

Bonk.fun has no standalone fee page that we could find, so its numbers below come from Raydium's public [LaunchLab platform list](https://launch-mint-v1.raydium.io/main/platforms?page=1&pageSize=100), which exposes each platform's on-chain settings.

## Fees side by side

| | Pump.fun | Bonk.fun (letsbonk.fun configs) |
| --- | --- | --- |
| Create a coin | No platform fee | Not published separately |
| Curve platform/protocol fee | 0.95% protocol | 1.25% platform fee rate |
| Curve creator fee | 0.30% | 0 |
| Underlying protocol fee | n/a (own program) | Raydium LaunchLab protocol fee on top |
| Graduation | 0.015 SOL fee, to PumpSwap | To a Raydium CPMM pool |
| App/interface fee | 0.45% in pump.fun apps (0.40% with referral) since 17 Oct 2026 | None documented |

### How to read Raydium's numbers

Raydium's [PlatformConfig docs](https://docs.raydium.io/products/launchlab/platform-config) explain that a LaunchLab swap pays three layered fees: the protocol trade fee from Raydium's global config, the platform's `fee_rate`, and the platform's `creator_fee_rate`. Rates are in millionths, so a `feeRate` of 12500 means 1.25%. The two letsbonk.fun configs in Raydium's list that carry a 12500 fee rate also show `creatorFeeRate: 0`. A third letsbonk.fun config shows a 1% fee rate.

### Pump.fun's numbers

Pump.fun's [fees page](https://pump.fun/docs/fees) splits the 1.25% curve fee into 0.30% for the creator, 0.95% for the protocol and 0% for LP. After graduation, PumpSwap fees follow market cap tiers, from 1.25% at the lowest tier down to 0.30% above 98,240 SOL. The Platform Fee in pump.fun's web and mobile apps sits on top and does not apply on Terminal or third-party interfaces. The short version: where you click changes what you pay.

## Graduation and liquidity

**Pump.fun:** coins graduate to a canonical PumpSwap pool, and pump.fun charges a flat 0.015 SOL at graduation.

**Bonk.fun:** coins migrate to a Raydium CPMM pool. Raydium's docs say the LP minted at migration is split between a platform-locked share and a burned share by the platform's `platform_scale` and `burn_scale`. The letsbonk.fun configs that charge 1.25% show `burnScale` 999999 out of 1,000,000, meaning almost all of that LP is burned and cannot be withdrawn by anyone. Those configs also set `platformCpCreator` to an address from Bonk.fun's own config (the same wallet that receives its locked-LP NFT), which per Raydium's [creator fee docs](https://docs.raydium.io/products/launchlab/creator-fees) makes that address the beneficiary of any CPMM creator fees after graduation.

Burned LP and locked LP both mean the pool's liquidity can't be pulled. Neither says anything about price.

## Creator rewards

This is the clearest difference:

- **Pump.fun creators** earn 0.30% on curve trades, and on PumpSwap a creator fee that peaks at 0.95% in the 420–1,470 SOL market-cap band and steps down as the coin grows.
- **Bonk.fun creators** earn 0 on the curve under the configs Raydium publishes. We could not find a Bonk.fun page that says how much of the post-graduation pool creator fee, if any, reaches token creators.

Bonk.fun's [revenue page](https://revenue.bonk.fun/) does publish where platform revenue goes, with the largest line (51%) labelled "Buy for BNKK", alongside BONKsol staking, marketing and development. That is a platform-level allocation, not a creator payout.

## Audience and culture

Numbers aside, the two attract different crowds. Pump.fun is the default venue with the most traders and the most launches. Bonk.fun leans on the BONK community and Raydium liquidity. If your coin is BONK-flavoured, that community fit may matter more than a fee difference. If you want the largest possible pool of eyes, pump.fun leads.

## Where Highbar fits

Highbar is neither: it runs on [Meteora DBC](/articles/meteora-dynamic-bonding-curve-explained) and graduates tokens to Meteora DAMM v2. From the [Highbar docs](/docs):

| | Highbar |
| --- | --- |
| Curve fee | 1%, no extra app fee on the website |
| Creator share on the curve | 0.4% (Standard), 0.496% (Higher), 0.6% (Max) |
| Graduation targets | 85, 150 or 250 SOL, chosen by the creator |
| Liquidity after graduation | Locked forever in two DAMM v2 positions |
| Creator share after graduation | 0.6% to 0.7% of volume, including the creator LP rebate |
| Anti-sniper | Optional, 25% decaying to about 1% over 60 seconds |

Highbar is much smaller than both. You trade reach for a creator-chosen graduation target, a creator fee on both phases and permanently locked DAMM v2 liquidity. The anti-sniper fee only makes early buys more expensive; it does not stop bots or bundles.

## Which should you pick?

- **Pick pump.fun** if reach is everything and you are comfortable with its fee schedule.
- **Pick Bonk.fun** if you want the BONK community and Raydium liquidity and don't need a curve creator fee.
- **Consider Highbar** if you want a curve creator fee, a graduation target you choose and locked liquidity, and you accept a smaller audience.

Whatever you pick, read the source pages linked above, test with small amounts, and never treat a launchpad as a promise of returns. You can preview Highbar's tier fees on the [launch page](/launch), or trade from your timeline with the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed).
