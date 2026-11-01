import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair, PublicKey, type Connection } from "@solana/web3.js";
import BN from "bn.js";
import { cpAmmCoder, MAX_SQRT_PRICE, MIN_SQRT_PRICE } from "@meteora-ag/cp-amm-sdk";
import { buildDammSell } from "./damm";
import { checkSellTx, DAMM_V2_PROGRAM, WSOL_MINT } from "./sell";

// A DAMM v2 pool account made up in memory (Test Coin / SOL), served by a stub connection. Generated keys only, nothing is sent.
async function fakePool(mint: PublicKey) {
  const zero = Buffer.alloc(cpAmmCoder.accounts.size("Pool"));
  Buffer.from([241, 154, 109, 4, 17, 177, 109, 188]).copy(zero);
  const p = cpAmmCoder.accounts.decode("Pool", zero) as Record<string, unknown>;
  const k = (camel: string, snake: string) => (camel in p ? camel : snake);
  Object.assign(p, {
    [k("tokenAMint", "token_a_mint")]: mint, [k("tokenBMint", "token_b_mint")]: new PublicKey(WSOL_MINT),
    [k("tokenAVault", "token_a_vault")]: Keypair.generate().publicKey, [k("tokenBVault", "token_b_vault")]: Keypair.generate().publicKey,
    liquidity: new BN("100000000000000000000000000"), [k("sqrtMinPrice", "sqrt_min_price")]: MIN_SQRT_PRICE, [k("sqrtMaxPrice", "sqrt_max_price")]: MAX_SQRT_PRICE,
    [k("sqrtPrice", "sqrt_price")]: new BN("184467440737095516"), // price about 0.0001 in raw units
    [k("collectFeeMode", "collect_fee_mode")]: 1,
  });
  // the coder's own encode() allocates 1000 bytes and a pool is 1112: write with the account layout into a full size buffer
  const layout = (cpAmmCoder.accounts as unknown as { accountLayouts: Map<string, { layout: { encode(v: unknown, b: Buffer): number } }> }).accountLayouts.get("Pool")!.layout;
  const out = Buffer.alloc(zero.length); Buffer.from([241, 154, 109, 4, 17, 177, 109, 188]).copy(out);
  layout.encode(p, out.subarray(8));
  return out;
}

test("DAMM v2 route: the cp-amm-sdk swap builds a token to SOL sell that passes the checks", async () => {
  const owner = Keypair.generate(), mint = Keypair.generate().publicKey, pool = Keypair.generate().publicKey;
  const data = await fakePool(mint);
  const calls: string[] = [];
  const conn = {
    commitment: "confirmed", rpcEndpoint: "http://stub.invalid",
    getAccountInfo: async (a: PublicKey) => { calls.push("getAccountInfo"); return a.equals(pool) ? { data, owner: new PublicKey(DAMM_V2_PROGRAM), lamports: 1, executable: false } : null; },
    getAccountInfoAndContext: async (a: PublicKey) => { calls.push("getAccountInfo"); return { context: { slot: 1 }, value: a.equals(pool) ? { data, owner: new PublicKey(DAMM_V2_PROGRAM), lamports: 1, executable: false } : null }; },
    getSlot: async () => { calls.push("getSlot"); return 1000; },
    getBlockTime: async () => { calls.push("getBlockTime"); return 1_790_000_000; },
  } as unknown as Connection;
  const amountRaw = 5_000_000_000n;
  const tx = await buildDammSell(conn, { owner: owner.publicKey, pool: pool.toBase58(), mint: mint.toBase58(), amountRaw, decimals: 6, slippageBps: 1000 }, async () => "11111111111111111111111111111111");
  const s = checkSellTx(tx, owner.publicKey, { mint: mint.toBase58(), pool: pool.toBase58(), route: "damm", amountRaw });
  assert.equal(s.amountIn, amountRaw);
  assert.ok(s.minOut > 0n);
  assert.ok(tx.signatures.every((x) => x.signature === null), "unsigned");
  assert.ok(calls.includes("getSlot") && calls.includes("getAccountInfo"));
});
