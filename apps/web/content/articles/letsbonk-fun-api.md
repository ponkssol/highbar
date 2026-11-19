---
title: "LetsBonk.fun API (2026): How Bonk.fun Launches Work Through Raydium's LaunchLab Endpoints"
slug: letsbonk-fun-api
meta_description: "Is there a LetsBonk.fun API? What Raydium's LaunchLab Mint, Auth and History APIs expose for Bonk.fun launches, the on-chain fee configs, and the gotchas."
primary_keyword: letsbonk.fun api
secondary_keywords:
  - bonk.fun api
  - letsbonk api
  - raydium launchlab api
  - bonk.fun sdk
  - create token letsbonk api
date: 2026-11-19
publish_at: "2026-11-19T08:23:00+07:00"
faq:
  - question: "Does LetsBonk.fun have its own public API?"
    answer: "We did not find a standalone developer API published by Bonk.fun on 19 November 2026; its site is a single-page app titled BONKfun. Bonk.fun launches run on Raydium LaunchLab, and Raydium documents the Mint, Auth and History APIs and an SDK demo for the Bonk variant."
  - question: "Do I need an API key to read LetsBonk.fun data?"
    answer: "Raydium's docs say read operations on the LaunchLab Mint API need no authentication, and the History API is fully public. Creating a mint through the API needs a ray-token, which you get by signing a timestamped message with your wallet."
  - question: "What fee does a LetsBonk.fun launch charge on the curve?"
    answer: "Raydium's public platform list on 19 November 2026 showed two letsbonk.fun configs with a 1.25% platform fee and a third with 1%. Raydium's global config adds a 0.25% protocol fee, and the creator fee rate on all three letsbonk.fun configs was 0."
  - question: "Is Highbar connected to Bonk.fun or Raydium?"
    answer: "No. Highbar is a separate launchpad built on Meteora's Dynamic Bonding Curve and DAMM v2. This article describes public Raydium documentation and data, and Highbar has no relationship with Bonk.fun or Raydium."
---

