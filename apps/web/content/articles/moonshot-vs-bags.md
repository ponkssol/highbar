---
title: "Moonshot vs Bags: Creation Costs, Creator Fees and Graduation Compared (2026)"
slug: moonshot-vs-bags
meta_description: "Moonshot vs Bags from official docs: $10 USDC creation fee vs fee-share configs, creator fee rates, graduation rules and who each launchpad suits."
primary_keyword: moonshot vs bags
secondary_keywords:
  - bags vs moonshot
  - moonshot vs bags.fm
  - moonshot creator fees vs bags
  - best solana launchpad for creators
  - moonshot alternative
date: 2026-11-18
publish_at: "2026-11-18T11:32:00+07:00"
faq:
  - question: "How much does it cost to create a coin on Moonshot?"
    answer: "Moonshot's troubleshooting page says the coin creation fee is $10 and can only be paid in USDC."
  - question: "How much does a creator earn on Moonshot vs Bags?"
    answer: "Moonshot's creator fee page says 0.25% of every trade before bonding and up to 0.15% after, configurable in the create form. On Bags' Default mode, 1% of each curve trade goes to a gross claimers pool, and on new SOL fee-share v2 configs the deployer takes 25% of that pool."
  - question: "When does a coin graduate on each platform?"
    answer: "Moonshot says bonding begins when a coin reaches a $1 million market cap. Bags says most SOL fee modes graduate at 85 SOL, Low Float at 80 SOL and Drop Mode at about 100 SOL."
  - question: "Can I split creator fees with other people?"
    answer: "Bags is built for that: its fee-share config lets you divide the claimers pool between several recipients. Moonshot's creator fee page describes a single creator share."
---

