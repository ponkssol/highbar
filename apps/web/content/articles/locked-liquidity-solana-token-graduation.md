---
title: "Locked Liquidity After a Solana Token Graduation: What Official Docs Say, and What\
  \ They Do Not"
slug: locked-liquidity-solana-token-graduation
meta_description: "Locked liquidity after Solana token graduation: Highbar and Studio DAMM v2 locks,\
  \ Float Burn and Earn, Bags supply locks, and what a lock is not."
primary_keyword: locked liquidity Solana token graduation
secondary_keywords:
  - locked liquidity Solana launchpad
  - DAMM v2 locked liquidity
  - Raydium Burn and Earn
  - token graduation locked LP
  - Dev Lock vs locked liquidity
date: 2026-11-21
publish_at: "2026-11-21T20:47:00+07:00"
faq:
  - question: "Does Highbar lock liquidity at graduation?"
    answer: "Yes. Official Highbar docs say 20% of supply, plus the raised SOL minus the documented\
  \ migration fee, moves into a Meteora DAMM v2 pool as two positions that are locked\
  \ forever."
  - question: "Do all Jupiter Studio tokens lock LP forever?"
    answer: "Current official Studio configs do: all LP tokens from the graduated DAMM v2 pool\
  \ are permanently locked. Official docs also say some older launches used a config\
  \ where 50% of the LP unlocks one year after graduation."
  - question: "Is a token lock the same as locked liquidity?"
    answer: "No. Highbar's Dev Lock, which uses Jupiter Lock, locks tokens in a wallet and cannot\
  \ be cancelled. Locked LP is a pool restriction. They answer different questions."
  - question: "Does locked liquidity make a token safe?"
    answer: "No. It restricts one way of removing pool inventory. It cannot guarantee demand,\
  \ stop the price from falling, or stop sniper bots."
---

"Locked liquidity" is one of the most searched phrases after a Solana token graduates, and one of the easiest to over-read. A lock is a rule about whether someone can withdraw the inventory in a pool. It is not a guarantee of demand, a floor on price, or a substitute for reading the mint and the program. This explainer uses official pages checked on 16 November 2026, including the [Highbar docs](/docs), Jupiter's [graduation and fees](https://docs.jup.ag/user-docs/launch/studio/graduation-and-fees) page, and the other official sources named below.

## What a liquidity lock is, and what it is not

When a bonding-curve launch graduates, raised quote tokens and a share of the token supply are usually placed in an automated-market-maker pool. If the LP tokens for that pool can be withdrawn, someone can later remove that inventory. If they cannot, traders still face price risk, but they are not relying on a deployer to leave the pool in place.

A lock does not:

- Stop the token's price from falling.
- Stop sniper bots or coordinated early buys.
- Replace a check of the mint, the program IDs, or the live fee.
- Mean every launchpad uses the same lock, or that "locked" on one official page matches another.

For the Meteora pool type many of these products use after graduation, see [Meteora DAMM v2 explained](/articles/meteora-damm-v2-explained-token-graduation).

## What official docs say on several venues

**Highbar.** Official docs say 20% of supply, plus the raised SOL minus the documented migration fee, moves into a Meteora DAMM v2 pool as two positions — a creator position and a platform position — that are locked forever. Graduation targets are 85, 150 or 250 SOL by tier. That is a permanent LP lock, not a vesting schedule.

**Jupiter Studio.** Current official user docs say all LP tokens from the graduated DAMM v2 pool are permanently locked, in meme and custom mode and with any quote token, and that no one can remove that liquidity. The same page says some older launches used a config where 50% of the LP unlocks one year after graduation, claimed with Claim LP on the Studio token page. Anyone can add more liquidity after graduation, with the usual risk that a price move can reduce the value of the added position.

**Float.** Official Float docs, as already summarized in our live [Float launchpad explainer](/articles/float-launchpad-explained), describe liquidity moving into a Raydium pool locked with Raydium's Burn & Earn, which those docs say means it can never be pulled. Re-read Float's live page before you trade, because other Float fee lines have changed since earlier write-ups.

**Bags.** Official fee-mode docs describe something different from an LP-lock sentence: Low Float locks 96% of token supply and Drop Mode locks 85% of supply, and several modes compound a share of post-migration fees back into the pool. Supply lock and fee compounding are not the same claim as "all LP tokens are permanently locked." Read the mode you are actually in.

**Heaven.** Official curve docs describe a virtual SOL floor inside Heaven's own AMM, not a migrating pool of raised SOL that is then locked. A virtual floor and a permanent DAMM v2 lock are different tools.

**Pump.fun.** Official fee pages used here describe the curve, PumpSwap, and the official-app Platform Fee. This article does not invent a PumpSwap liquidity-lock rule that those pages do not state.

## Token locks are a different tool

Highbar also offers **Dev Lock**, which uses Jupiter Lock to lock tokens in a wallet for a chosen period. Official Highbar docs say those locks cannot be cancelled, and each one has a public page. That is a token lock, not an LP lock. See [Dev Lock explained](/articles/dev-lock-token-lock-solana-explained). A creator can lock tokens and still, on some other venue, be able to withdraw LP, or the reverse. Check both.

## How to read a "locked" claim

Ask four questions on the official page or on-chain config: what is locked (LP tokens, a percentage of supply, or a wallet's tokens), for how long, who can still add or withdraw, and which config the token actually used (current Studio versus older Studio, or which Bags mode). Then look at the confirmation screen for the live fee. Highbar's lock rule is in the [docs](/docs). The [launch page](/launch) is where a Highbar launch chooses its tier, not where a lock becomes a safety rating. The [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) does not change the lock. If a marketing post says a token is safe because liquidity is locked, that claim goes further than any official page cited here.

Figures in this article were checked on 16 November 2026 against the official pages linked above.

Those pages change, so re-read them before you launch or trade, and do not treat this guide as a substitute for the live docs.

If a figure here disagrees with an official page, the official page is the one that binds.

Highbar is a small, new launchpad. Nothing in this article is a reason to buy or sell a token, and no launchpad can guarantee demand.

Locked liquidity and a creator fee share are design choices. They do not make a token safe, and they do not stop sniper bots on their own.

Always confirm fee rates, graduation targets and liquidity rules on the live docs, or on the on-chain config, immediately before you sign.

A useful way to use a comparison like this is to write down the three rules you actually care about — the curve fee, the creator share, and what happens to liquidity at graduation — and check those three lines on each official page, rather than choosing a launchpad by name or by a social-media clip.

If you are launching, prepare the token name, ticker, image and any links first, then read the fee table for the exact config you are about to sign, including whether an anti-sniper or app fee applies. If you are trading, check the mint, the pool, and the live fee on the confirmation screen.

None of the platforms compared here is affiliated with Highbar, and a factual comparison is not a recommendation to use one of them, or to buy any token that has already launched.
