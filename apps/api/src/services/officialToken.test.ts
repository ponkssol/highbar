import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair } from "@solana/web3.js";
import {
  clearOfficial, detectOfficial, impersonationBlock, memoryOfficialRepo, normSymbol, officialConfig, overrideOfficial, refreshOfficial, resolveOfficial,
  type LaunchCandidate,
} from "./officialToken.js";

const pk = () => Keypair.generate().publicKey.toBase58();
const DEV = pk(), OTHER = pk();
const cfgOf = (extra: Record<string, string> = {}) => officialConfig({ OFFICIAL_TOKEN_CREATOR: DEV, ...extra });
const launch = (o: Partial<LaunchCandidate> = {}): LaunchCandidate => ({ mint: pk(), pool: pk(), creator: DEV, symbol: "HIGHER", createdAt: 1_000, ...o });

test("config: symbol defaults to HIGHER, empty creator is null, invalid creator ignored", () => {
  assert.equal(officialConfig({}).symbol, "HIGHER");
  assert.equal(officialConfig({ OFFICIAL_TOKEN_CREATOR: "" }).creator, null);
  assert.equal(officialConfig({ OFFICIAL_TOKEN_CREATOR: "not-a-key" }).creator, null);
  assert.equal(officialConfig({ OFFICIAL_TOKEN_SYMBOL: "$abc" }).symbol, "ABC");
  assert.equal(normSymbol(" $higher\u200b "), "HIGHER");
  assert.equal(normSymbol("ＨＩＧＨＥＲ"), "HIGHER"); // full-width folds via NFKC
});

test("resolver: BAR_MINT wins, then the stored row, else not launched", () => {
  const envMint = pk(), detected = launch();
  const row = { mint: detected.mint, symbol: "HIGHER", creator: DEV, pool: detected.pool!, source: "detected" as const, launchedAt: 1_000, recordedAt: 2_000 };
  assert.deepEqual(resolveOfficial(cfgOf(), null), { mint: null, source: null, symbol: "HIGHER", creator: DEV, pool: null, launchedAt: null });
  assert.equal(resolveOfficial(cfgOf(), row).mint, detected.mint);
  assert.equal(resolveOfficial(cfgOf(), row).source, "detected");
  const withEnv = resolveOfficial(cfgOf({ BAR_MINT: envMint }), row);
  assert.equal(withEnv.mint, envMint); assert.equal(withEnv.source, "env");
});

test("detection: only the creator's launch with the official symbol (case-insensitive) counts, first one wins, idempotent", async () => {
  const repo = memoryOfficialRepo(), cfg = cfgOf();
  const first = launch({ symbol: "higher", createdAt: 500 }), later = launch({ createdAt: 900 });
  const fakes = [launch({ creator: OTHER, createdAt: 100 }), launch({ symbol: "HIGHERX", createdAt: 50 })];
  const row = await detectOfficial([later, ...fakes, first], cfg, repo, 10);
  assert.equal(row?.mint, first.mint); assert.equal(row?.symbol, "HIGHER"); assert.equal(row?.source, "detected");
  // re-runs (same or new launches, even an earlier one appearing later) never change the recorded token
  assert.equal(await detectOfficial([first, later], cfg, repo), null);
  assert.equal(await detectOfficial([launch({ createdAt: 1 })], cfg, repo), null);
  assert.equal((await repo.get())?.mint, first.mint);
  assert.equal((await refreshOfficial(repo, { OFFICIAL_TOKEN_CREATOR: DEV })).mint, first.mint);
});

test("detection: nothing without OFFICIAL_TOKEN_CREATOR", async () => {
  const repo = memoryOfficialRepo();
  assert.equal(await detectOfficial([launch()], officialConfig({}), repo), null);
  assert.equal(await repo.get(), null);
});

test("impersonation: HIGHER from any other wallet is refused, the dev wallet and other symbols pass", () => {
  const cfg = cfgOf();
  for (const s of ["HIGHER", "higher", "$Higher", "ＨＩＧＨＥＲ"]) assert.match(impersonationBlock(s, OTHER, cfg) ?? "", /reserved for the official/, s);
  assert.equal(impersonationBlock("HIGHER", DEV, cfg), null);
  assert.equal(impersonationBlock("HIGH", OTHER, cfg), null);
  assert.equal(impersonationBlock("HIGHERS", OTHER, cfg), null);
  // creator not configured yet: nobody may take the symbol
  assert.ok(impersonationBlock("HIGHER", DEV, officialConfig({})));
});

test("admin override replaces the detected token; clear goes back to auto-detection; BAR_MINT still wins", async () => {
  const env = { OFFICIAL_TOKEN_CREATOR: DEV }, repo = memoryOfficialRepo(), cfg = officialConfig(env);
  const first = launch();
  await detectOfficial([first], cfg, repo);
  const pinned = pk();
  const o = await overrideOfficial({ mint: pinned, symbol: "higher" }, repo, env);
  assert.equal(o.mint, pinned); assert.equal(o.source, "override");
  assert.equal(await detectOfficial([first], cfg, repo), null, "detection does not overwrite an override");
  await assert.rejects(overrideOfficial({ mint: "nope" }, repo, env), /valid Solana address/);
  const envMint = pk();
  assert.equal((await refreshOfficial(repo, { ...env, BAR_MINT: envMint })).mint, envMint);
  const c = await clearOfficial(repo, env);
  assert.equal(c.removed, true); assert.equal(c.official.mint, null);
  assert.equal((await detectOfficial([first], cfg, repo))?.mint, first.mint, "after clear the first official launch is detected again");
});
