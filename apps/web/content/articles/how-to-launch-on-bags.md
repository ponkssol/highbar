---
title: "How to Launch on Bags: Official Token Launch v2, Fee Modes and the Deployer Share"
slug: how-to-launch-on-bags
meta_description: "How to launch on Bags from official docs: Token Launch v2, seven fee modes, the 25%\
  \ deployer share, and how Highbar's form compares."
primary_keyword: how to launch on Bags
secondary_keywords:
  - launch a token on bags.fm
  - Bags token launch v2
  - Bags fee share config
  - bags.fm graduation
  - Bags vs Highbar launch
date: 2026-11-20
publish_at: "2026-11-20T09:48:00+07:00"
faq:
  - question: "Can I change a Bags fee mode after launch?"
    answer: "No. Bags' fee-mode docs say the bagsConfigType is set when the fee-share config is\
  \ created and cannot be changed after the token is launched."
  - question: "Who is the deployer on a new Bags SOL fee-share v2 config?"
    answer: "The payer passed when the fee-share config is created. Official docs give that deployer\
  \ 25% of the gross claimers pool. A later launch wallet does not replace it."
  - question: "What is the usual Bags graduation target?"
    answer: "Most official SOL modes graduate at 85 SOL. Low Float graduates at 80 SOL and Drop\
  \ Mode at about 100 SOL. Custom-quote launches use a quote-denominated threshold\
  \ configured by Bags administrators."
  - question: "Does Highbar support Bags-style fee sharing?"
    answer: "No. Highbar uses a published 1% fee and a tiered creator share on a Meteora Dynamic\
  \ Bonding Curve, without a multi-claimer pool or a separate 25% deployer slice."
---

Bags documents token launches as a Token Launch v2 flow in its official [launch guide](https://docs.bags.fm/how-to-guides/launch-token) and [fee-mode guide](https://docs.bags.fm/how-to-guides/customize-token-fees), checked on 16 November 2026. This article is a checklist of those published steps and choices, not a rewrite of the SDK sample and not a promise that a token will graduate. If a line here disagrees with the live docs, the docs win.

Highbar is a separate Meteora launchpad with a simpler form at [Launch](/launch). It is described at the end so you can see the difference, not because it is a Bags substitute.

## Before you start

The official launch guide is written for the Bags TypeScript SDK. It expects:

- A Bags API key from the [Bags Developer Portal](https://dev.bags.fm).
- A Solana wallet with enough SOL to pay transaction costs.
- Token metadata (name, image, and the other fields the create-token-info step requires).
- A decision about fee claimers and, if you use one, a partner key.

The official sample stores a private key in a local environment file. That is a developer convenience, not a safety recommendation. Use a workflow you already trust to sign, and never paste a private key into a chat, a shared doc, or an untrusted script.

Token Launch v2 requires a fee-share configuration. The official example allocates the normal recipient pool to the creator by default and lets you share that pool with additional claimers.

## Choose the fee mode first

The fee mode is the decision that is hardest to undo. Official SOL modes, if you do not pass a `bagsConfigType`, default to **Default**: a flat 2% fee, 1% platform and 1% gross claimers before migration, then 25% compounding after migration, graduating at 85 SOL.

The other official SOL modes, in short:

| Mode | Pre- / post-migration fee | Graduation | Distinct rule |
| --- | --- | --- | --- |
| Default | 2% / 2% | 85 SOL | 25% compounding after migration |
| Low Float | 2% / 2% decaying to a 0.5% floor | 80 SOL | 96% of supply locked |
| Drop Mode | 2% / 2% | About 100 SOL | 85% of supply locked |
| ~0% Fee Mode | 1% / 0.25% | 85 SOL | 50% compounding after migration |
| 1% Fee Mode | 0.25% / 1% | 85 SOL | 50% compounding after migration |
| Price Mode | 2% / 2% | 85 SOL | 1,000-token supply |
| Paper Hand Tax | 10% / 10% | 85 SOL | 50% compounding after migration |

The "Creator" column in Bags' tables is the gross claimers pool. On new SOL fee-share v2 configs, the deployer receives 25% of that pool and the configured recipients split the remaining 75%. A partner share, when present, comes from the platform pool and does not reduce the claimers pool. Our [Bags.fm fees explainer](/articles/bags-fm-fees-explained) expands those splits.

For a non-WSOL quote, including supported stock tokens, Bags documents a separate custom-quote path. Those configs keep the selected type's fee rates but use a quote-denominated threshold and zero compounding. Drop Mode is unavailable for custom quotes. Read [Launch a Token with a Custom Quote](https://docs.bags.fm/how-to-guides/launch-token-non-sol-quote) if that is the job.

## The official v2 sequence

Bags' launch guide describes this order:

1. Create metadata (create-token-info).
2. Create the fee-share config, including claimers and the optional mode.
3. Get the token-creation transaction.
4. Sign the transaction.
5. Broadcast the transaction.

The payer on the fee-share config is the deployer. Official docs say a later launch wallet does not replace that payer, so choose it deliberately. Claimers' basis points still total 10,000, but they divide only the remaining 75% of the gross claimers pool. If you add more claimers than the non-lookup-table limit, the official SDK flow creates and extends lookup tables first.

The same guide mentions Jito tip helpers used by the sample. Those helper endpoints are, by Bags' own note, undocumented in that docs set, so this article does not treat them as a required step.

After the launch is confirmed, check the mint, the fee-share config and the live fee on a block explorer. The mode cannot be changed.

## Graduation, and what this checklist does not claim

When a SOL-quoted token raises its mode's threshold, official docs say it migrates to a Meteora DAMM v2 pool. That is a program event, not a promise of demand. See [Meteora's Dynamic Bonding Curve overview](/articles/meteora-dynamic-bonding-curve-explained) for the underlying mechanism, and always re-read Bags' live pages for the mode you signed.

Bags' current fee-mode docs also say no current config type uses a base-fee scheduler, so an `enableFirstSwapWithMinFee` flag has no effect today. Do not invent an anti-sniper window for Bags that the official page does not describe.

## How Highbar's launch differs

Highbar's path, per the [Highbar docs](/docs), is a website form: open [Launch](/launch), connect a wallet, add a name, ticker, image and optional links, pick Standard, Higher or Max (85, 150 or 250 SOL), optionally turn on the anti-sniper fee, optionally add a dev buy of up to 20 SOL, and sign. The curve fee is 1%. The creator earns 0.4%, 0.496% or 0.6% of each curve trade by tier. Liquidity is locked forever in two DAMM v2 positions after graduation. There is no Bags-style claimers pool and no seven-mode menu.

If Bags' fee sharing or mode menu is why you are here, stay on Bags and follow its official guide. If you wanted a simpler SOL-paired Meteora launch, Highbar is a different product you can compare, not a rename of Bags. The [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) is only relevant after you have already chosen Highbar.

Read [how to launch a Solana memecoin](/articles/how-to-launch-a-solana-memecoin) for the checks that apply on any venue: the mint, the program, the fee, and the destination pool.

Figures in this article were checked on 16 November 2026 against the official pages linked above.

Those pages change, so re-read them before you launch or trade, and do not treat this guide as a substitute for the live docs.
