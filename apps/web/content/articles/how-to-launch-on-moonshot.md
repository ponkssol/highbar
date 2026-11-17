---
title: "How to Launch a Coin on Moonshot (2026): Steps, the $10 Creation Fee, Creator Fees and Bonding"
slug: how-to-launch-on-moonshot
meta_description: "How to launch a coin on Moonshot, step by step from its support docs: the $10 USDC creation fee, creator fee %, $1M bonding, editing and common pitfalls."
primary_keyword: how to launch on Moonshot
secondary_keywords:
  - how to create a coin on moonshot
  - moonshot create coin
  - moonshot creation fee
  - moonshot creator fee
  - launch memecoin on moonshot app
date: 2026-11-17
publish_at: "2026-11-17T14:58:00+07:00"
faq:
  - question: "How much does it cost to create a coin on Moonshot?"
    answer: "Moonshot's troubleshooting page says creation needs enough USDC in your wallet to cover a $10 coin creation fee, and that the fee can only be paid in USDC. Any initial buy you choose is on top of that."
  - question: "How much does a Moonshot creator earn?"
    answer: "Per Moonshot's creator fees page, trades pay 0.5% before a coin bonds and 0.3% after. The creator earns 0.25% of each transaction before bonding and up to 0.15% after, set in the create form. Earnings are paid hourly once the unpaid balance is over $1."
  - question: "When does a Moonshot coin bond?"
    answer: "Moonshot's bonding page says bonding begins once a coin reaches a $1 million market cap. The coin then moves from a virtual bonding curve pool to a full liquidity pool, and Moonshot links to Meteora's DBC docs for details."
  - question: "What can I edit after launching on Moonshot?"
    answer: "Moonshot's troubleshooting page says you can edit the website, X/Twitter link, media and creator fee %. You cannot edit the ticker, name or coin picture."
---

Moonshot is an app-first way to buy and create Solana memecoins. Its Create tab lets you launch a coin in a few taps, with a creator fee you set yourself. This guide follows Moonshot's own support docs, checked on 17 November 2026: [Create](https://support.moonshot.com/coins/create), [Creator fees](https://support.moonshot.com/coins/create/creator-fees), [Bonding](https://support.moonshot.com/coins/create/bonding), [Create troubleshooting](https://support.moonshot.com/coins/create/troubleshooting) and [Fees](https://support.moonshot.com/trade/fees). Where the docs are silent, we say so rather than guess.

We run Highbar, another Solana launchpad. A short comparison sits at the end. Moonshot is not affiliated with Highbar.

## Before you start

You need three things:

