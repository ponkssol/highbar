import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { CONFIG_ENV, configFilePath, indexableConfigEntries, indexableConfigSet } from "@hb/onchain";
import { store, tokenConfigAllowed, type Token } from "../store.js";

const withEnv = (env: Record<string, string | undefined>, fn: () => void | Promise<void>) => async () => {
  const saved = { ...process.env };
  try { for (const [k, v] of Object.entries(env)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } await fn(); }
  finally { process.env = saved; }
};
const file = (net: "mainnet" | "devnet") => JSON.parse(fs.readFileSync(configFilePath(net), "utf8").replace(/^\uFEFF/, ""));
const tierAddrs = (f: Record<string, unknown>) => Object.entries(f).filter(([k, v]) => /^(standard|higher|max)_(on|off)$/.test(k) && typeof v === "string").map(([, v]) => v as string);

const token = (config: string): Token => ({
  mint: "11111111111111111111111111111113", pool: "11111111111111111111111111111114", config, tier: "standard", antiSniper: false,
  creator: "11111111111111111111111111111115", createdAt: 1, quoteReserveSol: 0, thresholdSol: 1, progress: 0, isMigrated: false, priceSol: 0, mcapSol: 0,
  name: "Test Coin", symbol: "TEST", uri: "", volumeSol: 0, volume24hSol: 0, trades: 0, creatorFeesSol: 0, feesSol: 0, updatedAt: 1,
});
const fakeQ = () => { const calls: unknown[][] = []; return { calls, q: { query: async (...a: unknown[]) => { calls.push(a); return { rows: [], rowCount: 1 }; } } as any }; };

const FOREIGN = "11111111111111111111111111111112";
const noEnv = Object.fromEntries(Object.values(CONFIG_ENV).map((k) => [k, undefined]));

test("mainnet allowlist = exactly the 6 configs.mainnet.json configs; env overrides, TEST_CONFIGS and devnet configs never count",
  withEnv({ NETWORK: "mainnet", ...noEnv, CONFIG_MAX_ON: FOREIGN, TEST_CONFIGS: `higher_on=${FOREIGN}` }, () => {
    const main = tierAddrs(file("mainnet"));
    assert.equal(main.length, 6);
    const allow = indexableConfigSet();
    assert.deepEqual([...allow].sort(), [...new Set([...main, ...(file("mainnet").legacy ?? []).map((c: { address: string }) => c.address)])].sort());
    assert.ok(!allow.has(FOREIGN), "CONFIG_* / TEST_CONFIGS must not widen the mainnet allowlist");
    for (const a of tierAddrs(file("devnet"))) assert.ok(!allow.has(a), `devnet config ${a} must not be indexable on mainnet`);
    assert.equal(indexableConfigEntries().length, allow.size);
  }));

test("devnet allowlist uses the devnet configs", withEnv({ NETWORK: "devnet", ...noEnv, TEST_CONFIGS: undefined }, () => {
  const allow = indexableConfigSet();
  for (const a of tierAddrs(file("devnet"))) assert.ok(allow.has(a));
  for (const a of tierAddrs(file("mainnet"))) assert.ok(!allow.has(a));
}));

test("upsertToken refuses a token whose config is not allowlisted (nothing written), inserts an allowlisted one",
  withEnv({ NETWORK: "mainnet", ...noEnv }, async () => {
    const warn = console.warn; const warned: string[] = []; console.warn = (m: string) => { warned.push(String(m)); };
    try {
      const devnetCfg = tierAddrs(file("devnet"))[0];
      assert.equal(tokenConfigAllowed(devnetCfg), false);
      const bad = fakeQ();
      assert.equal(await store.upsertToken(token(devnetCfg), bad.q), false);
      assert.equal(bad.calls.length, 0, "no SQL for a refused token");
      assert.equal(warned.length, 1);
      assert.match(warned[0], /refused insert/);
      assert.doesNotMatch(warned[0], /https?:\/\/|postgres/i, "warning carries no URLs / secrets");
      const good = fakeQ();
      assert.equal(await store.upsertToken(token(tierAddrs(file("mainnet"))[0]), good.q), true);
      assert.equal(good.calls.length, 1);
    } finally { console.warn = warn; }
  }));
