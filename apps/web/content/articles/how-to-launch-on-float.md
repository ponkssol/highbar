---
title: "How to Launch on Float (2026): Pairs, Fee Tiers, Builder Launches and Ticker Rules"
slug: how-to-launch-on-float
meta_description: "How to launch on Float from its official docs: pick a pair and fee, standard vs builder\
  \ launches, the 2% first-buy cap and ticker relaunch costs."
primary_keyword: how to launch on Float
secondary_keywords:
  - Float launchpad how to
  - Float builder launch
  - Float ticker fee
  - launch on Float vs Highbar
date: 2026-11-18
publish_at: "2026-11-18T08:38:00+07:00"
faq:
  - question: "What do I need to decide before launching on Float?"
    answer: "Float's docs say you should choose the quote token the coin will be paired with,\
  \ a trading fee of 1%, 2% or 2.5%, and whether the launch is a standard coin or\
  \ a builder launch. A ticker can be used once for free."
  - question: "What is the first-buy cap on Float?"
    answer: "A creator can make a first buy in the launch transaction, capped at 2% of supply\
  \ on the launch form. The cap does not limit later buys or buys from other wallets."
  - question: "What is a builder launch?"
    answer: "A builder launch uses the same curve and fee choices as a standard launch, but 50%\
  \ of the fee Float collects goes to a fee wallet chosen at launch. There are no\
  \ holder rewards on builder coins."
  - question: "How is launching on Highbar different?"
    answer: "Highbar tokens are paired only with SOL on a Meteora Dynamic Bonding Curve. You pick\
  \ a Standard, Higher or Max tier (85, 150 or 250 SOL), optionally turn on the anti-sniper\
  \ fee, and can add a dev buy of up to 20 SOL."
---

Float is the Solana launchpad for coins paired with another token, including tokenized stocks. If you are searching "how to launch on Float," the useful version of that guide is the one taken from [Float's own docs](https://www.floatlaunch.xyz/docs), not from a recap of the launch form that the docs do not publish in full. This walkthrough sticks to those docs, checked on 16 November 2026, and then notes how the same decisions look on Highbar, the launchpad we run.

## 1. Choose the pair

Every Float coin is paired with a token. The docs list tokenized stocks (examples include NVIDIA, Tesla and McDonald's), pre-IPO names, ZEC or XMR on Solana, and plain SOL or USDC. Holder rewards on a standard coin are paid in that paired token, so the pair is not only a price unit. It is also the asset holders get paid in, and it carries issuer risk: tokenized stocks are issued by third parties that can pause transfers, and a coin is not a share. If that trade-off is not acceptable, Float is the wrong venue. Highbar, by contrast, pairs every token with SOL only.

## 2. Pick a trading fee

Creators choose 1%, 2% or 2.5% on every buy and sell. Raydium keeps 0.25% while the coin is on its [LaunchLab](https://docs.raydium.io/products/launchlab/overview) curve. The rest is collected by the Float program and split on chain when fees are cycled. The rate is not what the creator keeps. That depends on the launch type in the next step. Our [Float fees explainer](/articles/float-launchpad-fees) sets the splits out in full.

## 3. Standard coin or builder launch

This is the decision most first-time launchers miss.

- A **standard** coin pays the creator 0%. After Raydium's cut, the fee is split 17.5% to holders, 30% to a $FLOAT buyback and burn, 15% to traders, 15% to $FLOAT holders and 22.5% to the treasury.
- A **builder** launch keeps the same fee choices, curve and graduation, but sends 50% of the fee Float collects to a fee wallet chosen at launch (and not changeable later), with 15% to airdrops, 15% to buyback and 20% to the treasury, and no holder rewards. Before graduation, Raydium caps a creator's cut at 0.5% of each trade.

Builder launches are sent by Float's own server after it checks that they match a launch made on floatlaunch.xyz. If you want a personal fee share, use a builder launch. If you want holder rewards, use a standard coin.

## 4. Understand the first-buy cap and the ticker fee

A creator can make a first buy in the launch transaction, so nobody can buy before them. On the launch form that buy is capped at 2% of supply. The cap covers that one buy only.

Tickers are 1 to 10 letters or numbers, and case does not make a new ticker. Each ticker can be launched once for free. Relaunching an existing ticker costs 5 SOL within 15 seconds, 4 SOL up to one minute, 3 SOL up to one hour, and 2 SOL after that, with a refund of up to 2 SOL if the coin graduates within 48 hours, for launches from 4 November 2026. There is no refund if the launch bought more than the first-buy cap, or for wallets blocked for abusing launches.

## 5. Know what happens after you sign

The coin starts on Raydium LaunchLab at about a $20,000 market cap, with a fixed 1,000,000,000 supply and no mint or freeze authority. At about 7.5x, roughly $150,000, it graduates and liquidity is locked with Raydium's Burn & Earn. Fees build up in Raydium's vaults until they are cycled. Read Float's risk section before you launch: the program has not had an outside audit yet, and other apps can launch coins on Float's public fee tiers without going through the Float program.

## How the same steps look on Highbar

On Highbar you open the [launch page](/launch), connect a wallet, add a name, ticker, image and optional links, pick Standard, Higher or Max (85, 150 or 250 SOL), choose whether the optional anti-sniper fee is on, and optionally add a dev buy of up to 20 SOL in the same transaction. The curve fee is 1%, with a published creator share of 0.4%, 0.496% or 0.6% by tier. The anti-sniper fee, if on, starts at 25% and decays to about 1% over 60 seconds; it makes early buys more expensive and does not stop bots. There is no stock pair and no ticker relaunch fee. See the [docs](/docs) and [how to launch a Solana memecoin](/articles/how-to-launch-a-solana-memecoin). The [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) can also launch from posts on X.

## Bottom line

A Float launch is three choices — pair, fee rate, and standard vs builder — plus a first-buy cap and, if you reuse a ticker, a SOL fee. Read the [docs](https://www.floatlaunch.xyz/docs) immediately before you sign. If you want a SOL-paired Meteora launch with a published creator share, use Highbar's launch page instead.

Figures in this article were checked on 16 November 2026 against the official pages linked above.

Those pages change, so re-read them before you launch or trade, and do not treat this guide as a substitute for the live docs.

If a figure here disagrees with an official page, the official page is the one that binds.

Highbar is a small, new launchpad. Nothing in this article is a reason to buy or sell a token, and no launchpad can guarantee demand.

Locked liquidity and a creator fee share are design choices. They do not make a token safe, and they do not stop sniper bots on their own.

Always confirm fee rates, graduation targets and liquidity rules on the live docs, or on the on-chain config, immediately before you sign.

A useful way to use a comparison like this is to write down the three rules you actually care about — the curve fee, the creator share, and what happens to liquidity at graduation — and check those three lines on each official page, rather than choosing a launchpad by name or by a social-media clip.
