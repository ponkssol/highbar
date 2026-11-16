---
title: "StonkFun Review (2026): LaunchLab Launches, Creator Forwards, Reward Taxes and Risks"
slug: stonkfun-review
meta_description: "A StonkFun review from official developer, rewards and revenue pages: 1% LaunchLab\
  \ fees, 0.5% creator forwards, reward taxes and how Highbar differs."
primary_keyword: StonkFun review
secondary_keywords:
  - StonkFun launchpad review
  - is StonkFun good
  - StonkFun vs Highbar
  - StonkFun rewards review
date: 2026-11-19
publish_at: "2026-11-19T15:21:00+07:00"
faq:
  - question: "What is StonkFun?"
    answer: "StonkFun is a Solana launchpad, documented on its developer, rewards and revenue\
  \ pages, that launches tokens on Raydium LaunchLab and can pair them with many quote\
  \ tokens, including tokenized stocks."
  - question: "How much does a StonkFun creator earn on a LaunchLab launch?"
    answer: "StonkFun's developer docs say half of the pool's 1% fee, 0.5% of every trade, is\
  \ forwarded to the creator automatically, with nothing to sign."
  - question: "What is a StonkFun reward launch?"
    answer: "The rewards page says newer (v3) reward launches are funded by a 1% or 3% transfer\
  \ tax on every transfer, set at launch, and pay holders pro rata in the quote token."
  - question: "Does Highbar offer stock pairs?"
    answer: "No. Highbar pairs tokens only with SOL on a Meteora Dynamic Bonding Curve and graduates\
  \ them into a locked Meteora DAMM v2 pool."
---

StonkFun is one of the Solana launchpads built around coins paired with something other than SOL, including tokenized stocks. A review should start from its official pages, not from a neighbouring product's reputation. This review uses StonkFun's [developer](https://www.stonkfun.xyz/developers), [rewards](https://www.stonkfun.xyz/rewards) and [revenue](https://www.stonkfun.xyz/revenue) pages, checked on 16 November 2026, and Raydium's [LaunchLab docs](https://docs.raydium.io/products/launchlab/overview). Highbar, the launchpad we run, appears at the end as a SOL-paired comparison.

## What StonkFun is

The developer page describes a non-custodial launch and market-data API, with no API key, and a path to build a LaunchLab launch yourself and still be adopted by the platform if the launch matches the published shape. Attribution is to StonkFun's platform id inside LaunchLab. An adopted launch is, in the page's wording, indistinguishable from an API-created one for the token page, chart, volume, fee ledger and holder rewards, and the pool's own creator account is who gets paid.

That is a serious, technical product surface, and it is also a reminder that StonkFun is a LaunchLab front end, not a separate curve program. Coins graduate into a Raydium CPMM path, like other LaunchLab launches. Our earlier [how to launch on StonkFun](/articles/how-to-launch-on-stonkfun) guide covers the official pages as they stood on 11 November 2026; where this review and that guide might drift, the live StonkFun pages win.

## Fees and revenue

For a LaunchLab launch, the developer docs say the program charges a 1% curve fee to StonkFun's platform, and that half of that fee — 0.5% of every trade — is forwarded to the creator automatically. For older launches that still have a locked Raydium position and a Fee Key NFT, the same page describes a claim flow, with about half on the default 1% pool and about three quarters on the 2% tier. This review uses those official figures and does not restate launch-form copy that we did not re-fetch today.

The [revenue page](https://www.stonkfun.xyz/revenue) says the platform automatically claims its trading fees and uses approximately 60% of platform revenue to buy $STONK on the open market and burn it, with the rest retained. A $STONK quote executes a burn without a buyback. That is not a promise about any coin's price, and the page itself notes that pricing of exact splits may vary with volatile custom quote tokens.

## Reward launches and a documented pitfall

The rewards page says reward tokens distribute to holders pro rata in the quote token, and that a round may pay holders in the coin itself. Newer (v3) launches are funded by a 1% or 3% transfer tax on every transfer, set at launch; earlier ones were funded by about 85% of a 4% pool's trading fees. A transfer tax is charged on transfers, including sells, so it is a different cost from a trading fee.

The developer docs add a sharp warning: on a reward launch the withhold authority is assigned to the platform, holders are taxed from the first trade, and only that wallet can withdraw what is withheld. If a launch is not adopted — wrong curve, wrong config, an unpublished tax rate — the tax still accrues and may never be distributed. That is one of the more important official warnings on the site, and a review should not bury it.

## Risks that come with the quote token

A tokenized stock is issued by a third party, not by the company on the ticker, and a coin is not a share. Issuers can pause transfers or add rules. That risk is shared with any stock-paired launchpad, including Float, and it is not removed by a 0.5% creator forward or by a $STONK buyback. Locked or platform-held LP, where it applies, also does not make a coin a good bet.

## Where Highbar is a fair comparison

Highbar has no stock pairs. If that is why you are on StonkFun, Highbar cannot replace it. If you want a SOL-paired Meteora launch instead, Highbar charges 1% on the curve, pays the creator 0.4% to 0.6% by tier, and graduates at 85, 150 or 250 SOL into a locked DAMM v2 pool. The optional anti-sniper fee starts at 25% and decays to about 1% over 60 seconds; it does not stop bots. See the [docs](/docs), the [launch page](/launch), or the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed). For a direct pair-product comparison, see [Float vs StonkFun](/articles/float-vs-stonkfun), or [Float launchpad explained](/articles/float-launchpad-explained).

## Bottom line

StonkFun is a documented LaunchLab front end for paired-asset launches, with an official 0.5% creator forward on a 1% LaunchLab fee, optional transfer-tax rewards, and a disclosed 60% revenue buyback of $STONK. Read the developer warning about unaadopted reward mints, and read the issuer risk, before you launch or trade. A review is not a reason to buy a coin.

Figures in this article were checked on 16 November 2026 against the official pages linked above.

Those pages change, so re-read them before you launch or trade, and do not treat this guide as a substitute for the live docs.

If a figure here disagrees with an official page, the official page is the one that binds.

Highbar is a small, new launchpad. Nothing in this article is a reason to buy or sell a token, and no launchpad can guarantee demand.

Locked liquidity and a creator fee share are design choices. They do not make a token safe, and they do not stop sniper bots on their own.

Always confirm fee rates, graduation targets and liquidity rules on the live docs, or on the on-chain config, immediately before you sign.

A useful way to use a comparison like this is to write down the three rules you actually care about — the curve fee, the creator share, and what happens to liquidity at graduation — and check those three lines on each official page, rather than choosing a launchpad by name or by a social-media clip.

If you are launching, prepare the token name, ticker, image and any links first, then read the fee table for the exact config you are about to sign, including whether an anti-sniper or app fee applies. If you are trading, check the mint, the pool, and the live fee on the confirmation screen.
