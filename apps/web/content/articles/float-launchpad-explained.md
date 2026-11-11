---
title: "Float Launchpad Explained: Stock-Paired Memecoins on Solana, Fees and How Highbar Compares"
slug: float-launchpad-explained
meta_description: "What is Float, the Solana launchpad pairing memecoins with tokenized stocks? Fees, graduation, rewards and risks from its docs, and how Highbar differs."
primary_keyword: Float launchpad
secondary_keywords:
  - Float Solana launchpad
  - floatlaunch fees
  - stock paired memecoin
  - Float vs pump.fun
  - Float launchpad review
date: 2026-11-11
publish_at: "2026-11-11T12:48:00+07:00"
faq:
  - question: "What is Float?"
    answer: "Float is a Solana launchpad where every coin is paired with another token, such as a tokenized stock, a pre-IPO token, ZEC or XMR on Solana, SOL or USDC. Coins launch on Raydium LaunchLab, according to Float's docs."
  - question: "What are Float's fees?"
    answer: "Float's docs say creators pick a 1%, 2% or 2.5% trading fee. Raydium keeps part of it (0.25% while a coin is on its curve), and the rest is split 15% holders, 5% creator, 35% $FLOAT buyback and burn, 35% top traders and 10% treasury."
  - question: "When does a Float coin graduate?"
    answer: "Per the docs, coins start at about a $20,000 market cap and graduate at about 7.5x, roughly $150,000, when liquidity moves into a Raydium pool locked with Raydium's Burn & Earn."
  - question: "Is a stock-paired coin the same as owning the stock?"
    answer: "No. Float's docs state a coin is not a share and gives no rights in any company, and that tokenized stocks are issued by third parties that keep powers such as pausing transfers."
  - question: "How is Highbar different from Float?"
    answer: "Highbar pairs tokens with SOL on Meteora DBC, lets the creator choose an 85, 150 or 250 SOL graduation target, and graduates into a Meteora DAMM v2 pool with permanently locked liquidity. It has no stock pairs."
---

