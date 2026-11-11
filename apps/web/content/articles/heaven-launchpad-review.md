---
title: "Heaven Launchpad Review: No Bonding Curve, Permissioned Creator Fees and How Highbar Compares"
slug: heaven-launchpad-review
meta_description: "Heaven launchpad on Solana reviewed from its docs: no bonding curve, virtual SOL pools, creator vs community fees, and how Highbar compares."
primary_keyword: Heaven launchpad Solana
secondary_keywords:
  - Heaven launchpad
  - heaven.xyz review
  - Heaven launchpad fees
  - Heaven AMM no bonding curve
  - Heaven vs Highbar
date: 2026-11-11
publish_at: "2026-11-11T20:52:00+07:00"
faq:
  - question: "What is Heaven?"
    answer: "Heaven describes itself as an AMM and launchpad on Solana. Launches trade on Heaven's own AMM from the start, using virtual SOL instead of a bonding curve that later migrates."
  - question: "Does Heaven have a bonding curve?"
    answer: "No. Per Heaven's docs, each pool behaves as though it were seeded with 35 SOL of virtual SOL, which sets a floor no one can sell into. There is a virtual migration cap at $100k market cap for charting tools, but no actual migration."
  - question: "What are Heaven's fees?"
    answer: "Heaven's fees page lists free coin creation, a 1% protocol fee below $100k market cap, then 0.25% for community coins or 0.5% for creator coins. Creator fees are 1% for creator coins and 0.1% for community coins."
  - question: "What are Heaven's creator and community coins?"
    answer: "Deployers choose a category. Creator coins go through review after passing $100k in volume and, if approved, earn a 1% creator fee. Community coins skip review and earn 0.1%. Tokens judged to be scams have creator fees redirected to $LIGHT buybacks."
  - question: "How is Highbar different from Heaven?"
    answer: "Highbar uses a Meteora bonding curve that graduates at 85, 150 or 250 SOL into a Meteora DAMM v2 pool with permanently locked liquidity, and pays creators a fixed share by tier without a review step."
---

