import { test } from "node:test";
import assert from "node:assert/strict";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { DEVNET_LOCK_TIP_WALLET, lockTip, parseLockTipSol } from "./lock.js";

const TIP = "DN6H7ksaFRQp9oyj2guFoHf7UzYXAni9jTNAmHjnhigh";

test("lockTip mainnet: LOCK_TIP_WALLET and LOCK_TIP_SOL are required, no fallback", () => {
  for (const env of [
    { NETWORK: "mainnet" },
    { NETWORK: "mainnet", LOCK_TIP_SOL: "0.005" },
    { NETWORK: "mainnet", LOCK_TIP_WALLET: TIP },
    { NETWORK: "mainnet-beta", LOCK_TIP_WALLET: "<FILL_ME>", LOCK_TIP_SOL: "0.005" },
    { NETWORK: "mainnet", LOCK_TIP_WALLET: TIP, LOCK_TIP_SOL: "<FILL_ME>" },
    { NETWORK: "mainnet", LOCK_TIP_WALLET: "not-a-key", LOCK_TIP_SOL: "0.005" },
    { NETWORK: "mainnet", LOCK_TIP_WALLET: TIP, LOCK_TIP_SOL: "0" },
    { NETWORK: "mainnet", LOCK_TIP_WALLET: TIP, LOCK_TIP_SOL: "5" },
  ]) assert.throws(() => lockTip(env), JSON.stringify(env));
  const t = lockTip({ NETWORK: "mainnet", LOCK_TIP_WALLET: TIP, LOCK_TIP_SOL: "0.005" });
  assert.equal(t.tipWallet.toBase58(), TIP); assert.equal(t.tipSol, 0.005); assert.equal(t.tipLamports, 0.005 * LAMPORTS_PER_SOL);
});

test("lockTip devnet: keeps the fallback wallet and 0.005 SOL", () => {
  const t = lockTip({ NETWORK: "devnet" });
  assert.equal(t.tipWallet.toBase58(), DEVNET_LOCK_TIP_WALLET); assert.equal(t.tipSol, 0.005);
  assert.equal(lockTip({}).tipWallet.toBase58(), DEVNET_LOCK_TIP_WALLET);
  assert.equal(lockTip({ NETWORK: "devnet", LOCK_TIP_WALLET: TIP, LOCK_TIP_SOL: "0.01" }).tipWallet.toBase58(), TIP);
});

test("parseLockTipSol: plain decimal > 0 and <= 0.1", () => {
  for (const ok of ["0.005", "0.1", ".01", "0.0001"]) assert.ok(parseLockTipSol(ok) !== null, ok);
  for (const bad of [undefined, "", "0", "-0.005", "abc", "1e-3", "0.2", "Infinity", "NaN", "<FILL_ME>"]) assert.equal(parseLockTipSol(bad), null, String(bad));
});
