---
title: "How to Launch on Raydium LaunchLab (2026): JustSendit vs LaunchLab Mode, Step by Step"
slug: how-to-launch-on-raydium-launchlab
meta_description: "How to launch on Raydium LaunchLab: JustSendit vs LaunchLab mode, supply, 24 SOL minimum target, vesting, costs, graduation and pitfalls, step by step."
primary_keyword: how to launch on Raydium LaunchLab
secondary_keywords:
  - raydium launchlab tutorial
  - raydium justsendit
  - create token raydium launchlab
  - raydium launchpad how to
  - launchlab vesting
date: 2026-11-16
publish_at: "2026-11-16T18:57:00+07:00"
faq:
  - question: "How much does it cost to launch on Raydium LaunchLab?"
    answer: "Raydium's fee comparison page lists about 0.115 SOL to launch: a 0.1 SOL LaunchLab fee plus about 0.015 SOL of rent. Graduation costs about 0.04 SOL, paid from curve reserves."
  - question: "What is the difference between JustSendit and LaunchLab mode?"
    answer: "JustSendit is a one-minute launch with a fixed supply and an 85 SOL target. LaunchLab mode takes about five minutes and lets you set supply, curve allocation (51–80%), a target of 24 SOL or more, vesting and post-migration fee sharing."
  - question: "Can I change settings after launch?"
    answer: "No. Raydium's creation guide says supply, curve allocation, vesting cliff and unlock periods are fixed at launch."
  - question: "Who triggers graduation?"
    answer: "Graduation happens automatically with the first transaction that pushes the curve past the threshold. Any user can call it and earns a small bounty; the creator does not need to act."
---

Raydium LaunchLab is the bonding-curve program behind Bonk.fun, StonkFun and many other Solana launchpads, but you can also use it directly on raydium.io. This guide walks through launching a token on LaunchLab yourself, following Raydium's own [creation guide](https://docs.raydium.io/user-flows/creating-a-launchlab-token), and ends with a short comparison to Highbar, the Meteora-based launchpad we run.

Checked on 16 November 2026. Raydium updates LaunchLab often; its docs carry a changelog.

## Before you start

You need:

- A Solana wallet with SOL. Raydium suggests about 0.05–0.1 SOL for a JustSendit launch and 0.1–0.5 SOL for LaunchLab mode, which also covers vault rent.
- A token name, ticker and logo image or GIF.
- Optional description and links (website, X, Telegram).
- For LaunchLab mode: every setting decided in advance, because settings cannot be changed after launch.

Raydium's guide opens with a reminder that launching a token carries financial and reputational risk. Take that seriously.

## What it costs

From Raydium's [fee comparison page](https://docs.raydium.io/reference/fee-comparison):

| Event | Cost |
| --- | --- |
| Launch | About 0.115 SOL (0.1 SOL LaunchLab fee + about 0.015 SOL rent) |
| Curve trades | 1% default LaunchLab curve fee |
| Graduation | About 0.04 SOL, paid from curve reserves |
| CPMM pool after graduation | Usually 0.25% |

Our [Raydium LaunchLab fees explainer](/articles/raydium-launchlab-fees-explained) explains how platform and creator fees layer on top when a token launches through a third-party platform.

## Step 1: Choose your mode

Go to raydium.io/launchpad/create. Raydium offers two modes:

| | JustSendit | LaunchLab mode |
| --- | --- | --- |
| Setup time | About 1 minute | About 5 minutes |
| Supply | Fixed default | Fully configurable |
| SOL target | 85 SOL, fixed | 24 SOL minimum, custom |
| Share of supply on the curve | Default | 51–80% |
| Vesting | None | Optional |
| Best for | Quick community launches | Structured launches |

If you just want a meme launch, pick JustSendit. If you need vesting or a custom raise, pick LaunchLab mode.

## Step 2a: Launching with JustSendit

