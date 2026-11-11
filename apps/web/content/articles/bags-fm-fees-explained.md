---
title: "Bags.fm Fees Explained: All 7 Fee Modes, Graduation Thresholds and Fee Sharing"
slug: bags-fm-fees-explained
meta_description: "Bags fm fees explained: Default 2% mode, Low Float, Drop Mode, 1% and ~0% modes, 85 SOL graduation, fee compounding, and how Highbar compares."
primary_keyword: Bags fm fees
secondary_keywords:
  - bags.fm fees
  - bags.fm review
  - bags fee share
  - bags launchpad graduation
  - bags vs Highbar
date: 2026-11-11
publish_at: "2026-11-11T16:44:00+07:00"
faq:
  - question: "What is the default fee on Bags?"
    answer: "Per Bags' docs, Default mode charges 2% on every trade before and after migration. Before migration it splits 1% platform and 1% to the fee claimers pool; after migration 25% of the fee is compounded into liquidity."
  - question: "When does a Bags token graduate?"
    answer: "SOL-quoted tokens graduate to a Meteora DAMM v2 pool at 85 SOL in most modes. Bags' docs list 80 SOL for Low Float and about 100 SOL for Drop Mode."
  - question: "Can I change my Bags fee mode after launch?"
    answer: "No. Bags' docs say the config type is set once when the fee share config is created and cannot be changed after the token launches."
  - question: "What is the Bags deployer share?"
    answer: "For new SOL fee-share v2 configs, the wallet that pays to create the config receives 25% of the gross claimers pool. The configured fee recipients split the remaining 75%."
  - question: "How do Highbar fees differ from Bags?"
    answer: "Highbar charges a flat 1% curve fee with a fixed creator share by tier, offers three graduation targets of 85, 150 or 250 SOL, and locks all DAMM v2 liquidity permanently. Bags offers more fee modes and flexible fee sharing."
---

