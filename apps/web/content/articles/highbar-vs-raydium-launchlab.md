---
title: "Highbar vs Raydium LaunchLab: Curve, Fees, Graduation and Creator Earnings Compared"
slug: highbar-vs-raydium-launchlab
meta_description: "Highbar vs Raydium LaunchLab: JustSendit vs LaunchLab mode, layered fees, 85 SOL graduation, CPMM vs DAMM v2 liquidity and creator fees, from both docs."
primary_keyword: highbar vs raydium launchlab
secondary_keywords:
  - raydium launchlab vs highbar
  - raydium launchlab alternative
  - launchlab vs meteora dbc
  - raydium launchpad comparison
  - raydium justsendit vs highbar
date: 2026-11-16
publish_at: "2026-11-16T11:08:00+07:00"
faq:
  - question: "What is the difference between Highbar and Raydium LaunchLab?"
    answer: "LaunchLab is Raydium's bonding-curve program, used directly on raydium.io and by platforms such as Bonk.fun. Highbar is a launchpad built on Meteora DBC that graduates tokens to Meteora DAMM v2 with locked liquidity."
  - question: "What does it cost to launch on Raydium LaunchLab?"
    answer: "Raydium's fee comparison page lists about 0.115 SOL to launch (0.1 SOL LaunchLab fee plus about 0.015 SOL rent) and about 0.04 SOL at graduation, paid from curve reserves."
  - question: "Can I choose my own graduation target?"
    answer: "On LaunchLab mode you can set any target from 24 SOL up. JustSendit is fixed at 85 SOL. Highbar offers three fixed targets: 85, 150 or 250 SOL."
  - question: "Does LaunchLab offer vesting?"
    answer: "Yes. LaunchLab mode supports optional vesting with a cliff and unlock period. Highbar has no team allocation; creators can lock tokens they bought with Dev Lock on Jupiter Lock."
---