1. Select **JustSendit**.
2. Enter the token **name** and **ticker**.
3. Optionally add a **description** and **social links**.
4. Upload a **logo image or GIF**.
5. Optionally enter an **initial buy** in SOL. Raydium notes this changes the first price state on the curve, so review it before signing.
6. Review the summary, click **Create** and approve in your wallet.

The token goes live on the bonding curve immediately and graduates to a Raydium pool once the curve has collected 85 SOL.

## Step 2b: Launching with LaunchLab mode

1. Select **LaunchLab** mode and fill in the same token details.
2. Set the **total supply**, for example 1,000,000,000.
3. Set the **curve allocation**, the share of supply sold on the curve, between 51% and 80%. The rest seeds the pool after graduation.
4. Set the **SOL fundraising target**, at least 24 SOL. Raydium warns that a target set too high risks never graduating.
5. Configure **vesting** if needed: total locked amount, a cliff after graduation (Raydium's example is 180 days) and a linear unlock period (example 365 days), plus beneficiary wallets.
6. Enable **post-migration fee sharing** if you want a creator LP share, where the platform config allows it.
7. Optionally enter an **initial buy**.
8. Review the summary (price range, graduation condition, LP split), click **Create** and approve.

### Vesting rules worth repeating

Raydium's guide is blunt about three things:

- Cliff and unlock periods cannot be changed after launch.
- If a beneficiary loses their wallet key, their locked tokens are unreachable forever. Raydium suggests a multisig if recovery matters.
- Any part of the locked amount not allocated to a beneficiary before graduation is stuck permanently. Allocate all of it.

## Step 3: After launch

- **Watch curve progress.** The token page shows the share of the curve sold, SOL raised against the target, and the price chart. Raydium does not intervene in launches that fail to graduate.
- **Graduation is automatic.** The first transaction that pushes the curve past the threshold triggers it. Any user can call it and earns a small bounty.
- **After graduation**, a CPMM pool is created from the collected SOL and the remaining curve tokens. If you enabled post-migration fees, a Fee Key NFT is minted to your wallet. Raydium's guide notes that since the 17 August 2026 upgrade, the platform and creator LP shares become a platform-owned Fee Key position for new migrations, so read the current platform config before signing.
- **Claim creator fees.** If the config enables curve creator fees, they collect in a vault you claim from the Portfolio page on raydium.io.

## Pitfalls Raydium flags

| Pitfall | What to do |
| --- | --- |
| Target too high | Pick one the market can realistically reach |
| Vesting before beneficiaries are confirmed | Unallocated supply is lost after graduation |
| Moving or burning the Fee Key NFT | Fee claim rights are lost; keep it in a wallet you control |
| No initial buy | Bots may take early tokens cheaply |

On that last point, be careful: a large initial buy is real money at risk and is visible to everyone. Our guide on [sniper bots on Solana](/articles/sniper-bots-solana-memecoin-launches) explains what early buying looks like.

## How Highbar compares

Highbar is not built on LaunchLab. It launches on Meteora's Dynamic Bonding Curve and graduates to Meteora DAMM v2. From the [Highbar docs](/docs):

| | Raydium LaunchLab | Highbar |
| --- | --- | --- |
| Targets | 85 SOL (JustSendit) or 24 SOL+ (custom) | 85, 150 or 250 SOL |
| Supply | Default or custom | Fixed 1,000,000,000, mint authority off |
| Vesting | Optional in LaunchLab mode | No team allocation; optional Dev Lock |
| Curve fee | 1% default | 1%, creator gets 0.4%–0.6% |
| After graduation | CPMM, usually 0.25% | DAMM v2, 1%, liquidity locked forever |
| Anti-sniper | Not described | Optional, 25% → about 1% over 60 s |

LaunchLab gives you much more control. Highbar gives you fewer choices and a fixed creator share on both sides of graduation. Highbar's anti-sniper fee only makes the first minute more expensive; it does not stop bots. If you want to compare flows, our [Highbar launch guide](/articles/how-to-launch-a-solana-memecoin) covers each field, the [launch page](/launch) previews each tier without signing, and the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) trades Solana tokens from posts on X.
