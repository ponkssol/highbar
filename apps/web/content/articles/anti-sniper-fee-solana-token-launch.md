---
title: "Anti-Sniper Fees on Solana Token Launches: How a Decaying Fee Works"
slug: anti-sniper-fee-solana-token-launch
meta_description: "How an anti-sniper fee works on a Solana launch: a 25% start fee that decays to about 1% in 60 seconds, with a worked example and honest limits."
primary_keyword: anti-sniper fee Solana
secondary_keywords:
  - anti-sniper launch
  - decaying trading fee
  - early trading fee
  - Meteora fee scheduler
date: 2026-11-10
publish_at: "2026-11-10T16:00:00+07:00"
faq:
  - question: "What is an anti-sniper fee?"
    answer: "It is a trading fee that starts high when a pool goes live and decays quickly toward the normal fee. Buying in the first seconds costs far more than buying a minute later."
  - question: "How does Highbar's anti-sniper fee decay?"
    answer: "It starts at 25% of the trade and decays exponentially over 60 steps of 1 second each, with the fee dropping by 5.22% of its current value every second. After 60 seconds it is about 1%, the normal curve fee."
  - question: "Does the anti-sniper fee stop bots from buying?"
    answer: "No. It makes early buying more expensive, which reduces the early sniping advantage. Bots can still buy, and it does not promise any outcome for the token."
  - question: "Is the anti-sniper fee on by default?"
    answer: "No. It is off by default and the creator chooses it when launching. With it off, the fee is a flat 1% from the first trade."
  - question: "Does the creator's dev buy pay the anti-sniper fee?"
    answer: "No. The creator's dev buy in the launch transaction pays the normal minimum fee, not the anti-sniper fee."
---

The first seconds after a Solana token goes live are the most contested of its life. Automated buyers watch for new launches and try to get in before anyone else, at the lowest price on the curve. An anti-sniper fee is one tool a launchpad can use to change that contest. This article explains how a decaying fee works, shows Highbar's numbers and is candid about what it can and cannot do.

## The problem in one paragraph

On a bonding curve, early buyers get the lowest price. If a bot can buy in the first block or two, it can hold cheap supply and sell into the first real demand. That advantage comes from speed, not from judging the token. A flat 1% fee does nothing to change the economics: being first is nearly free.

## The idea: make being first expensive

An anti-sniper fee raises the cost of the earliest trades. The fee starts high when trading opens and decays toward the normal level. A buyer who rushes in at second zero pays a lot. A buyer who arrives a minute later pays the normal fee. The designers' goal is to reduce the payoff of pure speed.

Meteora's DAMM v2 documentation describes a related mechanism for pools after graduation: time-scheduler fees can start with a higher launch fee and reduce over time, either linearly or exponentially, which suits launches that need stronger early protection and then a gradual move toward normal trading. The same idea of a decaying fee is what Highbar exposes at the start of the bonding curve phase.

## How Highbar's anti-sniper fee works

According to the [Highbar docs](/docs), when the creator turns the option on:

- **Start fee:** 25% of the trade, the moment the pool goes live.
- **Decay:** exponential, over 60 steps of 1 second each. Every second the fee drops by 5.22% of its current value.
- **End fee:** about 1% after 60 seconds, which is the normal curve fee from then on.
- **Creator dev buy:** the dev buy in the launch transaction pays the normal minimum fee, not the anti-sniper fee.
- **Default:** off. With it off, the fee is a flat 1% from the first trade.

The trade panel on a token page shows the live fee while the decay is running, so traders can see what they would pay.

### The decay table

| Seconds after launch | 0s | 10s | 20s | 30s | 45s | 60s |
| --- | --- | --- | --- | --- | --- | --- |
| Trading fee | 25% | 14.63% | 8.56% | 5.01% | 2.24% | about 1% |

Notice the shape. Exponential decay drops fast early and flattens out. Most of the savings arrive in the first 20 to 30 seconds, and the last half of the window is a gentle slide to the normal fee.

## A worked example

To make the table concrete, here is plain arithmetic using the figures above (it is an illustration of the fee, not a forecast of anything):

- A 1 SOL buy at 0 seconds pays 25% as a fee, which is 0.25 SOL.
- The same 1 SOL buy at 10 seconds pays 14.63%, which is 0.1463 SOL.
- At 30 seconds it pays 5.01%, about 0.05 SOL.
- At 60 seconds it pays about 1%, about 0.01 SOL.

For a bot that depends on buying cheap and exiting quickly, a fee of that size in the first seconds eats into its margin. For an ordinary trader who shows up a minute later, the difference all but disappears.

## What it costs normal traders

Anti-sniper fees are not free of side effects. Anyone who buys in the first minute pays more, not just bots. A person who sees the launch at second 20 and buys immediately pays 8.56%. That is why the fee falls so quickly, and why Highbar describes the intention as making early sniping expensive while normal trading is not affected. It is also why the live fee display matters: you can wait a few seconds and pay less.

## What it does not do

It is important to be precise here, because overclaiming is common in this corner of crypto.

- **It does not stop bots.** A bot can still buy; it just pays more. Some will accept that cost if they expect the token to run.
- **It reduces the early sniping advantage.** That is the full extent of the claim.
- **It is not a guarantee of fair distribution or of any price outcome.** Who ends up holding supply depends on many things.
- **It does not cover the creator's own buy.** The dev buy pays the normal minimum fee. If a creator buys a large amount at launch, traders can see it, and should weigh that.
- **It does not replace research.** You still need to check holders, locks and the token page.

If a platform tells you its launches are immune to sniping, or that the fee is anti-bundle or bundle-proof, treat that as a red flag. For how those bots behave, see [sniper bots on Solana](/articles/sniper-bots-solana-memecoin-launches). A decaying fee changes incentives; it does not remove actors.

## Should a creator turn it on?

There is no single right answer. Some considerations:

1. **Do you want early trading to be more costly for bots?** If so, turning it on is the direct way.
2. **Do you want the lowest possible friction for early community members?** A flat 1% fee is simpler, and early supporters will not pay a premium.
3. **How will you share the launch?** If the token's launch time is public in advance, the first seconds are more competitive. If you announce afterward, there may be less to defend against.

On Highbar the choice is made at launch through one of six fixed Meteora DBC configs, three tiers each with anti-sniper on or off. You can see the option on the [launch page](/launch), where the form explains that with it off, early bots pay the normal 1% fee, and with it on, first-minute buys are taxed up to 25%.

## What traders can do

If you trade new tokens, a few habits help whether or not the fee is on:

- **Check the live fee** on the trade panel before buying in the first minute.
- **Do not chase the first second.** Waiting until the fee has decayed usually costs you only a few seconds of price movement.
- **Look at the early buyers** on a block explorer to see how the first transactions landed.
- **Size positions sensibly.** A new token can lose most of its value quickly regardless of fees.

If you follow new launches from your timeline, the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) puts a trade popup next to posts that mention a Solana token, but you should still check each token's fee and details yourself.

## Summary

A decaying anti-sniper fee turns a speed contest into a pricing decision. Highbar's version starts at 25%, falls by 5.22% of its current value each second and reaches about 1% after a minute. It is optional, off by default and honest about its limits: it reduces the early sniping advantage and nothing more. The full parameters are in the [Highbar docs](/docs).
