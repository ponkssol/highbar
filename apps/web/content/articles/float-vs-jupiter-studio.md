---
title: "Float vs Jupiter Studio: Stock-Paired Coins vs USDC, SOL or JUP Launches, Fees and Creator Share"
slug: float-vs-jupiter-studio
meta_description: "Float vs Jupiter Studio from official docs: paired-token coins on Raydium LaunchLab vs Meteora launches, fee splits, creator share, graduation and locks."
primary_keyword: float vs jupiter studio
secondary_keywords:
  - jupiter studio vs float
  - float launchpad vs jupiter studio
  - floatlaunch vs studio.jup.ag
  - usdc paired token launchpad solana
  - float launchpad alternative
date: 2026-11-17
publish_at: "2026-11-17T18:54:00+07:00"
faq:
  - question: "Can I launch a USDC-paired coin on both Float and Jupiter Studio?"
    answer: "Yes. Float's docs list SOL and USDC alongside tokenized stocks, pre-IPO tokens and privacy coins as pairs. Jupiter Studio supports USDC, SOL or JUP as the quote token, and meme mode uses USDC."
  - question: "Which pays the creator more?"
    answer: "Studio pays the creator 50% of its 1% or 2% fee for the token's whole life. A standard Float coin pays its creator 0%. A Float builder launch sends 50% of what Float collects to a chosen fee wallet, capped by Raydium at 0.5% of each trade before graduation."
  - question: "Is liquidity locked after graduation on both?"
    answer: "Float says graduated liquidity is locked forever in a Raydium pool with Burn & Earn. Jupiter says all LP from graduated Studio pools is permanently locked on current configs; some older configs unlock 50% after a year."
  - question: "Does either have anti-sniper protection?"
    answer: "Studio offers an optional anti-sniping fee in custom mode, starting at 99% and decaying over 1 to 5 minutes. Float's docs describe a creator first buy in the launch transaction, capped at 2% of supply on its launch form, but not a decaying anti-sniper fee."
---

