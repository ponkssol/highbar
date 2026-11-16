---
title: "Highbar vs Bags: Two Meteora Launchpads Compared for Creators, Fee Sharing and Graduation"
slug: highbar-vs-bags
meta_description: "Highbar vs Bags: fee modes vs fixed tiers, fee sharing with up to 100 earners, graduation targets, locked liquidity and anti-sniper options compared."
primary_keyword: highbar vs bags
secondary_keywords:
  - bags vs highbar
  - bags fm alternative
  - bags.fm comparison
  - bags fee sharing vs highbar
  - meteora launchpad comparison bags
date: 2026-11-16
publish_at: "2026-11-16T17:36:00+07:00"
faq:
  - question: "Are Bags and Highbar built on the same infrastructure?"
    answer: "Yes. Bags' program IDs page lists Meteora DBC for the curve and Meteora DAMM v2 after graduation, plus its own Fee Share programs. Highbar also launches on Meteora DBC and graduates to DAMM v2."
  - question: "Can I share creator fees with other people?"
    answer: "On Bags, yes. Its launch guide allows up to 100 fee earners per token, identified by wallet or by X, Kick or GitHub account. Highbar's docs do not offer fee sharing; creator fees go to the wallet that launched the token."
  - question: "Which charges less on the curve?"
    answer: "In Bags' Default mode a curve trade pays 2%; its 1% Fee Mode charges 0.25% on the curve and 1% after. Highbar charges 1% on the curve and 1% in the DAMM v2 pool after graduation."
  - question: "Does Bags have an anti-sniper fee?"
    answer: "Bags' fee docs say no current config type uses a base-fee scheduler. Highbar offers an optional fee that starts at 25% and decays to about 1% over 60 seconds, which reduces the early advantage but does not stop bots."
---

