---
title: "How to Launch on Boop.fun: Official Website Steps, X Launch and Fee Delegation"
slug: how-to-launch-on-boop-fun
meta_description: "How to launch on boop.fun from official docs: the free website form, launching via\
  \ X, image rules, fee delegation, pre-buy notes, and how Highbar compares."
primary_keyword: how to launch on boop.fun
secondary_keywords:
  - launch a token on boop.fun
  - boop.fun create token
  - boop fun fee delegation
  - launch on boop via X
  - boop.fun vs Highbar launch
date: 2026-11-21
publish_at: "2026-11-21T11:33:00+07:00"
faq:
  - question: "Is it free to start a Boop.fun launch?"
    answer: "Official token-deployment docs say you can start the creation process for free on\
  \ the website, or launch by tagging Boop's bot on X."
  - question: "Can I launch a Boop token from Telegram?"
    answer: "No. Official FAQs say you cannot launch via Telegram. The documented paths are the\
  \ website form and X."
  - question: "How much can the creator pre-buy?"
    answer: "Official pages disagree. The deployment guide says you can buy up to 50% of the supply\
  \ at creation. The FAQ says you can pre-buy all 74.32% on the curve, which would\
  \ trigger an auto-graduation. Check the live form."
  - question: "How is Highbar's launch form different?"
    answer: "Highbar uses a website form with a chosen 85, 150 or 250 SOL tier, an optional 60-second\
  \ anti-sniper fee, and an optional dev buy of up to 20 SOL. It does not document\
  \ Boop-style fee delegation or a tag-to-create X bot."
---

Boop's official [token deployment](https://docs.boop.fun/token-deployment-101) page, checked on 16 November 2026, describes two launch paths: a free form on the [Boop create page](https://boop.fun/create/token), and a launch by tagging [@beeponboop](https://x.com/beeponboop) on X. This walkthrough follows those official steps and the related [FAQ](https://docs.boop.fun/faqs) and [graduation](https://docs.boop.fun/graduation) notes. It is not a promise that a token will graduate.

## Launch on the website

Official docs say to connect a wallet and provide a short set of fields.

- **Token name** — the full name, not the ticker.
- **Ticker** — the short symbol.
- **Image** — a PNG or JPEG, ideally square, no larger than 1920×1920 pixels and 5 MB. Official FAQs repeat those limits and say WebP is not accepted. If an upload fails, check those three rules first.
- **Cult lore** — a description of the token.
- **Trading fees** — by default, a large share of post-graduation trading fees goes to holders. Official docs say you can instead award that holder portion to an X user by choosing the X icon and entering a username. That is fee delegation, not a required field.
- **Links** — optional Telegram, X and website links.

When the fields look right, official docs say to hit **review and launch**, check the preview, and confirm with **looks good, let's go**. After that, demand is still a separate problem: official graduation docs say a token that never reaches the required market cap stays on the curve.

You can log in with a Solana wallet or an X account, per the official FAQ (the site uses Privy). If you launched via X and later want to manage the token on the website, official docs say to sign in with the same X account.

## Launch on X

Official deployment docs say to click **create on x.com** from the create page, which generates and posts a custom tweet. Beep replies with a confirmation and the links needed to track the token. That is the documented X path. Official FAQs say you cannot launch via Telegram.

The [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) is not this flow. It is a Highbar tool for trading or launching from an X post after you have already chosen Highbar.

## Decisions to make before you sign

**Fee delegation.** If you leave the default, official post-graduation rules send 62.5% of a 2% fee to holders. If you delegate, that holder portion goes to the named account, and official claim docs describe how that account connects X, GitHub, Instagram or TikTok to claim. Delegation is set in the official launch flow; do not assume you can redo it later unless a live official page says you can.

**Pre-buy.** Official pages do not agree, so this checklist will not pretend they do. The deployment guide says the creator can buy up to 50% of the supply at creation. The FAQ says you can pre-buy all 74.32% on the curve, which triggers an auto-graduation. Read the live form and the confirmation screen.

**Graduation figures.** Official pages also disagree on the threshold: about 86 SOL accumulated on the curve, or a market cap of about 400 SOL with 80 SOL migrated and 6 SOL to the team. Check the live [graduation](https://docs.boop.fun/graduation) and [bonding curve](https://docs.boop.fun/the-boop-bonding-curve) pages the day you launch. Graduation rewards were marked as paused on the graduation page when this was checked.

## How Highbar's form differs

Per the [Highbar docs](/docs), you open [Launch](/launch), connect a wallet, add a name, ticker, image and optional links, pick Standard, Higher or Max (85, 150 or 250 SOL), optionally enable the anti-sniper fee (25% decaying to about 1% over 60 seconds, which does not stop bots), optionally place a dev buy of up to 20 SOL, and sign. There is no official holder-reward split and no fee delegation to an X account. Liquidity is locked forever in two DAMM v2 positions after graduation.

If you wanted Boop's holder rewards, X-bot launch or fee delegation, stay on Boop's official pages. If you wanted Highbar's SOL tiers and locked DAMM v2 liquidity, use Highbar's form only after you have read the docs. For generic pre-launch checks that apply on either venue, see [how to launch a Solana memecoin](/articles/how-to-launch-a-solana-memecoin) and [Meteora launchpad platforms compared](/articles/meteora-launchpad-platforms-compared).

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

Read the confirmation screen for the live fee, the quote asset and the destination pool, and only sign if those three lines match the official page you just checked.
