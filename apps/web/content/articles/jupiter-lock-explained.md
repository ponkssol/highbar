---
title: "Jupiter Lock Explained: How Solana Token Locks, Cliffs and Vesting Work for Memecoin Dev Locks"
slug: jupiter-lock-explained
meta_description: "What Jupiter Lock is, how cliffs and vesting work, how to verify a dev lock on Solana, and how Highbar's Dev Lock uses it. Plain-language guide."
primary_keyword: jupiter lock
secondary_keywords:
  - jupiter lock solana
  - jup lock vesting
  - dev lock solana
  - lock tokens solana
  - memecoin dev lock
date: 2026-11-23
publish_at: "2026-11-23T14:02:00+07:00"
faq:
  - question: "What is Jupiter Lock?"
    answer: "Jupiter's docs describe Jupiter Lock as an open-source, audited and free tool to lock and distribute tokens over time on Solana. Its program ID is LocpQgucEQHbqNABEYvBvwoxCPsSbG91A1QaQhQQqjn and its interface is at lock.jup.ag."
  - question: "Who audited Jupiter Lock?"
    answer: "Jupiter's Lock overview says it was audited twice, by OtterSec and Sec3. Jupiter's audits page links the reports."
  - question: "What is a cliff and what is vesting?"
    answer: "A cliff is the date before which nothing can be claimed. Vesting is how the locked tokens release after that, for example step by step over a number of days."
  - question: "How does Highbar's Dev Lock use Jupiter Lock?"
    answer: "Highbar's docs say Dev Lock uses Jupiter Lock as an on-chain escrow. Locks are permanent: nobody, including the creator, can cancel a lock or change who receives the tokens. Unlock dates run from one minute to ten years, with optional linear vesting of up to 3650 days."
  - question: "Does a dev lock make a token safe?"
    answer: "No. A lock only covers the tokens inside it. The creator may hold other tokens in other wallets, and a lock says nothing about price, demand or the rest of the supply."
---

"Dev locked" is one of the first things memecoin traders look for, and on Solana the tool behind many of those locks is **Jupiter Lock**. This guide explains what Jupiter Lock is, how cliffs and vesting work, how to verify a lock yourself, and how Highbar's Dev Lock feature uses it.

