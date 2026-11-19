---
title: "How Much Does It Cost to Launch a Memecoin on Solana? Network Fees, Rent and Platform Fees (2026)"
slug: solana-memecoin-launch-cost
meta_description: "What launching a Solana memecoin really costs: base and priority fees, account rent, and creation fees on pump.fun, Moonshot, Studio, Heaven and Highbar."
primary_keyword: cost to launch a memecoin on solana
secondary_keywords:
  - how much does it cost to create a solana token
  - solana token creation fee
  - memecoin launch cost
  - solana rent token account
  - free memecoin launch solana
date: 2026-11-19
publish_at: "2026-11-19T16:20:00+07:00"
faq:
  - question: "How much SOL do I need to launch a memecoin?"
    answer: "On most launchpads, only enough for network fees and the rent deposits for the accounts the launch creates, plus any first buy you choose to make. Jupiter's docs put a Studio launch at less than 0.05 SOL in total; pump.fun says it charges no platform fee to create a coin."
  - question: "Is any Solana launchpad free?"
    answer: "Several say they charge no creation fee: pump.fun, Heaven and Boop's website flow, per their docs. You still pay Solana's network fee and account rent. Moonshot is the exception among those we checked, with a $10 creation fee payable only in USDC."
  - question: "What is rent on Solana?"
    answer: "A deposit that keeps an account alive. Solana's docs give the minimum balance as (account size + 128) × 3,480 lamports per byte-year × 2 years. For a 165-byte token account that is 2,039,280 lamports, about 0.002 SOL."
  - question: "Is the dev buy part of the launch cost?"
    answer: "Only if you choose one. A dev buy is a trade, not a fee: you receive tokens for it, and it pays the normal trading fee. On Highbar it is optional and capped at 20 SOL."
---

"How much does it cost to launch a memecoin on Solana?" has a short answer and a long one. The short answer: on most launchpads, a few thousandths to a few hundredths of a SOL, plus whatever you decide to buy yourself. The long answer depends on three layers, which this guide separates: Solana's own network fees, account rent, and the launchpad's creation fee, if it has one.

We run Highbar, a Solana launchpad. Figures below come from official docs read on 19 November 2026, and none of this is advice to launch or buy a token.

## Layer 1: Solana network fees

Every transaction pays a fee in SOL. Solana's [fee documentation](https://solana.com/docs/core/fees) splits it into two parts:

- **Base fee:** 5,000 lamports (0.000005 SOL) per signature. Half is burned and half goes to the validator.
- **Prioritization fee (optional):** compute unit price × compute unit limit ÷ 1,000,000, in lamports, all of it to the validator. It raises the chance your transaction is scheduled ahead of others.

A launch usually takes one transaction, sometimes a few, with two or three signatures each (your wallet, the new mint, sometimes a platform signer). The base fee is therefore tiny. Priority fees and, if your tool uses them, Jito tips are where launch transactions can get more expensive during busy periods. Jito's docs set a minimum tip of 1,000 lamports for bundles.

## Layer 2: rent for new accounts

Creating a token creates accounts: the mint, its metadata, the pool and its vaults, and token accounts. Each must hold a minimum balance. Solana's [accounts documentation](https://solana.com/docs/core/accounts) gives the formula:

> minimum balance = (account size + 128) × 3,480 lamports per byte-year × 2 years

For example, the SPL Token docs show that a token account is 165 bytes. That gives (165 + 128) × 3,480 × 2 = **2,039,280 lamports, about 0.002 SOL**. Larger accounts, such as pool state, need more. You don't calculate this yourself; your wallet shows the total before you approve.

Who pays the rent varies by platform. Jupiter's [Studio launch guide](https://docs.jup.ag/user-docs/launch/studio/launching-a-token) is unusually clear: the launch transaction is "the network fee plus the rent of the accounts the launch creates, less than 0.05 SOL in total," and you need that SOL even when the quote token is USDC or JUP.

## Layer 3: launchpad creation fees