Float and Jupiter Studio both let you launch a Solana coin against something other than plain SOL. Float is built around pairs with tokenized stocks and other tokens. Studio lets you choose USDC, SOL or JUP. Beyond that they are quite different: different engines, very different creator economics, and different ideas of who a launch should reward. This comparison uses [Float's docs](https://www.floatlaunch.xyz/docs) and Jupiter's [launching a token](https://docs.jup.ag/user-docs/launch/studio/launching-a-token) and [graduation and fees](https://docs.jup.ag/user-docs/launch/studio/graduation-and-fees) pages. Jupiter's pages were checked on 17 November 2026. Float's fee rules were rechecked on 23 November 2026.

We run Highbar, a SOL-only launchpad, and include it briefly. Neither Float nor Jupiter is affiliated with Highbar.

## Float vs Jupiter Studio at a glance

| | Float | Jupiter Studio |
| --- | --- | --- |
| Engine | Raydium LaunchLab, then a Raydium pool | Bonding curve, then Meteora DAMM v2 |
| Pairs | Tokenized stocks, pre-IPO tokens, ZEC or XMR on Solana, SOL, USDC | USDC, SOL or JUP |
| Supply | 1,000,000,000, no mint or freeze authority | 1,000,000,000 |
| Trading fee | 1% on new standard coins; builder launches pick 1%, 2% or 2.5% | 1% (meme) or 1% / 2% (custom) |
| Creator share | 0% on standard coins; builder launches 50% of Float's collection | 50% of the fee, for life |
| Holder rewards | 17.5% of Float's collection, paid in the paired token | None described |
| Graduation | About 7.5x the starting cap (roughly $150,000) | At least 15,000 USDC raised or equivalent |
| Liquidity after graduation | Locked forever with Raydium Burn & Earn | All LP permanently locked on current configs |
| Anti-sniping | Not described; creator first buy capped at 2% on the form | Optional in custom mode, 1–5 minutes |
| Vesting | Not described | 0% to 80% of supply, from graduation |

## The pairing choice

Float pairs every coin with a token: a tokenized stock such as NVIDIA or Tesla, a pre-IPO name, a privacy coin bridged to Solana, or SOL or USDC. Float's docs say it is not affiliated with the companies whose stocks are used, and that a coin gives no rights in any company.

Studio's quote choice is narrower but simpler: USDC, SOL or JUP. Meme mode uses USDC with a 5,000 USDC starting market cap and graduates at a 75,000 USDC market cap, about 15,390 USDC raised. In custom mode you set the market caps, as long as the raise reaches at least 15,000 USDC or the equivalent.

If you specifically want a coin tied to a stock or pre-IPO token, Float is the purpose-built choice. If you want a stablecoin pair with Jupiter's distribution, Studio is.

## Fees and where they go

### Float

Float's docs say new standard coins pay a flat 1% fee on every buy and sell. Builder launches can pick 1%, 2% or 2.5%, and standard coins launched earlier at 2% or 2.5% keep their rate. Raydium keeps 0.25% while the coin is on its curve. Float's program collects the rest. On standard coins, before and after graduation, it splits it 17.5% to the coin's holders, 30% to a $FLOAT buyback and burn, 15% to traders and 15% to $FLOAT holders (both as USDC), and 22.5% to the treasury. The creator share is 0%.

Builder launches change that: 50% of Float's collection goes to a fee wallet chosen at launch, 15% to airdrops, 15% to buyback and 20% to treasury, with no holder rewards. Raydium caps a creator's cut at 0.5% of each trade before graduation, so Float's docs say the builder gets 0.375% per trade at the 1% level and 0.5% at 2% and 2.5%.

### Jupiter Studio

Every buy and sell pays the token's fee for its whole life, on the curve and in the DAMM v2 pool. That is 1% in meme mode, or 1% or 2% in custom mode, set at launch. It is split 50% to the creator and 50% to Jupiter, so the creator earns 0.5% or 1% of each trade. You claim from the Studio token page with your deployer wallet.

## Creator economics

This is the clearest difference. Studio pays the deployer by default. Float's standard launch pays holders, traders and the $FLOAT ecosystem instead, and a creator who wants a share has to use a builder launch. At the same 2% fee level before graduation, a Studio creator earns 1% of each trade and a Float builder earns 0.5%. These are mechanics, not income forecasts. Fees only exist if people trade.

## Graduation and liquidity

Float coins start at a market cap of about $20,000 and graduate at about 7.5x, roughly $150,000. Liquidity then moves into a Raydium pool locked forever with Raydium's Burn & Earn. Studio tokens graduate when the curve raises the amount set at launch, then move into a Meteora DAMM v2 pool whose LP tokens are permanently locked on every current config.

## Risks the platforms disclose

Float's own risk list is worth reading in full. Tokenized-stock issuers such as xStocks, Sunrise and PreStocks can pause transfers, move or burn tokens, or add transfer rules. If an issuer pauses, trading and rewards for coins paired with it stop. Some pre-IPO tokens add a transfer fee. Float's program has not had an outside audit, and its upgrade authority sits with a 2-of-3 Squads multisig.

Jupiter's docs warn that adding liquidity to a graduated pool carries risk: if the price drops sharply, you can lose part or all of what you deposited. The fee is set at launch and cannot be changed, and vested supply never unlocks if a token does not graduate.

Background: our [Float launchpad explainer](/articles/float-launchpad-explained) and [Jupiter Studio vs Highbar](/articles/jupiter-studio-vs-highbar). Float's fee split changed after our explainer was published, so the live docs win.

## Where Highbar fits

Highbar does not offer stock, USDC or JUP pairs. Per the [Highbar docs](/docs), every token is SOL-paired on a Meteora Dynamic Bonding Curve with a 1% fee. Meteora keeps 0.2% and the creator earns 0.4%, 0.496% or 0.6% depending on a graduation target of 85, 150 or 250 SOL. Liquidity then moves into a DAMM v2 pool that is locked forever, and the creator receives 0.6% to 0.7% of post-graduation volume including the LP rebate. An optional anti-sniper fee starts at 25% and decays to about 1% over 60 seconds. It only reduces the early-buy advantage. It does not stop bots, bundles or rug pulls. Locked liquidity is not a guarantee of price or safety.

## Which should you choose?

- **Float** if a stock-paired or pre-IPO-paired coin is the point, and you accept issuer risk and a standard split that does not pay the creator.
- **Jupiter Studio** if you want a USDC or JUP pair, a creator share for life, vesting, anti-sniping and Jupiter's visibility.
- **Highbar** if you want a SOL pair with a published creator share and a graduation target you choose.

You can compare Highbar tiers without signing on the [launch page](/launch), or trade from X with the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed). A stock-paired coin is still a memecoin, not a share. This is not investment advice.
