---
title: "Jupiter Studio Review (2026): Meme and Custom Modes, Fees, Vesting and Locked DAMM\
  \ v2 Liquidity"
slug: jupiter-studio-review
meta_description: "Jupiter Studio review from official docs: meme and custom modes, 1% or 2% fees, 15,000\
  \ USDC graduation, vesting, anti-sniping, and how Highbar compares."
primary_keyword: Jupiter Studio review
secondary_keywords:
  - Jupiter Studio launchpad
  - Jupiter Studio meme mode
  - Jupiter Studio custom mode
  - Jupiter Studio vs Highbar
  - studio.jup.ag review
date: 2026-11-20
publish_at: "2026-11-20T11:09:00+07:00"
faq:
  - question: "What is Jupiter Studio?"
    answer: "Jupiter Studio is Jupiter's token launch tool. Official user docs say tokens launch\
  \ on a bonding curve and graduate to a Meteora DAMM v2 pool when the curve has raised\
  \ enough quote tokens. Meme mode is preconfigured; custom mode lets the creator\
  \ change quote asset, market caps, fee, vesting and anti-sniping."
  - question: "What does it cost to launch?"
    answer: "The official launch guide says the deployer wallet pays the network fee plus account\
  \ rent, less than 0.05 SOL in total, even when the quote token is USDC or JUP. No\
  \ initial liquidity deposit or initial buy is required."
  - question: "Are graduated Studio pools locked?"
    answer: "Jupiter's current user docs say all LP tokens from the graduated DAMM v2 pool are\
  \ permanently locked. Some older launches used configs where 50% of the LP unlocks\
  \ one year after graduation."
  - question: "Does the anti-sniper fee stop bots?"
    answer: "No. Official docs say it makes trading right after launch expensive, starting at\
  \ 99% and falling to the 1% or 2% transaction fee over 1 to 5 minutes in custom\
  \ mode. It does not claim to stop bots."
---

Jupiter Studio is Jupiter's official launch product at [studio.jup.ag](https://studio.jup.ag). This review uses Jupiter's [Studio overview](https://docs.jup.ag/user-docs/launch/studio), [launching a token](https://docs.jup.ag/user-docs/launch/studio/launching-a-token) and [graduation and fees](https://docs.jup.ag/user-docs/launch/studio/graduation-and-fees) pages, checked on 16 November 2026, and compares only the published mechanics with the [Highbar docs](/docs). It is not a verdict on which product is better, and it is not a reason to buy any Studio or Highbar token.

## What Studio is

Studio launches a token on a bonding curve with a fixed supply of 1,000,000,000 tokens. Buyers and sellers can trade on that curve until graduation. Graduation happens when the curve has raised enough quote tokens — USDC, SOL or JUP — to meet the threshold set at launch. Official docs set a floor of 15,000 USDC, or the equivalent in SOL or JUP. The raised quote and the matching token allocation then move into a Meteora DAMM v2 pool, and the curve stops.

Every Studio token also gets a dedicated Studio page, appears on Jupiter's AlphaScan, and is flagged as a Studio token on jup.ag. That visibility is a real product difference. Highbar is small and new, with its own token list, leaderboard and a [Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) for trading and launching from X, but it does not have Jupiter's built-in audience.

## Meme mode and custom mode

Meme mode is the preconfigured path. Official values:

| Setting | Meme mode |
| --- | --- |
| Quote token | USDC |
| Initial market cap | 5,000 USDC |
| Graduation market cap | 75,000 USDC |
| Estimated raise | About 15,390 USDC |
| Transaction fee | 1% |
| Anti-sniping | Off |
| Creator vesting | None |
| Bonding supply | 795,000,000 (79%) |
| Migrating supply | 205,000,000 (21%) |

Custom mode is where Studio is most unlike a one-config launchpad. The creator picks USDC, SOL or JUP, sets initial and graduation market caps (the raise still has to reach at least 15,000 USDC or equivalent; initial market cap has a 1,000 USDC floor), chooses a 1% or 2% fee, optionally turns on anti-sniping, and can vest 0% to 80% of supply to themselves. Vesting starts at graduation, not at launch. Duration can be immediate, 6 months or 12 months, with an optional 6- or 12-month cliff, unlocking daily or monthly. If the token never graduates, vested supply never unlocks. Those parameters cannot be changed later.

## Fees, anti-sniping and claims

The transaction fee is charged on every buy and sell, on the curve and on the DAMM v2 pool, for the life of the token. It is split 50% to the creator and 50% to Jupiter. The creator claims from the Studio token page with the same deployer wallet. Fees exist only if people trade; official docs say there is no guarantee a token will graduate or generate fees.

Anti-sniping is custom-mode only and off by default. When it is on, the fee starts at 99% and decreases, linearly or exponentially, over 1 to 5 minutes (1 minute by default) down to the 1% or 2% transaction fee. It replaces the transaction fee during that window and is split the same 50/50 way. On jup.ag, a warning appears while that window may still apply. This makes early trades more expensive. It does not stop bots. For the general mechanism, see [anti-sniper fees on Solana launches](/articles/anti-sniper-fee-solana-token-launch).

At launch, official docs say the pool's creator role is transferred to a Jupiter program address that records your wallet as the owner. Fees and LP claims still go to that wallet through the Studio page. That transfer is documented as expected, not as a red flag.

## Liquidity after graduation

For every current Studio config, official docs say all LP tokens from the graduated pool are permanently locked and no one, including the creator, can withdraw them. Some older launches used a config where 50% of the LP unlocks one year after graduation; the creator claims that LP from the Studio page. Anyone can add more liquidity on Meteora after graduation, and Jupiter warns that added liquidity can lose value if the price moves.

For how DAMM v2 pools work in general, see [Meteora DAMM v2 explained](/articles/meteora-damm-v2-explained-token-graduation). Our side-by-side is [Jupiter Studio vs Highbar](/articles/jupiter-studio-vs-highbar).

## How Highbar compares, briefly

Highbar also uses a Meteora Dynamic Bonding Curve and a locked DAMM v2 pool. It is SOL-only. Graduation is 85, 150 or 250 SOL by tier. The curve fee is 1%, with the creator earning 0.4% to 0.6% on the curve and 0.6% to 0.7% after graduation with the LP rebate. There is no 2% fee option, no USDC or JUP quote, and no creator vesting of up to 80% of supply. Highbar's optional anti-sniper fee starts at 25% and decays to about 1% over 60 seconds. Creators buy tokens if they want them, then can use Dev Lock; there is no team allocation by design.

Pick Studio if you wanted Jupiter visibility, a USDC or JUP pair, vesting, or a 2% fee. Pick Highbar if you wanted a SOL-only published tier table and a 60-second anti-sniper window, and you accept a much smaller venue. Read both official docs, then use [Launch](/launch) only if Highbar is actually the product you want.

Figures in this article were checked on 16 November 2026 against the official pages linked above.

Those pages change, so re-read them before you launch or trade, and do not treat this guide as a substitute for the live docs.

If a figure here disagrees with an official page, the official page is the one that binds.

Highbar is a small, new launchpad. Nothing in this article is a reason to buy or sell a token, and no launchpad can guarantee demand.

Locked liquidity and a creator fee share are design choices. They do not make a token safe, and they do not stop sniper bots on their own.

Always confirm fee rates, graduation targets and liquidity rules on the live docs, or on the on-chain config, immediately before you sign.
