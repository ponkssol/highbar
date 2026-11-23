---
title: "Jupiter Studio vs Raydium LaunchLab: Fees, Graduation, Vesting and Anti-Sniping Compared (2026)"
slug: jupiter-studio-vs-raydium-launchlab
meta_description: "Jupiter Studio vs Raydium LaunchLab: curve fees, creator share, graduation targets, vesting, anti-sniping and where liquidity goes, from official docs."
primary_keyword: jupiter studio vs raydium launchlab
secondary_keywords:
  - jupiter studio vs launchlab
  - raydium launchlab vs jupiter studio
  - jupiter studio fees
  - raydium launchlab fees
  - solana launchpad comparison 2026
date: 2026-11-23
publish_at: "2026-11-23T12:36:00+07:00"
faq:
  - question: "What is the main difference between Jupiter Studio and Raydium LaunchLab?"
    answer: "Jupiter Studio launches on a Meteora curve and graduates into a Meteora DAMM v2 pool, with a lifetime fee split 50/50 between creator and Jupiter. Raydium LaunchLab uses Raydium's own bonding-curve program and graduates into a Raydium CPMM pool, where the usual fee tier is 0.25%."
  - question: "What are the fees on each?"
    answer: "Jupiter's docs say the Studio fee is 1% in meme mode and 1% or 2% in custom mode, for the token's whole life. Raydium's fee comparison page lists a 1% default LaunchLab curve fee, about 0.115 SOL to launch, about 0.04 SOL at graduation and 0.25% on the CPMM pool afterwards."
  - question: "When do tokens graduate?"
    answer: "Studio meme mode graduates at a 75,000 USDC market cap, with about 15,390 USDC raised; custom mode needs at least 15,000 USDC or the equivalent. LaunchLab's JustSendit mode uses a fixed 85 SOL target and LaunchLab mode allows a custom target from 24 SOL."
  - question: "Do both offer anti-sniper protection?"
    answer: "Jupiter Studio offers an optional anti-sniper fee in custom mode, lasting 1 to 5 minutes. We did not find an equivalent decaying anti-sniper fee in Raydium's LaunchLab creation docs."
  - question: "Can creators vest tokens?"
    answer: "Yes on both. Studio lets creators vest 0% to 80% of supply, counted from graduation. LaunchLab mode offers optional vesting; JustSendit mode does not."
---

Jupiter Studio and Raydium LaunchLab are two of the biggest names behind Solana token launches, and they come from two of Solana's largest DeFi teams. They solve the same problem in different ways. Studio is a creator product on top of a Meteora curve, while LaunchLab is Raydium's own launch program that many front ends, including Bonk.fun and Float, build on.

