---
title: "Highbar vs Float Launchpad: Fees, Graduation, Creator Share and Stock Pairs Compared"
slug: highbar-vs-float
meta_description: "Highbar vs Float: quote assets, trading fees, who earns the creator share, graduation\
  \ and locked liquidity, from each platform's own docs."
primary_keyword: highbar vs Float
secondary_keywords:
  - Float vs Highbar
  - Float launchpad alternative
  - Float vs Highbar fees
  - stock paired memecoin vs SOL
date: 2026-11-17
publish_at: "2026-11-17T08:41:00+07:00"
faq:
  - question: "What is the main difference between Highbar and Float?"
    answer: "Float launches coins on Raydium LaunchLab and can pair them with tokenized stocks,\
  \ pre-IPO tokens, ZEC or XMR, SOL or USDC. Highbar launches on a Meteora Dynamic\
  \ Bonding Curve, pairs every token with SOL, and graduates into a Meteora DAMM v2\
  \ pool."
  - question: "Do Float creators earn trading fees?"
    answer: "On a standard Float launch, Float's docs say the creator share is 0%. Creators who\
  \ want a share can use a builder launch, which sends 50% of the fee Float collects\
  \ to a fee wallet chosen at launch."
  - question: "How do Highbar's curve fees compare?"
    answer: "Highbar charges a flat 1% on every curve trade. Meteora keeps 0.2% of the trade and\
  \ the rest is split by tier, so the creator earns 0.4%, 0.496% or 0.6% on the curve."
  - question: "Does Float lock liquidity after graduation?"
    answer: "Yes. Float's docs say that at about a $150,000 market cap, liquidity moves into a\
  \ Raydium pool and is locked with Raydium's Burn & Earn, so it can never be pulled."
  - question: "Does Highbar's anti-sniper fee stop bots?"
    answer: "No. It is optional, off by default, and only makes buying in the first 60 seconds\
  \ more expensive, starting at 25% and decaying to about 1%. It does not stop bots\
  \ or Jito bundles."
---