1. **A Moonshot account.** Per the [sign-up guide](https://support.moonshot.com/get-started/sign-up), you install the app, register with your email, enter a one-time code, and enable biometrics such as Face ID or Touch ID.
2. **At least $10 in USDC.** The troubleshooting page says a "deposit to finish" error means you lack the USDC for the $10 coin creation fee. It can only be paid in USDC, not SOL. Add more if you plan an initial buy.
3. **Your coin's details,** ready to paste: ticker, name, image and description. The ticker, name and picture cannot be changed later, so get them right first.

## Step-by-step: creating a coin on Moonshot

### 1. Open the Create tab

In the app, go to the Create tab. Its categories (Trending, Top, Active, Yours, New) let you browse coins made on Moonshot. "Yours" is where your own coins will appear.

### 2. Tap Create

Tap the Create button to open the form.

### 3. Customize your coin

Required fields:

- Ticker
- Name
- Image
- Description

Optional fields:

- A website URL. Moonshot suggests this can point to a specific tweet or an X community.
- Your X (Twitter) username.
- Up to four extra photos or videos, with at most one video of up to 30 seconds.

### 4. Set your initial buy and creator fee %

- **Buy amount** is how much of your own coin you want to buy at launch.
- **Creator fee %** is the share of creator fees you want to receive once the coin bonds. The post-bond creator share is capped, as explained below.

Be deliberate about the initial buy. Other users can see how much the creator holds, and a large one can shape how people read the launch.

### 5. Swipe to create

Swipe to confirm. The coin is created and appears under Create, then Yours.

## How Moonshot creator fees work

From the creator fees page:

| | Before bonding | After bonding |
| --- | --- | --- |
| Dynamic fee on each transaction | 0.5% | 0.3% |
| Creator's share | 0.25% | Up to 0.15% (set in the create form) |

Moonshot describes this as earning up to 50% of those fees. It processes earnings hourly once your unpaid balance is above $1.

Moonshot's separate trading fees page also lists a Moonshot fee on buys and sells: 2.5% (with a ~$0.99 minimum) for trades of $2 to $100, and 1% for $100 and above. The docs do not spell out how this combines with the dynamic fee on a single trade. They do say the app shows an exact breakdown before you confirm, so read it. For how different platforms structure creator pay, see our guide to [memecoin creator fees](/articles/memecoin-creator-fees-solana-launchpad).

## What bonding means on Moonshot

Moonshot calls graduation "bonding". The bonding page says it begins once a Create coin reaches a $1 million market cap, when the coin moves automatically from a virtual bonding curve pool to a full liquidity pool. Moonshot points to Meteora's [Dynamic Bonding Curve docs](https://docs.meteora.ag/core-products/dbc/what-is-dbc) for the mechanics. The page does not state a SOL target or say whether the resulting liquidity is locked, so we do not claim either.

After bonding, a coin gets a purple "Created on Moonshot" badge and, per Moonshot, a higher chance of being verified and shown on the home page. Verification has its own [criteria](https://support.moonshot.com/coins/verification/criteria), including $1 million in rolling 24-hour volume and a $1 million market cap. Moonshot notes that verified coins are not endorsed by it.

## After launch: editing and finding your coin

From the coin's page, tap the three dots and choose Edit, or tap a field in the About section. You can change:

- Website
- X/Twitter
- Media
- Creator fee %

You cannot change the ticker, name or picture. To find your coins later, open Create and tap Yours. Use the share icon on the coin's page for a direct link.

## Common pitfalls

- **"Deposit to finish."** You need USDC for the $10 creation fee. SOL in the wallet will not cover it.
- **Mistakes in fixed fields.** Typos in the ticker or name are permanent.
- **Small-trade fees.** On trades under $100, Moonshot's fee is 2.5% with a ~$0.99 minimum, which matters for small test buys.
- **Slippage.** Trades default to a dynamic slippage tolerance of up to 5%. You can change it in the buy/sell settings.

## How Highbar compares

Highbar is a web launchpad rather than a mobile app. Per the [Highbar docs](/docs), you connect a Solana wallet on the [launch page](/launch), add a name, ticker, image and optional links, pick a tier, choose whether to turn on the anti-sniper fee, and optionally add a dev buy of up to 20 SOL. Differences from Moonshot:

- **Graduation in SOL.** The creator chooses 85, 150 or 250 SOL, then liquidity moves to a Meteora DAMM v2 pool and is locked forever.
- **Fees.** Curve trades pay 1%. Meteora keeps 0.2% and the creator earns 0.4%, 0.496% or 0.6% by tier, with no extra app fee on the website. After graduation the creator receives 0.6% to 0.7% of volume including the LP rebate.
- **Optional anti-sniper fee.** It starts at 25% and decays to about 1% over 60 seconds. It raises the cost of the earliest buys and does not stop bots.
- **Fixed token facts.** 1,000,000,000 supply, mint authority off and immutable metadata.

Moonshot is easier if you live in its app and want card or bank deposits through its partners. Highbar is for creators who want a SOL graduation target and published fee tiers. Our [step-by-step memecoin launch guide](/articles/how-to-launch-a-solana-memecoin) covers the Highbar flow in full, and the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) lets you trade from X.

Whichever you use, re-read the live docs before you create. Most new coins never bond, and nothing here is investment advice.