People who search for a "LetsBonk.fun API" usually want one of three things: to read new Bonk.fun launches and trades, to create a token programmatically, or to know what fee settings a launch inherits. The short answer is that Bonk.fun (it now brands itself BONKfun and also runs at letsbonk.fun) is a front end on **Raydium LaunchLab**, so the documented interfaces are Raydium's. This guide walks through them using Raydium's [LaunchLab code demos](https://docs.raydium.io/products/launchlab/code-demos), [Mint API overview](https://docs.raydium.io/api-reference/launch-mint-v1/overview), [Auth API overview](https://docs.raydium.io/api-reference/launch-auth-v1/overview), [platform config reference](https://docs.raydium.io/products/launchlab/platform-config) and the live platform list, all read on 19 November 2026.

We run Highbar, a different Solana launchpad. We are not affiliated with Bonk.fun or Raydium, and nothing here is an official Bonk.fun statement.

## Is there an official LetsBonk.fun API?

We could not find a developer page published by Bonk.fun itself. The bonk.fun homepage is a JavaScript app with the page title "BONKfun" and no public docs link in its HTML. What does exist:

- Raydium's **LaunchLab Mint API** at `launch-mint-v1.raydium.io`, which lists platforms, configs and mints, and has a "List Bonk mints" endpoint (`/get/list-bonk-custom`).
- Raydium's **Auth API**, which issues the `ray-token` needed for write calls.
- Raydium's **History API** for candles and trades.
- The **Raydium SDK v2** demo repo, which includes `createBonkMintApi.ts`, described in Raydium's docs as "the API-driven Bonk variant" of creating a launch.

Third-party indexers also sell LetsBonk data. [Bitquery's LetsBonk page](https://docs.bitquery.io/docs/blockchain/Solana/letsbonk-api/), for example, offers GraphQL queries and streams and says you need an access token outside its IDE. Those are independent products, not a Bonk.fun API.

## The three Raydium services behind a Bonk.fun API integration

| Service | Base URL (mainnet) | Auth | What it gives you |
| --- | --- | --- | --- |
| Mint API | launch-mint-v1.raydium.io | None for reads; `ray-token` for creation | Platforms, configs, mint lists and details, vesting queries, mint creation |
| Auth API | launch-auth-v1.raydium.io | Wallet signature | A JWT `ray-token`, typically valid about 24 hours |
| History API | launch-history-v1.raydium.io | None | OHLC candles at 1m, 5m and 15m (1–500 per call) and trades (1–100 per call) |

The Auth flow, per Raydium, is simple: sign the message `Sign in to raydium.io: <unix seconds>` with your wallet (Ed25519, base58 signature), post it to `/request-token`, and send the returned token in the `ray-token` header. There is also a Ledger variant that signs a transaction instead.

The on-chain program is LaunchLab, `LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj`, per Raydium's [program addresses page](https://docs.raydium.io/reference/program-addresses). That page notes LaunchLab's source is not public and points to the published IDLs instead.

## Reading LetsBonk.fun configs: what the platform list shows

A LaunchLab launch binds two configs. The **GlobalConfig** sets the curve type, quote token and Raydium's protocol fee. The **PlatformConfig** belongs to the front end and sets its own fee, any creator fee and what happens to LP tokens at migration. Raydium's docs say all rates are in units of 1/1,000,000, so 10,000 means 1%.

Here is what `GET /main/platforms` returned for the three entries named letsbonk.fun on 19 November 2026:

| Platform config | Platform fee | Creator fee on curve | LP at migration | CPMM pool config |
| --- | --- | --- | --- | --- |
| BuM6KD… | 1.25% | 0 | 999,999 of 1,000,000 burned | 0.5% trade fee + 0.75% creator fee |
| FfYek5… | 1.25% | 0 | 999,999 of 1,000,000 burned | same as above |
| 8pCtbn… | 1% | 0 | 100% platform-locked | 2% trade fee + 0.05% creator fee |

The GlobalConfigs returned by `/main/configs` all carried a 0.25% protocol `tradeFeeRate`. So a curve trade on the two 1.25% configs pays 1.5% in total, and on the 1% config 1.25%, before any referral fee. On the 1.25% configs, the `platformCpCreator` field names a letsbonk.fun address, and Raydium's docs say that field decides whether the CPMM pool records the original creator or a platform-chosen address. Read that before assuming who earns the post-migration creator fee.

Which config do new launches use? The Raydium SDK demo hard-codes `8pCtbn…` with the comment "current platform: bonk", but the Mint API's list endpoint showed recent launches on both 1.25% configs on 18 November (UTC), including some paired with BONK rather than SOL. Read the `platformId` on the pool you care about rather than trusting a blog table, this one included.

## Creating a token through the LetsBonk.fun API route

The `createBonkMintApi.ts` demo shows the server-assisted flow:

1. Fetch a GlobalConfig from `/main/configs` and decode its fields.
2. Post your name, symbol, image, decimals, supply, sale and raise amounts, `platformId` and `migrateType` to `/create/get-random-mint` with a `ray-token`. The API returns a fresh mint address and a metadata link.
3. Build the create (and optional first buy) transactions with the SDK and sign them locally.

The plain SDK route skips the API and calls `raydium.launchpad.createLaunchpad()` directly. Raydium's notes are worth copying into your own checklist:

- `symbol` must be 10 characters or fewer, and `uri` must not be empty.
- Most economics are not arguments; they come from the configs you bind.
- The builder returns several transactions. Execute them in order, because the mint must exist before the buy lands.
- Pin the SDK version (`0.2.64-alpha` in the docs), because the interface has changed between releases.

## LetsBonk.fun API gotchas

**Raise size is a raw integer.** StonkFun's [developer page](https://www.stonkfun.xyz/developers), which builds on the same LaunchLab program, warns that `totalFundRaisingB` is in the quote token's smallest units and that Raydium's default is 85 SOL written in lamports. Reuse that number on a token with different decimals, such as a BONK-quoted launch, and the curve graduates at a market cap nobody intended.

**Fees stack.** Protocol, platform, creator and referral fees are separate lines on every curve trade, and the CPMM creator fee after migration is charged on top of the pool's trade fee, not carved out of it.

**LP rights changed in August 2026.** Raydium says migrations after its 2026-08-17 upgrade fold any creator scale into one platform-owned locked share and burn the rest. Don't promise a creator Fee Key NFT from an old config value.

## Where Highbar fits

If you are comparing launch infrastructure rather than building on LaunchLab, Highbar uses Meteora instead. Every Highbar launch uses one of six fixed Meteora DBC configs: three tiers, each with an optional anti-sniper fee that is off by default. That fee starts at 25% and decays to about 1% over 60 seconds. It only makes early buys more expensive and does not stop bots or Jito bundles. The curve fee is 1%, the creator earns 0.4% to 0.6% of curve volume by tier, and graduation goes to a Meteora DAMM v2 pool with permanently locked liquidity. All config addresses are listed in the [Highbar docs](/docs), and the [launch page](/launch) previews each tier before you sign. The [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) lets you trade or launch from posts on X.

For the user-level view of Bonk.fun, see [Bonk.fun vs pump.fun](/articles/bonk-fun-vs-pump-fun) and [Raydium LaunchLab fees explained](/articles/raydium-launchlab-fees-explained). For how the Meteora side works, read [Meteora DBC explained](/articles/meteora-dynamic-bonding-curve-explained).

## Summary

There is no separate public LetsBonk.fun API that we could find. Bonk.fun data and launches go through Raydium's LaunchLab Mint, Auth and History APIs and the Raydium SDK, and the fees a launch pays are whatever its bound GlobalConfig and PlatformConfig say. Read those configs yourself, size the raise in the right units, and re-check everything before you sign. Nothing here is a reason to buy any token.
