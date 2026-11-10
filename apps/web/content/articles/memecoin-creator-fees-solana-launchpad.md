---
title: "How Creator Fees Work on a Solana Launchpad (and How to Claim Them)"
slug: memecoin-creator-fees-solana-launchpad
meta_description: "Creator fees on a Solana launchpad explained: curve fees, migration fees, LP fees and the creator rebate, with the exact tier tables and how to claim."
primary_keyword: Solana launchpad creator fees
secondary_keywords:
  - memecoin creator fees
  - claim creator fees Solana
  - launchpad fee split
  - creator LP rebate
date: 2026-11-10
publish_at: "2026-11-10T18:15:00+07:00"
faq:
  - question: "How much of the curve fee does a creator get on Highbar?"
    answer: "Every curve trade pays a 1% fee. Meteora keeps 20% of it (0.2% of the trade), and the rest is split between the creator and the platform by tier: Standard 0.4% creator, Higher 0.496% creator, Max 0.6% creator."
  - question: "Is there a fee when a token graduates?"
    answer: "Yes, by tier. Standard and Higher charge a 1% migration fee taken from the SOL raised, and Max charges none. Only on Higher does the creator get a share, 50% of that fee."
  - question: "What is the creator LP rebate?"
    answer: "After migration the platform forwards a fixed part of its own LP fees to the token's creator. With it, creators end up with 0.6% on Standard, 0.65% on Higher and 0.7% on Max of post-migration volume."
  - question: "How do I claim my fees?"
    answer: "Open Portfolio and Claim fees, connect the wallet you launched with, sign a short free message to prove it is your wallet, and claim one token or all of them."
  - question: "Are creator earnings guaranteed?"
    answer: "No. Fees come only from trading volume. A token with no trading earns no fees, and nothing here is a promise or forecast."
---

When people ask why a launchpad token's creator keeps a project alive, the answer is often fees. Creator fees are the direct mechanism that connects trading activity to the person who launched the token. This guide explains where they come from on Highbar, how they differ by tier and how creators claim them. The numbers are taken from the [Highbar docs](/docs). They describe how the fee mechanics work, not what any token will earn.

## Four places fees come from

A token launched on Highbar can generate creator fees in up to four ways:

1. **Trading fees on the bonding curve**, paid out in SOL.
2. **A share of the migration fee**, once the token has graduated (Higher tier only).
3. **LP fees from the creator's locked DAMM v2 position** after migration.
4. **The creator LP rebate**, which the platform pays out of its own LP fees after migration.

All of these depend on trading volume, apart from the one-time migration fee on Higher, which depends on the token graduating. If nobody trades a token, there are no fees.

## Fees on the bonding curve

Every trade on the curve pays a 1% fee. Meteora keeps 20% of it, which is 0.2% of the trade. The rest is split between the creator and the platform according to the tier.

| Tier | Creator on the curve | Platform on the curve | Meteora |
| --- | --- | --- | --- |
| Standard | 0.4% | 0.4% | 0.2% |
| Higher | 0.496% | 0.304% | 0.2% |
| Max | 0.6% | 0.2% | 0.2% |

The Higher tier looks unusual because of how the split is stored on-chain. According to the docs, it is stored as 62% of the non-Meteora fee, because the program only accepts whole numbers, which gives the creator 0.496% of every trade.

To see what the percentages mean in practice, here is plain arithmetic, not a forecast. If a Standard token saw 100 SOL of trading volume on its curve, the creator's 0.4% share of those trades would be 0.4 SOL. On Max the same volume would give 0.6 SOL. Real volume can be far higher or lower, and many tokens see very little.

Traders never pay an extra app fee on top of the 1% curve fee.

## The migration fee

When the token reaches its target and graduates, a migration fee is taken from the SOL raised.

| Tier | Migrates at | Migration fee | Creator share of it |
| --- | --- | --- | --- |
| Standard | 85 SOL | 1% (0.85 SOL) | 0% |
| Higher | 150 SOL | 1% (1.5 SOL) | 50% |
| Max | 250 SOL | 0% | 0% |

On Higher, half of the migration fee goes to the creator, which is 0.75 SOL. On Standard and Max the creator gets no share of it.

## Fees after migration

After graduation the token trades in a [Meteora DAMM v2](/articles/meteora-damm-v2-explained-token-graduation) pool. The pool charges a 1% fee on every trade. Meteora keeps 20% of it (0.2% of the trade), and the remaining 0.8% goes to the locked LP positions. The liquidity is split into two permanent positions, one for the creator and one for the platform.

| Tier | Locked LP to creator | Locked LP to platform |
| --- | --- | --- |
| Standard | 20% | 80% |
| Higher | 40% | 60% |
| Max | 50% | 50% |

Because LP fees follow the position NFT, whoever holds the creator's position can claim its fees. The liquidity itself stays locked.

### The creator LP rebate

Highbar's platform shares most of its own LP fees with the creator. Each time the platform claims the fees on its locked position, it forwards a fixed part of that SOL to the token's creator. The on-chain pool and LP split do not change, and the rebate is paid on top.

| Tier | Rebate of platform LP fees | Creator LP share | Creator total | Platform | Meteora |
| --- | --- | --- | --- | --- | --- |
| Standard | 68.75% | 0.16% | 0.6% | 0.2% | 0.2% |
| Higher | 68.75% | 0.32% | 0.65% | 0.15% | 0.2% |
| Max | 75% | 0.4% | 0.7% | 0.1% | 0.2% |

Shares are of post-migration volume. The rebate goes to the creator's wallet automatically, with nothing to sign. Payouts start at 0.01 SOL, and smaller amounts carry over to the next payout.

## Choosing a tier with fees in mind

Fees are one input to the tier decision, and probably not the most important one. A few honest considerations:

- **Higher tiers pay creators a bigger share per trade** but ask the community to push the curve further before graduation.
- **A token that does not graduate never reaches the post-migration fees.** The migration target is a real hurdle.
- **Volume is what matters.** A modest share of a busy token beats a large share of a quiet one.
- **Do not pick a tier only for the fee.** A target the community cannot reach leaves you with a curve and no pool.

The [launch page](/launch) shows the creator fee, post-migration creator share, migration fee and market cap at migration for each tier before you sign.

## How to claim your fees

Your share of trading fees builds up on-chain, in the pool itself. You claim it yourself, whenever you like:

1. Open **Portfolio**, then **Claim fees**.
2. Connect the wallet you launched with.
3. Sign a short free message to prove it is your wallet.
4. Claim one token or all of them.

Curve fees are paid in SOL. Your share of the migration fee is claimable once the token has graduated (Higher tier only), and LP fees from your locked position follow the position NFT.

## Transparency and checking the numbers

Fee flows are meant to be checkable. Highbar's docs state that every payout, buyback and burn links its Solana transaction, and the [Open Book](/open-book) lists fee flows across tokens, reconciled against chain. You can compare the docs' numbers with what you see on-chain, which is the safest way to evaluate any launchpad's fee claims.

## What to remember

Creator fees reward activity, not intention. They can be meaningful for a token with sustained volume and negligible for one without. Nothing in this article is a forecast, and no creator should treat fees as guaranteed income. If you are thinking about launching, read the [docs](/docs) first, test the tiers in the form and, if you want to launch from a post you see on X, take a look at the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed).
