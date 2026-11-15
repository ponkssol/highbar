---
title: "How to Launch a Coin on Pump.fun in 2026: Steps, Costs and What Happens Next"
slug: how-to-launch-on-pump-fun
meta_description: "How to launch on pump.fun: wallet, name, ticker, image, signing, what it costs, how the curve and PumpSwap graduation work, and how Highbar's flow differs."
primary_keyword: how to launch on pump.fun
secondary_keywords:
  - how to create a coin on pump.fun
  - pump.fun launch guide
  - pump.fun create token cost
  - launch memecoin pump.fun
  - pump.fun graduation
date: 2026-11-12
publish_at: "2026-11-12T09:58:00+07:00"
faq:
  - question: "How much does it cost to launch a coin on pump.fun?"
    answer: "Pump.fun's fees page says creating a coin carries no platform fee. You pay the Solana network fee and the small SOL deposit for the token's accounts. A first buy placed in the pump.fun app also pays the 0.45% Platform Fee (0.40% with a referral code)."
  - question: "Can I change my coin's name or image after launching on pump.fun?"
    answer: "No. Pump.fun's create guide says the name, symbol and image are immutable because they are part of the token's metadata. Decide on them before you sign."
  - question: "What happens when a pump.fun coin graduates?"
    answer: "Per pump.fun's bonding curve guide, the curve closes and liquidity migrates automatically to a canonical PumpSwap pool. Pump.fun charges 0.015 SOL per coin at graduation."
  - question: "Do I earn anything as a pump.fun creator?"
    answer: "Pump.fun's fees page lists a 0.30% creator fee on curve trades and a market-cap-tiered creator fee on PumpSwap afterwards. You can instead direct it to holders with Holder Rewards. Earnings depend entirely on trading volume."
  - question: "How is launching on Highbar different?"
    answer: "Highbar uses Meteora DBC. You also add a name, ticker and image, but you choose an 85, 150 or 250 SOL graduation target, can turn on an optional anti-sniper fee, and can add a dev buy of up to 20 SOL in the launch transaction."
---