Bags is one of the best-known launchpads built on Meteora, and people search for "bags fm fees" because the answer isn't one number: Bags offers seven fee modes for SOL launches, each with its own split and compounding. This guide lays them out from [Bags' own documentation](https://docs.bags.fm/how-to-guides/customize-token-fees) and compares them with Highbar, which also runs on Meteora DBC. We run Highbar, so we have kept to verifiable facts on both sides.

Checked on 11 November 2026. Bags notes that existing configs keep the terms they were created with, so older tokens can differ.

## How Bags is built

Bags' [program IDs page](https://docs.bags.fm/principles/program-ids) lists the Meteora Dynamic Bonding Curve program for token creation and the bonding curve, Meteora DAMM v2 for tokens after graduation, and Bags' own Fee Share programs for splitting and claiming fees. So the curve and the post-graduation pool are Meteora's, and the fee routing layer is Bags'. If you want the mechanics behind that, see our [Meteora DBC explainer](/articles/meteora-dynamic-bonding-curve-explained).

## The seven SOL fee modes

From Bags' [Customize Token Fees](https://docs.bags.fm/how-to-guides/customize-token-fees) page. "Creator" here means the gross claimers pool before the deployer deduction explained below.

| Mode | Pre-migration fee | Post-migration fee | Post-migration compounding | Graduates at |
| --- | --- | --- | --- | --- |
| Default | 2% (1% platform / 1% creator) | 2% (0.75% / 0.75%) | 0.5% (25% of fee) | 85 SOL |
| Low Float | 2% | 2% falling to 0.5% by market cap | 25% of fee | 80 SOL |
| Drop Mode | 2% | 2% | 25% of fee | About 100 SOL |
| ~0% Fee Mode | 1% | 0.25% | 50% of fee | 85 SOL |
| 1% Fee Mode | 0.25% | 1% | 50% of fee | 85 SOL |
| Price Mode | 2% | 2% | 25% of fee | 85 SOL |
| Paper Hand Tax Mode | 10% | 10% | 50% of fee | 85 SOL |

What makes each one different:

- **Default** is the flat 2% everyone starts with.
- **Low Float** locks 96% of supply, and after graduation the fee decays from 2% to a 0.5% floor as market cap grows to roughly 25 times its graduation value.
- **Drop Mode** locks 85% of supply with Default economics.
- **~0% Fee Mode** front-loads fees on the curve, then drops to 0.25%.
- **1% Fee Mode** does the opposite: cheap on the curve, 1% afterwards.
- **Price Mode** is Default with a total supply of 1,000 tokens.
- **Paper Hand Tax Mode** charges 10% on every trade, half of it compounded after graduation.

Bags is explicit that the mode is set once, when the fee share config is created, and **cannot be changed after launch**.

## Fee compounding

All seven SOL modes compound part of the post-migration fee back into the DAMM v2 pool's liquidity rather than paying it out. Default, Low Float, Drop Mode and Price Mode compound 25%; the other three compound 50%. Bags' rationale is deeper liquidity over time. The trade-off is that less of each fee reaches the platform and the claimers.

## Who actually gets the "creator" share

This is the detail most fee tables skip. Per Bags' [deployer fees page](https://docs.bags.fm/how-to-guides/deployer-fees), new SOL fee-share v2 configs give the **deployer**, the wallet that paid to create the config, **25% of the gross claimers pool**. The fee recipients you configure split the remaining 75%.

Bags' own example: with a 2% fee and no compounding, 1% goes to the platform, 0.25% to the deployer and 0.75% to the configured recipients. If the same wallet is both deployer and sole recipient, it gets the full 1%.

Recipients can be wallets or social accounts. Bags' launch guide shows fee claimers looked up by social username, and partners can take a share from the platform side without reducing the claimers pool.

## Bags vs Highbar

Both launch on Meteora DBC and graduate to DAMM v2, so the comparison is about configuration choices. Highbar numbers come from the [Highbar docs](/docs).

| | Bags (Default mode) | Highbar |
| --- | --- | --- |
| Curve fee | 2% | 1% |
| Creator on the curve | 1% gross claimers pool (deployer takes 25% of it) | 0.4%, 0.496% or 0.6% by tier |
| Post-graduation fee | 2%, 25% compounded | 1% DAMM v2 pool fee |
| Creator after graduation | 0.75% gross claimers pool | 0.6%, 0.65% or 0.7% of volume incl. LP rebate |
| Graduation target | 85 SOL (mode-dependent) | 85, 150 or 250 SOL by tier |
| Fee modes | 7 | 3 tiers × anti-sniper on/off |
| Fee sharing with other accounts | Yes, multiple claimers | Not offered in the docs; creator fees go to the launch wallet |
| Anti-sniper | No current mode uses a base-fee scheduler, per Bags' docs | Optional, 25% decaying to about 1% over 60 s |
| Liquidity | Per Meteora config; supply locks in Low Float and Drop Mode | All DAMM v2 liquidity locked forever |

Being fair:

- **Bags wins on flexibility.** Seven modes and multi-recipient fee sharing are things Highbar simply doesn't offer.
- **Highbar's trading fee is lower in Default terms.** A curve trade costs 1% on Highbar versus 2% in Bags' Default mode, although Bags' 1% Fee Mode charges only 0.25% on the curve.
- **Highbar lets the creator choose a higher graduation bar**, up to 250 SOL, which means deeper liquidity at migration if the token gets there.
- **Bags has much more activity** and an established brand.

On Highbar's anti-sniper fee: it makes early buys expensive, nothing more. Read our explainer on the [anti-sniper fee](/articles/anti-sniper-fee-solana-token-launch) for the decay table and its limits.

## Practical tips

1. Decide on the mode **before** creating the config; it's permanent.
2. Choose the config payer carefully, since that wallet becomes the deployer.
3. Model what traders pay, not just what you earn. A 10% fee mode earns more per trade but discourages trading.
4. Check older tokens individually; legacy configs keep their original terms.

## Bottom line

Bags fees range from 0.25% to 10% depending on mode, with Default at 2% on both sides of graduation, part of every post-migration fee compounded into liquidity, and a 25% deployer cut of the claimers pool on new configs. It's a flexible system if you read the docs closely. If you prefer a single 1% curve fee, three fixed graduation targets and permanently locked liquidity, compare Highbar's [docs](/docs) and [launch page](/launch), or try the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) to trade from X.
