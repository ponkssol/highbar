---
title: "Boop.fun vs Bags: Holder Rewards vs Fee-Share Configs on Solana, Compared (2026)"
slug: boop-fun-vs-bags
meta_description: "Boop.fun vs Bags from official docs: who earns trading fees, fee rates before and after graduation, launching from X, graduation targets and supply."
primary_keyword: boop.fun vs bags
secondary_keywords:
  - bags vs boop.fun
  - boop vs bags fm
  - boop.fun holder rewards vs bags fee sharing
  - solana launchpad fee sharing
  - launch token from x solana
date: 2026-11-19
publish_at: "2026-11-19T15:04:00+07:00"
faq:
  - question: "What is the main difference between Boop.fun and Bags?"
    answer: "Who the fees are for. Boop's docs send 62.5% of the 2% post-graduation fee to holders or a fee delegate. Bags lets the launcher configure who shares the creator side of fees, with a separate 25% deployer share on new SOL fee-share v2 configs."
  - question: "Do creators earn before graduation on Boop.fun or Bags?"
    answer: "Boop's token deployment page says that before graduation all fees go to the platform. On Bags' Default mode, half of the 2% pre-migration fee, 1% of each trade, goes to the gross claimers pool."
  - question: "Can I launch from X on both?"
    answer: "Boop's docs say you can launch by tagging @beeponboop on X, and Bags supports social usernames as fee claimers. Highbar's Chrome extension can also turn a post on X into a launch."
  - question: "When do tokens graduate on Boop.fun and Bags?"
    answer: "Boop's docs put graduation at about a 400 SOL market cap, with about 80 SOL migrated to a Meteora pool. Bags says most SOL fee modes graduate at 85 SOL, with Low Float at 80 SOL and Drop Mode at about 100 SOL."
---

Boop.fun and Bags both turned "who gets the trading fees" into the headline feature of a Solana launchpad, but they answer the question in opposite ways. Boop routes most post-graduation fees to the people holding the token. Bags lets the launcher write a fee-share config that decides which wallets and social accounts are paid. This comparison sticks to what each platform's own docs say.

