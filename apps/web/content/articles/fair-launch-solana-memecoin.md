---
title: "What Is a Fair Launch on Solana? Presales, Dev Buys, Allocations and What You Can Check"
slug: fair-launch-solana-memecoin
meta_description: "What a fair launch means for a Solana memecoin: no presale or team allocation, how dev buys and vesting change it, and a checklist to verify it."
primary_keyword: fair launch solana memecoin
secondary_keywords:
  - what is a fair launch crypto
  - fair launch token solana
  - no presale memecoin
  - stealth launch vs fair launch
  - creator allocation memecoin
date: 2026-11-19
publish_at: "2026-11-19T20:15:00+07:00"
faq:
  - question: "What does fair launch mean for a memecoin?"
    answer: "There is no official definition. It usually means no presale, no free team allocation and a public start, so everyone, including the creator, gets tokens by buying from the same curve or pool."
  - question: "Is a launch with a dev buy still a fair launch?"
    answer: "It can be, if the buy is disclosed and visible. A dev buy is a purchase at the curve price, not a free allocation. But the creator buys first, so its size and what happens to those tokens matter."
  - question: "Do launchpads allow creator allocations?"
    answer: "Some do. Jupiter Studio's custom mode lets a creator vest 0% to 80% of supply from graduation, and Bags' Low Float mode locks 96% of supply. Highbar's docs say there is no team allocation and no presale on its launches."
  - question: "Does an anti-sniper fee make a launch fair?"
    answer: "No. Highbar's optional anti-sniper fee starts at 25% and decays to about 1% over 60 seconds, and it is off by default. It only makes early buys more expensive. It does not stop bots, Jito bundles or concentrated buying, and it does not make a launch fair."
---

"Fair launch" is one of the most used phrases in Solana memecoin posts, and one of the least defined. No standard or regulator sets its meaning; launchpads and creators use it loosely. This guide sets out what people usually mean by a fair launch on Solana, the settings that change how fair a launch really is, and what you can check yourself instead of trusting the label.

We run Highbar, a Solana launchpad. This is an explainer, and nothing here is a reason to buy a particular token.

## What people usually mean by a fair launch

Most uses of the term point to four things:

1. **No presale.** Nobody bought tokens privately before trading opened.
2. **No free allocation.** No team, advisor or marketing wallet received tokens without paying the same price as everyone else.
3. **A public start.** Trading opens to everyone at once, on a known venue.
4. **One price path.** Every buyer, creator included, buys from the same bonding curve or pool at the price it shows.

A bonding-curve launchpad often has no presale and sells the supply on a public curve, with the price rising as people buy. Boop's [bonding curve page](https://docs.boop.fun/the-boop-bonding-curve) describes the idea in one line, "the earlier you get in, the cheaper the token." But launchpads differ on the details, and the details decide whether "fair" is accurate.

## What Highbar's launches look like

Highbar's [docs](/docs) describe a fixed supply model for every token:

- Total supply 1,000,000,000, 6 decimals, mint authority off, metadata immutable.
- "There is no team allocation and no presale." The supply is split between the bonding curve and the 20% that goes into the Meteora DAMM v2 pool at graduation, "with nothing left over."
- "Creators get tokens only by buying them, like everyone else."

That matches the usual supply checklist. It does not make the launch fair, stop bots or Jito bundles, or prevent a rug. Two settings still matter, and we would rather spell them out than hide behind the label.

## The dev buy: a purchase, but a first one

On Highbar, a creator can add an optional dev buy of up to 20 SOL. It "goes into the same transaction that creates the pool, so you buy first," and it pays the normal minimum fee, not the anti-sniper fee. It is a purchase at the curve price, not a free allocation. It is also, by design, the cheapest buy anyone will get.

