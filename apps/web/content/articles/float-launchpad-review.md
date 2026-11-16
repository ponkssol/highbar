---
title: "Float Launchpad Review (2026): Stock Pairs, Fees, Builder Launches and Risks"
slug: float-launchpad-review
meta_description: "A Float launchpad review from its official docs: stock-paired coins, fees, builder\
  \ launches, ticker rules, disclosed risks and how Highbar differs."
primary_keyword: Float launchpad review
secondary_keywords:
  - Float Solana review
  - is Float launchpad good
  - Float launchpad risks
  - Float vs Highbar
date: 2026-11-17
publish_at: "2026-11-17T12:33:00+07:00"
faq:
  - question: "What is Float?"
    answer: "Float is a Solana launchpad, described in its own docs, where every coin is paired\
  \ with another token such as a tokenized stock, a pre-IPO token, ZEC or XMR, SOL\
  \ or USDC. Coins launch on Raydium LaunchLab and graduate at about a $150,000 market\
  \ cap."
  - question: "Is a Float coin the same as owning the stock?"
    answer: "No. Float's docs state that a coin is not a share and gives no rights in any company,\
  \ and that Float is not affiliated with those companies. Tokenized stocks are issued\
  \ by third parties that keep powers such as pausing transfers."
  - question: "Has the Float program been audited?"
    answer: "Float's docs say the program has not had an outside audit yet. Upgrade authority\
  \ and settings are held by a 2-of-3 Squads multisig."
  - question: "How is Highbar different?"
    answer: "Highbar pairs tokens only with SOL on a Meteora Dynamic Bonding Curve, lets the creator\
  \ choose an 85, 150 or 250 SOL graduation target, and graduates into a Meteora DAMM\
  \ v2 pool with permanently locked liquidity. It has no stock pairs."
---

Float has been one of the most talked-about new Solana launchpads, mainly because it lets you launch a memecoin paired with a tokenized stock. A review should start with what the product actually does, what it costs, and what the team discloses itself, not with a score. This review is based on [Float's docs](https://www.floatlaunch.xyz/docs), checked on 16 November 2026. Highbar, the launchpad we run, appears at the end as a SOL-paired comparison, not as a substitute for stock pairs.

## What Float is, and what it is not

Per the docs, every coin on Float is paired with a token: a tokenized stock (examples given include NVIDIA, Tesla and McDonald's), a pre-IPO name, a privacy coin (ZEC or XMR on Solana), or plain SOL or USDC. Coins trade on whatever terminal you like. Holder rewards on a standard coin are paid in the paired token.

Under the hood, coins launch on [Raydium LaunchLab](https://docs.raydium.io/products/launchlab/overview) with a fixed supply of 1,000,000,000, no mint or freeze authority, and a starting market cap of about $20,000. They graduate at about 7.5x, roughly $150,000, when liquidity moves into a Raydium pool locked with Raydium's Burn & Earn. That lock is a real design choice: the docs say the liquidity can never be pulled.

What Float is not: it is not a brokerage, and a coin is not a share. The docs say Float is not affiliated with, or endorsed by, the companies whose stocks are used as pairs, and that a coin gives no rights in any company. Treat a stock-paired coin as a memecoin with an extra dependency, not as exposure to the stock.

Our earlier explainer, [Float launchpad explained](/articles/float-launchpad-explained), is useful background. Float's fee split was updated after that page was published; the figures in this review use the current docs.

## Fees and who they pay

Creators pick a trading fee of 1%, 2% or 2.5%. Raydium keeps 0.25% while a coin is on its curve. On a **standard** coin, the rest is split 17.5% to holders, 30% to a $FLOAT buyback and burn, 15% to traders, 15% to $FLOAT holders and 22.5% to the treasury. The creator share is 0%. That will surprise anyone who assumed a launchpad always pays the deployer.

Creators who want a share use a **builder launch**: 50% of the fee Float collects goes to a fee wallet chosen at launch, with 15% to airdrops, 15% to buyback and 20% to the treasury, and no holder rewards. Before graduation, Raydium caps a creator's cut at 0.5% of each trade. Builder launches are sent by Float's own server after it checks they match a launch made on floatlaunch.xyz.

Tickers can be used once for free. Relaunching an existing ticker costs 5, 4, 3 or 2 SOL depending on how recent the last launch was, with a refund of up to 2 SOL if the new coin graduates within 48 hours (for launches from 4 November 2026). A creator's first buy in the launch transaction is capped at 2% of supply on the launch form only.

## The risks Float lists itself

This is the strongest part of Float's docs, and a review should not soften it.

- Coins are highly speculative. Most lose value, and you can lose everything you put in.
- Tokenized stocks are issued by third parties (the docs name xStocks, Sunrise, PreStocks and others), not by the companies. Issuers can pause transfers, move or burn tokens, or add transfer rules. If an issuer pauses, trading and rewards for coins paired with it stop.
- Some pre-IPO tokens charge a transfer fee on top of trading fees: 1% for PreStocks and 0.2% for Tessera.
- ZEC and XMR on Solana are bridged tokens, not the native coins. The docs also describe risks for certain leveraged pair tokens.
- The Float program has not had an outside audit yet. Upgrade authority sits with a 2-of-3 Squads multisig, and the docs publish the program and multisig addresses.
- Other apps can launch coins on Float's public LaunchLab fee tiers outside the site. Those coins do not get Float's fee split or rewards.

That list is not a reason to avoid the product automatically. It is a reason to read the docs before you trade, and not to treat a ticker like "TSLA" as if you were buying Tesla stock.

## Where Highbar is a fair comparison, and where it is not

Highbar has no stock pairs and no $FLOAT-style fee flywheel. It launches SOL-paired tokens on a Meteora Dynamic Bonding Curve, with a 1% curve fee, a creator share of 0.4%, 0.496% or 0.6% by tier, and graduation at 85, 150 or 250 SOL into a locked Meteora DAMM v2 pool. An optional anti-sniper fee starts at 25% and decays to about 1% over 60 seconds; it makes early buys more expensive and does not stop bots. See the [anti-sniper fee explainer](/articles/anti-sniper-fee-solana-token-launch) and the [Highbar docs](/docs).

If you want a stock-paired coin, Highbar cannot do that job. If you want a SOL pair and a published creator cut, Float's standard launch cannot do that job. They overlap only for people who are still deciding which kind of launch they want.

## Who it is for

Float suits traders and creators who specifically want a coin paired with a stock, pre-IPO or privacy-coin token, and who are comfortable with issuer risk and an unaudited program. A builder launch suits someone who wants a personal fee share on that same infrastructure. It is a poor fit if you expected a standard launch to pay the creator, or if you wanted a simple SOL pair with no extra issuer.

## Bottom line

Float is a distinctive launchpad: paired assets, locked Raydium liquidity, a standard-coin fee split that pays the creator nothing, and a builder path if you want a share. Its own docs are candid about issuer risk and the lack of an outside audit. Read them in full. To compare a SOL-paired Meteora launch, use the [Highbar docs](/docs), the [launch page](/launch), or the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) for trading from X. No launchpad review is a reason to buy a coin.
