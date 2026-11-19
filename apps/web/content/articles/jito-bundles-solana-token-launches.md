---
title: "Jito Bundles and Solana Token Launches: What a Bundled Launch Is and How to Spot One"
slug: jito-bundles-solana-token-launches
meta_description: "What Jito bundles are, why launch tools bundle a token's creation with buys, how to spot a bundled launch on-chain, and what anti-sniper fees cannot do."
primary_keyword: jito bundle token launch
secondary_keywords:
  - bundled launch solana
  - jito bundles explained
  - memecoin bundle check
  - solana launch bundle snipers
  - how to spot a bundled memecoin
date: 2026-11-19
publish_at: "2026-11-19T13:43:00+07:00"
faq:
  - question: "What is a Jito bundle?"
    answer: "Jito's documentation describes a bundle as a group of up to five transactions that execute sequentially and atomically, meaning all-or-nothing. Bundles compete for inclusion through tips paid to validators."
  - question: "What does a bundled launch mean for a memecoin?"
    answer: "It usually means the token's creation and one or more buys were submitted together, so they landed in the same block in a fixed order and nobody could trade in between. The buys can come from several wallets."
  - question: "Is every bundled launch a scam?"
    answer: "No. Launch tools use bundles so that creating a pool and a first buy cannot be split. The concern is undisclosed supply held across many wallets controlled by the same person, which a bundle makes easy to set up."
  - question: "Does an anti-sniper fee stop bundles?"
    answer: "No. Highbar's optional anti-sniper fee starts at 25% and decays to about 1% over 60 seconds, and it is off by default. It only makes early buys more expensive. It does not stop bots or Jito bundles, and Highbar does not describe it as a defense against coordinated buying inside the launch block."
---

"Was it bundled?" is now one of the first questions asked about a new Solana memecoin. The phrase refers to **Jito bundles**, a way of submitting several transactions so they land together. This guide explains how bundles work, why launch tools use them, how to look for a bundled launch on-chain, and what launchpad features can and cannot do about it.

We run Highbar, a Solana launchpad. This is an educational guide, not trading advice, and it does not accuse any specific token or team.

## What a Jito bundle is

Jito runs a block engine that many Solana validators connect to. Its [low-latency transaction docs](https://docs.jito.wtf/lowlatencytxnsend/) describe bundles in a few lines:

- A bundle is a group of transactions, **at most five**.
- The transactions execute **sequentially and atomically**, which Jito describes as all-or-nothing.
- Bundles compete against other bundles on **tips** to the validator, and the tips are redistributed to validators and their stakers.
- Traders submit bundles to block engines, which simulate them and forward the most profitable combinations to validators.
- Jito enforces a **minimum tip of 1,000 lamports** for bundles and notes that, in busy periods, that minimum may not be enough.

So a bundle is not a hack. It is a public, documented tool, also used for arbitrage and for making sure a multi-step action either fully happens or does not happen at all.

## Why token launches get bundled

A launch involves at least two steps: create the token and its pool, then buy. If those steps travel separately, a bot watching for new pools can slip a buy in between. Bundling the steps removes the gap.

You can see this in official developer material. Raydium's LaunchLab [code demos](https://docs.raydium.io/products/launchlab/code-demos) describe an "optional first buy in the same bundle" and warn that the create transactions must be executed in order. Bags' [launch guide](https://docs.bags.fm/how-to-guides/launch-token) builds its launch from "bundle transactions" with a shared blockhash. StonkFun's [developer page](https://www.stonkfun.xyz/developers) tells builders they can construct a launch with "your own bundle." On Highbar, the [docs](/docs) say an optional dev buy of up to 20 SOL "goes into the same transaction that creates the pool, so you buy first." That is one transaction, not a multi-wallet bundle, and it is visible on the token. It does not stop other wallets from bundling their own buys in the same block.

## When a bundled launch becomes a problem

Because a bundle can hold up to five transactions, and each transaction can carry several instructions, one person can create a token and buy from a handful of wallets in the same block, in a fixed order, before anyone else can act. On-chain, those wallets look like separate early buyers. If the creator controls all of them, a large share of supply sits with one party while the holder list looks spread out.

That is the real concern behind the question. A bundle is the mechanism; **undisclosed concentrated supply** is the risk. A creator who openly buys at launch and says so is in a very different position from one who hides the same buys across ten fresh wallets.

## How to spot a bundled launch

No single signal proves anything, so look for several together:

1. **Same block as creation.** Open the token's first transactions on an explorer. Several buys landing in the same slot as the pool creation suggest a bundle or very fast bots.
2. **Fresh wallets.** Early buyers whose wallets were created minutes before launch and have no other history.
3. **Shared funding.** Early wallets that were all funded from the same source shortly before launch.
4. **Matching sizes.** Buys of identical or neatly stepped amounts.
5. **Coordinated exits.** Those same wallets selling together later.
6. **Holder share.** Add up what the first-block wallets still hold. A high combined share matters more than how the buys arrived.

Third-party holder-clustering tools can speed this up, but read their methods; they infer links and can be wrong. For the broader pre-trade review, our guide on [sniper bots on Solana](/articles/sniper-bots-solana-memecoin-launches) covers bot-like buying patterns in more detail.

## Bundles vs snipers: different problems

- A **sniper** is someone else racing to buy first after your token appears.
- A **bundle** lets a creator, or anyone who sees the launch transaction early, place buys in the same block as creation.

Tools aimed at one do not fix the other. A delay or a decaying fee affects trades after a pool opens; it does not reach inside a bundle that created the pool. Some launchpads also restrict how much one wallet can buy early. Those caps are per wallet, and a bundle can use several wallets.

## What anti-sniper fees can and cannot do

Highbar's optional [anti-sniper fee](/articles/anti-sniper-fee-solana-token-launch) starts at 25% of a trade when the pool goes live and decays exponentially to about 1% after 60 seconds. It is off by default. It only makes those earliest buys more expensive. It does not stop bots or Jito bundles. The docs also say the creator's dev buy in the launch transaction pays the normal minimum fee, not the anti-sniper fee.

Highbar does not describe this fee as a defense against coordinated buying inside the launch block, and it is not one. A buyer willing to pay the fee can still buy, and nothing in a fee schedule can tell whether five wallets belong to one person. Jupiter Studio's docs describe a similar idea, an anti-sniping fee that starts at 99% and decreases over one to five minutes; it, too, is a cost, not a block.

## If you are launching: be transparent

- **Disclose your buy.** Say how much you bought and from which wallet.
- **Use one wallet.** Spreading a dev buy across many wallets is exactly what makes a launch look bundled.
- **Consider a public lock.** Highbar's Dev Lock uses Jupiter Lock, an on-chain escrow; locks are permanent and show a countdown on the token page.
- **Turn on the anti-sniper fee if you want early bots to pay more**, knowing what it does not do.

You can see every launch setting before signing on the [launch page](/launch). If you trade from your timeline, the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) shows fees before every trade; it does not analyse bundles for you.

## Summary

Jito bundles group up to five transactions that land together, in order, or not at all. Launch tools use them for legitimate reasons, and the same mechanism lets a creator spread early buys across several wallets in the launch block. Check the first block, wallet ages, funding sources and combined holdings before you trade. Anti-sniper fees make the first seconds expensive; they do not detect or stop bundled buying, and no launchpad setting can ensure a fair distribution.
