---
title: "Heaven vs Bags: Reviewed Creator Fees vs Fee-Share Configs on Solana (2026)"
slug: heaven-vs-bags
meta_description: "Heaven vs Bags from official docs: Heaven's review-based 1% or 0.1% creator fee on its own AMM vs Bags' fee modes, shared claimers and DAMM v2 graduation."
primary_keyword: heaven vs bags
secondary_keywords:
  - bags vs heaven
  - heaven.xyz vs bags.fm
  - heaven creator fee vs bags fee sharing
  - solana creator fee launchpad
  - bags alternative
date: 2026-11-18
publish_at: "2026-11-18T16:51:00+07:00"
faq:
  - question: "How do creator fees differ between Heaven and Bags?"
    answer: "Heaven pays 1% to coins its admins confirm as Creator coins and 0.1% to Community coins. Bags pays from a gross claimers pool set by the fee mode, for example 1% of each curve trade in Default mode, with 25% of that pool going to the deployer on new SOL fee-share v2 configs."
  - question: "Can I share fees with other people on Heaven?"
    answer: "Heaven's docs say a confirmed creator can route a portion of fees back to its flywheel address, and describe routing fees to an original artist as something it wants to enable. Bags' fee-share config divides the claimers pool between several recipients by basis points."
  - question: "Do Heaven coins migrate to another pool?"
    answer: "No. Heaven's docs say pools trade on its own AMM from day one, using virtual SOL, with no migration. Bags tokens graduate from a bonding curve into a Meteora DAMM v2 pool, at 85 SOL in most modes."
  - question: "Is a Heaven Creator coin vetted for safety?"
    answer: "No. Heaven says being categorized as Creator is not a safety check or stamp of approval. It means Heaven saw proof that the real team, artist or builder deployed it."
---

