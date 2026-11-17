---
title: "How to Launch on Heaven (2026): Free Launches, Creator vs Community Fees and the API Route"
slug: how-to-launch-on-heaven
meta_description: "How to launch a token on Heaven from its official docs: what you can customize, choosing Creator or Community, fees, the 6-second sniper fee and the API."
primary_keyword: how to launch on Heaven
secondary_keywords:
  - how to launch a token on heaven.xyz
  - heaven launchpad how to create a coin
  - heaven creator vs community coin
  - heaven api create pool
  - heaven launchpad guide
date: 2026-11-17
publish_at: "2026-11-17T16:13:00+07:00"
faq:
  - question: "How much does it cost to launch on Heaven?"
    answer: "Heaven's fees page lists creating a coin as free, and its permissionless page says every launch is free and takes under five seconds. You still need SOL for network costs and for any initial buy."
  - question: "Should I pick Creator or Community when launching on Heaven?"
    answer: "Pick Creator only if you are the real builder, team or artist and can prove it on your X or website. Creator coins go into review and, if approved, earn a 1% creator fee. Community coins skip review and earn 0.1%."
  - question: "Does a Heaven token migrate to another DEX?"
    answer: "No. Heaven's curve page says pools trade on Heaven's own AMM from day one, seeded with virtual SOL, and never migrate. A $100k virtual migration cap exists only so charting tools display tokens in a familiar way."
  - question: "Does Heaven have anti-sniper protection?"
    answer: "Heaven's Pro Pools page lists standard pools as having a 6-second linear decay for sniper resistance. Pro Pools can set custom slot-based fee brackets."
---