Moonshot and Bags both let you launch a Solana coin without writing code, but they are built for different people. Moonshot is a trading app with a Create tab, and its fees page says deposits and withdrawals go through its partner MoonPay. Bags is a launch and fee-sharing platform with an API and a menu of fee modes. This comparison uses Moonshot's support pages on [creating a coin](https://support.moonshot.com/coins/create), [creator fees](https://support.moonshot.com/coins/create/creator-fees), [bonding](https://support.moonshot.com/coins/create/bonding), [trading fees](https://support.moonshot.com/trade/fees) and [troubleshooting](https://support.moonshot.com/coins/create/troubleshooting), and Bags' [fee modes](https://docs.bags.fm/how-to-guides/customize-token-fees), [launch guide](https://docs.bags.fm/how-to-guides/launch-token) and [deployer fees](https://docs.bags.fm/how-to-guides/deployer-fees) pages, all read on 18 November 2026.

We run Highbar, another Solana launchpad. Neither Moonshot nor Bags is affiliated with us, and we cover where Highbar fits at the end.

## Moonshot vs Bags at a glance

| | Moonshot | Bags (Default mode) |
| --- | --- | --- |
| How you launch | Create tab in the Moonshot app | Bags app, TypeScript SDK, API or CLI |
| Cost to create | $10, USDC only | Network costs; config creation funds deployer accounts |
| Curve fee | 0.5% dynamic fee before bonding | 2% |
| Creator share | 0.25% pre-bond; up to 0.15% post-bond | Gross claimers pool of 1%; deployer takes 25% of it on new SOL v2 configs |
| Fee sharing | Single creator share | Multiple recipients by basis points |
| Graduation | Bonding begins at $1M market cap | 85 SOL in most modes |
| Payouts | Hourly, if unpaid balance exceeds $1 | Claimed through creator and deployer endpoints |

## Launching a coin

### Moonshot

Moonshot's create guide is short. Go to the Create tab, press Create, fill in the required ticker, name, image and description, add optional links and media, set your initial buy amount and creator fee percentage, then swipe to create. The troubleshooting page adds two practical points. The creation fee is $10 and must be paid in USDC; SOL will not work. After launch you can edit the website, X handle, media and creator fee percentage, but not the ticker, name or picture.

### Bags

Bags' launch guide is written for developers using the TypeScript SDK, though the same choices apply in its app. Token Launch v2 requires a fee-share configuration. You pick a `bagsConfigType`, one of seven SOL fee modes, and list fee claimers with basis points that add up to 10,000. The fee mode is set once and cannot be changed after launch. The wallet that pays to create the config becomes the deployer, and the docs warn that a different wallet used later to launch does not replace it.

If you want a short in-app flow, Moonshot is simpler. If you want programmatic launches or shared fees, Bags gives you more control.

## Fees and creator earnings

### Moonshot

Moonshot documents two fee layers. The creator fees page lists a dynamic fee of 0.5% on every transaction before a coin bonds and 0.3% after. The creator earns up to half of that: 0.25% pre-bond and up to 0.15% post-bond, configurable in the create form. Earnings are sent hourly once the unpaid balance exceeds $1.

Separately, Moonshot's trading fees page says each trade in the app carries a Moonshot fee and a crypto fee, tiered by size: 2.5% with a minimum of about $0.99 for trades of $2 to $100, and 1% for $100 and above. The docs do not spell out how the dynamic coin fee and the app fee combine, so read the breakdown Moonshot shows before you confirm.

### Bags

Bags' Default mode charges 2% before and after migration. Before migration, half goes to the platform pool and half to the gross claimers pool. After migration, 25% of the fee is compounded into the pool's liquidity and the rest is split evenly. Bags stresses that its "Creator" column is the gross claimers pool, not the final payout. On new SOL fee-share v2 configs the deployer takes 25% of that pool and the configured recipients split the other 75%. If one wallet is both deployer and sole recipient, it receives the whole pool, up to 1% of each curve trade in Default mode.

Other modes change the picture: the 1% Fee Mode charges 0.25% on the curve and 1% after, the ~0% Fee Mode does the reverse, and Paper Hand Tax Mode charges 10% throughout. Our [Bags fees explainer](/articles/bags-fm-fees-explained) has more background, and the live docs win where they differ.

## Graduation and liquidity

Moonshot says bonding begins when a coin reaches a $1 million market cap, and its bonding page points readers to Meteora's [Dynamic Bonding Curve explainer](https://docs.meteora.ag/core-products/dbc/what-is-dbc) for the mechanics. Bonded coins get a "Created on Moonshot" badge. The page does not state an LP lock rule, so we do not claim one.

Bags tokens graduate into a Meteora DAMM v2 pool once they raise the mode's threshold: 85 SOL for most modes, 80 SOL for Low Float and about 100 SOL for Drop Mode. Low Float locks 96% of supply and Drop Mode 85%. Post-migration fee compounding deepens the pool over time. The fee pages do not describe a permanent LP lock, so check the specific pool.

Bags' launch flow returns a Meteora config key, and Moonshot's bonding page links Meteora's DBC explainer. Our [Meteora DBC explainer](/articles/meteora-dynamic-bonding-curve-explained) describes that curve in plain terms.

## Who each one suits

- **Moonshot** suits creators who want to launch from a consumer app, pay a flat $10 in USDC, and receive a single creator share paid out hourly.
- **Bags** suits creators who want to choose a fee structure, share fees with collaborators or launch through an API.

Neither choice makes a coin more likely to succeed. Most new coins lose value.

## Where Highbar fits

Highbar is a SOL-only launchpad on Meteora. Per the [Highbar docs](/docs), every curve trade pays 1%. Meteora keeps 0.2%, and the creator earns 0.4%, 0.496% or 0.6% depending on whether the graduation target is 85, 150 or 250 SOL. At graduation, liquidity moves into a Meteora DAMM v2 pool and is locked permanently, and creators receive 0.6% to 0.7% of post-graduation volume including the creator LP rebate. An optional anti-sniper fee starts at 25% and falls to about 1% over 60 seconds, and it is off by default. It only makes early buys more expensive and does not stop bots or Jito bundles.

Highbar does not offer fee sharing between several wallets, and it does not have a consumer app with fiat deposits. If those matter, Bags or Moonshot fit better.

## Bottom line

Moonshot is the simpler consumer path with a $10 USDC creation fee and a modest, configurable creator share. Bags is the flexible path with fee modes and shared fees. Read the fee you will sign on the confirmation screen. To compare SOL tiers, see the [Highbar launch page](/launch), and if you trade from your timeline, the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) lets you trade Solana tokens from posts on X. This is not investment advice.
