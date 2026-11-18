---
title: "Mint Authority and Freeze Authority on Solana: What They Mean and How to Check Them"
slug: mint-authority-freeze-authority-solana-explained
meta_description: "Mint authority and freeze authority on Solana in plain words: what each one can do, how to check them on an explorer, and what Highbar tokens publish."
primary_keyword: mint authority solana
secondary_keywords:
  - freeze authority solana
  - revoke mint authority
  - mint authority disabled
  - solana token authorities explained
  - immutable metadata solana
date: 2026-11-18
publish_at: "2026-11-18T12:50:00+07:00"
faq:
  - question: "What does mint authority mean on Solana?"
    answer: "It is the optional key allowed to create new units of a token. Solana's docs say that if no mint authority is present, the mint has a fixed supply and no further tokens may be minted."
  - question: "What can a freeze authority do?"
    answer: "Per the SPL Token docs, a freeze authority can issue FreezeAccount instructions that make a token account unusable until it is thawed. Instructions that include a frozen account fail."
  - question: "Do Highbar tokens have mint authority?"
    answer: "No. The Highbar docs say every token has mint authority off, so no new tokens can ever be minted, plus a fixed 1,000,000,000 supply, 6 decimals and immutable metadata. The docs do not state the freeze authority, so check that field on an explorer."
  - question: "Does a disabled mint authority make a token safe?"
    answer: "No. It removes one specific risk, new supply being created. It says nothing about who holds the existing supply, liquidity, or whether the price will hold."
---

Two fields on every Solana token tell you who still has power over it: the mint authority and the freeze authority. They are among the first things a careful trader checks, and among the easiest to misunderstand. This guide explains what each one does, how to read them, and what they do not tell you. It uses Solana's own [mint account documentation](https://solana.com/docs/tokens/basics/create-mint) and the [SPL Token program docs](https://spl.solana.com/token), read on 18 November 2026.

## The mint account in one paragraph

Every Solana token has one mint account. Its address is the token's identity across wallets, apps and explorers. Solana's docs list what the mint stores: an optional mint authority, the total supply, the number of decimals, an initialized flag and an optional freeze authority. Name, ticker and image are not stored in the mint itself. They live in a separate metadata account, either through the Metaplex Token Metadata program or, for Token-2022 mints, a built-in metadata extension.

So when an explorer shows a token's "authorities", it is reading the mint account. The ticker you see in a post is just a label on top.

## Mint authority: who can create more tokens

The mint authority is the key allowed to mint new units. Solana's docs put it plainly: if no mint authority is present, the mint has a fixed supply and no further tokens may be minted.

A creator can set the authority to nothing. The SPL Token docs show this with `spl-token authorize <mint> mint --disable`, after which the explorer shows the mint authority as disabled. Once it is gone, it cannot be added back.

### Why it matters

If a mint authority is still set, whoever holds that key could create new tokens at any time and sell them. That would dilute every holder. For a memecoin with no stated reason to keep minting, an active mint authority is a question you want answered before you buy.

There are legitimate reasons to keep one. A stablecoin issuer mints as deposits arrive, for example. The point is not that every mint authority is bad, but that it should be explained.

## Freeze authority: who can lock accounts

The freeze authority is a separate optional key. The SPL Token docs say it can issue `FreezeAccount` instructions that make a token account unusable. Any token instruction involving a frozen account fails until the account is thawed with `ThawAccount`.

In practice, a freeze authority can stop a specific wallet from moving or selling that token. Again, some issuers keep it on purpose. Regulated tokens often need the ability to freeze or claw back. [Float's docs](https://www.floatlaunch.xyz/docs) give a clear example: tokenized stocks are issued by third parties that keep powers over their tokens, including pausing transfers and moving or burning tokens from any wallet. That is a disclosed design, not a hidden trick, but it is a real risk for anyone holding those tokens.

For a memecoin, an active freeze authority with no explanation is a strong reason to stop and ask.

## Decimals and supply

Two more fields sit next to the authorities:

- **Supply** is the total number of tokens in existence, in whole units.
- **Decimals** set how finely a token can be divided. A token with 6 decimals can be split down to 0.000001.

Supply on its own tells you little. A 1,000,000,000 supply and a 1,000 supply can carry the same market cap at different prices. What matters is whether the supply can change and who holds it.

## Metadata: can the name and image change?

Metadata can be mutable or immutable. If it is mutable, whoever controls the update authority can change the name, ticker or image after launch. That has been used to rebrand legitimately, and it has been used to make a token look like something else. Immutable metadata cannot be changed by anyone.

## How to check a token's authorities

1. **Get the mint address from a source you trust.** Tickers are not unique. Copy the address from the project's official page or the launchpad's token page, not a reply.
2. **Open it on an explorer** such as Solscan or Solana Explorer.
3. **Find the mint authority field.** "Disabled", "none" or an empty value means no more tokens can be minted.
4. **Find the freeze authority field.** Same reading: empty means no one can freeze accounts.
5. **Check the metadata** for whether it is mutable and who holds the update authority.
6. **Check the token program.** Token-2022 mints can carry extensions such as transfer fees. Look for them.

Our guide on [how to check a Solana token before buying](/articles/how-to-check-a-solana-token-before-buying) puts these checks into a longer routine with holders and liquidity.

## What Highbar tokens publish

Per the [Highbar docs](/docs), every token launched on Highbar is created by the same on-chain config and shares these facts:

| Property | Value |
| --- | --- |
| Total supply | 1,000,000,000 |
| Decimals | 6 |
| Mint authority | Off. No new tokens can ever be minted |
| Metadata | Immutable |
| Token standard | SPL Token |
| Supply into the DAMM v2 pool at migration | 20% |

There is no team allocation and no presale. The docs do not state the freeze authority, so read that field on the explorer yourself, as you would for any token.

Two more facts help when you look at a Highbar token. Each launch uses one of six published Meteora Dynamic Bonding Curve configs, and the docs list their addresses so you can open them on Solscan. After graduation, liquidity moves into a Meteora DAMM v2 pool and is locked permanently.

## What authorities do not tell you

A clean set of authorities removes specific risks. It does not make a token a good buy.

- **Concentrated holders.** One wallet can hold a large share of supply with no authority at all. Check the holder list and the creator's buy; our [Dev Lock explainer](/articles/dev-lock-token-lock-solana-explained) covers how a creator can lock tokens publicly.
- **Liquidity.** A token with perfect authorities can still have very little liquidity.
- **Coordinated buying.** Several wallets buying in the first blocks is about behaviour, not authorities.
- **Price.** Most new tokens lose value whatever their settings.

## Summary

Mint authority decides whether supply can grow. Freeze authority decides whether accounts can be locked. Mutable metadata decides whether the label can change. Check all three on the mint address, not the ticker. Highbar tokens publish a fixed 1,000,000,000 supply, 6 decimals, mint authority off and immutable metadata. To launch one, start at the [launch page](/launch). If you trade from your timeline, the [Highbar Chrome extension](https://chromewebstore.google.com/detail/oioebamfkpahdnjkbbmldepkackabhed) shows token chips on X posts with a contract address; confirm the address before you trade. This is not investment advice.