Float and Highbar are both Solana launchpads, but they are built for different kinds of launches. Float, per its [docs](https://www.floatlaunch.xyz/docs), is the launchpad that pairs a new coin with another token — including tokenized stocks — and routes most of a standard coin's fees to holders, traders and a $FLOAT buyback. Highbar, the launchpad we run, pairs every token with SOL on a Meteora Dynamic Bonding Curve and publishes a fixed creator share by tier. If you are choosing between them, the useful question is which rules you actually want.

Checked on 16 November 2026 against [Float's docs](https://www.floatlaunch.xyz/docs) and the [Highbar docs](/docs). Both pages change, so re-read them before you act.

## Highbar vs Float at a glance

| | Float | Highbar |
| --- | --- | --- |
| Curve program | Raydium LaunchLab | Meteora Dynamic Bonding Curve |
| Graduates to | A Raydium pool, locked with Burn & Earn | A Meteora DAMM v2 pool, locked forever |
| Quote asset | Tokenized stocks, pre-IPO tokens, ZEC or XMR, SOL or USDC | SOL only |
| Trading fee | 1%, 2% or 2.5%, chosen by the creator | 1% on the curve and 1% after graduation |
| Creator share on a standard launch | 0%, per Float's docs | 0.4%, 0.496% or 0.6% of each curve trade, by tier |
| Graduation | About 7.5x from a $20,000 starting market cap, roughly $150,000 | 85, 150 or 250 SOL, chosen at launch |
| Early-buy rule | Creator's first buy in the launch transaction is capped at 2% of supply on the launch form | Optional anti-sniper fee, 25% decaying to about 1% over 60 seconds |

## How Float works

Every Float coin is paired with a token. The docs give examples such as NVIDIA or Tesla tokenized stocks, pre-IPO names, ZEC or XMR on Solana, or plain SOL or USDC. Holder rewards on a standard coin are paid in that paired token. Coins launch on [Raydium LaunchLab](https://docs.raydium.io/products/launchlab/overview) with a fixed supply of 1,000,000,000, no mint or freeze authority, and a starting market cap of about $20,000. At about 7.5x, roughly $150,000, the coin graduates and its liquidity moves into a Raydium pool locked with Raydium's Burn & Earn. A creator can place a first buy in the launch transaction, capped at 2% of supply on the launch form. The cap covers that one buy only: it does not limit later buys, or buys from other wallets.

Our earlier guide, [Float launchpad explained](/articles/float-launchpad-explained), covers the same mechanics. Float's fee split was updated after that page was published; the figures here use the current docs.

## How Highbar works

Highbar does not run a launchpad program of its own. Every launch creates a Meteora DBC pool using one of six fixed configs: Standard, Higher or Max, each with the anti-sniper fee on or off. When the curve holds 85, 150 or 250 SOL, it migrates to a Meteora DAMM v2 pool together with 20% of the supply. Liquidity is split into two permanent positions and nobody can pull it. See our [Meteora DBC explainer](/articles/meteora-dynamic-bonding-curve-explained).

## Fees, and who actually gets paid

This is where the two platforms diverge most clearly.

On Float, the creator picks a trading fee of 1%, 2% or 2.5%. Raydium keeps part of it (0.25% while the coin is on its curve). The rest is collected by the Float program. For every **standard** coin, that remainder is split the same way before and after graduation: 17.5% to holders in the paired token, 30% to buying and burning $FLOAT, 15% to a trader airdrop, 15% to a $FLOAT holder airdrop, and 22.5% to the treasury. The docs are direct: the creator share is 0% on every standard coin, old and new.

Creators who want a personal share use a **builder launch**. That type keeps the same fee choices, curve and graduation, but splits the fee Float collects 50% to a fee wallet chosen at launch, 15% to airdrops, 15% to the $FLOAT buyback and 20% to the treasury. There are no holder rewards on builder coins. Before graduation, Raydium caps a creator's cut at 0.5% of each trade, so on the 2% and 2.5% levels the builder does not receive a full half until after graduation.

On Highbar, every curve trade pays 1%. Meteora keeps 0.2% of the trade. The remaining 0.8% is split by tier: the creator receives 0.4% on Standard, 0.496% on Higher and 0.6% on Max. On Higher, the creator also receives half of the 1% migration fee (0.75 SOL). After graduation the DAMM v2 pool also charges 1%, and with the creator LP rebate the creator ends up with 0.6%, 0.65% or 0.7% of post-migration volume. Traders do not pay an extra app fee on the Highbar website. Trades placed through the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) add 0.02% of the SOL amount, shown before you confirm.

## Graduation, liquidity and early-buy rules

Both platforms lock liquidity at graduation, by different methods. Float uses Raydium Burn & Earn. Highbar locks two DAMM v2 positions forever. Neither design is a statement about price or demand.

The early-buy rules also differ. Float caps the creator's first buy. Highbar offers an optional decaying fee that makes very early buys expensive for everyone. The fee starts at 25% and falls to about 1% over 60 seconds; the creator's dev buy in the launch transaction pays the normal minimum fee, not the anti-sniper fee. It does not stop bots, bundled buys or buys from other wallets. See our guide to [sniper bots on Solana](/articles/sniper-bots-solana-memecoin-launches).

Float also charges a ticker relaunch fee: a ticker can be launched once for free, then 5, 4, 3 or 2 SOL depending on how recently it was used, with a refund of up to 2 SOL if that coin graduates within 48 hours (for coins launched from 4 November 2026). Highbar has no ticker fee. The ticker HIGHER is reserved, and $HIGHER is not live.

## Risks each platform discloses

Float's docs are unusually plain about risk, and they are worth reading in full. Tokenized stocks are issued by third parties, not the companies, and those issuers can pause transfers, move or burn tokens, or add rules later. If an issuer pauses, trading and rewards for coins paired with it stop. Some pre-IPO tokens add a transfer fee (1% for PreStocks, 0.2% for Tessera). The Float program has not had an outside audit yet; upgrade authority sits with a 2-of-3 Squads multisig. A coin is not a share and gives no rights in any company.

Highbar's docs focus on locked DAMM v2 liquidity, a public Dev Lock that cannot be cancelled, and published fee tables. A lock still does not make a token a good bet. No launchpad can guarantee demand.

## Who each one suits

Float suits people who want a stock, pre-IPO or privacy-coin pair, or who like a standard-coin split that pays holders, traders and a buyback rather than the creator. A builder launch is the path if you want a personal fee share on that infrastructure. Highbar suits creators who want a SOL pair, a chosen graduation target, a published creator share on both phases and locked DAMM v2 liquidity, and who accept that Highbar is small and new. If stock pairs are the whole point, Highbar is not the tool.

## Bottom line

Highbar and Float are not close substitutes. One is a SOL-paired Meteora launchpad with a fixed creator cut by tier. The other is a Raydium LaunchLab launchpad built around paired assets and a fee split that, on a standard coin, pays the creator nothing. Read [Float's docs](https://www.floatlaunch.xyz/docs) and the [Highbar docs](/docs) before you choose, and see the tiers on the [launch page](/launch).