This comparison uses only official docs: Jupiter's [Studio graduation and fees page](https://docs.jup.ag/user-docs/launch/studio/graduation-and-fees), its [launching guide](https://docs.jup.ag/user-docs/launch/studio/launching-a-token) and [developer overview](https://dev.jup.ag/docs/studio), and Raydium's [LaunchLab overview](https://docs.raydium.io/products/launchlab/overview), [creation guide](https://docs.raydium.io/user-flows/creating-a-launchlab-token) and [fee comparison](https://docs.raydium.io/reference/fee-comparison), all checked on 23 November 2026. We run Highbar, a Meteora DBC launchpad, and mention it briefly at the end. We are not affiliated with Jupiter or Raydium.

## At a glance

| | Jupiter Studio | Raydium LaunchLab |
| --- | --- | --- |
| Curve program | Meteora curve | Raydium LaunchLab |
| Quote token | USDC, SOL or JUP | Set by the launch (SOL in the standard flow) |
| Trading fee | 1% (meme) or 1% / 2% (custom), whole life | 1% default on the curve; 0.25% typical on CPMM after graduation |
| Creator share | 50% of the fee, before and after graduation | Optional creator fee on the curve, capped at 0.5%; separate CPMM creator fee possible after |
| Graduation | 75,000 USDC market cap in meme mode; custom from 15,000 USDC raised | 85 SOL in JustSendit; custom from 24 SOL in LaunchLab mode |
| Graduates into | Meteora DAMM v2, LP permanently locked on current configs | Raydium CPMM, LP burned or locked per platform settings |
| Vesting | 0% to 80% of supply, from graduation | Optional in LaunchLab mode |
| Anti-sniping | Optional in custom mode, 1 to 5 minutes | Not found in the creation docs |

## Fees

### Jupiter Studio

Jupiter's docs say every buy and sell pays the token's transaction fee for its **whole life**, on the curve and on the Meteora pool after graduation. The fee is set at launch and cannot be changed: **1%** in meme mode, **1% or 2%** in custom mode. It is split **50% to the creator and 50% to Jupiter**, and that split does not change at graduation.

### Raydium LaunchLab

Raydium's fee comparison page lists a **1% default** fee on bonding-curve trades, split 50/50 between the pool seed and the LaunchLab treasury. A front end built on LaunchLab can set its own platform fee on top, and a creator fee, which Raydium caps at 0.5%. One-time costs are about **0.115 SOL** to launch (a 0.1 SOL LaunchLab fee plus about 0.015 SOL rent) and about **0.04 SOL** at graduation, paid from curve reserves. After graduation, trading moves to a CPMM pool, typically on the **0.25%** tier.

**What it means:** Studio gives the creator a fixed half of a 1% or 2% fee for life. LaunchLab's post-graduation pool is cheaper for traders, and creator income depends on the platform and launch settings. Our guide to [Raydium LaunchLab fees](/articles/raydium-launchlab-fees-explained) goes deeper on the layers.

## Graduation

**Studio.** Graduation happens when the curve collects enough quote tokens to reach the graduation market cap set at launch. The minimum raise is 15,000 USDC or the equivalent in SOL or JUP. In meme mode, graduation is at a **75,000 USDC** market cap, with about 15,390 USDC raised. At graduation, the raised tokens move into a new Meteora DAMM v2 pool with 21% of supply in meme mode, and Jupiter's docs say all LP tokens from that pool are permanently locked on every current Studio config. Some older launches used configs where 50% of the LP unlocks after a year.

**LaunchLab.** Raydium's creation guide offers two modes. **JustSendit** uses a fixed **85 SOL** target and default settings. **LaunchLab mode** lets the creator set a custom target from **24 SOL**, choose 51% to 80% of supply on the curve and add vesting. A launch graduates when the quote vault reaches the threshold, then a CPMM pool is created from the curve reserves. Raydium's docs describe graduation as one-way: the token does not return to the curve even if the price falls later. LP is then split by the platform's settings between a burned share and a share locked through LP-Lock.

## Vesting and supply

Studio lets creators allocate **0% to 80%** of supply to themselves, subject to vesting. Vesting starts **at graduation**, with durations of immediate, 6 months or 12 months, and daily or monthly unlocks. If the token never graduates, the vested supply never unlocks. These settings cannot be changed after launch.

LaunchLab mode supports optional vesting as part of its configurable supply. JustSendit has none. Raydium's docs note that LaunchLab mints the full supply at initialize and revokes the mint authority in the same call, and that the freeze authority is never set.

## Anti-sniping

Studio offers anti-sniper protection in **custom mode**, off by default. When on, trades right after launch pay a much higher fee that decreases to the normal fee over **1 to 5 minutes**, linearly or exponentially. Jupiter warns that a trade in the first minutes can pay a fee of up to 99%, and shows a warning on jup.ag while it may apply. Meme mode launches without it.

We did not find an equivalent decaying anti-sniper fee in Raydium's LaunchLab creation docs. Individual front ends may add their own tools. For a wider look, see our explainer on [anti-sniper fees](/articles/anti-sniper-fee-solana-token-launch).

Remember that no decaying fee stops coordinated buys inside the launch block. It only makes the first seconds expensive for bots that buy after launch.

## Which fits which creator?

- **You want a fixed lifetime share of fees and a Jupiter token page:** Studio's 50% split and dedicated page are built for that.
- **You want the simplest possible launch:** LaunchLab's JustSendit takes about a minute with defaults.
- **You want cheap trading after graduation:** LaunchLab's CPMM pools typically charge 0.25%.
- **You want vesting tied to graduation:** Studio's vesting is designed around it.
- **You want to build your own front end:** LaunchLab's platform configs are public infrastructure.

## Where Highbar fits

Highbar sits closer to Studio on the stack: tokens launch on a Meteora Dynamic Bonding Curve and graduate into a Meteora DAMM v2 pool with permanently locked liquidity. Locked liquidity cannot be withdrawn, and it is not a guarantee of price or safety. The differences are in the choices. Per the [Highbar docs](/docs), every launch uses one of six fixed configs: three graduation targets (85, 150 or 250 SOL), each with the anti-sniper fee on or off. The curve fee is 1%, with the creator earning 0.4% to 0.6% of each trade by tier. The optional anti-sniper fee starts at 25% and decays to about 1% over 60 seconds. It only makes early buys more expensive. It does not stop bots, bundles or rug pulls. There is no team allocation or vesting. Creators get tokens only by buying them, including an optional dev buy of up to 20 SOL. You can compare tiers on the [launch page](/launch), or launch and trade from posts on X with the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed). For a direct comparison, see [Jupiter Studio vs Highbar](/articles/jupiter-studio-vs-highbar).

## Bottom line

Jupiter Studio gives creators a fixed half of a 1% or 2% fee for life, Meteora DAMM v2 liquidity, graduation-based vesting and an optional anti-sniper window. Raydium LaunchLab gives a fast default path at 85 SOL, flexible custom launches and cheaper CPMM trading after graduation. Read both sets of docs on the day you launch, because configs and fees change.
