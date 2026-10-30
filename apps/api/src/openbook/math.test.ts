import { test } from "node:test";
import assert from "node:assert/strict";
import { antiSniperPortion, minOutHeadroomPct, platformFlow, splitSwapFee, swapPrices } from "./math.js";
import { TIP_ACCOUNTS, tipAccountCount, tipProvider, UNKNOWN_TIP, UNKNOWN_TIP_ACCOUNTS } from "../indexer/tipAccounts.js";

test("splitSwapFee: parts always sum to the fee; exact parts win; referral capped by protocol", () => {
  for (const tier of ["standard", "higher", "max"] as const) for (const viaUi of [false, true]) {
    const s = splitSwapFee({ side: "buy", solLamports: 1_000_000_000n, feeLamports: 10_000_000n, tier, antiSniper: false, viaUi });
    assert.equal(s.protocol + s.referral + s.creator + s.platform, s.total);
    assert.equal(s.source, "derived");
  }
  const e = splitSwapFee({ side: "buy", solLamports: 3_500_000_000n, feeLamports: 35_000_000n, tier: "max", antiSniper: false, parts: { trading: 28_000_000n, protocol: 7_000_000n, referral: 0n } });
  assert.equal(e.source, "indexed");
  assert.equal(e.trading, 28_000_000n);
  assert.equal(e.creator + e.platform, 28_000_000n);
  const big = splitSwapFee({ side: "buy", solLamports: 1n, feeLamports: 100n, tier: "standard", antiSniper: false, referralLamports: 10_000n });
  assert.ok(big.referral <= 20n);
});

test("anti-sniper portion: only above the 1% base, only on anti-sniper configs", () => {
  assert.equal(antiSniperPortion("buy", 1_000_000_000n, 10_000_000n, true), 0n);
  assert.equal(antiSniperPortion("buy", 1_000_000_000n, 250_000_000n, true), 240_000_000n);
  assert.equal(antiSniperPortion("buy", 1_000_000_000n, 250_000_000n, false), 0n);
  assert.equal(antiSniperPortion("sell", 990_000_000n, 10_000_000n, true), 0n);
});

test("platform flow 40/50/10 after rebate + cashback; never negative", () => {
  const f = platformFlow(1_000_000n, 100_000n, 100_000n);
  assert.equal(f.net, 800_000n);
  assert.deepEqual([f.buyback, f.ops, f.treasury], [320_000n, 400_000n, 80_000n]);
  const z = platformFlow(100n, 50n, 500n);
  assert.equal(z.net, 0n);
  assert.equal(z.buyback + z.ops + z.treasury, 0n);
});

test("prices + min-out headroom", () => {
  const p = swapPrices({ side: "buy", solLamports: 3_500_000_000n, tokenAmount: 42_571_548_960_550n, feeLamports: 35_000_000n, nextSqrtPrice: 169_846_617_465_225_634n })!;
  assert.ok(p.pre < p.exec && p.exec < p.post);
  assert.equal(minOutHeadroomPct(100n, 90n), 10);
  assert.equal(minOutHeadroomPct(100n, null), null);
});

test("tip accounts: unique, providers resolve, unknown-tip bucket", () => {
  const all = [...Object.values(TIP_ACCOUNTS).flat(), ...UNKNOWN_TIP_ACCOUNTS];
  assert.equal(new Set(all).size, all.length);
  assert.equal(tipAccountCount(), all.length);
  assert.equal(tipProvider("moonBtH9HvLHjLqi9ivyrMVKgFUsSfrz9BwQ9khhn1u"), "lunar-lander");
  assert.equal(tipProvider("DSAiWuoci5RNZ7skPotJsL987YaWg7bTGwAYugZV97Kx"), UNKNOWN_TIP);
  assert.equal(tipProvider("11111111111111111111111111111111"), null);
});
