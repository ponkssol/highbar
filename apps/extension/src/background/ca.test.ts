import { test } from "node:test";
import assert from "node:assert/strict";
import { gate, mergeInfo, topPair, type DexPair } from "./ca";

const MINT = "BkMjuu1cPLzTaLp8uTsR5xE9NttRsKVTqTKyrdKepump";
const POOL = "HbZ73YQ7UV3AQf2ZzhZrJYtzM937gJiCV2hFUmKxsKqz";

test("ca worker: the top pair is the most liquid one for this base token", () => {
  const pairs: DexPair[] = [
    { pairAddress: "a", baseToken: { address: MINT }, liquidity: { usd: 10 } },
    { pairAddress: POOL, baseToken: { address: MINT }, liquidity: { usd: 900 } },
    { pairAddress: "c", baseToken: { address: "other" }, liquidity: { usd: 9e9 } },
  ] as DexPair[];
  assert.equal(topPair(pairs, MINT)?.pairAddress, POOL);
  assert.equal(topPair(null, MINT), null);
});

test("ca worker: merge prefers DexScreener market numbers, Jupiter names and verified", () => {
  const i = mergeInfo(MINT, {
    jup: { id: MINT, name: "Test Coin", symbol: "TEST", usdPrice: 0.002, mcap: 2_000_000, liquidity: 50_000, isVerified: true, decimals: 6, tokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
    dex: { pairAddress: POOL, dexId: "meteora", priceUsd: "0.0021", priceChange: { h24: 12.5 }, volume: { h24: 345_000 }, liquidity: { usd: 51_000 }, marketCap: 2_100_000, baseToken: { address: MINT, name: "Test Coin", symbol: "TEST" } } as DexPair,
    siteUrl: "https://highbar.capital",
  });
  assert.equal(i.name, "Test Coin"); assert.equal(i.symbol, "TEST");
  assert.equal(i.priceUsd, 0.002); assert.equal(i.change24h, 12.5); assert.equal(i.volume24hUsd, 345_000);
  assert.equal(i.mcapUsd, 2_000_000); assert.equal(i.liquidityUsd, 51_000);
  assert.equal(i.verified, true); assert.equal(i.pool, POOL); assert.equal(i.highbar, false); assert.equal(i.tokenUrl, null);
  assert.equal(i.tokenProgram, "spl");
  assert.deepEqual(i.sources, ["jupiter", "dexscreener"]);
});

test("ca worker: an unknown token still gets a shape, the chart pool falls back to GeckoTerminal", () => {
  const i = mergeInfo(MINT, { gtPool: POOL, siteUrl: "https://highbar.capital" });
  assert.equal(i.name, "Unknown token"); assert.equal(i.priceUsd, null); assert.equal(i.pool, POOL); assert.equal(i.dex, "geckoterminal");
  assert.equal(i.tokenProgram, null);
});

test("ca worker: the gate spaces calls", async () => {
  const g = gate(40), t0 = Date.now(), at: number[] = [];
  await Promise.all([1, 2, 3].map(() => g(async () => { at.push(Date.now() - t0); })));
  assert.ok(at[2]! >= 75, String(at));
});

test("ca: a pump coin only pump.fun knows still opens (name, symbol from its coin record)", () => {
  const mint = "CEMEy7jkeytkxq3qYjaKyQnKiUdHAMJDM1B1tv2Upump";
  const i = mergeInfo(mint, { pump: { mint, name: "Test Coin", symbol: "TEST" }, siteUrl: "https://highbar.capital" });
  assert.equal(i.name, "Test Coin"); assert.equal(i.symbol, "TEST"); assert.deepEqual(i.sources, ["pump.fun"]);
  assert.equal(mergeInfo(mint, { pump: { mint: "other", name: "Other" }, siteUrl: "https://highbar.capital" }).name, "Unknown token");
});
