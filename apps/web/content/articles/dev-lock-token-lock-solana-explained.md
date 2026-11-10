---
title: "Dev Lock on Solana: How Creator Token Locks and Vesting Work"
slug: dev-lock-token-lock-solana-explained
meta_description: "What is a dev lock? How creator token locks and linear vesting work on Solana with Jupiter Lock, how to read one, and what a lock does not prove."
primary_keyword: dev lock Solana
secondary_keywords:
  - token lock Solana
  - Jupiter Lock
  - token vesting
  - creator token lock
date: 2026-11-10
publish_at: "2026-11-10T19:00:00+07:00"
faq:
  - question: "What is a Dev Lock?"
    answer: "It is a way for a token's creator to lock their own tokens on-chain until a chosen date, optionally followed by linear vesting. On Highbar it uses Jupiter Lock, an on-chain escrow."
  - question: "Can a Dev Lock be cancelled?"
    answer: "No. According to the Highbar docs, locks are permanent and nobody, including the creator, can cancel a lock or change who receives the tokens."
  - question: "How long can a lock last?"
    answer: "The lock API accepts an unlock time between one minute and ten years from now, and a vesting length of 0 to 3650 days after that. The form on the token page currently asks for a whole number of days from 1 to 3650 and creates a lock that unlocks all at once."
  - question: "Does a Dev Lock mean a token is safe?"
    answer: "No. It shows that specific tokens are locked until a date. It says nothing about other wallets, demand or price."
  - question: "Where can I see locks?"
    answer: "Locked tokens show a Dev locked badge with a live countdown on the token page, in token lists and on the leaderboard. Every lock has a public page, and all locks are listed on the Highbar Locks page."
---

When a creator launches a token, the first question traders ask is often about the creator's own holdings. How much do they have? Could they sell it all tomorrow? A token lock is one answer to that question that does not depend on trust: it moves tokens into an on-chain escrow with a public unlock date. This guide explains how locks and vesting work, how Highbar's Dev Lock operates and, importantly, what a lock cannot tell you.

## Why locks exist

A creator who holds a large share of a token can sell it at any moment, which leaves other holders exposed. A promise to hold is only words. A lock turns the promise into a rule enforced by a program: the tokens cannot move until the date passes.

Locks do not make a token valuable, and a creator who locks tokens has not removed other risks. They simply make one specific kind of commitment visible and verifiable.

## How Highbar's Dev Lock works

According to the [Highbar docs](/docs), Dev Lock lets creators lock their own tokens to show they are in it for the long run. Locks use Jupiter Lock, an on-chain escrow, and they are permanent: nobody, including the creator, can cancel a lock or change who receives the tokens.

The steps are:

1. **Open your token and press Dev Lock.** Only the wallet that created the token sees the button.
2. **Enter the amount and the schedule.** The API accepts an unlock between one minute and ten years from now, plus optional linear vesting of up to 3650 days. The form on the token page currently asks for a whole number of days from 1 to 3650 and sends no vesting, so those tokens unlock together.
3. **Confirm you understand the lock cannot be undone, then sign.** A small protocol tip in SOL is shown before you sign.

Once the unlock date passes, the creator opens the token and uses Claim unlocked. With vesting, tokens release step by step after the unlock date, and the creator can claim whatever has released so far.

### Cliff versus vesting

It helps to picture the schedule:

- **A plain lock** keeps every locked token untouchable until the unlock date, then makes them all claimable at once.
- **A lock with linear vesting** keeps tokens locked until the unlock date, then releases them gradually over the vesting period. A longer vesting period means a slower release into the market.

Both are visible on the lock's public page, so a trader can see the amount, the date and the schedule before buying.

## Where locks show up

Highbar displays locks in several places:

- A **Dev locked** badge on the token page, in token lists and on the leaderboard, with a live countdown to the unlock date.
- A **public page for every lock**, which anyone can share.
- The [Locks](/locks) page, which lists all locks.

That makes it easy to scan for tokens whose creators have made a visible commitment, and to compare commitments across tokens.

## How to read a lock

When you see a Dev locked badge, ask a few practical questions:

1. **How much is locked?** Compare the locked amount with the token's total supply. Every Highbar token has a fixed supply of 1,000,000,000, so you can work out the share yourself. A tiny lock is a gesture; a large one is a commitment.
2. **When does it unlock?** A lock that ends next week says something different from one that ends in a year.
3. **Is there vesting?** Gradual release after the unlock is generally gentler on the market than a single large unlock.
4. **Who holds the rest?** A lock covers only the tokens that were locked. The creator or others may hold more elsewhere.
5. **What did the creator buy?** On Highbar there is no team allocation or presale. Creators get tokens only by buying them, like everyone else, so a dev buy and a lock are connected: the dev buy is how a creator holds anything to lock.

## What a lock does not prove

Locks are useful and often misunderstood. A Dev Lock does not mean:

- **The token is safe.** It addresses one specific risk, the creator selling the locked tokens early.
- **The creator holds nothing else.** Other wallets can hold supply.
- **Demand exists.** A token can be locked and still trade near zero.
- **The creator will stay involved.** A lock keeps tokens in place, not a person.
- **Liquidity is handled.** Liquidity locking is separate. On Highbar, graduated pools hold their liquidity in permanently locked positions, and that is a different mechanism from a creator's own token lock.

Use the lock as one data point among several.

## Should a creator lock tokens?

A lock is a choice, not an obligation. Some considerations:

- **It signals commitment.** A public countdown shows the community you cannot sell before a given date.
- **It is permanent.** You cannot cancel it, so lock only what you are certain you will not need before the date.
- **It pairs well with honesty.** A lock backed by a clear explanation of your plans means more than a lock alone.
- **It does not require a large amount.** Locking a portion of your tokens is still visible and verifiable.

If you are unsure, start with a smaller lock and a date you are comfortable with. Because locks cannot be cancelled, decide on the amount and schedule before you sign.

## Locks and the rest of a token's design

Dev Lock is one piece of Highbar's launch design, alongside optional anti-sniper fees, tiered migration targets and locked liquidity after graduation. You can see the whole structure in the [docs](/docs) and on the [launch page](/launch). For traders, locks work best as part of a wider routine of checking holders, liquidity and the token's page.

## Summary

A Dev Lock turns a creator's promise to hold into an on-chain escrow with a public date. On Highbar it uses Jupiter Lock, it is permanent, and it shows up as a badge, a public page and an entry on the Locks page. It tells you something real about the locked tokens and nothing about price or demand. If you follow new tokens from X, the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) puts a trade popup next to posts, but checking a token's locks and holders is still your job.