Heaven and Bags both care about one question: who should earn the fees a coin generates? They answer it differently. Heaven decides after launch, with an admin review that sorts coins into Creator, Community or Blocked. Bags decides before launch, with a fee-share config that names the recipients and a fee mode that cannot be changed. This comparison uses Heaven's [fees](https://docs.heaven.xyz/fees), [permissioned fees](https://docs.heaven.xyz/permissioned), [curve](https://docs.heaven.xyz/curve) and [standardized launch](https://docs.heaven.xyz/standardized) pages, and Bags' [fee modes](https://docs.bags.fm/how-to-guides/customize-token-fees), [launch guide](https://docs.bags.fm/how-to-guides/launch-token) and [deployer fees](https://docs.bags.fm/how-to-guides/deployer-fees) pages, read on 18 November 2026.

We run Highbar, another Solana launchpad. Neither Heaven nor Bags is affiliated with us.

## Heaven vs Bags at a glance

| | Heaven | Bags (Default mode) |
| --- | --- | --- |
| Where coins trade | Heaven's own AMM from day one | Meteora bonding curve, then Meteora DAMM v2 |
| Cost to launch | Free | Network costs; config creation funds deployer accounts |
| Who decides the creator fee | Heaven's admins, after review | The creator, before launch |
| Creator fee | 1% (Creator coin) or 0.1% (Community coin) | Gross claimers pool: 1% on the curve, 0.75% after migration |
| Protocol fee | 1% under $100k market cap, then 0.25% or 0.5% | 1% on the curve, 0.75% after migration |
| Fee sharing | Routing to flywheel; artist routing described as a goal | Multiple recipients by basis points; 25% deployer share on new SOL v2 configs |
| Customization | Logo, name, ticker, description, links only | Seven SOL fee modes, custom quotes set up by Bags |
| Graduation | None; virtual migration cap at $100k for screeners | 85 SOL in most modes |

## Two philosophies of creator fees

### Heaven: permissionless launches, permissioned fees

Heaven's permissioned page explains the idea. A creator fee should help real builders fund their work without selling supply, but it makes little sense for a deployer to earn on a community takeover or a scam. So every launch is open, but the fee depends on review.

At launch the deployer chooses Creator or Community. Community skips review and pays the deployer 0.1%. Creator starts Heaven's admin review and an "In review" tag, with the 1% creator fee held by Heaven's contract until the review ends. The outcome is one of three:

- **Creator.** The 1% is released and the creator claims ongoing. They can also route part of it to Heaven's flywheel address.
- **Community.** 90% of the fees collected so far go to buybacks, and the deployer gets 0.1% from then on.
- **Blocked.** All collected creator fees go to buybacks.

Heaven adds that Creator status is not a safety check. It means Heaven saw proof on the project's X account or website that the real team, artist or builder deployed it.

### Bags: fees set before launch

Bags' launch guide says Token Launch v2 requires a fee-share configuration. You pick one of seven SOL fee modes and list fee claimers whose basis points add up to 10,000. The mode is set once and cannot be changed after launch. Claimers can be wallets or, through Bags' lookup endpoint, social usernames.

Bags is careful about terms. Its "Creator" column is the gross claimers pool, not the final payout. On new SOL fee-share v2 configs, the wallet that pays to create the config is the deployer and takes 25% of that pool before recipients divide the rest. A later launch wallet does not replace it.

## Fees in numbers

### Heaven

Heaven's fees page lists protocol fees separately from creator fees. Creating a coin is free. Protocol fees are 1% while a coin trades under $100k market cap, then 0.25% for a Community coin and 0.5% for a Creator coin. Creator fees are 0.1% for Community and 1% for Creator. Heaven says it has no LP fees for primary pool providers. Protocol fees go to its $LIGHT flywheel.

### Bags

Default mode is 2% on the curve and 2% after migration. On the curve, half goes to the platform and half to the claimers pool. After migration, 25% is compounded into the pool's liquidity and the rest is split evenly. Other modes change the balance: 1% Fee Mode is 0.25% on the curve and 1% after, ~0% Fee Mode is 1% then 0.25%, and Paper Hand Tax Mode is 10% throughout. Our [Bags fees explainer](/articles/bags-fm-fees-explained) has more detail, and the live docs win where they differ.

## Liquidity: no migration vs graduation

Heaven's curve page says it does not need a bonding curve because it owns the AMM. Each pool trades as though it were seeded with 35 SOL of virtual liquidity that nobody can sell into, and coins trade on Heaven's AMM from the first trade. A $100k "virtual migration" cap exists only so screeners can display coins in the usual way. Heaven says it is still experimenting with the opening virtual SOL amount.

Bags tokens start on a bonding curve and graduate into a Meteora DAMM v2 pool once they raise the mode's threshold: 85 SOL in most modes, 80 SOL in Low Float and about 100 SOL in Drop Mode. Post-migration compounding adds part of each fee back into the pool's liquidity. The fee pages do not describe a permanent LP lock, so check the pool.

For more on Heaven, see our [Heaven launchpad review](/articles/heaven-launchpad-review). The live docs win where it differs.

## Who each one suits

- **Heaven** suits a creator who wants a free, standard launch and can prove they are the real team or artist to unlock the 1% fee, or who is happy with 0.1% for a community meme.
- **Bags** suits a creator who wants to decide the fee structure up front, split fees with collaborators, or launch through an SDK or API.

Neither platform makes a coin a better investment. Most new coins lose value.

## Where Highbar fits

Highbar takes a third approach: a fixed, published creator share with no review and no fee-share config. Per the [Highbar docs](/docs), every curve trade pays 1%. Meteora keeps 0.2%, and the creator earns 0.4%, 0.496% or 0.6% depending on whether the graduation target is 85, 150 or 250 SOL. At graduation, liquidity moves into a Meteora DAMM v2 pool and is locked permanently, split into a creator position and a platform position. With the creator LP rebate, creators receive 0.6% to 0.7% of post-graduation volume. The optional anti-sniper fee starts at 25% and decays to about 1% over 60 seconds, and it is off by default. It only makes early buys more expensive and does not stop bots or Jito bundles.

Highbar does not split fees between several recipients, and it does not review coins to set the fee. If either of those is what you want, Bags or Heaven fits better. Our [creator fees guide](/articles/memecoin-creator-fees-solana-launchpad) compares the models more broadly.

## Bottom line

Heaven ties the creator fee to a review after launch. Bags ties it to a config before launch. Both are coherent; they suit different creators. Read the fee page and the confirmation screen before you sign. To compare Highbar's tiers, see the [launch page](/launch), and to trade from your timeline, the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) adds token chips to X posts. This is not investment advice.
