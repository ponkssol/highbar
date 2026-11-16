---
title: "Float vs StonkFun: Two Stock-Paired Solana Launchpads Compared"
slug: float-vs-stonkfun
meta_description: "Float vs StonkFun, compared from official docs: quote assets, trading fees, who earns\
  \ the creator share, reward taxes and how liquidity is locked."
primary_keyword: Float vs StonkFun
secondary_keywords:
  - StonkFun vs Float
  - stock paired launchpad comparison
  - Float alternative Stonk
  - StonkFun vs Float fees
date: 2026-11-18
publish_at: "2026-11-18T09:55:00+07:00"
faq:
  - question: "Are Float and StonkFun the same kind of launchpad?"
    answer: "They overlap: both can pair a new Solana coin with a tokenized stock or another quote\
  \ token, and both launch on Raydium LaunchLab. Their fee splits, reward designs\
  \ and official documentation are different."
  - question: "How do the fees differ?"
    answer: "Float lets the creator pick 1%, 2% or 2.5%, and pays a standard-coin creator 0%.\
  \ StonkFun's developer docs say a LaunchLab launch forwards half of the pool's 1%\
  \ fee, 0.5% of every trade, to the creator automatically."
  - question: "What are reward coins on each platform?"
    answer: "Float's standard coins pay holder rewards from a 17.5% share of the fee Float collects.\
  \ StonkFun's rewards page says newer reward launches are funded by a 1% or 3% transfer\
  \ tax on every transfer, set at launch."
  - question: "Does Highbar offer stock pairs?"
    answer: "No. Highbar pairs tokens only with SOL on a Meteora Dynamic Bonding Curve and graduates\
  \ them into a locked Meteora DAMM v2 pool."
---

Float and StonkFun are the two Solana launchpads people mention in the same breath when they want a coin paired with a tokenized stock. They are not the same product. Both use Raydium LaunchLab, but the fee splits, the reward designs and what the official pages actually promise are different. This comparison uses [Float's docs](https://www.floatlaunch.xyz/docs), StonkFun's [developer](https://www.stonkfun.xyz/developers), [rewards](https://www.stonkfun.xyz/rewards) and [revenue](https://www.stonkfun.xyz/revenue) pages, all checked on 16 November 2026, and then places Highbar, the launchpad we run, in a third column for readers who actually want a SOL pair.

## What they share

Both platforms let a coin trade against a quote token that is not only SOL. Float's docs list tokenized stocks, pre-IPO tokens, ZEC or XMR, SOL and USDC. StonkFun's developer page describes launches on [Raydium LaunchLab](https://docs.raydium.io/products/launchlab/overview), with quote tokens listed through its public pairs API, and says a launch can be built against LaunchLab directly and still be adopted by the platform if it matches the published shape. Both therefore inherit LaunchLab's basic path: a bonding curve, then a Raydium pool at graduation.

Both also carry the same category of issuer risk. A tokenized stock is issued by a third party, not by the company on the ticker, and a coin is not a share. That risk is not unique to either launchpad, and it is not removed by locked liquidity.

## Fees and who gets paid

This is the clearest difference.

Float's creator picks 1%, 2% or 2.5%. Raydium keeps 0.25% on the curve. On a **standard** Float coin the creator share is 0%; the rest of what Float collects is split among holders, a $FLOAT buyback, trader and $FLOAT-holder airdrops, and the treasury. A **builder** launch is the path if the creator wants a share: 50% of the fee Float collects goes to a fee wallet chosen at launch, subject to Raydium's 0.5% creator-cut cap before graduation.

StonkFun's developer docs describe a LaunchLab launch differently. The LaunchLab program charges a 1% curve fee to StonkFun's platform, and "half of the pool's 1% fee, 0.5% of every trade, is forwarded to the creator" automatically, with nothing to sign. For older launches that still have a locked Raydium position and a Fee Key NFT, the same page says a fee coin accrues about half on the default 1% pool and about three quarters on the 2% tier, claimed with a wallet signature. This article uses those official figures and does not add launch-form details that we did not re-verify on the live form.

StonkFun's [revenue page](https://www.stonkfun.xyz/revenue) says the platform automatically claims its trading fees and uses approximately 60% of platform revenue to buy $STONK on the open market and burn it. That is not a promise about any coin's price.

## Rewards

Float standard coins pay holders 17.5% of the fee Float collects, in the paired token. Builder coins have no holder rewards. StonkFun's [rewards page](https://www.stonkfun.xyz/rewards) says reward tokens pay holders pro rata in the quote token (a round may also pay in the coin itself), and that newer (v3) launches are funded by a 1% or 3% transfer tax on every transfer, set at launch, while earlier ones were funded by about 85% of a 4% pool's trading fees. A transfer tax applies to every transfer, including your own sells, so it is a different kind of cost from a trading fee. The developer docs also warn that a taxed mint which is not adopted by the platform still taxes holders, and that withheld amount may never be distributed.

## Liquidity at graduation

Float's docs say coins graduate at about a $150,000 market cap and that liquidity is locked with Raydium's Burn & Earn, so it can never be pulled. StonkFun's developer docs describe LaunchLab launches migrating to CPMM and, for some older launches, a locked Raydium position with a Fee Key NFT. We are not restating a StonkFun graduation market cap here, because the developer page tells builders to use a live pricing response rather than hard-coding a raise amount.

## Where Highbar fits, and where it does not

Highbar has no stock pairs. If that is the whole point of the comparison, stop here and choose between Float and StonkFun using their official pages, including our earlier [how to launch on StonkFun](/articles/how-to-launch-on-stonkfun) guide and [Float launchpad explained](/articles/float-launchpad-explained) (the fee split on that page was later updated; this article uses the current Float docs).

If you want a SOL-paired Meteora launch instead, Highbar charges 1% on the curve, pays the creator 0.4%, 0.496% or 0.6% by tier, and graduates at 85, 150 or 250 SOL into a locked DAMM v2 pool. The optional anti-sniper fee starts at 25% and decays to about 1% over 60 seconds; it does not stop bots. See the [docs](/docs), the [launch page](/launch), or the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed).

## Bottom line

Float and StonkFun both do paired-asset launches on LaunchLab, but they pay creators differently: Float's standard coin pays the creator nothing, while StonkFun's official developer docs describe an automatic 0.5% creator forward on a 1% LaunchLab fee. Read both official sources before you pick one. Highbar is the comparison only if you wanted a SOL pair all along.

Figures in this article were checked on 16 November 2026 against the official pages linked above.

Those pages change, so re-read them before you launch or trade, and do not treat this guide as a substitute for the live docs.

If a figure here disagrees with an official page, the official page is the one that binds.

Highbar is a small, new launchpad. Nothing in this article is a reason to buy or sell a token, and no launchpad can guarantee demand.

Locked liquidity and a creator fee share are design choices. They do not make a token safe, and they do not stop sniper bots on their own.

Always confirm fee rates, graduation targets and liquidity rules on the live docs, or on the on-chain config, immediately before you sign.

A useful way to use a comparison like this is to write down the three rules you actually care about — the curve fee, the creator share, and what happens to liquidity at graduation — and check those three lines on each official page, rather than choosing a launchpad by name or by a social-media clip.