Float is the Solana launchpad people kept bringing up on X this week. Its pitch is simple: launch a memecoin paired not just with SOL but with a tokenized stock like NVIDIA or Tesla, a pre-IPO token, or a privacy coin. Its docs describe fresh launch rules too, including a cap on the creator's first buy and a ticker refund rule that applies from 4 November 2026. This guide explains how Float works, using [Float's own docs](https://www.floatlaunch.xyz/docs), and how it compares with Highbar, the launchpad we run.

Checked on 11 November 2026. Float is young and changing quickly, so re-read its docs before you act.

## What Float is

Per [Float's docs](https://www.floatlaunch.xyz/docs), every coin on Float is paired with a token: a tokenized stock (examples given include NVIDIA, Tesla and McDonald's), a pre-IPO name like OpenAI or Anthropic, a privacy coin (ZEC or XMR on Solana), or plain SOL or USDC. Coins trade on whatever terminal you like, and holder rewards are paid in the paired token.

Under the hood, coins launch on [Raydium LaunchLab](https://docs.raydium.io/products/launchlab/overview):

- Fixed supply of 1,000,000,000, with no mint or freeze authority.
- A starting market cap of about $20,000.
- A bonding curve that graduates at about 7.5x, roughly $150,000 market cap.
- At graduation, liquidity moves into a Raydium pool and is locked with Raydium's Burn & Earn, which the docs say means it can never be pulled.

## Float's fees

Creators choose a trading fee of **1%, 2% or 2.5%** per buy and sell. Raydium keeps part of it (0.25% while a coin is on its curve, according to Float). The rest goes through the Float program and is split the same way for every coin, before and after graduation:

| Share | Goes to |
| --- | --- |
| 15% | Holders, in the paired token, pro rata |
| 5% | The creator's chosen wallet |
| 35% | Buying back and burning $FLOAT |
| 35% | USDC airdrops to top traders by volume |
| 10% | Treasury |

Two things are worth noticing. The creator's share is small by design, 5% of the platform's portion. And the biggest slices go to the platform token buyback and to high-volume traders. The docs say bots and wash-trading volume are excluded from trader airdrops and the list is reviewed before each one.

### Ticker fees and the first-buy cap

Float's docs describe two anti-spam rules:

- **Tickers** can be launched once for free. Relaunching an existing ticker costs 5 SOL within 15 seconds of the original, falling to 2 SOL after an hour, with a refund of up to 2 SOL if the coin graduates within 48 hours (for coins launched from 4 November 2026).
- **First buy cap:** a creator's first buy in the launch transaction is capped at 2% of supply on the launch form. The docs are clear that this cap does not limit later buys or buys from other wallets.

## Risks Float discloses itself

Float's docs are unusually direct about risk, and they are worth quoting in summary:

- Coins are highly speculative; most lose value.
- Tokenized stocks are issued by third parties, not the companies, and those issuers can pause transfers, move or burn tokens, or add transfer rules. If an issuer pauses, trading and rewards for coins paired with it stop.
- Some pre-IPO tokens add a transfer fee: 1% for PreStocks and 0.2% for Tessera.
- The Float program **has not had an outside audit yet**. Its upgrade authority sits with a 2-of-3 Squads multisig.
- Float is not affiliated with the companies whose stocks are used as pairs, and a coin gives no rights in any company.

Treat a stock-paired coin as a memecoin with an extra dependency, not as exposure to the stock.

## Float vs Highbar

| | Float | Highbar |
| --- | --- | --- |
| Infrastructure | Raydium LaunchLab → Raydium pool | Meteora DBC → Meteora DAMM v2 |
| Pair asset | Tokenized stocks, pre-IPO, ZEC/XMR, SOL, USDC | SOL |
| Trading fee | 1%, 2% or 2.5% (creator picks) | 1% on the curve |
| Creator share | 5% of the fee after Raydium's cut | 0.4% to 0.6% of each curve trade by tier |
| Graduation | About $150,000 market cap | 85, 150 or 250 SOL (creator picks) |
| Liquidity | Locked with Raydium Burn & Earn | Locked forever in DAMM v2 positions |
| Early-buy rules | Creator's first buy capped at 2% of supply on the launch form | Optional anti-sniper fee, 25% decaying to about 1% over 60 s |

Highbar numbers come from the [Highbar docs](/docs). A few honest notes:

- **Stock pairs are Float's unique feature.** Highbar has nothing similar; if that's what you want, Highbar is not the tool.
- **Creator economics differ sharply.** On Highbar, the creator takes 40% to 60% of each curve fee, and after graduation 0.6% to 0.7% of volume with the creator LP rebate. On Float, the creator gets 5% of the post-Raydium fee, while holders and traders share more.
- **Anti-sniping approaches differ.** Float caps the creator's first buy. Highbar offers an optional fee that starts at 25% and decays to about 1% over 60 seconds, which makes very early buys expensive for everyone. Neither stops bundled buys from other wallets; see our explainer on [sniper bots on Solana](/articles/sniper-bots-solana-memecoin-launches).

## Who Float suits

Float suits people who specifically want coins tied to stock or pre-IPO tokens and like the idea of fees flowing to holders and active traders. It is less suited to creators who want a large personal share of fees, or anyone uncomfortable with an unaudited program and third-party stock issuers.

Highbar suits creators who want SOL pairs, a graduation target they choose, a meaningful creator fee on both phases and permanently locked liquidity, and who accept that Highbar is small.

## Bottom line

Float is a creative twist on the bonding-curve launchpad: memecoins paired with real-world asset tokens, with fees steered towards holders, traders and a $FLOAT buyback. Its own docs list the trade-offs clearly, including the lack of an outside audit. Read them in full before trading, and remember that no launchpad design makes a coin a safe bet. To compare Highbar, read the [docs](/docs), see the tiers on the [launch page](/launch), or try the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) for trading from X.
