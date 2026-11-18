---
title: "How to Claim Creator Fees on a Solana Launchpad: Curve Fees, LP Fees and Rebates Explained"
slug: claim-creator-fees-solana-launchpad
meta_description: "How creator fees are claimed on Solana launchpads: curve fees, migration fees, locked LP fees and rebates, plus Highbar's claim flow step by step."
primary_keyword: claim creator fees solana
secondary_keywords:
  - how to claim creator fees
  - claim memecoin creator rewards
  - meteora dbc claim creator fees
  - damm v2 lp fees creator
  - creator lp rebate
date: 2026-11-18
publish_at: "2026-11-18T20:53:00+07:00"
faq:
  - question: "How do I claim creator fees on Highbar?"
    answer: "Open Portfolio, then Claim fees. Connect the wallet you launched with, sign a short free message to prove it is your wallet, then claim one token or all of them. Per the Highbar docs, fees build up on-chain in the pool until you claim."
  - question: "What fees can a Highbar creator claim?"
    answer: "Trading fees from the bonding curve, paid in SOL; the creator's share of the migration fee on the Higher tier; and LP fees from the creator's locked DAMM v2 position after migration. The creator LP rebate is paid automatically, with nothing to sign."
  - question: "Who can claim LP fees from a locked position?"
    answer: "The Highbar docs say LP fees follow the position NFT, so whoever holds it can claim. Keep the wallet that holds it secure."
  - question: "Is the creator LP rebate the same as LP fees?"
    answer: "No. LP fees come from the creator's own locked position. The rebate is a fixed part of the platform's LP fees that the platform forwards to the creator each time it claims. Payouts start at 0.01 SOL and smaller amounts carry over."
---

Launching a token is one transaction. Getting paid for it is an ongoing process that many creators only look at weeks later. Creator fees on Solana launchpads come from several places, they accrue in different accounts, and some are claimed by hand while others arrive on their own. This guide explains the common fee sources, how other launchpads describe claiming, and the exact flow on Highbar. It is about mechanics. Fees only exist if people trade, and nothing here predicts income.

## Where creator fees come from

Most launchpads pay creators from one or more of these:

1. **Curve trading fees.** A share of each trade while the token is on its bonding curve.
2. **Migration fees.** A share of a one-time fee taken when the token graduates, on some platforms.
3. **Post-graduation trading fees.** A share of each trade in the pool the token moves into, either as a fixed fee split or as LP fees from a liquidity position the creator owns.
4. **Rebates or forwards.** Payments the platform makes to the creator out of its own share.

Some of these accrue in the pool and need a claim transaction. Others are pushed to the creator's wallet. Knowing which is which saves a lot of confusion.

## How other launchpads describe claiming

Each platform's own pages, read on 18 November 2026:

| Launchpad | How creator fees reach the creator |
| --- | --- |
| Jupiter Studio | Connect the deployer wallet on the Studio token page and press the claim button |
| Moonshot | Sent hourly once the unpaid balance exceeds $1 |
| Bags | Creator and deployer balances read and claimed through separate endpoints |
| Heaven | Creator coins can claim ongoing after review; Community coins claim a 0.1% share |
| Float (builder launch) | Paid to the fee wallet whenever anyone cycles fees on the coin page |

Sources: [Studio graduation and fees](https://docs.jup.ag/user-docs/launch/studio/graduation-and-fees), [Moonshot creator fees](https://support.moonshot.com/coins/create/creator-fees), [Bags deployer fees](https://docs.bags.fm/how-to-guides/deployer-fees), [Heaven permissioned fees](https://docs.heaven.xyz/permissioned), [Float docs](https://www.floatlaunch.xyz/docs).

Two details are worth noting. Bags separates the deployer's 25% share of the claimers pool from the normal recipients, and its docs say creator claim endpoints cover the normal recipient portion only. Float's builder fee wallet is chosen at launch and cannot be changed. In both cases, the wallet you pick at setup matters long after launch.

## Highbar's creator fees

Per the [Highbar docs](/docs), a Highbar creator can receive four kinds of payment.

### 1. Curve trading fees

Every curve trade pays 1%. Meteora keeps 0.2%, and the creator's share depends on the tier:

| Tier | Graduates at | Creator on the curve |
| --- | --- | --- |
| Standard | 85 SOL | 0.4% |
| Higher | 150 SOL | 0.496% |
| Max | 250 SOL | 0.6% |

These are paid out in SOL and accrue on-chain in the pool until you claim.

### 2. Migration fee share (Higher only)

When a token graduates, a migration fee is taken from the SOL raised: 1% (0.85 SOL) on Standard, 1% (1.5 SOL) on Higher and 0% on Max. Only on Higher does the creator get a share: half, which is 0.75 SOL. It becomes claimable once the token has graduated.

### 3. LP fees from the locked position

At graduation the pool moves into a Meteora DAMM v2 pool whose liquidity is locked forever, split into a creator position and a platform position. The creator owns 20% on Standard, 40% on Higher and 50% on Max. The pool charges 1% per trade; Meteora keeps 0.2% and 0.8% goes to the locked positions in proportion. The docs note that these LP fees follow the position NFT, so whoever holds it can claim. Our [DAMM v2 explainer](/articles/meteora-damm-v2-explained-token-graduation) covers position NFTs in more depth.

### 4. Creator LP rebate

After migration, the platform shares most of its own LP fees with the creator. Each time the platform claims fees on its locked position, it forwards a fixed part to the token's creator:

| Tier | Rebate of platform LP fees | Creator total after migration |
| --- | --- | --- |
| Standard | 68.75% | 0.6% |
| Higher | 68.75% | 0.65% |
| Max | 75% | 0.7% |

The rebate is sent automatically to the creator wallet, with nothing to sign. Payouts start at 0.01 SOL, and smaller amounts carry over to the next payout. The on-chain pool and LP split do not change; the rebate is paid on top.

## How to claim on Highbar, step by step

1. **Open Portfolio, then Claim fees.**
2. **Connect the wallet you launched with.** The docs tie the claim to that wallet.
3. **Sign a short, free message.** This proves the wallet is yours. It is not a transaction and costs nothing.
4. **Claim one token or all of them.** The claim itself is an on-chain transaction, so keep a little SOL for network fees.

You can claim whenever you like. Fees wait in the pool until you do.

## Good habits

- **Launch from a wallet you will keep.** The launch wallet is the one that claims. A burner you later lose access to means unclaimed fees you cannot reach.
- **Protect the position NFT's wallet.** Post-graduation LP fees follow the NFT. If it moves, the right to claim moves with it.
- **Check transactions yourself.** Claims and rebate payouts are Solana transactions you can open on an explorer.
- **Keep records.** Fee income may have tax consequences where you live. That is a question for a local adviser.
- **Do not plan around a number.** Creator fees depend on volume, and volume can fall to nothing.

For a comparison of creator fee models across launchpads, see our [memecoin creator fees guide](/articles/memecoin-creator-fees-solana-launchpad).

## Summary

Creator fees come from the curve, sometimes a migration fee, the pool after graduation, and on some platforms a rebate. On Highbar, curve fees, the Higher-tier migration share and locked LP fees are claimed from Portfolio, Claim fees with the launch wallet, after a free signed message. The creator LP rebate arrives on its own once it reaches 0.01 SOL. Read the full tables in the [docs](/docs), launch from the [launch page](/launch), or start from a post on X with the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed). This is not investment advice.