Heaven takes a different route from almost every other Solana launchpad: it skips the bonding curve. Instead of a curve that graduates to a separate pool, tokens trade on Heaven's own AMM from the first block, propped up by "virtual SOL". It also decides who earns creator fees through a review process. This review explains how Heaven works using [Heaven's documentation](https://docs.heaven.xyz/intro), then compares it with Highbar, the Meteora-based launchpad we run.

Checked on 11 November 2026. Heaven's docs say it is still experimenting with some parameters, so check the live docs.

## What Heaven is

Heaven's [about page](https://docs.heaven.xyz/about) calls it "an AMM and launchpad designed to house great ideas on Solana". Three ideas define it:

1. **No bonding curve.** Tokens trade on Heaven's AMM immediately.
2. **Standardised launches.** Every launch uses the same parameters; only the logo, name, ticker, description and links change.
3. **Permissioned creator fees.** Anyone can launch, but creator fees above a small base rate depend on a review.

Launches are free and, per Heaven's [permissionless page](https://docs.heaven.xyz/permissionless), take under five seconds.

## How "no bonding curve" works

Heaven's [curve page](https://docs.heaven.xyz/curve) explains the mechanism. Each pool behaves algorithmically as though it were seeded with **35 SOL**, even though launching is free. Nobody can sell into that virtual SOL, so it acts as a floor. Because the pool already has working depth, there is no need to migrate to another AMM later.

Heaven still shows a **virtual migration cap at $100k** market cap so tools like Axiom Pulse or Photon's memescope can display tokens in a familiar way, but trading never moves venues. The docs also include a table of how the liquidity-to-market-cap ratio thins as a pool grows, and note that Heaven is still experimenting with the starting virtual SOL amount.

For comparison with the curve model, our [Meteora DBC explainer](/articles/meteora-dynamic-bonding-curve-explained) covers how a traditional bonding curve and migration work.

## Heaven's fees

From Heaven's [fees page](https://docs.heaven.xyz/fees):

### Protocol fees

| Action | Fee |
| --- | --- |
| Create a coin | Free |
| Trading below $100k market cap | 1% |
| Community coin above $100k | 0.25% |
| Creator coin above $100k | 0.5% |

### Creator fees

| Coin type | Creator fee |
| --- | --- |
| Community | 0.1% |
| Creator | 1% |

Heaven says all protocol fees go to its "god flywheel", which its docs describe as using 100% of protocol revenue to buy back and burn its token, $LIGHT. That is Heaven's stated policy, not a price promise.

## Permissioned creator fees, explained

This is Heaven's most distinctive and most debated feature. Per its [permissioned fees page](https://docs.heaven.xyz/permissioned):

- The deployer chooses **Creator** or **Community** at launch.
- **Community** launches skip review and earn a 0.1% creator fee.
- **Creator** launches get an "In review" tag once they pass $100k in volume. The 1% creator fee is held by the contract during review.
- After review, a coin is grouped as **Creator** (1% fee released), **Community** (90% of fees collected so far go to the flywheel, 10% to the deployer, and 0.1% from then on) or **Blocked** (creator fees go to $LIGHT buybacks).

Heaven is explicit that "Creator" status is **not a safety check or stamp of approval**. It only means the team saw proof that the deployer is who they claim to be. Heaven also describes routing creator fees to the real artist when someone else launches a coin based on their work.

The trade-off is clear: it filters out fee-farming on copycat coins, but it means a platform admin decision affects a creator's income.

## Pro Pools and sniper resistance

Heaven's [Pro Pools](https://docs.heaven.xyz/pro-pools) let established projects bring an existing token and their own liquidity, with configurable creator, LP and reflection fees, market-cap fee brackets, and slot-based fees for sniper resistance. The same page lists standard pools as having a **6-second linear decay** for sniper resistance.

## Heaven vs Highbar

| | Heaven | Highbar |
| --- | --- | --- |
| Model | Own AMM, virtual SOL, no migration | Meteora DBC curve → Meteora DAMM v2 |
| Launch cost | Free | No separate launch fee listed in the docs; optional dev buy up to 20 SOL |
| Customisation | Same parameters for every standard launch | 3 tiers × anti-sniper on/off |
| Trading fee | 1% protocol below $100k, plus creator fee | 1% on the curve, 1% in the DAMM v2 pool |
| Creator fee | 1% (approved creator) or 0.1% (community) | 0.4% to 0.6% on the curve, 0.6% to 0.7% after graduation |
| Creator review | Yes, above $100k volume for Creator coins | No review; fixed by tier |
| Sniper resistance | 6-second linear decay on standard pools | Optional fee, 25% to about 1% over 60 s |
| Liquidity | Virtual SOL floor in Heaven's AMM | Real liquidity locked forever in DAMM v2 |

Highbar facts are from the [Highbar docs](/docs). A few honest takeaways:

- **Heaven's no-migration model is genuinely different.** There's no graduation cliff, and tokens never change venue. If that appeals, Highbar doesn't offer it.
- **Creator economics.** An approved Heaven creator coin can earn a 1% creator fee, higher than Highbar's per-trade share. But it depends on review. Highbar's shares are fixed by tier and need no approval.
- **Liquidity.** Heaven's floor is virtual SOL inside its AMM. Highbar's graduated pools hold real SOL raised on the curve, locked forever in DAMM v2 positions. See [DAMM v2 explained](/articles/meteora-damm-v2-explained-token-graduation).
- **Anti-sniper.** Both have a decaying early fee. Neither makes a launch safe from bots or bundles.

## Who Heaven suits

Heaven suits creators who like a single standard launch format, want to skip the curve-and-migrate step, and are comfortable with an admin review deciding their creator fee. Highbar suits creators who want to choose a graduation target, want their creator share fixed in advance, and want real locked liquidity after graduation, while accepting a much smaller audience.

## Bottom line

Heaven reimagines the launchpad as a single AMM with a virtual SOL floor and reviewed creator fees. It's coherent and clearly documented, with real trade-offs. Read its docs before launching or trading. To compare, see Highbar's [docs](/docs), the tier preview on the [launch page](/launch), or the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) for trading from X.
