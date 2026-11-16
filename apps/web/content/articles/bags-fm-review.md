---
title: "Bags.fm Review (2026): Fee Modes, Fee Sharing, Graduation Thresholds and How Highbar\
  \ Compares"
slug: bags-fm-review
meta_description: "A Bags.fm review from official docs: seven SOL fee modes, fee sharing, 85 SOL graduation,\
  \ the 25% deployer share, and how Highbar's fixed tiers differ."
primary_keyword: Bags.fm review
secondary_keywords:
  - Bags launchpad review
  - Bags.fm fees review
  - Bags vs Highbar
  - is Bags.fm good
date: 2026-11-19
publish_at: "2026-11-19T20:51:00+07:00"
faq:
  - question: "What is Bags.fm?"
    answer: "Bags is a Solana launchpad, documented at docs.bags.fm, that launches tokens on a\
  \ Meteora Dynamic Bonding Curve, supports several fee modes and fee sharing, and\
  \ graduates SOL-quoted tokens to a Meteora DAMM v2 pool."
  - question: "What is the default Bags fee?"
    answer: "If you do not specify a bagsConfigType, the Default mode is used: a 2% fee, graduating\
  \ at 85 SOL, with 25% of post-migration fees compounded back into the pool."
  - question: "How does fee sharing work?"
    answer: "Bags fee-share configs can split the claimers pool across many recipients. Newly\
  \ created SOL fee-share v2 configs also give the deployer 25% of the gross claimers\
  \ pool; normal recipients divide the remaining 75%."
  - question: "How does Highbar compare with Bags?"
    answer: "Both use Meteora DBC and DAMM v2. Highbar uses six fixed configs, a 1% curve fee\
  \ and a published creator share by tier, without Bags' fee-mode menu or multi-recipient\
  \ fee sharing."
---

Bags is one of the more configurable Meteora launchpads, and a review has to take that seriously rather than flattening it into "another pump.fun alternative." This review follows Bags' official [fee-mode docs](https://docs.bags.fm/how-to-guides/customize-token-fees) and [launch guide](https://docs.bags.fm/how-to-guides/launch-token), checked on 16 November 2026, and then compares Highbar, the launchpad we run, which shares the same Meteora programs with a much smaller config surface.

## What Bags is good at

Bags launches tokens on a Meteora Dynamic Bonding Curve and, for SOL-quoted tokens, graduates them into a DAMM v2 pool at a documented SOL threshold that depends on the mode. The distinctive features are the **seven SOL fee modes** and **fee sharing**.

Default mode, used if you do not specify a type, charges a 2% fee, graduates at 85 SOL, and after migration compounds 25% of fees back into the pool, with the rest split equally between the platform pool and the gross claimers pool. Other modes change that picture: Low Float locks 96% of supply and decays the post-migration fee toward a 0.5% floor, graduating at 80 SOL; Drop Mode locks 85% of supply and graduates at about 100 SOL; ~0% Fee Mode is 1% then 0.25%; 1% Fee Mode is 0.25% then 1%; Price Mode uses a 1,000 token supply; Paper Hand Tax Mode is a flat 10%. Custom-quote launches keep the selected type's rates but use a configured quote threshold and zero compounding.

Fee-share v2 configs can pay many recipients. Newly created SOL configs give the **deployer 25% of the gross claimers pool**, and normal recipients divide the remaining 75%. A partner share, when present, comes from the platform pool and does not reduce the claimers pool. The launch docs are written for developers using the TypeScript SDK and CLI, including lookup tables when the recipient list is long. That is a real product, and it is the reason someone would pick Bags over a three-tier launchpad.

The official fee tables label a "Creator" column that is actually the gross claimers pool, not necessarily the final payout to one deployer. A review should repeat Bags' own warning about that label.

## What to be careful about

The config is set when the fee-share config is created and, per the docs, cannot be changed after the token is launched. Pick the mode carefully. Current config types do not use a base-fee scheduler, so there is no decaying anti-sniper fee in the live mode list we read; `enableFirstSwapWithMinFee` has no effect right now. Graduation thresholds and fee rates are official, but they are also easy to mix up across modes, especially on custom quotes, where a default threshold is quote-denominated and is not a silent USD conversion.

Bags is more complicated than Highbar or a JustSendit launch. Complexity is useful when you need it and expensive when you do not.

## How Highbar compares

Highbar also uses Meteora DBC and DAMM v2, which is why the comparison is fair. It does not offer seven modes or a 100-recipient fee share. It offers six fixed configs, a 1% curve fee, a creator share of 0.4% to 0.6% by tier, graduation at 85, 150 or 250 SOL, permanently locked liquidity, and an optional anti-sniper fee that starts at 25% and decays to about 1% over 60 seconds, which does not stop bots. The website adds no extra app fee. Highbar is much smaller. Our earlier [Bags fees explainer](/articles/bags-fm-fees-explained) and this review should be read with the live Bags docs, which have since spelled out the v2 deployer share more clearly.

If you need Bags' fee sharing or a custom quote, Highbar is the wrong tool. If you want a short, published SOL tier table, Bags is more than you may want to configure. See the [Highbar docs](/docs), the [launch page](/launch), or the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed).

## Bottom line

Bags is a strong choice when the job is a configurable Meteora launch with fee sharing and a menu of modes. It is a weaker choice if you wanted a one-page fee table. Read the official mode and deployer-share docs before you launch, and do not treat this review as a reason to buy a Bags coin — or any other coin on any launchpad you compare this month or later today.

Figures in this article were checked on 16 November 2026 against the official pages linked above.

Those pages change, so re-read them before you launch or trade, and do not treat this guide as a substitute for the live docs.

If a figure here disagrees with an official page, the official page is the one that binds.

Highbar is a small, new launchpad. Nothing in this article is a reason to buy or sell a token, and no launchpad can guarantee demand.

Locked liquidity and a creator fee share are design choices. They do not make a token safe, and they do not stop sniper bots on their own.

Always confirm fee rates, graduation targets and liquidity rules on the live docs, or on the on-chain config, immediately before you sign.

A useful way to use a comparison like this is to write down the three rules you actually care about — the curve fee, the creator share, and what happens to liquidity at graduation — and check those three lines on each official page, rather than choosing a launchpad by name or by a social-media clip.

If you are launching, prepare the token name, ticker, image and any links first, then read the fee table for the exact config you are about to sign, including whether an anti-sniper or app fee applies. If you are trading, check the mint, the pool, and the live fee on the confirmation screen.

None of the platforms compared here is affiliated with Highbar, and a factual comparison is not a recommendation to use one of them, or to buy any token that has already launched.

Take your time, read the confirmation screen, and only sign if the live fee and destination pool match what you expected to pay.
