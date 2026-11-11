---
title: "Meteora Launchpad Guide: How to Launch on Meteora DBC and Which Platform to Use"
slug: meteora-launchpad-platforms-compared
meta_description: "Is there a Meteora launchpad? How launching on Meteora DBC works, and how Bags, Jupiter Studio and Highbar configure it differently. Sourced comparison."
primary_keyword: Meteora launchpad
secondary_keywords:
  - Meteora DBC launchpad
  - Meteora token launchpad
  - launch token on Meteora
  - Meteora Solana launchpad
  - launchpads built on Meteora
date: 2026-11-11
publish_at: "2026-11-11T19:26:00+07:00"
faq:
  - question: "Does Meteora have its own launchpad?"
    answer: "Meteora provides the Dynamic Bonding Curve program and tools such as launch.meteora.ag and the Fun Launch scaffold for building launchpads. Most creators launch through a platform built on DBC, such as Bags, Jupiter Studio or Highbar."
  - question: "Where do Meteora DBC tokens graduate?"
    answer: "Meteora's docs say completed DBC curves migrate into Meteora DAMM v2 pools. DAMM v1 migration is deprecated for new configs and new pools."
  - question: "What does Meteora itself charge?"
    answer: "Per Meteora's protocol revenue page, the protocol takes 20% of DBC trading fees, with 80% shared between partner and creator. DBC also takes a fixed 0.2% protocol liquidity migration fee at graduation."
  - question: "Do all Meteora launchpads lock liquidity?"
    answer: "DBC requires at least 10% of migrated liquidity to stay locked at day 1. Beyond that, each launchpad's config decides. Highbar and Jupiter Studio both document permanently locked LP after graduation."
  - question: "How is Highbar configured on Meteora?"
    answer: "Highbar uses six fixed DBC configs: Standard 85 SOL, Higher 150 SOL and Max 250 SOL, each with the anti-sniper fee on or off. Tokens graduate into DAMM v2 with liquidity locked forever."
---