Launching a coin on pump.fun takes about a minute. Understanding what you have just launched takes a little longer. This guide walks through the steps from [pump.fun's own create guide](https://pump.fun/docs/create-coin), explains the costs from its [fees page](https://pump.fun/docs/fees), and covers what happens after you sign. At the end we compare the flow with Highbar, the Meteora-based launchpad we run, for readers weighing both.

Checked on 12 November 2026.

## Before you start

Have these ready:

- **A Solana wallet** with a little SOL. Pump.fun supports Phantom, Solflare, Backpack and other Solana wallets, or an email sign-in through Privy that creates an embedded wallet.
- **A name and ticker.** Pump.fun suggests a short, all-caps symbol, typically 3 to 6 characters.
- **A square image**, ideally 512x512 PNG or JPG.
- **A short description** and any links to X, Telegram or a website.

One practical note from pump.fun's [docs index](https://pump.fun/docs): external wallet sign-in on the pump.fun website is being retired on 30 November 2026, and the linked page explains how to keep your account. Read it if you normally connect Phantom or another external wallet on the web.

## Step-by-step: creating a coin

### 1. Connect a wallet

Open pump.fun and connect your Solana wallet, or sign in with email.

### 2. Open the create page

Click **Create** in the sidebar and fill in the form:

- **Name**: the full name of the coin.
- **Symbol / ticker**: the short code traders will see.
- **Description**: a blurb shown on the coin page and in social previews.
- **Image**: high contrast reads better in small feed cards.
- **Socials** (optional): X, Telegram or website.

### 3. Sign the launch transaction

Approve the transaction in your wallet. The create guide says the coin is live on the bonding curve as soon as the transaction confirms, and the first trade can happen immediately.

### 4. Your coin trades on the curve

There is no liquidity to seed and no presale. Pricing follows pump.fun's [bonding curve](https://pump.fun/docs/bonding-curve), a constant-product formula with virtual reserves: buys move the price up, sells move it down.

### Tips pump.fun itself gives

- Decide on the brand first. **Name, symbol and image are immutable.**
- Add socials; the guide notes that coins with verified links tend to get more attention in the discovery feed.
- Read the Terms and the Trademark Guidelines; coins that break them may be removed.

## What a pump.fun launch costs

| Item | Cost (per pump.fun's fees page) |
| --- | --- |
| Creating the coin | No platform fee; network fee and account deposit only |
| A first buy at creation in the pump.fun app | Curve fee plus the 0.45% Platform Fee (0.40% with a referral code) |
| Every curve trade | 1.25% (0.30% creator, 0.95% protocol) |
| Graduation to PumpSwap | 0.015 SOL per coin |
| Trades after graduation | 1.25% down to 0.30%, by market cap |

The Platform Fee has applied to trades in the pump.fun web and mobile apps since 17 October 2026. It does not apply on Terminal or third-party interfaces, which may charge their own fees. Our [pump.fun fees explainer](/articles/pump-fun-fees-explained) covers every tier.

## Choices to make at launch

Pump.fun's fees page describes a few coin types beyond the standard one:

- **Holder Rewards coins.** The creator fee goes to holders instead of the creator, distributed from a vault net of costs. Pump.fun states these rewards are not guaranteed and lists a minimum holding (currently US$20 equivalent) to qualify.
- **Charity coins.** The creator can opt to send the creator fee to a charity.
- **Custom Pair coins.** Paired with an asset other than SOL or USDC, on a flat 1.25% curve fee and 0.30% PumpSwap fee.

Cashback coins are no longer available for new launches.

## What happens after launch

Your coin sits on the curve until its market cap reaches the graduation threshold. Then, per pump.fun's bonding curve page, the curve closes and the liquidity migrates automatically and irreversibly to a canonical PumpSwap pool. Pump.fun says it does not seed or remove that liquidity afterwards.

Most coins never get there. That is true on every launchpad: a launch gives you a market, not buyers. Expect to spend far more time on community than on the form.

### Claiming creator fees

On a standard coin you earn the creator fee: 0.30% on the curve, then a PumpSwap creator fee that is 0.95% in the 420–1,470 SOL market-cap band and steps down as the coin grows. Fees are paid in the pool's quote asset, such as SOL, not in your coin.

## How Highbar's launch flow compares

Highbar runs on Meteora's Dynamic Bonding Curve instead of its own program. Per the [Highbar docs](/docs), the steps on [Launch](/launch) are:

1. Connect your wallet.
2. Add a name (up to 32 bytes), a ticker (up to 10 bytes), an image and optional links.
3. Pick a tier: Standard (85 SOL target), Higher (150 SOL) or Max (250 SOL).
4. Decide whether to turn on the anti-sniper fee. It is off by default.
5. Optionally add a dev buy of up to 20 SOL in the same transaction, so you buy first.
6. Sign. The token is live when it confirms.

| | Pump.fun | Highbar |
| --- | --- | --- |
| Graduation target | One threshold for all coins | Creator picks 85, 150 or 250 SOL |
| Curve fee | 1.25% (+0.45% in its apps) | 1%, no app fee on the website |
| Creator on the curve | 0.30% | 0.4% to 0.6% by tier |
| Anti-sniper | Not documented | Optional, 25% decaying to about 1% over 60 s |
| Graduates to | PumpSwap | Meteora DAMM v2, liquidity locked forever |

The anti-sniper fee only makes the first minute expensive for early buyers. It does not stop bots or Jito bundles. If you want the full Highbar walkthrough, read our [step-by-step Solana memecoin guide](/articles/how-to-launch-a-solana-memecoin). You can also launch from a post on X with the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed).

## Bottom line

Launching on pump.fun is quick: connect, fill in the name, ticker, image and links, sign. The real decisions are the brand (it can't change), the coin type and whether you buy in the app, where the Platform Fee applies. Pump.fun gives you the biggest audience on Solana. If you would rather pick your own graduation target or use an anti-sniper fee, compare Highbar's [docs](/docs) first. Either way, no launch guarantees anyone will trade.
