---
title: "How to Launch on Jupiter Studio: Meme Mode, Custom Settings, Vesting and the Anti-Sniper\
  \ Toggle"
slug: how-to-launch-on-jupiter-studio
meta_description: "How to launch on Jupiter Studio from official docs: meme vs custom mode, vesting,\
  \ anti-sniping, and how Highbar's launch form differs."
primary_keyword: how to launch on Jupiter Studio
secondary_keywords:
  - launch a token on studio.jup.ag
  - Jupiter Studio meme mode
  - Jupiter Studio custom mode
  - Jupiter Studio vesting
  - Jupiter Studio anti-sniper
date: 2026-11-20
publish_at: "2026-11-20T13:52:00+07:00"
faq:
  - question: "How much SOL do I need to launch on Jupiter Studio?"
    answer: "Official launch docs say the deployer wallet pays the network fee plus account rent,\
  \ less than 0.05 SOL in total, even when the quote token is USDC or JUP. No initial\
  \ liquidity or initial buy is required."
  - question: "Can I change Studio settings after launch?"
    answer: "No. Official docs say market caps, the transaction fee, the vesting schedule and\
  \ anti-sniping are set at launch and cannot be modified afterward."
  - question: "When does creator vesting start?"
    answer: "At graduation, not at launch. If the token never graduates, vested supply never unlocks.\
  \ Duration can be immediate, 6 months or 12 months, with an optional cliff."
  - question: "How is Highbar's launch form different?"
    answer: "Highbar is SOL-only, with a chosen 85, 150 or 250 SOL graduation tier, no creator\
  \ vesting of supply, and an optional 60-second anti-sniper fee. The form is on Highbar's\
  \ launch page."
---

Jupiter's official [launching a token](https://docs.jup.ag/user-docs/launch/studio/launching-a-token) page, checked on 16 November 2026, describes a three-step launch at [studio.jup.ag](https://studio.jup.ag). This walkthrough follows that page and the [graduation and fees](https://docs.jup.ag/user-docs/launch/studio/graduation-and-fees) rules. It is not a promise that a token will graduate, and it does not replace the confirmation screen in your wallet.

## 1. Basics

Connect the wallet you want to use as the deployer. Official docs say this same wallet is used later to claim fees.

Choose **Meme** or **Custom**. Meme mode is preconfigured: USDC quote, 5,000 USDC initial market cap, 75,000 USDC graduation market cap, about 15,390 USDC raised, a 1% fee, anti-sniping off, and no vesting, with 79% of the 1,000,000,000 supply sold on the curve and 21% moved to the pool at graduation. Custom mode is the path if you need a SOL or JUP quote, a different market-cap path, a 2% fee, vesting, or anti-sniping.

Enter the image, name and symbol.

Keep some SOL in the deployer wallet. Official docs say the launch transaction is the network fee plus the rent of the accounts it creates, less than 0.05 SOL in total, even when the quote is USDC or JUP. Most wallets show the exact amount before you approve. No liquidity deposit or initial buy is required.

## 2. Enhance, and the settings you cannot edit later

The recap screen shows the configuration, the token-supply breakdown, and the estimated amount raised before graduation. You can add a header banner, a description and social links. If you need to change the mode or the custom parameters, official docs say to go back with Customize Settings.

Custom parameters, with official constraints:

- Quote token: USDC, SOL or JUP.
- Initial market cap: at least 1,000 USDC or equivalent.
- Graduation market cap: the raise must still reach at least 15,000 USDC or the equivalent in SOL or JUP.
- Transaction fee: 1% or 2%.
- Anti-sniping: off by default; when on, 1 to 5 minutes, linear or exponential, starting at 99% and falling to the transaction fee.
- Supply vested: 0% to 80%.
- Vesting duration: immediate, 6 months or 12 months, counted from graduation.
- Frequency: daily (default) or monthly.
- Cliff: none, 6 months, or 12 months (12 months only with a 12-month duration).

Vesting starts at graduation. A 12-month duration with a 6-month cliff, for example, unlocks 50% at six months and the rest daily or monthly until 12 months. If the token never graduates, vested tokens never unlock. Official docs warn that vesting cannot be changed after launch, so choose it as a final setting, not as a draft.

Anti-sniping makes early trades expensive. It does not stop bots. Leave it off unless you understand that a buyer in the first minutes can pay up to 99%.

## 3. Share, then verify

Confirm and launch. Official docs say the wallet asks you to sign a message, then to approve the launch transaction, after which the token is live on the bonding curve. They also say the pool's creator role is transferred to a Jupiter program address that records your wallet as the owner. That is documented as expected. Fees and LP claims still go to your wallet through the Studio page.

After confirmation, check the mint, the quote asset, the fee and the graduation threshold. Every current Studio config, official fees docs say, locks all graduated LP tokens permanently. Some older tokens used a config where 50% of LP unlocks after one year. Do not assume your launch matches an old token you remember.

Studio tokens appear on AlphaScan and on a dedicated Studio page that feeds jup.ag. That is part of the official product, not a ranking claim.

## How Highbar's form differs

Per the [Highbar docs](/docs), you open [Launch](/launch), connect a wallet, add a name, ticker, image and optional links, pick Standard, Higher or Max (85, 150 or 250 SOL), optionally enable the anti-sniper fee (25% decaying to about 1% over 60 seconds), optionally place a dev buy of up to 20 SOL in the same transaction, and sign. Supply is 1,000,000,000, mint authority is off, and metadata is immutable. There is no meme/custom switch, no USDC or JUP quote, and no vesting of up to 80% of supply. Creators who want a public token lock use Dev Lock after they have bought tokens.

If you wanted Studio's modes, stay on [studio.jup.ag](https://studio.jup.ag) and the official pages. If you wanted Highbar's SOL tiers, use Highbar's form only after you have read the docs. For a general pre-launch checklist that applies on either venue, see [how to launch a Solana memecoin](/articles/how-to-launch-a-solana-memecoin). The [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) is a Highbar tool, not a Studio setting.

Our [Jupiter Studio vs Highbar](/articles/jupiter-studio-vs-highbar) comparison repeats the same official figures in a side-by-side table.

Figures in this article were checked on 16 November 2026 against the official pages linked above.

Those pages change, so re-read them before you launch or trade, and do not treat this guide as a substitute for the live docs.

If a figure here disagrees with an official page, the official page is the one that binds.

Highbar is a small, new launchpad. Nothing in this article is a reason to buy or sell a token, and no launchpad can guarantee demand.

Locked liquidity and a creator fee share are design choices. They do not make a token safe, and they do not stop sniper bots on their own.

Always confirm fee rates, graduation targets and liquidity rules on the live docs, or on the on-chain config, immediately before you sign.

A useful way to use a comparison like this is to write down the three rules you actually care about — the curve fee, the creator share, and what happens to liquidity at graduation — and check those three lines on each official page, rather than choosing a launchpad by name or by a social-media clip.

If you are launching, prepare the token name, ticker, image and any links first, then read the fee table for the exact config you are about to sign, including whether an anti-sniper or app fee applies. If you are trading, check the mint, the pool, and the live fee on the confirmation screen.
