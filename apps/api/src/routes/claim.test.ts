import { test } from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import BN from "bn.js";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { AccountLayout, ACCOUNT_SIZE, NATIVE_MINT, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { CpAmm, CP_AMM_PROGRAM_ID } from "@meteora-ag/cp-amm-sdk";
import { registerClaim } from "./claim.js";
import { canonicalDammPool } from "../services/creatorLp.js";

const pk = () => Keypair.generate().publicKey;
const zero32 = () => Array(32).fill(0);
const creator = pk(), stranger = pk(), mint = pk(), config = pk(), foreignConfig = pk(), nftMint = pk(), nftAccount = pk();
const dbcPool = pk(), position = pk(), foreignPosition = pk(), foreignPool = pk();
const pool = canonicalDammPool(mint.toBase58(), 0)!;

const poolState = (tokenAMint = mint) => ({
  tokenAMint, tokenBMint: NATIVE_MINT, tokenAVault: pk(), tokenBVault: pk(), tokenAFlag: 0, tokenBFlag: 0,
  liquidity: new BN(1000), feeAPerLiquidity: zero32(), feeBPerLiquidity: zero32(), rewardInfos: [],
}) as any;
const positionState = (inPool: PublicKey) => ({
  pool: inPool, nftMint, feeAPending: new BN(5_000_000), feeBPending: new BN(250_000_000),
  feeAPerTokenCheckpoint: zero32(), feeBPerTokenCheckpoint: zero32(),
  unlockedLiquidity: new BN(0), vestedLiquidity: new BN(0), permanentLockedLiquidity: new BN(450), rewardInfos: [],
}) as any;
const ourPool = poolState(), theirPool = poolState();

function nftAccountInfo(owner: PublicKey, amount = 1n) {
  const data = Buffer.alloc(ACCOUNT_SIZE);
  AccountLayout.encode({ mint: nftMint, owner, amount, delegateOption: 0, delegate: PublicKey.default, state: 1, isNativeOption: 0,
    isNative: 0n, delegatedAmount: 0n, closeAuthorityOption: 0, closeAuthority: PublicKey.default }, data);
  return { data, owner: TOKEN_2022_PROGRAM_ID, lamports: 1, executable: false, rentEpoch: 0 };
}

type Opts = { nftOwner?: PublicKey; nftAmount?: bigint; tokenConfig?: PublicKey; inDb?: boolean };
function app(o: Opts = {}) {
  const token = { mint: mint.toBase58(), pool: dbcPool.toBase58(), name: "Mig Test", symbol: "MIG", tier: "flash", creator: creator.toBase58(),
    config: (o.tokenConfig ?? config).toBase58(), isMigrated: true } as any;
  const conn = {
    getAccountInfo: async (k: PublicKey) => (k.equals(nftAccount) ? nftAccountInfo(o.nftOwner ?? creator, o.nftAmount ?? 1n) : null),
    getLatestBlockhash: async () => ({ blockhash: Keypair.generate().publicKey.toBase58(), lastValidBlockHeight: 1 }),
  };
  const amm = new CpAmm(conn as any) as any; // real instruction builder, mocked reads
  const positions = new Map<string, any>([[position.toBase58(), positionState(pool)], [foreignPosition.toBase58(), positionState(foreignPool)]]);
  amm.fetchPositionState = async (p: PublicKey) => { const s = positions.get(p.toBase58()); if (!s) throw new Error("nope"); return s; };
  amm.fetchPoolState = async (p: PublicKey) => (p.equals(pool) ? ourPool : p.equals(foreignPool) ? theirPool : Promise.reject(new Error("nope")));
  amm.getPositionsByUserAndTokenMint = async (u: PublicKey, m: PublicKey) => (!u.equals(creator) || !m.equals(mint) ? [] : [
    { position, positionNftAccount: nftAccount, positionState: positions.get(position.toBase58()), pool, poolState: ourPool },
    { position: foreignPosition, positionNftAccount: pk(), positionState: positions.get(foreignPosition.toBase58()), pool: foreignPool, poolState: theirPool },
  ]);
  const dbc = { state: {
    getPool: async () => ({ poolState: { config, isMigrated: 1, creatorQuoteFee: new BN(100_000_000), creatorBaseFee: new BN(0), migrationFeeWithdrawStatus: 0b010 } }),
    getPoolConfig: async () => ({ migrationQuoteThreshold: new BN(85e9), migrationFeePercentage: 0, creatorMigrationFeePercentage: 0, migrationFeeOption: 0 }),
  } };
  const store = {
    tokensByCreator: async (c: string) => (c === token.creator ? [token] : []),
    getToken: async (k: string) => (o.inDb === false ? null : k === token.mint || k === token.pool ? token : null),
  } as any;
  const f = Fastify();
  registerClaim(f, { dbc, amm, conn: conn as any, store, platformConfigs: () => new Set([config.toBase58()]) });
  return f;
}
const build = (f: ReturnType<typeof app>, body: Record<string, string>) => f.inject({ method: "POST", url: "/claim/build", payload: { kind: "lp", ...body } });

test("GET /claim: lists only positions in our canonical pool and sums lpSol into totalSol", async () => {
  const r = await app().inject({ method: "GET", url: `/claim/${creator.toBase58()}` });
  assert.equal(r.statusCode, 200);
  const j = r.json();
  const row = j.tokens[0];
  assert.equal(row.lp.dammPool, pool.toBase58());
  assert.equal(row.lp.positions.length, 1, "position in a foreign pool with the same mint is filtered out");
  assert.deepEqual(row.lp.positions[0], { dammPool: pool.toBase58(), position: position.toBase58(), positionNftAccount: nftAccount.toBase58(),
    unclaimedSol: 0.25, unclaimedToken: 5, lockedSharePct: 45 });
  assert.equal(row.lpFeeSol, 0.25);
  assert.equal(j.totalLpSol, 0.25);
  assert.ok(Math.abs(j.totalSol - 0.35) < 1e-12, "trading 0.1 + lp 0.25 (migration fee already withdrawn)");
  assert.equal("lpFees" in row, false);
});

test("GET /claim: a wallet that no longer holds the NFT sees no positions", async () => {
  const f = app();
  // stranger launched nothing and holds nothing
  const j = (await f.inject({ method: "GET", url: `/claim/${stranger.toBase58()}` })).json();
  assert.equal(j.totalLpSol, 0); assert.equal(j.tokens.length, 0);
});

test("POST /claim/build lp: non-owner is rejected", async () => {
  const r = await build(app(), { creator: stranger.toBase58(), pool: pool.toBase58(), position: position.toBase58() });
  assert.equal(r.statusCode, 403); assert.match(r.json().error, /does not hold/);
});

test("POST /claim/build lp: NFT account owned by someone else, or amount != 1, is rejected", async () => {
  for (const o of [{ nftOwner: stranger }, { nftAmount: 0n }]) {
    const r = await build(app(o), { creator: creator.toBase58(), pool: pool.toBase58(), position: position.toBase58() });
    assert.equal(r.statusCode, 403, String(o.nftAmount ?? "owner"));
  }
});

test("POST /claim/build lp: pools that aren't ours are rejected", async () => {
  // same mint, different (non-canonical) pool
  let r = await build(app(), { creator: creator.toBase58(), pool: foreignPool.toBase58(), position: foreignPosition.toBase58() });
  assert.equal(r.statusCode, 403); assert.match(r.json().error, /DAMM v2 pool/);
  // token not in our DB
  r = await build(app({ inDb: false }), { creator: creator.toBase58(), pool: pool.toBase58(), position: position.toBase58() });
  assert.equal(r.statusCode, 403); assert.match(r.json().error, /not a highbar pool/);
  // token in DB but its config is not one of our platform configs
  r = await build(app({ tokenConfig: foreignConfig }), { creator: creator.toBase58(), pool: pool.toBase58(), position: position.toBase58() });
  assert.equal(r.statusCode, 403);
  // position/pool mismatch
  r = await build(app(), { creator: creator.toBase58(), pool: pool.toBase58(), position: foreignPosition.toBase58() });
  assert.equal(r.statusCode, 400);
});

test("POST /claim/build lp: returns an unsigned claimPositionFee tx with the right accounts", async () => {
  const r = await build(app(), { creator: creator.toBase58(), pool: pool.toBase58(), position: position.toBase58() });
  assert.equal(r.statusCode, 200, r.body);
  const j = r.json();
  assert.equal(j.kind, "lp"); assert.equal(j.pool, pool.toBase58()); assert.equal(j.position, position.toBase58());
  assert.equal(j.positionNftAccount, nftAccount.toBase58()); assert.equal(j.mint, mint.toBase58());
  const tx = Transaction.from(Buffer.from(j.tx, "base64"));
  assert.ok(tx.feePayer?.equals(creator)); assert.ok(tx.recentBlockhash);
  const ix = tx.instructions.find((i) => i.programId.equals(CP_AMM_PROGRAM_ID));
  assert.ok(ix, "has a cp-amm instruction");
  const keys = ix!.keys.map((k) => k.pubkey.toBase58());
  for (const k of [pool, position, nftAccount, creator, mint, NATIVE_MINT, ourPool.tokenAVault, ourPool.tokenBVault]) assert.ok(keys.includes(k.toBase58()), k.toBase58());
  assert.ok(ix!.keys.find((k) => k.pubkey.equals(creator))!.isSigner, "NFT owner signs");
  assert.ok(!keys.includes(foreignPool.toBase58()));
});

test("POST /claim/build: unknown kind still rejected", async () => {
  const r = await app().inject({ method: "POST", url: "/claim/build", payload: { kind: "bogus", creator: creator.toBase58(), pool: pool.toBase58() } });
  assert.equal(r.statusCode, 400);
});