Bags and Highbar look alike from a distance. Both launch tokens on Meteora's Dynamic Bonding Curve and graduate them to Meteora DAMM v2. The differences are in what each platform builds on top: how fees are set, who can receive them, how high the graduation bar is and whether there is an anti-sniper option. We run Highbar. This comparison sticks to [Bags' documentation](https://docs.bags.fm/how-to-guides/customize-token-fees) and the [Highbar docs](/docs), and says where Bags is the better fit.

Checked on 16 November 2026. Bags notes that existing configs keep the terms they were created with.

## Highbar vs Bags in one table

| | Bags | Highbar |
| --- | --- | --- |
| Curve | Meteora DBC | Meteora DBC |
| After graduation | Meteora DAMM v2 | Meteora DAMM v2, liquidity locked forever |
| Fee setup | 7 SOL fee modes, set once | 3 tiers × anti-sniper on/off (6 fixed configs) |
| Default curve fee | 2% | 1% |
| Default post-graduation fee | 2%, 25% compounded into liquidity | 1% |
| Graduation target | 85 SOL in most modes | 85, 150 or 250 SOL |
| Fee sharing | Up to 100 earners, wallets or social accounts | Not offered; fees go to the launch wallet |
| Deployer share | 25% of the gross claimers pool on new configs | n/a |
| Anti-sniper | No current mode uses a base-fee scheduler | Optional, 25% → about 1% over 60 s |
| Custom quote tokens | Supported, including stock tokens | SOL only |

## What they share

Bags' [program IDs page](https://docs.bags.fm/principles/program-ids) lists Meteora DBC for token creation and the curve, Meteora DAMM v2 after graduation, and Bags' own Fee Share programs. Highbar has no launchpad program of its own; every launch uses one of six fixed DBC configs whose addresses are published in its docs. So the curve math and the graduated pool type are Meteora's on both. Our [Meteora DBC explainer](/articles/meteora-dynamic-bonding-curve-explained) covers that shared base.

## Where Bags is stronger

### Fee sharing with collaborators

Bags' [launch guide](https://docs.bags.fm/how-to-guides/launch-token) says Token Launch v2 requires a fee-share configuration, allows up to 100 fee earners per token, and lets you identify earners by X, Kick or GitHub account as well as by wallet. If you are launching with a team, an artist or a streamer, that is a real advantage. Highbar does not offer it.

### More fee modes

Bags offers seven SOL fee modes, from a 0.25% curve fee in its 1% Fee Mode to 10% in Paper Hand Tax Mode. Modes such as Low Float lock most of the supply. The mode is fixed once the config is created. Our [Bags fees explainer](/articles/bags-fm-fees-explained) lays out every mode.

### Custom quote tokens

Bags documents launching on a bonding curve with a custom quote, including supported stock tokens. Highbar pairs every token with SOL.

### Audience and tooling

Bags has an established brand, an SDK and a developer portal for programmatic launches. Highbar is new and much smaller.

## Where Highbar is different

### A single, lower default fee

A curve trade on Highbar pays 1%, with Meteora keeping 0.2% and the rest split by tier. Bags' Default mode charges 2% on the curve. Highbar's docs state that traders never pay an extra app fee on top of the 1% on the website.

### A graduation bar the creator chooses

| Highbar tier | Graduates at | Approx. market cap at migration | Creator's share of locked LP |
| --- | --- | --- | --- |
| Standard | 85 SOL | 420.75 SOL | 20% |
| Higher | 150 SOL | 742.5 SOL | 40% |
| Max | 250 SOL | 1,250 SOL | 50% |

A higher target means deeper liquidity at migration if the token gets there, and a harder climb. Most Bags modes graduate at 85 SOL; Low Float uses 80 SOL and Drop Mode about 100 SOL.

### Locked liquidity with a creator position

On Highbar, DAMM v2 liquidity is locked forever in two permanent positions, one for the creator and one for the platform. The creator's position earns LP fees, and the platform forwards a creator LP rebate on top, so creators receive 0.6%, 0.65% or 0.7% of post-migration volume. Our [DAMM v2 guide](/articles/meteora-damm-v2-explained-token-graduation) explains what locked liquidity does and does not mean.

### An optional anti-sniper fee

Bags' fee docs say no current config type uses a base-fee scheduler. Highbar offers one as an option: the fee starts at 25% and decays exponentially to about 1% over 60 seconds, with the creator's dev buy paying the normal fee. It only makes the earliest buys more expensive. It does not stop bots or Jito bundles.

## Creator earnings side by side

| | Bags (Default mode) | Highbar |
| --- | --- | --- |
| On the curve | 1% gross claimers pool | 0.4%, 0.496% or 0.6% by tier |
| After graduation | 0.75% gross claimers pool | 0.6%, 0.65% or 0.7% incl. LP rebate |
| Deductions | Deployer takes 25% of the gross claimers pool on new configs | None; creator wallet receives its share |

Per Bags' [deployer fees page](https://docs.bags.fm/how-to-guides/deployer-fees), if the deployer and the sole recipient are the same wallet, it receives the full claimers pool. Bags' per-trade creator share is higher in Default mode, but traders also pay twice the curve fee. Which matters more depends on how much your token trades.

## How launching works on each

**Bags:** through the Bags app, or programmatically with an API key, metadata, a fee-share config and a signed launch transaction, per its launch guide.

**Highbar:** open the [launch page](/launch), connect a wallet, add a name, ticker, image and optional links, pick a tier, choose anti-sniper on or off, optionally add a dev buy of up to 20 SOL and sign. Every token has a fixed 1,000,000,000 supply, mint authority off and immutable metadata.

## Which should you choose?

- **Choose Bags** if you want to share fees with collaborators, need a custom quote token or a special fee mode, or want an SDK and an established audience.
- **Choose Highbar** if you want a 1% curve fee, a graduation target of 85, 150 or 250 SOL, a locked creator LP position and an optional anti-sniper fee, and you are launching from your own wallet.

Neither platform can make a token succeed. Read the live docs before you sign, and if you trade from X, see the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed).
