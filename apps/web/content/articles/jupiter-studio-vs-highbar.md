---
title: "Jupiter Studio vs Highbar: Two Meteora DBC Launchpads Compared"
slug: jupiter-studio-vs-highbar
meta_description: "Jupiter Studio vs Highbar: meme and custom modes, 1% or 2% fees, 15,000 USDC graduation, anti-sniping, vesting and locked LP, compared side by side."
primary_keyword: Jupiter Studio launchpad
secondary_keywords:
  - Jupiter Studio vs Highbar
  - Jupiter Studio fees
  - how to launch on Jupiter Studio
  - Jupiter Studio graduation
  - Jupiter Studio anti sniper
date: 2026-11-11
publish_at: "2026-11-11T18:09:00+07:00"
faq:
  - question: "What is Jupiter Studio?"
    answer: "Jupiter Studio is Jupiter's token launch tool. Tokens launch on a bonding curve and graduate to a Meteora DAMM v2 pool. Jupiter's developer docs describe it as launching on Meteora Dynamic Bonding Curve pools."
  - question: "What are Jupiter Studio's fees?"
    answer: "Per Jupiter's docs, every buy and sell pays the token's transaction fee, 1% in meme mode or 1% or 2% in custom mode, for the token's whole life. It is split 50% to the creator and 50% to Jupiter."
  - question: "When does a Jupiter Studio token graduate?"
    answer: "The minimum raised to graduate is 15,000 USDC or the equivalent in SOL or JUP. Meme mode graduates at a 75,000 USDC market cap with about 15,390 USDC raised."
  - question: "Do both platforms lock liquidity after graduation?"
    answer: "Yes. Jupiter's user docs say all LP tokens from the graduated Meteora pool are permanently locked. Highbar's docs say DAMM v2 liquidity is locked forever in two positions, one for the creator and one for the platform."
  - question: "Which is better for anti-sniping?"
    answer: "Both offer an optional decaying fee. Jupiter Studio lets custom-mode creators pick 1 to 5 minutes, linear or exponential. Highbar's optional fee starts at 25% and decays to about 1% over 60 seconds. Neither stops bots; each only makes early buys more expensive."
---