People search "Meteora launchpad" expecting a single website. In practice, Meteora is the engine and launchpads are the cars. Meteora's Dynamic Bonding Curve (DBC) program handles the curve, the fees and the migration; launchpads like Bags, Jupiter Studio and Highbar each wrap it in their own configuration and interface. [MemeSonar's DefiLlama-based tracker](https://memesonar.app/solana-launchpads) put Meteora DBC at 4.7% of Solana launchpad volume in the week to 9 November 2026, shared across platforms it lists as Bags, Believe and Jupiter Studio.

This guide explains how launching on Meteora works, what Meteora fixes for everyone, and how three launchpads configure it differently. We run Highbar, one of them.

Checked on 11 November 2026 against [Meteora's documentation](https://docs.meteora.ag/core-products/dbc/what-is-dbc).

## What Meteora provides

Per [Meteora's "What is DBC?" page](https://docs.meteora.ag/core-products/dbc/what-is-dbc), DBC is a permissionless token launch product. A **partner** (the launchpad) creates a config that defines the quote mint, curve, fees, token type, migration target and liquidity split. A **creator** launches a token from that config. Traders buy and sell against a virtual pool, and when the quote reserve hits the threshold, the launch graduates into a DAMM v2 pool.

For builders, Meteora offers [launch.meteora.ag](https://launch.meteora.ag) for setting up a DBC config key and an open-source [Fun Launch scaffold](https://docs.meteora.ag/invent/scaffold/fun-launch) for building a launchpad front end. That's why so many launchpads appear on DBC: much of the hard work is shared.

We covered the curve mechanics in depth in our [Meteora DBC explainer](/articles/meteora-dynamic-bonding-curve-explained). This article is about the platforms.

## What Meteora fixes for every launchpad

Some rules come from Meteora, whatever launchpad you use:

- **Protocol fee:** Meteora's [protocol revenue page](https://docs.meteora.ag/protocol/protocol-revenues) says 20% of DBC trading fees go to the protocol and 80% is shared between partner and creator according to the config.
- **Migration fee:** DBC applies a fixed **0.2% protocol liquidity migration fee** at graduation, separate from any partner or creator migration fee, per Meteora's [migration docs](https://docs.meteora.ag/core-products/dbc/migration-and-liquidity).
- **Graduation venue:** DAMM v2. DAMM v1 migration is deprecated for new configs and pools.
- **Minimum lock:** at least **10% of migrated liquidity** must stay locked at day 1, and vesting locks are capped at two years.
- **Curve design:** up to 16 curve segments, with fixed, linear or exponential fee schedulers available to partners.

Everything else, including the fee level, creator share, graduation target, anti-sniper settings and how much liquidity is locked, is the launchpad's choice.

## Three Meteora launchpads compared

| | Bags | Jupiter Studio | Highbar |
| --- | --- | --- | --- |
| Configs | 7 SOL fee modes | Meme mode + Custom mode | 6 fixed configs (3 tiers × anti-sniper on/off) |
| Curve fee | 2% in Default (0.25% to 10% by mode) | 1% or 2% | 1% |
| Creator share | 1% gross claimers pool in Default, 25% of it to the deployer | 50% of the fee | 0.4% to 0.6% of each trade by tier |
| Graduation | 85 SOL in most modes | Minimum 15,000 USDC raised | 85, 150 or 250 SOL |
| Quote asset | SOL, or custom quotes | USDC, SOL or JUP | SOL |
| Anti-sniper | No current mode uses a base-fee scheduler | Optional, 1–5 minutes | Optional, 25% to about 1% over 60 s |
| Post-graduation LP | Fees partly compounded into liquidity | All LP permanently locked | All LP locked forever |
| Source | [Bags docs](https://docs.bags.fm/how-to-guides/customize-token-fees) | [Jupiter Studio docs](https://docs.jup.ag/user-docs/launch/studio) | [Highbar docs](/docs) |

### Bags

Bags lists the Meteora DBC and DAMM v2 programs on its [program IDs page](https://docs.bags.fm/principles/program-ids) and layers its own Fee Share program on top. Its strength is fee routing: multiple claimers, social-account recipients and seven fee modes. The mode is permanent once set.

### Jupiter Studio

Studio's [user docs](https://docs.jup.ag/user-docs/launch/studio) describe a 50/50 fee split between creator and Jupiter for the token's whole life, optional anti-sniping in Custom mode, creator vesting of up to 80% of supply starting at graduation, and permanently locked LP. Every Studio token shows up on Jupiter's AlphaScan.

### Highbar

Highbar publishes all six of its DBC config addresses in its [docs](/docs), so anyone can open them on Solscan. The tiers:

| Tier | Target | Creator on curve | Locked LP to creator / platform |
| --- | --- | --- | --- |
| Standard | 85 SOL | 0.4% | 20% / 80% |
| Higher | 150 SOL | 0.496% | 40% / 60% |
| Max | 250 SOL | 0.6% | 50% / 50% |

After graduation, Highbar's DAMM v2 pool charges 1%, and with the creator LP rebate creators get 0.6% to 0.7% of post-migration volume. All liquidity is locked forever. Highbar doesn't run its own launchpad program and doesn't use a custom token contract. Tokens have 1,000,000,000 supply, mint authority off and immutable metadata. For what happens after migration, see [DAMM v2 explained](/articles/meteora-damm-v2-explained-token-graduation).

Honest caveat: Highbar is the smallest of the three by activity.

## How to launch on Meteora, step by step

Whichever platform you choose, the flow is similar:

1. **Choose the platform** based on the fee, target and tools you want.
2. **Connect a Solana wallet** on that platform's launch page.
3. **Enter token details**: name, ticker, image, links.
4. **Choose the configuration**: fee mode, tier or custom parameters.
5. **Decide on protection and allocation**: anti-sniper fee, vesting or a dev buy, where offered.
6. **Sign the transaction.** The DBC virtual pool goes live when it confirms.
7. **After graduation**, the token trades on Meteora DAMM v2, and fees follow the config.

On Highbar that looks like the [launch page](/launch): pick Standard, Higher or Max, toggle anti-sniper, optionally add a dev buy of up to 20 SOL, and sign.

## How to choose

- **Want fee sharing or exotic fee modes?** Bags.
- **Want vesting, USDC/JUP pairs or Jupiter visibility?** Jupiter Studio.
- **Want SOL pairs, a creator-chosen graduation bar and published configs?** Highbar.

And before buying any Meteora token, check its config and lock data on-chain. Shared infrastructure doesn't mean shared risk levels.

## Bottom line

There isn't one Meteora launchpad; there's one Meteora engine with many launchpads on top. Meteora fixes the protocol fee, the 0.2% migration fee, DAMM v2 graduation and a minimum lock. Each launchpad decides the rest. Compare their docs directly, and if Highbar's tiers fit, start with the [docs](/docs) or trade from X with the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed).