Raydium LaunchLab is one of the most important pieces of launch infrastructure on Solana. You can use it directly on raydium.io, and platforms such as Bonk.fun and StonkFun run on it too. Highbar, the launchpad we run, is built on Meteora instead. This article compares launching directly on Raydium LaunchLab with launching on Highbar, using [Raydium's documentation](https://docs.raydium.io/products/launchlab/overview) and the [Highbar docs](/docs). Where LaunchLab is the better fit, we say so.

Checked on 16 November 2026. Raydium's docs keep a changelog and LaunchLab has changed several times this year.

## Raydium LaunchLab vs Highbar in one table

| | Raydium LaunchLab (raydium.io) | Highbar |
| --- | --- | --- |
| Program | Raydium LaunchLab | Meteora Dynamic Bonding Curve |
| Creation modes | JustSendit (quick) or LaunchLab mode (configurable) | One form, 3 tiers × anti-sniper on/off |
| Graduation target | 85 SOL (JustSendit) or 24 SOL minimum, custom | 85, 150 or 250 SOL |
| Graduates to | Raydium CPMM pool | Meteora DAMM v2 pool |
| Default curve fee | 1% (Raydium fee comparison page) | 1% |
| Launch cost | About 0.115 SOL | No separate launch fee listed; optional dev buy up to 20 SOL |
| Vesting | Optional in LaunchLab mode | No team allocation; optional Dev Lock |
| Anti-sniper option | Not described in the creation guide | Optional decaying fee |
| Post-graduation pool fee | Usually 0.25% on CPMM | 1% on DAMM v2 |

## How launching works on Raydium LaunchLab

Raydium's [creation guide](https://docs.raydium.io/user-flows/creating-a-launchlab-token) describes two modes at raydium.io/launchpad/create:

### JustSendit mode

The quick path, about a minute. You enter a name and ticker, optional description and links, upload an image or GIF, optionally add an initial buy, and sign. The token graduates to a Raydium pool once the curve has collected 85 SOL. Raydium suggests having about 0.05–0.1 SOL for creation.

### LaunchLab mode

The configurable path, about five minutes. You set the total supply, the share of supply on the curve (51–80%), a SOL fundraising target of at least 24 SOL, optional vesting with a cliff and unlock period, and post-migration fee sharing. Raydium warns that supply, curve allocation and vesting settings cannot be changed after launch, and that a target set too high risks never graduating.

That flexibility is LaunchLab's biggest strength. If you need a structured launch with vesting for a team or a custom raise, Highbar does not offer that.

## How launching works on Highbar

On Highbar's [launch page](/launch) you connect a wallet, add a name (up to 32 bytes), a ticker (up to 10 bytes), an image and optional links, pick a tier, choose whether the anti-sniper fee is on, optionally add a dev buy of up to 20 SOL, and sign. Every token has a fixed supply of 1,000,000,000, mint authority off and immutable metadata. There is no team allocation and no presale. Our [step-by-step launch guide](/articles/how-to-launch-a-solana-memecoin) covers each field.

Highbar is deliberately narrower: fewer settings, fewer ways to make a mistake, and fewer ways to customise.

## Fees compared

### LaunchLab's layered fees

Per Raydium's [PlatformConfig docs](https://docs.raydium.io/products/launchlab/platform-config), a LaunchLab curve swap can pay three fees: Raydium's protocol trade fee, the platform's fee and a creator fee set by the platform. Raydium caps the platform fee at 5% and the creator fee at 0.5%. Raydium's [fee comparison page](https://docs.raydium.io/reference/fee-comparison) lists 1% as the default LaunchLab curve fee and about 0.25% on the CPMM pool after graduation.

One-time costs on the same page: about 0.115 SOL to launch (0.1 SOL LaunchLab fee plus about 0.015 SOL rent), and about 0.04 SOL at graduation, paid from curve reserves.

### Highbar's fees

Highbar charges 1% on every curve trade. Meteora keeps 0.2%, and the rest goes to the creator and the platform by tier. There is a migration fee of 1% of the SOL raised on Standard and Higher (0.85 SOL and 1.5 SOL) and 0% on Max. After graduation the DAMM v2 pool charges 1%.

The honest takeaway: on the curve, the default costs are similar. After graduation, a CPMM pool at about 0.25% is cheaper to trade than Highbar's 1% DAMM v2 pool.

## Creator earnings

On LaunchLab, the creator fee depends on the config the token launches from, and Raydium's [creator fee docs](https://docs.raydium.io/products/launchlab/creator-fees) explain that post-graduation creator revenue comes from CPMM creator fees only when the creator remains the recorded pool creator and the config enables them. Pre-migration creator fees, where enabled, are claimed from the Portfolio page on raydium.io.

Raydium's creation guide also notes a change from the 17 August 2026 upgrade: for migrations after that date, the platform and creator LP shares become a platform-owned Fee Key position and the burn share is burned.

On Highbar, the creator share is fixed by tier:

| Tier | Creator on the curve | Creator after graduation (incl. LP rebate) |
| --- | --- | --- |
| Standard (85 SOL) | 0.4% | 0.6% |
| Higher (150 SOL) | 0.496% | 0.65% |
| Max (250 SOL) | 0.6% | 0.7% |

On Higher, the creator also gets half the migration fee (0.75 SOL). The detail is in our [creator fees guide](/articles/memecoin-creator-fees-solana-launchpad).

## Liquidity after graduation

LaunchLab creates a Raydium CPMM pool from the collected SOL and the remaining curve tokens. How the LP is split between a locked platform position and a burned share depends on the platform config.

Highbar migrates into a Meteora DAMM v2 pool with 20% of the supply, and the liquidity is locked forever in two positions. The creator's share of the locked LP is 20%, 40% or 50% by tier. Locked or burned, the liquidity cannot be pulled; that says nothing about price.

## Sniping

Raydium's creation guide lists "not making an initial buy" as a pitfall, noting that without one, sniping bots may capture early tokens cheaply. It does not describe a decaying anti-sniper fee for raydium.io launches.

Highbar's optional anti-sniper fee starts at 25% and decays to about 1% over 60 seconds. It only makes the earliest buys more expensive. It does not stop bots or Jito bundles. Our [anti-sniper explainer](/articles/anti-sniper-fee-solana-token-launch) has the decay table.

## Which should you choose?

- **Choose Raydium LaunchLab** if you need custom supply, a custom raise, vesting or a structured launch, or you want a lower pool fee after graduation and Raydium's liquidity.
- **Choose Highbar** if you want a simple form with three graduation targets, a fixed creator share on both sides of graduation, a locked creator LP position and an optional anti-sniper fee, and you accept a smaller audience.

Read both docs before you sign; settings on either platform are permanent once the token is live. The [Highbar docs](/docs) list every config address, and the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) lets you trade Solana tokens from posts on X.