We run Highbar, a Solana launchpad on Meteora. Jupiter Lock is built by Jupiter. We are not affiliated with Jupiter, and the facts about Jupiter Lock come from [Jupiter's Lock overview](https://dev.jup.ag/docs/lock), checked on 23 November 2026.

## What Jupiter Lock is

Jupiter describes Lock as an **open-source, audited and free** tool to lock and distribute tokens over time. According to its docs:

- It is used by project teams, creators, community builders and anyone else who wants to lock tokens.
- It supports a **cliff** and **vesting** for non-circulating supply, "in a clear and transparent manner".
- The program ID is `LocpQgucEQHbqNABEYvBvwoxCPsSbG91A1QaQhQQqjn`.
- It was **audited twice, by OtterSec and Sec3**. Jupiter's [audits page](https://developers.jup.ag/docs/resources/audits) links the reports.
- The user interface is at [lock.jup.ag](https://lock.jup.ag/).

In plain terms, a lock is an on-chain escrow. Tokens move from the creator's wallet into an account controlled by the Lock program, and they can only come out according to the schedule set when the lock was created.

## Cliffs and vesting in plain words

Two settings shape almost every lock:

**Cliff (or unlock date).** Nothing can be claimed before this date. If a creator locks 5% of supply with a cliff 90 days out, those tokens cannot move for 90 days.

**Vesting.** After the cliff, tokens can release all at once or gradually. Linear vesting over 100 days, for example, releases about 1% of the locked amount each day. The recipient claims whatever has released so far.

A few combinations you will see:

| Setup | What it means |
| --- | --- |
| Cliff only | Everything unlocks on one date. |
| Cliff plus linear vesting | Nothing until the cliff, then a steady release. |
| Short cliff, long vesting | Small, regular unlocks over a long period. |

Neither setting changes what the market does. A token can fall while its supply is locked, and a large unlock can add selling pressure when it arrives.

## Why memecoin creators lock tokens

On a bonding-curve launchpad, creators often buy some of their own token at launch (a dev buy). Traders worry that the creator could sell that bag at any moment. Locking part or all of it is a public signal that those specific tokens cannot be sold before a date.

It is a signal, not a promise. Our guide to [dev locks on Solana](/articles/dev-lock-token-lock-solana-explained) covers what a lock does and does not tell you.

## How to verify a lock yourself

Do not trust a "locked" badge or a screenshot on its own. Check on-chain.

1. **Find the lock account.** Platforms that use Jupiter Lock usually link it. On Highbar, every lock has a public page and appears on the [Locks](/locks) list.
2. **Confirm the program.** On a block explorer, the escrow account should be owned by the Jupiter Lock program ID above.
3. **Check the mint.** Make sure the locked token's mint address matches the token you are looking at, not a copycat.
4. **Read the schedule.** Note the amount, the unlock date and any vesting.
5. **Compare with total holdings.** A creator who locks 2% but holds 15% in other wallets has not locked much. Use a holder list to see the rest.

Our checklist on [how to check a Solana token before buying](/articles/how-to-check-a-solana-token-before-buying) covers holder concentration and other checks in more detail.

## How Highbar's Dev Lock uses Jupiter Lock

Highbar builds a simple flow on top of Jupiter Lock. Per the [Highbar docs](/docs):

- **Who can lock:** only the wallet that created the token sees the Dev Lock button on its token page.
- **Settings:** an amount, an unlock date between one minute and ten years from now, and optional linear vesting after the unlock of up to 3650 days.
- **Permanent:** locks cannot be cancelled early, and nobody, including the creator, can change who receives the tokens. You confirm that you understand this before signing.
- **Cost:** a small protocol tip in SOL is shown before you sign.
- **Visibility:** locked tokens show a "Dev locked" badge on the token page, in token lists and on the leaderboard, with a live countdown to the unlock date. Each lock has a shareable public page.
- **Claiming:** after the unlock date, the creator uses "Claim unlocked" on the token. With vesting, tokens release step by step and can be claimed as they vest.

Because the lock itself lives in Jupiter Lock, anyone can verify it on-chain without trusting Highbar's interface.

### A worked example

Say a creator launches on Highbar with a 2 SOL dev buy and receives a slice of supply. They lock all of it with an unlock date 30 days out and 180 days of linear vesting after that. For the first 30 days, nothing moves. From day 31, roughly 1/180 of the locked amount releases each day, and the creator can claim it whenever they like. Traders can see the countdown and the schedule on the token page and confirm both on-chain.

## Common misunderstandings

- **"Locked supply means the price can't drop."** It does not. Unlocked supply and new sellers still move price.
- **"Dev locked means the dev holds nothing else."** It only covers the locked tokens.
- **"A lock protects liquidity."** A dev lock covers creator tokens, not the pool. On Highbar, liquidity after graduation is a separate matter: it sits in a Meteora DAMM v2 pool where the LP is permanently locked. That lock cannot be withdrawn, and it is not a guarantee of price or safety.
- **"Every lock tool works the same way."** Settings and permissions differ by tool and by how each lock was created. Read the specific lock.

## Locking and trading from X

If you find tokens through posts on X, the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) lets you trade and launch Solana tokens from the post itself. Check the lock and holder list before you trade, the same way you would on any site.

## Summary

Jupiter Lock is a free, open-source and audited Solana program for locking tokens with a cliff and optional vesting. A dev lock built on it is easy to verify on-chain, and it only proves that the locked tokens cannot move before their schedule. Highbar's Dev Lock uses Jupiter Lock, and its locks are permanent and publicly listed. If you are planning a launch, you can start from the [launch page](/launch) and add a lock from your token page afterwards.