Sources, read on 19 November 2026: Boop's [token deployment 101](https://docs.boop.fun/token-deployment-101), [graduation](https://docs.boop.fun/graduation), [bonding curve](https://docs.boop.fun/the-boop-bonding-curve), [rewards](https://docs.boop.fun/rewards), [fee claiming](https://docs.boop.fun/claiming-ur-fee-rewards) and [FAQ](https://docs.boop.fun/faqs) pages, and Bags' [fee modes](https://docs.bags.fm/how-to-guides/customize-token-fees), [launch guide](https://docs.bags.fm/how-to-guides/launch-token) and [deployer fees](https://docs.bags.fm/how-to-guides/deployer-fees) pages. We run Highbar, which is not affiliated with either.

## Boop.fun vs Bags at a glance

| | Boop.fun | Bags (Default mode) |
| --- | --- | --- |
| How you launch | Website, or by tagging @beeponboop on X | Bags app, TypeScript SDK or API |
| Cost to create | Website flow described as free | Network costs; config creation funds deployer accounts |
| Fee before graduation | All fees go to the platform | 2%: 1% platform, 1% gross claimers pool |
| Fee after graduation | 2%, of which 62.5% to holders or delegates | 2%: 0.75% platform, 0.75% claimers, 0.5% compounded |
| Who earns | Holders by default, or a delegated social account | Configured recipients, plus a 25% deployer share of the claimers pool |
| Graduation | About 400 SOL market cap; about 80 SOL migrated | 85 SOL in most modes |
| Destination | A Meteora pool | Meteora DAMM v2 |

## Fees and who earns: Boop.fun vs Bags

**Boop.fun.** The token deployment page says "a 2% fee is taken on (post-graduation) trades" and splits it like this:

- 62.5% to token holders, or to fee delegates,
- 6.25% to BOOP stakers,
- 6.25% to the BOOP buyback bank,
- 12.5% to future rewards and incentives,
- 12.5% to the platform.

That works out to 1.25% of post-graduation volume for holders or delegates. Boop's rewards page says holder rewards are shared by each wallet's share of supply and sent directly to wallets, with no claim needed. The same deployment page says that before graduation "all fees go to the platform," so a Boop creator does not earn a curve fee by default.

**Bags.** On the Default mode, every trade pays 2%. Before migration, 1% goes to the platform pool and 1% to the gross claimers pool. After migration, 25% of the fee is compounded into liquidity and the rest split equally, so 0.75% goes to claimers. Bags offers six other modes, from a 0.25%-then-1% mode to a 10% "Paper Hand Tax" mode, each with its own split.

The Bags claimers pool is not all one person's. Bags' deployer page says new SOL fee-share v2 configs give the wallet that paid to create the config **25% of the gross claimers pool**, and the configured recipients split the remaining 75% by basis points that must total 10,000. So on Default mode, a creator who is both deployer and sole recipient collects the whole 1% pre-migration claimers share; one who assigns everything to others still keeps the deployer cut.

## Fee delegation and social accounts

Both platforms tie fees to social identity, which is part of why they get compared.

- **Boop** lets a creator delegate the holder share of fees to an X user instead of holders, and its fee-claim page supports X, GitHub, Instagram and TikTok accounts. Recipients sign in with that account, and the docs describe a "share on X to claim" step.
- **Bags** supports social usernames as fee claimers through its fee-share wallet lookup, alongside plain wallet addresses, and lets you split fees across several recipients.

The difference is the default. Boop starts from holders. Bags starts from the launcher's chosen recipients.

## Supply and graduation: Boop.fun vs Bags

Boop's deployment page says about 75% of supply goes on the bonding curve, 0.5% to BOOP stakers at graduation, 4.5% is burned and about 20% is reserved for the Meteora pool. Its rewards page, however, says 5% of a graduating token's supply is airdropped to stakers, so the two pages do not describe the split the same way. The graduation page says a token needs about a 400 SOL market cap; at that point about 80 SOL migrates with the remaining tokens and 6 SOL goes to the team for deployment costs. It also notes that graduation rewards are currently paused.

Boop's pages also differ on the creator's first buy: the deployment page says up to 50% of supply, while the FAQ says a creator can buy all 74.32% on the curve, which triggers auto-graduation. Read the live create form before relying on either.

Bags says most SOL fee modes graduate at 85 SOL into a Meteora DAMM v2 pool. Low Float graduates at 80 SOL and locks 96% of supply. Drop Mode graduates at about 100 SOL and locks 85% of supply. Price Mode launches with a 1,000-token supply. That flexibility is the point of Bags.

## Which one fits which creator?

- **Boop.fun** fits a community-first coin where the pitch is "holders get paid," or a launch made by tagging a bot on X. It does not pay the creator on the curve by default.
- **Bags** fits creators who want to be paid, or to pay collaborators, from the first trade, and who are comfortable choosing a fee mode and recipients up front.

For more context, see [Bags.fm fees explained](/articles/bags-fm-fees-explained), our guide to [creator fees on Solana launchpads](/articles/memecoin-creator-fees-solana-launchpad), and the [Meteora launchpad comparison](/articles/meteora-launchpad-platforms-compared).

## Where Highbar fits

Highbar sits between the two on one axis and apart on another. Like Bags, it pays the creator from the first curve trade: of the 1% curve fee, the creator earns 0.4%, 0.496% or 0.6% depending on the tier (85, 150 or 250 SOL). After graduation to a Meteora DAMM v2 pool with permanently locked liquidity, the creator ends up with 0.6% to 0.7% of volume including the LP rebate. Unlike both, Highbar has no holder-reward split and no multi-recipient fee config. Creators claim their fees in Portfolio, Claim fees. The optional anti-sniper fee (25% decaying to about 1% over 60 seconds, off by default) only makes early buys more expensive. It does not stop bots or Jito bundles. See the [Highbar docs](/docs) and try each tier on the [launch page](/launch). The [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) can turn a post on X into a launch.

## Bottom line

Boop.fun pays holders, or a delegated account, from a 2% post-graduation fee and keeps curve fees for the platform. Bags pays configured recipients and the deployer from the first trade, with seven fee modes to choose from. Some of Boop's pages disagree with each other on supply and first-buy limits, so check the live form before launching. Neither model, nor ours, can promise that a token will graduate or hold value.