Jupiter Studio and Highbar have more in common than most launchpad pairs. Both launch tokens on Meteora's Dynamic Bonding Curve, both graduate to Meteora DAMM v2, and both lock liquidity after graduation. The differences are in the choices each makes on top of that shared base: fees, graduation targets, anti-sniping, vesting and visibility. This guide compares them using [Jupiter's Studio documentation](https://docs.jup.ag/user-docs/launch/studio) and the [Highbar docs](/docs). Highbar is our product, and we say plainly where Studio has the edge.

Checked on 11 November 2026.

## The shared foundation

Jupiter's [developer docs](https://developers.jup.ag/docs/studio) describe Studio as an API for launching tokens on Dynamic Bonding Curve (DBC) pools, and its user docs say graduated tokens migrate to a Meteora DAMM v2 pool. Highbar does the same: every launch uses one of six fixed Meteora DBC configs, and graduated tokens trade in a DAMM v2 pool. If you want the background on how that works, see our explainers on [Meteora DBC](/articles/meteora-dynamic-bonding-curve-explained) and [DAMM v2 graduation](/articles/meteora-damm-v2-explained-token-graduation).

So the question isn't which technology is better. It's which configuration suits you.

## How launching works on each

### Jupiter Studio

Per Studio's [launch guide](https://docs.jup.ag/user-docs/launch/studio/launching-a-token), you connect a wallet at studio.jup.ag, choose **Meme** or **Custom** mode, add an image, name and symbol, review, then sign. The launch transaction costs less than 0.05 SOL in network fees and rent, and no initial buy is required.

Meme mode uses fixed settings:

| Setting | Meme mode value |
| --- | --- |
| Quote token | USDC |
| Initial market cap | 5,000 USDC |
| Graduation market cap | 75,000 USDC |
| Estimated raise before graduation | About 15,390 USDC |
| Transaction fee | 1% |
| Anti-sniping | Off |
| Creator vesting | None |

Custom mode lets creators choose USDC, SOL or JUP as the quote token, set market caps (the raise must reach at least 15,000 USDC or equivalent), pick a 1% or 2% fee, turn on anti-sniping, and allocate 0–80% of supply to themselves under a vesting schedule that starts at graduation.

### Highbar

Per the [Highbar docs](/docs), you open [Launch](/launch), connect a wallet, add a name, ticker, image and optional links, choose a tier, decide whether to turn on the anti-sniper fee, optionally add a dev buy of up to 20 SOL in the same transaction, and sign. The tier sets the graduation target:

| Tier | Graduation target | Approx. market cap at migration |
| --- | --- | --- |
| Standard | 85 SOL | 420.75 SOL |
| Higher | 150 SOL | 742.5 SOL |
| Max | 250 SOL | 1,250 SOL |

Every Highbar token has a supply of 1,000,000,000, mint authority off, immutable metadata and no team allocation or presale.

## Fees compared

| | Jupiter Studio | Highbar |
| --- | --- | --- |
| Fee on curve trades | 1% (meme) or 1%/2% (custom) | 1% |
| Creator share on the curve | 50% of the fee | 40% to 60% of the fee by tier (0.4% to 0.6% of the trade) |
| Fee after graduation | Same fee, still 50/50 | 1% DAMM v2 pool fee |
| Creator after graduation | 50% of the fee | 0.6% to 0.7% of volume with the creator LP rebate |
| Who else shares the fee | Jupiter | Platform and Meteora (Meteora keeps 0.2% of each trade) |
| Migration fee | Not listed | 1% on Standard and Higher, 0% on Max |

On a 1% Studio token, the creator earns 0.5% of each trade for the token's life. On Highbar, the creator earns 0.4% to 0.6% on the curve depending on tier, and 0.6% to 0.7% after graduation. These are mechanics, not forecasts: fees only exist if people trade. Our guide to [creator fees on a Solana launchpad](/articles/memecoin-creator-fees-solana-launchpad) has worked examples.

## Anti-sniping

Both platforms offer an optional, decaying anti-sniper fee, and both default it to off.

- **Jupiter Studio** (custom mode only): duration of 1 to 5 minutes, linear or exponential decrease. The creator receives 50% of the higher fee charged during that window.
- **Highbar**: starts at 25% and decays exponentially to about 1% over 60 seconds. The creator's own dev buy in the launch transaction pays the normal fee.

Neither approach stops bots or coordinated bundles; it makes the earliest buys more expensive. Treat any claim beyond that with suspicion.

## Vesting and creator allocation

This is Studio's clearest advantage for structured projects. Custom mode lets creators allocate up to 80% of supply to themselves, vesting from graduation over immediate, 6-month or 12-month schedules with optional cliffs. If the token never graduates, that supply never unlocks.

Highbar takes the opposite approach: no team allocation at all. Creators get tokens only by buying them, and can then choose to lock them publicly with Dev Lock, which uses Jupiter Lock. Locks can't be cancelled, and each one has a public page on [Locks](/locks).

## Liquidity and visibility

Jupiter's docs say all LP tokens from a graduated Studio pool are permanently locked. Highbar's docs say the DAMM v2 liquidity is locked forever, split into a creator position and a platform position (20/80, 40/60 or 50/50 by tier).

On visibility, Studio has a real edge: every Studio token appears on Jupiter's AlphaScan and gets a dedicated Studio page that feeds into jup.ag's token page. Highbar has its own token list and leaderboard, and a [Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) for trading and launching from X posts, but a much smaller audience than Jupiter.

## Which one fits you?

- **Choose Jupiter Studio** if you want USDC or JUP pairs, creator vesting, a 2% fee option, or Jupiter's built-in visibility.
- **Choose Highbar** if you want SOL pairs with a choice of 85, 150 or 250 SOL graduation, no team allocation by design, a creator LP position after graduation and a fast 60-second anti-sniper decay.

## Bottom line

Jupiter Studio and Highbar are cousins on the same Meteora rails. Studio is more configurable and far more visible; Highbar is simpler, fixed and SOL-native, with creator-chosen graduation targets. Both lock liquidity, and neither can promise a token will succeed. Read Studio's docs and Highbar's [docs](/docs), and try the [launch form](/launch) to see every tier's numbers before you sign.