Other launchpads set different limits. Boop's deployment guide says a creator can buy up to 50% of supply at creation, while its FAQ says a creator could buy all 74.32% on the curve, which triggers graduation. Its pages don't agree, so check the live form. A large first buy, on any platform, means one wallet holds a big share at the lowest price. Whether that is "fair" depends on disclosure and on what the creator does next.

## Creator allocations and vesting

Some launchpads offer allocation tools that are reasonable in context but don't match a strict fair-launch definition:

- **Jupiter Studio**'s [launch guide](https://docs.jup.ag/user-docs/launch/studio/launching-a-token) lets a custom-mode creator vest 0% to 80% of supply. Vesting starts at graduation, with immediate, 6-month or 12-month durations, and "if the token never graduates, the vested supply never unlocks."
- **Bags**' [fee modes](https://docs.bags.fm/how-to-guides/customize-token-fees) include Low Float, which locks 96% of supply, and Drop Mode, which locks 85%.
- **Raydium LaunchLab**'s SDK exposes locked-amount, cliff and unlock parameters for launches built on it.

None of these is hidden. They just mean "fair launch" should be read alongside the allocation settings for that specific coin.

## Snipers and bundles: fair for whom?

A launch with no presale can still be dominated in its first seconds by bots or by coordinated wallets. Two different things are at work:

- **Sniping**: outsiders racing to buy first.
- **Bundling**: transactions grouped to land together in the launch block. Jito's [docs](https://docs.jito.wtf/lowlatencytxnsend/) describe bundles as up to five transactions executed sequentially and all-or-nothing.

Highbar's optional [anti-sniper fee](/articles/anti-sniper-fee-solana-token-launch) starts at 25% and decays to about 1% over 60 seconds. It is off by default. It only makes early buys more expensive. It does not stop bots or Jito bundles, and Highbar does not describe it as a defense against coordinated buying in the launch block. Other platforms offer similar tools, such as Jupiter Studio's anti-sniping fee that starts at 99%. These change the cost of being early. None makes a launch fair, and none stops bots, bundles or rugs.

## A fair-launch checklist you can run yourself

1. **Supply.** Is the total supply fixed? Is mint authority off?
2. **Allocation.** Did any wallet receive tokens without buying? Is there a vesting or lock schedule, and for how much?
3. **Dev buy.** How big was the creator's first buy, from which wallet, and was it disclosed?
4. **First block.** How many wallets bought in the same block as creation, and do they share a funding source?
5. **Locks.** Has the creator locked any tokens, and until when? Highbar's Dev Lock uses Jupiter Lock, is permanent once signed and shows a public countdown; see our [Dev Lock guide](/articles/dev-lock-token-lock-solana-explained).
6. **Config.** Can you see the launchpad config the token uses? Highbar publishes all six of its Meteora DBC config addresses in the docs.
7. **Holders over time.** Does supply spread out, or stay with the earliest wallets?

## For creators: say what you did

- Skip the dev buy, or keep it modest, and say exactly what you bought.
- Buy from one wallet, not many.
- Consider a Dev Lock on what you bought, with a date that means something.
- Decide on the anti-sniper fee deliberately and say whether it is on.
- Post the mint address so buyers don't fall for copies.

None of those choices guarantees a fair launch, stops bots or Jito bundles, or makes a token safe. Our guide to [launching a Solana memecoin](/articles/how-to-launch-a-solana-memecoin) walks through each setting, and the [launch page](/launch) lets you preview them before you sign. You can also start a launch from a post on X with the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed).

## Summary

A fair launch on Solana usually means no presale, no free allocation, a public start and one price path for everyone. Many bonding-curve launchpads start without a presale or a free team allocation, but dev buys, vesting, locks, bots and bundles all shape what actually happens. Highbar's launches have no team allocation or presale, and the creator buys like everyone else, first, if they choose a dev buy. That is not a guarantee the launch is fair, and the optional anti-sniper fee does not stop bots or Jito bundles. Check the supply, the first block and the locks yourself. A fair-looking start says nothing about where the price goes next.