Heaven is a Solana launchpad that runs its own AMM. There is no bonding curve to fill and no migration to another exchange. A token trades on Heaven's pool from the first second. Because the platform is standardized, launching is mostly about two decisions: what your token looks like, and whether you are a Creator or a Community launch. This guide follows Heaven's official docs, checked on 17 November 2026: [Standardized](https://docs.heaven.xyz/standardized), [Permissionless launches](https://docs.heaven.xyz/permissionless), [Permissioned fees](https://docs.heaven.xyz/permissioned), [Fees](https://docs.heaven.xyz/fees), [No bonding curve](https://docs.heaven.xyz/curve), [Pro Pools](https://docs.heaven.xyz/pro-pools) and the [API quickstart](https://docs.heaven.xyz/sdk/quickstart/api).

We run Highbar, a different kind of launchpad, and compare briefly at the end. Heaven is not affiliated with Highbar.

## How a Heaven launch works

Heaven's curve page explains the model. Each pool behaves as if it were seeded with 35 SOL, even though launching is free. That "virtual SOL" sets a floor nobody can sell into, so a new token has enough liquidity to trade right away. Heaven says it is still experimenting with the starting amount. There is a "virtual migration" cap at $100k so tools like Axiom's Pulse or Photon's memescope can display tokens in a familiar way, but nothing actually migrates.

Every standard launch uses the same parameters. Per the Standardized page, the only things you customize are the token logo, name, ticker, description and social links. Heaven's API docs add that a standard launch creates a new Token-2022 mint.

## Step-by-step: launching on Heaven

Heaven's docs do not publish a click-by-click guide for the web app, so the steps below follow what the docs say a launch needs.

### 1. Prepare your token details

Have your logo, name, ticker, a short description and your social links ready. These are the only customizable fields, so the work you put in here is the work that shows.

### 2. Connect a Solana wallet with some SOL

Launching is free, but you need SOL for network costs and for any initial buy. The curve page says creators can buy as much dev supply as they want. Anyone can see a large creator buy, so think about how it will read.

### 3. Choose Creator or Community

This is the decision that matters most. Per the Permissioned fees page:

- **Creator:** for a real builder, team or artist. Once a launch passes $100k in volume it is reviewed. Meanwhile, the 1% creator fee is held by Heaven's contract and you cannot access it.
- **Community:** for a meme with no team behind it. It skips review and the deployer earns a 0.1% fee from the start.

After review, a Creator launch ends up in one of three groups. If approved as **Creator**, the held fees are released and the 1% fee continues. If moved to **Community**, 90% of the fees collected so far go to Heaven's buyback flywheel and the deployer keeps the 10% (the 0.1% rate) going forward. If **Blocked**, as a larp or scam, all creator fees go to $LIGHT buybacks. Heaven stresses that "Creator" is not a safety check or stamp of approval. It means Heaven has seen proof on the project's X or website that the real team deployed it.

### 4. Launch

Heaven says launches are permissionless, take under five seconds and are not monitored or restricted. The token trades on Heaven's AMM right away.

### 5. Claim creator fees

Heaven's API reference includes a claim-creator-fee transaction for standard pools. For Creator launches, fees become claimable only after a successful review.

## Heaven fees in one table

From the Fees page:

| Item | Fee |
| --- | --- |
| Create a coin | Free |
| Protocol fee below $100k market cap | 1% |
| Protocol fee above $100k, community coin | 0.25% |
| Protocol fee above $100k, creator coin | 0.5% |
| Creator fee, community coin | 0.1% |
| Creator fee, creator coin | 1% |

Protocol fees go to Heaven's $LIGHT buyback flywheel. Heaven also says there are no LP fees for primary pool providers. For how this compares with other launchpads, see our [Heaven launchpad review](/articles/heaven-launchpad-review).

## Sniper resistance

The Pro Pools page compares pool types. Standard pools have a "6 second linear decay" for sniper resistance. Pro Pools let the creator set up to 42 slot-based fee brackets; Heaven's example charges 50% for roughly the first 2 seconds and 10% up to about 6 seconds. A decaying fee makes the earliest trades expensive. It does not stop bots outright.

## The API route

Developers can launch programmatically. Heaven's REST API at `tx.api.heaven.xyz` builds unsigned transactions that your app signs and submits. The [Create Pool Transaction](https://docs.heaven.xyz/api-reference/standard-pool-api/create-pool-transaction) endpoint creates a new Token-2022 mint, sets up metadata, creates the pool, sets it live and can run an initial buy, all in one transaction. Its request includes the payer, creator, name, symbol, metadata URI, config version, program ID, initial purchase amount and a lookup-table address Heaven specifies. Pro Pools are the route if you want to bring an existing SPL token or custom fees.

## Common mistakes

- **Picking Creator for a meme.** If review moves it to Community, 90% of the held fees go to the flywheel.
- **Expecting a migration.** There is no graduation event or new pool to watch for. The $100k cap is visual only.
- **Assuming a review is an endorsement.** Heaven says it is not.

## How Highbar compares

Highbar uses a different model. Per the [Highbar docs](/docs), every token starts on a Meteora Dynamic Bonding Curve and graduates at a target the creator picks (85, 150 or 250 SOL) into a Meteora DAMM v2 pool whose liquidity is locked forever.

- **Creator fees without review.** The creator earns 0.4%, 0.496% or 0.6% of each 1% curve trade by tier, and 0.6% to 0.7% of volume after graduation including the LP rebate.
- **Optional anti-sniper fee.** It starts at 25% and decays to about 1% over 60 seconds, and it is off by default. Like Heaven's, it raises the cost of early buys and does not stop bots or Jito bundles.
- **Dev buy cap.** Up to 20 SOL in the launch transaction, with an optional public Dev Lock afterwards.

Heaven is simpler if you want an instant AMM pool and are comfortable with a review deciding your creator fee. Highbar fits creators who want a graduation milestone and a creator share that does not depend on a review. Our earlier guide to [Meteora DAMM v2 graduation](/articles/meteora-damm-v2-explained-token-graduation) explains that model.

Compare tiers without signing on the [launch page](/launch), or trade from X with the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed). Re-read Heaven's live docs before you launch, since it says it is still tuning its parameters. This is not investment advice.
