import { test } from "node:test";
import assert from "node:assert/strict";
import { PublicKey } from "@solana/web3.js";
import { TIERS, type TierId } from "@hb/shared";
import { buildTierConfig } from "./createConfigs.js";
import { CONFIG_ENV, configPubkey } from "./client.js";
import { devBuyReferral } from "./launch.js";

const tiers = Object.keys(TIERS) as TierId[];
const REF = new PublicKey("11111111111111111111111111111115");

test("dev first buy: no referral on min-fee configs (a referral would forfeit the min fee), platform referral otherwise", async () => {
  let calls = 0;
  const ref = async () => { calls++; return REF; };
  assert.equal(await devBuyReferral(1, ref), null, "enableFirstSwapWithMinFee = 1 (on-chain u8)");
  assert.equal(await devBuyReferral(true, ref), null, "enableFirstSwapWithMinFee = true (build param)");
  assert.equal(calls, 0, "the referral lookup is skipped on min-fee configs");
  assert.equal(await devBuyReferral(0, ref), REF);
  assert.equal(await devBuyReferral(false, ref), REF);
  assert.equal(await devBuyReferral(undefined, ref), REF);
  assert.equal(await devBuyReferral(0, async () => null), null, "missing platform referral account");
});

test("anti-sniper flag picks the tier's _on config, missing/false picks _off", () => {
  const saved = { ...process.env };
  try {
    process.env.NETWORK = "mainnet";
    const keys = Object.keys(CONFIG_ENV);
    keys.forEach((k, i) => { process.env[CONFIG_ENV[k]] = new PublicKey(Buffer.alloc(32, i + 1)).toBase58(); });
    for (const id of tiers) {
      assert.equal(configPubkey(id, true).toBase58(), process.env[CONFIG_ENV[`${id}_on`]], `${id}_on`);
      assert.equal(configPubkey(id, false).toBase58(), process.env[CONFIG_ENV[`${id}_off`]], `${id}_off`);
    }
  } finally { process.env = saved; }
});

test("only the _on configs enable the min-fee first swap, all 3 tiers", () => {
  for (const id of tiers) {
    assert.equal((buildTierConfig(id, true) as any).enableFirstSwapWithMinFee, true, `${id}_on`);
    assert.equal((buildTierConfig(id, false) as any).enableFirstSwapWithMinFee, false, `${id}_off`);
  }
});
