import { test } from "node:test";
import assert from "node:assert/strict";
import { thresholdSolFor, TIERS, type TierId } from "@hb/shared";
import { QUOTES, buildTierConfig, thresholdForQuote } from "./createConfigs.js";

const tiers = Object.keys(TIERS) as TierId[];

test("SOL quote: config is unchanged (threshold in SOL, 9 quote decimals)", () => {
  for (const id of tiers) {
    const c: any = buildTierConfig(id, false, undefined, "mainnet");
    assert.equal(thresholdForQuote(id, "mainnet", QUOTES.SOL), thresholdSolFor(id, "mainnet"));
    assert.ok(c.migrationQuoteThreshold);
  }
});

test("USDC quote on devnet: threshold is the SOL threshold at the given price, 6 quote decimals", () => {
  for (const id of tiers) {
    assert.equal(thresholdForQuote(id, "devnet", QUOTES.USDC, 150), Math.round(thresholdSolFor(id, "devnet") * 150));
    const c: any = buildTierConfig(id, true, undefined, "devnet", QUOTES.USDC, 150);
    assert.ok(c);
  }
});

test("USDC quote needs an explicit SOL price", () => {
  assert.throws(() => thresholdForQuote("standard" as TierId, "devnet", QUOTES.USDC), /--sol-price/);
  assert.throws(() => thresholdForQuote("standard" as TierId, "devnet", QUOTES.USDC, 0), /--sol-price/);
});

test("non-SOL quotes are blocked on mainnet", () => {
  assert.throws(() => buildTierConfig("standard" as TierId, false, undefined, "mainnet", QUOTES.USDC, 150), /not enabled on mainnet/);
});

import { PublicKey } from "@solana/web3.js";
import { allowedQuote } from "./quotes.js";
test("allowedQuote: WSOL everywhere, devnet USDC on devnet only, unknown mints never", () => {
  assert.equal(allowedQuote(QUOTES.SOL.mint, "mainnet")?.id, "SOL");
  assert.equal(allowedQuote(QUOTES.USDC.mint, "devnet")?.id, "USDC");
  assert.equal(allowedQuote(QUOTES.USDC.mint, "mainnet"), null);
  assert.equal(allowedQuote(new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), "mainnet"), null); // real USDC is not enabled yet
});
