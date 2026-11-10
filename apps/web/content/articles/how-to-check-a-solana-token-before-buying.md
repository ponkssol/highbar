---
title: "How to Check a Solana Token Before Buying: A Practical Checklist"
slug: how-to-check-a-solana-token-before-buying
meta_description: "A practical checklist for checking a Solana token before buying: contract address, mint authority, supply, liquidity, holders, locks and early buyers."
primary_keyword: how to check a Solana token before buying
secondary_keywords:
  - Solana token checklist
  - check mint authority
  - memecoin due diligence
  - verify token contract address
date: 2026-11-10
publish_at: "2026-11-10T19:45:00+07:00"
faq:
  - question: "What is the first thing to check on a new Solana token?"
    answer: "The contract address. Tickers and names are not unique, so confirm the mint address against an official source such as the project's own page before anything else."
  - question: "What is mint authority and why does it matter?"
    answer: "Mint authority is the permission to create more tokens. If it is still active, supply can be increased. On Highbar, mint authority is off for every token, so no new tokens can ever be minted."
  - question: "Does locked liquidity make a token safe?"
    answer: "No. Locked liquidity means the liquidity cannot be withdrawn. It does not protect the price, and it says nothing about holder concentration or demand."
  - question: "Can this checklist guarantee a token is trustworthy?"
    answer: "No. It helps you spot warning signs and verify basic facts. New tokens remain risky and you can lose all the money you put in."
  - question: "Is a mint address ending in high proof that a token is from Highbar?"
    answer: "No. When Highbar's vanity mint pool has a key, the address ends in high. If the pool is empty, the launch uses a normal mint that does not. Anyone can also grind an address with the same ending. Confirm the token on its page at highbar.capital."
---

Every day, new Solana tokens appear faster than anyone can read about them. Most traders cannot research each one at length, but a short, repeatable checklist catches a surprising number of problems. This guide gives you one you can run in a few minutes, with notes on what each check tells you and what it does not. It is educational, not investment advice, and no checklist makes a new token safe.

## Step 1: Confirm you have the right contract address

The most common mistake is buying the wrong token. Names and tickers are not unique on Solana, so many tokens share the same ones. Before anything else:

- Get the mint address from an official source, such as the project's own page or its verified links.
- Compare it character by character with the address you are about to trade.
- Be wary of addresses copied from replies and comments.

On Highbar, every token has its own page at /token/ followed by its mint. Vanity mints end in "high" when the mint pool can supply one. A fallback mint does not, and an address that merely ends in those four letters is not proof it was launched here, so confirm the token on the site itself.

## Step 2: Look at the token's basic design

Open the mint on a block explorer such as Solscan and check:

- **Total supply and decimals.** Is the supply fixed and reasonable, and does it match what the project says?
- **Mint authority.** If it is still active, someone can create more tokens. If it has been turned off, no new tokens can be minted.
- **Freeze authority.** If a token has one, the holder of it may be able to freeze accounts. Check whether it is set.
- **Metadata.** Immutable metadata cannot be changed later; mutable metadata can.

For reference, every token launched on Highbar has a fixed supply of 1,000,000,000, 6 decimals, mint authority off and immutable metadata, according to the [Highbar docs](/docs). The docs do not say anything about freeze authority, so check that field on the explorer yourself for any token. Basic design facts are useful because they are easy to verify, but they are only one layer.

## Step 3: Understand where it trades and how deep the liquidity is

Find out whether the token is still on a bonding curve or has graduated to a pool.

- **On a curve:** the progress bar shows how much SOL the curve holds compared to its target. Price moves with each buy and sell.
- **In a pool:** check the pool's liquidity compared with the size of the trade you intend to make. A thin pool means large price impact.

Ask who holds the liquidity. On Highbar, a token that reaches its target graduates into a Meteora DAMM v2 pool, and the docs state the liquidity there is locked permanently in two positions, one for the creator and one for the platform. That removes the possibility of those parties withdrawing it, but it does not make the pool deep or the price stable. For more detail see the [Highbar docs](/docs).

## Step 4: Check who holds the supply

Open the holder list. Look for:

- **Concentration.** A few wallets holding a large share can move the price on their own.
- **Clusters.** Several holders funded from the same source may be one actor.
- **The creator's holdings.** How much do they hold, and have they locked any of it?

Holder maps and explorers can show relationships between wallets. They are hints, not verdicts: a team can use several wallets for a disclosed allocation.

## Step 5: Check for locks and vesting

If the creator has locked tokens, find out how much, until when and whether there is vesting. On Highbar, a locked token shows a Dev locked badge with a live countdown, every lock has a public page and all locks are listed on the [Locks page](/locks). A lock tells you about the locked tokens only. A small lock next to a large unlocked holding says something different from a large lock with vesting.

## Step 6: Look at the early buyers

The first minutes of a token's life often shape who holds the cheapest supply. Check:

- Whether many buys landed in the first block or two.
- Whether early wallets are new and share a funding source.
- Whether early buyers have already sold.

If the token had an anti-sniper fee, bot-like buyers paid more to get in, which reduces the early sniping advantage but does not remove it. See our [overview of sniper bots](/articles/sniper-bots-solana-memecoin-launches) for what to look for.

## Step 7: Read the creator and the project

- **Links.** Does the token page link to a real website and social accounts? Are they consistent?
- **History.** Has the creator wallet launched other tokens, and what happened to them?
- **Claims.** Treat promises about price, listings or partnerships as unverified until you see evidence you can check yourself.

A project's honesty about what it cannot promise is often a better signal than its enthusiasm.

## Step 8: Check fees and the cost of trading

Know what a trade costs before you press the button. On Highbar, every curve trade pays a 1% fee, shared by the creator, the platform and Meteora, with no extra app fee on top. If anti-sniper is on, the fee starts at 25% and decays to about 1% over 60 seconds, and the trade panel shows the live fee. Slippage settings and priority fees add to the cost on any platform.

## Step 9: Decide your size and your exit

The checklist cannot tell you whether to buy. It can only reduce surprises. Then decide:

1. **How much you can afford to lose.** New tokens can lose most of their value quickly.
2. **What your plan is.** Decide how you will handle price moves before you are in a trade, not during.
3. **Whether you want to buy at all.** Skipping is a valid decision.

## Quick checklist

1. Contract address confirmed from an official source.
2. Supply, mint authority, freeze authority and metadata checked.
3. Curve or pool status understood, with liquidity compared with your trade size.
4. Holder concentration and clusters reviewed.
5. Locks and vesting reviewed, if any.
6. Early buyers examined.
7. Creator, links and claims checked.
8. Fees and slippage understood.
9. Position size set to an amount you can lose.

## What this checklist cannot do

It cannot predict price, detect every bad actor or make a token safe. Locked liquidity, fixed supply and an off mint authority are structural facts. They are worth checking, and they leave plenty of risk in place. If you trade from X, the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) puts a trade popup beside posts, which makes this checklist more important rather than less. To launch your own token with clearly documented mechanics, start at the [launch page](/launch).