| Launchpad | Creation fee per its docs | Notes |
| --- | --- | --- |
| Pump.fun | None, "for any pairing" | You pay the network fee and "the small SOL deposit the network requires" |
| Moonshot | $10 | Payable only in USDC, per its troubleshooting page |
| Jupiter Studio | No separate fee stated | Network fee plus rent, under 0.05 SOL |
| Heaven | Free | "Every token launch on Heaven is free," per its permissionless page |
| Boop.fun | Free (website flow) | Its deployment guide says creation starts "for free" |
| StonkFun | Launch fee on its API path | Its developer page says building the launch yourself has no launch fee, only Solana's costs |
| Highbar | No creation fee in its fee tables | Fee tables cover the curve, migration and post-migration fees |

Sources: pump.fun [fees](https://pump.fun/docs/fees), Moonshot [troubleshooting](https://support.moonshot.com/coins/create/troubleshooting), Heaven [permissionless launches](https://docs.heaven.xyz/permissionless), Boop [token deployment](https://docs.boop.fun/token-deployment-101), StonkFun [developers](https://www.stonkfun.xyz/developers) and the [Highbar docs](/docs). On Highbar, the docs list the 1% curve fee, the migration fee taken from SOL raised at graduation, and post-migration pool fees. The launch steps end with "Sign the transaction in your wallet," so the network fee and account rent appear in your wallet's confirmation, not as a separate Highbar charge.

## The optional costs that dwarf the fees

**The dev buy.** A first buy is not a fee; you get tokens for it. But it is usually the largest number in a launch. On Highbar it is optional, capped at 20 SOL, placed in the same transaction that creates the pool, and pays the normal fee rather than the anti-sniper fee. On pump.fun, the fees page says the first purchase made in the app when creating a coin carries the 0.45% app platform fee introduced on 17 October 2026.

**Trading fees on your own buy.** Whatever the curve fee is (1% on Highbar, 1.25% on pump.fun's curve, 2% on Bags' Default mode), your dev buy pays it too.

**Locks and extras.** Highbar's Dev Lock, which uses Jupiter Lock, shows a small protocol tip in SOL before you sign. Promotion, artwork and community management are real costs that no launchpad lists.

## Fees you don't pay upfront

Graduation costs are usually taken from the curve, not from your wallet. Pump.fun charges 0.015 SOL at graduation, deducted from the curve for SOL-paired coins. Highbar takes a 1% migration fee from the SOL raised on Standard (0.85 SOL) and Higher (1.5 SOL, half of which goes to the creator), and none on Max. These matter for how much liquidity reaches the pool, not for what you need in your wallet on launch day.

## A realistic budget

For a launch with no first buy on a launchpad without a creation fee, keep about **0.05 SOL** in the wallet to cover network fees, rent and a modest priority fee, which matches the ceiling Jupiter documents for Studio. Add the full amount of any dev buy, plus its trading fee. On Moonshot, have $10 in USDC as well. Always read your wallet's final number before approving. If it is far above what you expected, stop and check what you are signing.

## How to launch on Highbar

Open the [launch page](/launch), connect your wallet, add a name (up to 32 bytes), a ticker (up to 10 bytes) and an image, pick a tier (85, 150 or 250 SOL target), choose whether to turn on the optional anti-sniper fee, add a dev buy if you want one, and sign. That fee starts at 25% and decays to about 1% over 60 seconds, is off by default, and only makes early buys more expensive. It does not stop bots or Jito bundles. Our step-by-step guide to [launching a Solana memecoin](/articles/how-to-launch-a-solana-memecoin) covers each field. For other platforms' trading fees, see [pump.fun fees explained](/articles/pump-fun-fees-explained) and the [best Solana launchpad comparison](/articles/best-solana-launchpad-2026). The [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) can also start a launch from a post on X; it adds 0.02% of the SOL amount on extension transactions.

## Summary

Launching a memecoin on Solana is cheap in fees and expensive only in what you choose to buy. Network fees are fractions of a cent per signature, rent deposits are a few thousandths of a SOL per account, and most launchpads charge no creation fee at all. Moonshot's $10 USDC fee is the main exception we found. Budget around 0.05 SOL plus any dev buy, read the wallet confirmation, and remember that a cheap launch does not make anyone want to buy the token.
