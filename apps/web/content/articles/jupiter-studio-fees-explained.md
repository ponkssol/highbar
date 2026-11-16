---
title: "Jupiter Studio Fees Explained: The 1% or 2% Lifetime Split, Anti-Sniper Window and\
  \ How to Claim"
slug: jupiter-studio-fees-explained
meta_description: "Jupiter Studio fees from official docs: 1% or 2% split 50/50 for life, the 99% anti-sniper\
  \ window, claims, and how Highbar's 1% tiered split compares."
primary_keyword: Jupiter Studio fees
secondary_keywords:
  - Jupiter Studio fee split
  - Jupiter Studio anti-sniper fee
  - Jupiter Studio creator fees
  - studio.jup.ag fees
  - Jupiter Studio vs Highbar fees
date: 2026-11-20
publish_at: "2026-11-20T12:28:00+07:00"
faq:
  - question: "What is the Jupiter Studio trading fee?"
    answer: "Official graduation-and-fees docs say every buy and sell pays the token's transaction\
  \ fee for life, on the bonding curve and on the Meteora DAMM v2 pool. Meme mode\
  \ is 1%. Custom mode is 1% or 2%, set at launch and unchangeable. The fee is split\
  \ 50% to the creator and 50% to Jupiter."
  - question: "Where does the anti-sniper fee go?"
    answer: "It is split the same 50/50 way as the ordinary transaction fee. During the window\
  \ it replaces that fee rather than stacking on top of it. Official launch docs say\
  \ it starts at 99% and falls to 1% or 2% over 1 to 5 minutes."
  - question: "How do I claim Studio fees?"
    answer: "Connect the deployer wallet on the Studio token page and use the claim control next\
  \ to the accumulated fees. Official docs say the pool's on-chain creator role may\
  \ show a Jupiter program address; claims still pay that deployer wallet."
  - question: "How do Highbar's fees compare?"
    answer: "Highbar charges 1% on the curve, of which Meteora keeps 0.2% of the trade and the\
  \ creator earns 0.4%, 0.496% or 0.6% by tier. After graduation the DAMM v2 pool\
  \ also charges 1%, and with the rebate the creator ends up with 0.6% to 0.7% of\
  \ volume."
---

Jupiter Studio's fee rules are short, official, and easy to misquote, because the anti-sniper window uses a much higher number than the lifetime fee. This explainer follows Jupiter's [graduation and fees](https://docs.jup.ag/user-docs/launch/studio/graduation-and-fees) and [launch](https://docs.jup.ag/user-docs/launch/studio/launching-a-token) pages, checked on 16 November 2026, and puts Highbar's published 1% table next to them. Fee figures are mechanics, not earnings forecasts.

## The lifetime transaction fee

Every buy and sell pays one transaction fee, on the Studio bonding curve and later on the Meteora DAMM v2 pool. Official docs say this lasts for the life of the token and does not change after graduation.

| Mode | Fee | Split | Can it change later? |
| --- | --- | --- | --- |
| Meme | 1% | 50% creator, 50% Jupiter | No |
| Custom | 1% (default) or 2% | 50% creator, 50% Jupiter | No |

On a 1% token the creator's share is 0.5% of each trade. On a 2% token it is 1% of each trade. Those shares exist only when volume exists. Official pages state there is no guarantee a token will graduate or generate fees.

Meme mode also has a published raise path: a 5,000 USDC initial market cap, a 75,000 USDC graduation market cap, and about 15,390 USDC raised, with 21% of supply moving into the DAMM v2 pool. Custom mode must still raise at least 15,000 USDC or the equivalent in SOL or JUP.

## The anti-sniper window is a replacement fee, not an extra fee

Anti-sniping is available only in custom mode and is off by default. Meme mode launches without it. When it is on, official launch docs say:

- The fee starts at 99% when trading opens.
- It decreases in steps over 1 to 5 minutes (1 minute by default).
- The decrease can be linear (the default) or exponential.
- It falls down to the 1% or 2% transaction fee you chose.
- It replaces that transaction fee during the window; it is not added on top.
- It applies to buys and sells, and it is split 50/50 like the ordinary fee.
- jup.ag shows a warning while the window may still apply.

This is a decaying early fee. It makes the first minutes more expensive. It does not stop bots, and it does not make a token safe. See [anti-sniper fees on Solana token launches](/articles/anti-sniper-fee-solana-token-launch) for the broader pattern.

## Launch cost, claims and LP

The deployer wallet pays the launch transaction in SOL: network fee plus account rent, less than 0.05 SOL in official docs, even if the quote token is USDC or JUP. No initial buy or liquidity deposit is required.

Creators claim fees from the Studio token page with the deployer wallet. Official docs also note that the on-chain pool creator is transferred to a Jupiter program address that records that wallet as owner. Claims still pay the wallet.

After graduation, current configs lock all LP tokens permanently. Some older configs let 50% of LP unlock after one year, claimed with Claim LP on the Studio page. Anyone may add more liquidity on Meteora, with the usual risk that a price move can reduce the value of the added position.

## How Highbar's 1% table compares

Highbar, per the [Highbar docs](/docs), charges 1% on the curve. Meteora keeps 0.2% of the trade. The creator earns 0.4% (Standard), 0.496% (Higher) or 0.6% (Max). There is a 1% migration fee on Standard and Higher (the Higher tier also receives half of that fee, 0.75 SOL) and a 0% migration fee on Max. After graduation the DAMM v2 pool charges 1%, and with the creator LP rebate the creator ends up with 0.6%, 0.65% or 0.7% of volume. No extra website app fee. The [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) adds 0.02% of the SOL amount on extension trades.

| | Jupiter Studio (1% token) | Highbar Standard, on the curve |
| --- | --- | --- |
| Trader pays | 1% (or up to 99% in a custom anti-sniper window) | 1% (or the optional 25% to about 1% anti-sniper fee over 60 seconds) |
| Creator earns | 0.5% of the trade, for life | 0.4% of the trade on the curve |
| Other share | 0.5% to Jupiter | Meteora 0.2% of the trade, platform the rest |

A 2% Studio token pays the creator 1% of volume, which is higher than Highbar's curve share. Highbar's post-graduation creator share with rebate (0.6% to 0.7%) is higher than a 1% Studio token's 0.5%, and lower than a 2% Studio token's 1%. Those are splits, not returns. Our [creator fees guide](/articles/memecoin-creator-fees-solana-launchpad) and [Jupiter Studio vs Highbar](/articles/jupiter-studio-vs-highbar) put the same figures in more context.

If you want Highbar's table, open the [docs](/docs) and the [launch page](/launch) and read the live tier before you sign. If you want Studio's 50/50 lifetime split, stay on Jupiter's official pages.

Figures in this article were checked on 16 November 2026 against the official pages linked above.

Those pages change, so re-read them before you launch or trade, and do not treat this guide as a substitute for the live docs.

If a figure here disagrees with an official page, the official page is the one that binds.

Highbar is a small, new launchpad. Nothing in this article is a reason to buy or sell a token, and no launchpad can guarantee demand.

Locked liquidity and a creator fee share are design choices. They do not make a token safe, and they do not stop sniper bots on their own.

Always confirm fee rates, graduation targets and liquidity rules on the live docs, or on the on-chain config, immediately before you sign.

A useful way to use a comparison like this is to write down the three rules you actually care about — the curve fee, the creator share, and what happens to liquidity at graduation — and check those three lines on each official page, rather than choosing a launchpad by name or by a social-media clip.
