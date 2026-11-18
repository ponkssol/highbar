---
title: "How to Launch a Solana Token From an X Post: The Extension Route, Step by Step"
slug: launch-solana-token-from-x-post
meta_description: "How launching a Solana token from a post on X works with the Highbar Chrome extension: what the listing says, the launch settings, fees and etiquette."
primary_keyword: launch solana token from x
secondary_keywords:
  - launch memecoin from twitter
  - create solana token from tweet
  - launch coin from x post
  - highbar chrome extension launch
  - tweet to token solana
date: 2026-11-18
publish_at: "2026-11-18T18:09:00+07:00"
faq:
  - question: "Can I launch a Solana token directly from a post on X?"
    answer: "With the Highbar Chrome extension, yes. Its Chrome Web Store listing says you can turn any post and its image into a coin launch on Highbar. The launch itself follows the same rules as the Highbar launch page."
  - question: "What settings do I choose when launching?"
    answer: "Per the Highbar docs: a name of up to 32 bytes, a ticker of up to 10 bytes, an image, optional links, a tier of 85, 150 or 250 SOL, whether the anti-sniper fee is on, and an optional dev buy of up to 20 SOL. Then you sign one transaction."
  - question: "Does the extension charge a fee?"
    answer: "The Highbar docs say extension transactions add 0.02% of the SOL amount, on top of the pool fee and Solana network fees. Trades on the website do not add it. The listing says fees are shown before every trade."
  - question: "Is it fine to launch a coin from someone else's post?"
    answer: "Be careful. A coin built on someone else's post, art or name can mislead buyers and may not be welcome. Do not imply that the author is involved unless they are."
---

A lot of Solana memecoins start as a post: a joke, an image, a phrase that catches on. The usual way to turn that into a coin is slow. You save the image, open a launchpad, retype the name, upload, configure and sign. The Highbar Chrome extension shortens that path by letting you start a launch from the post itself. This guide explains what the extension's listing says about launching from X, which settings you will choose, what it costs, and the etiquette worth following. It describes a tool. It is not advice to launch or buy anything.

## What the listing says

The extension is "Highbar – Trade Solana from X". Its [Chrome Web Store listing](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed), checked on 18 November 2026 at version 0.4.1, describes it as a way to trade and launch Solana tokens directly from posts on X, with wallets stored locally in the extension. The relevant features are:

- **Launch from a post:** turn any post and its image into a coin launch on Highbar.
- **Trade from X:** token chips on posts that mention a Solana contract address or cashtag, with a trade popup.
- **Multi wallet:** create or import several wallets stored locally.
- **Fast trades:** set your own priority fee and optionally a custom RPC.

The listing also says wallet keys are created and stored only on your device, fees are shown before every trade, and trading crypto is risky. Check the listing again when the version changes, since features can move between releases. Our earlier [guide to trading Solana from X](/articles/trade-solana-from-x-chrome-extension) covers the trading side and a safety checklist for any extension.

## What you are actually launching

A launch from the extension is a launch on Highbar, so it follows the rules in the [Highbar docs](/docs). Every token:

- Starts on its own Meteora Dynamic Bonding Curve, priced in SOL.
- Has a fixed 1,000,000,000 supply, 6 decimals, mint authority off and immutable metadata.
- Pays a 1% fee on every curve trade, shared by the creator, the platform and Meteora.
- Graduates into a Meteora DAMM v2 pool with permanently locked liquidity once it reaches its tier's target.

There is no team allocation and no presale. Immutable metadata means the name, ticker and image you pick cannot be changed later, so get them right before you sign.

## The settings, step by step

The Highbar docs list these launch fields for the launch page. A launch from a post is a launch on Highbar, so expect the same choices, and read what the extension shows before you sign. Here is what to decide.

### 1. Name and ticker

The name can be up to 32 bytes and the ticker up to 10 bytes. Emoji and some characters use more than one byte each, so a short-looking ticker can still be too long. Tickers are not unique across Solana, so expect others with the same one.

### 2. Image and links

The point of launching from a post is to use its image. Make sure it is an image you are entitled to use (see etiquette below). Add optional links, such as the post itself, so buyers can see where the idea came from.

### 3. Tier

Pick how high the bar is:

| Tier | Graduates at | Creator on the curve | Creator after graduation (incl. LP rebate) |
| --- | --- | --- | --- |
| Standard | 85 SOL | 0.4% | 0.6% |
| Higher | 150 SOL | 0.496% | 0.65% |
| Max | 250 SOL | 0.6% | 0.7% |

A higher target pays the creator a larger share per trade and leaves deeper liquidity at graduation, but takes more buying to reach. A token that never reaches it keeps trading on the curve.

### 4. Anti-sniper fee

Off by default. When on, the fee starts at 25% of the trade the moment the pool goes live and decays exponentially to about 1% after 60 seconds. It only makes early buys more expensive. It does not stop bots or Jito bundles, and it does not make a launch safe. A post that is already spreading may draw fast buyers, so think about it. Our [anti-sniper fee explainer](/articles/anti-sniper-fee-solana-token-launch) has the full decay table.

### 5. Dev buy

Optional, up to 20 SOL, placed in the same transaction that creates the pool, so you buy first. It pays the normal minimum fee, not the anti-sniper fee. It is real SOL at real risk, and anyone can see it on-chain.

### 6. Sign

You sign the launch transaction in your wallet. Per the docs, the token is live the moment it confirms. Keep some SOL beyond any dev buy for network fees and rent.

## What it costs

- **Curve trading fee:** 1% per trade, paid by traders, including you if you buy.
- **Extension fee:** per the Highbar docs, extension transactions add 0.02% of the SOL amount, rounded down to the nearest lamport, on top of the pool fee and network fees. Trades on the website do not add it.
- **Network fees and rent:** standard Solana costs.

The listing says fees are shown before every trade. That confirmation screen is the number to read.

## Etiquette: launching from someone else's post

Being able to launch from any post does not mean you should. A few rules of thumb:

- **Do not impersonate.** Do not name the coin, write the description or post about it in a way that suggests the author is behind it unless they are.
- **Respect artwork.** [Heaven's docs](https://docs.heaven.xyz/permissioned) describe the case of an artist whose viral image became a coin while she earned nothing from it. That is a real cost to a real person.
- **Say what it is.** If it is a community meme about a post, call it that.
- **Ask first when you can.** If the author wants to be involved, they can launch it themselves, and on Highbar the creator wallet is the one that earns creator fees.

## After the launch

Share the token page and the mint address, not just the ticker. Creator fees build up in the pool and you claim them from Portfolio, Claim fees, with the wallet you launched from. If you want to show commitment, the Dev Lock locks tokens permanently with a public countdown. For a broader walkthrough of the web flow, see [how to launch a Solana memecoin](/articles/how-to-launch-a-solana-memecoin).

## Summary

The Highbar extension lets you start a Solana token launch from a post on X. The launch follows Highbar's usual rules: a Meteora curve, three SOL targets, an optional anti-sniper fee, an optional dev buy of up to 20 SOL, fixed supply and immutable metadata. Extension transactions add a 0.02% fee. Use posts and images you are entitled to use, and be honest about what the coin is. Install from the [Chrome Web Store listing](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed), or use the [launch page](/launch) on the web. This is not investment advice.
