import BN from "bn.js";
import { PublicKey, type AccountInfo, type Transaction } from "@solana/web3.js";
import { AccountLayout, ACCOUNT_SIZE, NATIVE_MINT, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getTokenProgram, getUnClaimLpFee, type CpAmm, type PoolState, type PositionState } from "@meteora-ag/cp-amm-sdk";
import { DAMM_V2_MIGRATION_FEE_ADDRESS, deriveDammV2PoolAddress } from "@meteora-ag/dynamic-bonding-curve-sdk";

/** Creator side of the post-migration DAMM v2 LP fees (cp-amm-sdk 1.5.1).
 *  At migration DBC mints two permanently locked positions (creator + partner); fees accrue on them and are claimed with
 *  CpAmm.claimPositionFee, signed by the current holder of the position NFT. Everything here is read/build only: no signing, no sends. */

const LAMPORTS = 1e9, BASE_DEC = 1e6;
const num = (b: BN, d: number) => Number(b.toString()) / d;

/** The subset of CpAmm used here (kept narrow so tests can mock it). */
export interface LpAmm {
  fetchPoolState(pool: PublicKey): Promise<PoolState>;
  fetchPositionState(position: PublicKey): Promise<PositionState>;
  getPositionsByUserAndTokenMint(user: PublicKey, mint: PublicKey): Promise<Array<{ positionNftAccount: PublicKey; position: PublicKey; positionState: PositionState; pool: PublicKey; poolState: PoolState }>>;
  claimPositionFee(p: Parameters<import("@meteora-ag/cp-amm-sdk").CpAmm["claimPositionFee"]>[0]): Promise<Transaction>;
}
/** Build claimPositionFee for `owner` (signer, holds the position NFT), paying the fees out to `receiver` when it is a different wallet.
 *  cp-amm-sdk 1.5.1: claimPositionFee({ receiver }) without a tempWSolAccount sets the SOL-side token account owner to undefined and
 *  throws while building (setupFeeClaimAccounts). claimPositionFee2 is the receiver variant: the SOL side lands in the owner's WSOL ATA,
 *  which is closed (unwrapped) to `receiver` in the same tx, and the token side goes to the receiver's ATA (created by `feePayer`).
 *  No receiver (or receiver = owner): plain claimPositionFee, everything stays with the owner. Build only, no RPC. */
export function claimPositionFeeTx(amm: Pick<CpAmm, "claimPositionFee" | "claimPositionFee2">, p: {
  owner: PublicKey; feePayer?: PublicKey; receiver?: PublicKey; position: PublicKey; pool: PublicKey; positionNftAccount: PublicKey;
  poolState: Pick<PoolState, "tokenAMint" | "tokenBMint" | "tokenAVault" | "tokenBVault" | "tokenAFlag" | "tokenBFlag">;
}): Promise<Transaction> {
  const st = p.poolState;
  const common = {
    owner: p.owner, feePayer: p.feePayer ?? p.owner, position: p.position, pool: p.pool, positionNftAccount: p.positionNftAccount,
    tokenAMint: st.tokenAMint, tokenBMint: st.tokenBMint, tokenAVault: st.tokenAVault, tokenBVault: st.tokenBVault,
    tokenAProgram: getTokenProgram(st.tokenAFlag), tokenBProgram: getTokenProgram(st.tokenBFlag),
  };
  return p.receiver && !p.receiver.equals(p.owner) ? amm.claimPositionFee2({ ...common, receiver: p.receiver }) : amm.claimPositionFee(common);
}
export interface LpConn { getAccountInfo(pk: PublicKey, commitment?: "confirmed"): Promise<AccountInfo<Buffer> | null> }

export interface LpPosition {
  dammPool: string; position: string; positionNftAccount: string;
  unclaimedSol: number; unclaimedToken: number;
  /** position permanent-locked liquidity / pool liquidity, in % */
  lockedSharePct: number;
}

/** Our canonical DAMM v2 pool for a token: the DAMM v2 config of the DBC config's migrationFeeOption (DAMM_V2_CONFIG overrides, like the keeper), token/WSOL. */
export function canonicalDammPool(mint: string, migrationFeeOption: number, env: NodeJS.ProcessEnv = process.env): PublicKey | null {
  const dammConfig = env.DAMM_V2_CONFIG ? new PublicKey(env.DAMM_V2_CONFIG) : DAMM_V2_MIGRATION_FEE_ADDRESS[migrationFeeOption];
  return dammConfig ? deriveDammV2PoolAddress(dammConfig, new PublicKey(mint), NATIVE_MINT) : null;
}

/** Unclaimed fees of a position split into SOL (quote) and token (base), whichever side the quote mint sits on. */
export function positionFees(poolState: PoolState, positionState: PositionState) {
  const fee = getUnClaimLpFee(poolState, positionState);
  const quoteIsB = poolState.tokenBMint.equals(NATIVE_MINT), quoteIsA = poolState.tokenAMint.equals(NATIVE_MINT);
  const solRaw = quoteIsB ? fee.feeTokenB : quoteIsA ? fee.feeTokenA : new BN(0);
  const tokRaw = quoteIsB ? fee.feeTokenA : quoteIsA ? fee.feeTokenB : fee.feeTokenA.add(fee.feeTokenB);
  return { sol: num(solRaw, LAMPORTS), token: num(tokRaw, BASE_DEC) };
}

const share = (pos: PositionState, pool: PoolState) => {
  const total = Number(pool.liquidity.toString());
  return total > 0 ? +(Number(pos.permanentLockedLiquidity.toString()) / total * 100).toFixed(4) : 0;
};

/** Positions in `dammPool` whose NFT the wallet holds right now (a sold/transferred NFT is not listed). */
export async function creatorPositions(amm: LpAmm, owner: PublicKey, mint: string, dammPool: PublicKey): Promise<LpPosition[]> {
  const all = await amm.getPositionsByUserAndTokenMint(owner, new PublicKey(mint)); // matches ANY pool with this mint: keep ours only
  return all.filter((p) => p.pool.equals(dammPool)).map((p) => {
    const f = positionFees(p.poolState, p.positionState);
    return { dammPool: p.pool.toBase58(), position: p.position.toBase58(), positionNftAccount: p.positionNftAccount.toBase58(),
      unclaimedSol: f.sol, unclaimedToken: f.token, lockedSharePct: share(p.positionState, p.poolState) };
  });
}

/** Position NFT account check: an SPL / Token-2022 account for `nftMint`, owned by `owner`, holding exactly 1. */
export function ownsPositionNft(info: AccountInfo<Buffer> | null, owner: PublicKey, nftMint: PublicKey): boolean {
  if (!info || info.data.length < ACCOUNT_SIZE) return false;
  if (!info.owner.equals(TOKEN_2022_PROGRAM_ID) && !info.owner.equals(TOKEN_PROGRAM_ID)) return false;
  const a = AccountLayout.decode(info.data.subarray(0, ACCOUNT_SIZE));
  return a.owner.equals(owner) && a.mint.equals(nftMint) && a.amount === 1n;
}

export class LpClaimError extends Error { constructor(public status: number, msg: string) { super(msg); } }

/** Build (unsigned) claimPositionFee for `owner` (also fee payer) after checking: the position is in `pool`, `pool` is the canonical
 *  pool of a token in our DB whose DBC config is one of our platform configs, and `owner` holds the position NFT (amount 1). */
export async function buildLpClaim(o: {
  amm: LpAmm; conn: LpConn; owner: PublicKey; pool: PublicKey; position: PublicKey;
  tokenOf: (mint: string) => Promise<{ mint: string; config: string } | null>;
  platformConfigs: Set<string>;
  migrationFeeOptionOf: (config: string) => Promise<number | null>;
}): Promise<{ tx: Transaction; positionNftAccount: PublicKey; mint: string }> {
  const ps = await o.amm.fetchPositionState(o.position).catch(() => null);
  if (!ps) throw new LpClaimError(404, "position not found");
  if (!ps.pool.equals(o.pool)) throw new LpClaimError(400, "position is not in this pool");
  const st = await o.amm.fetchPoolState(o.pool).catch(() => null);
  if (!st) throw new LpClaimError(404, "pool not found");
  const mint = st.tokenBMint.equals(NATIVE_MINT) ? st.tokenAMint : st.tokenAMint.equals(NATIVE_MINT) ? st.tokenBMint : null;
  const t = mint ? await o.tokenOf(mint.toBase58()) : null;
  if (!t || !o.platformConfigs.has(t.config)) throw new LpClaimError(403, "pool is not a highbar pool");
  const opt = await o.migrationFeeOptionOf(t.config);
  const canonical = opt == null ? null : canonicalDammPool(t.mint, opt);
  if (!canonical || !canonical.equals(o.pool)) throw new LpClaimError(403, "pool is not the token's highbar DAMM v2 pool");
  const held = (await o.amm.getPositionsByUserAndTokenMint(o.owner, new PublicKey(t.mint))).find((p) => p.position.equals(o.position) && p.pool.equals(o.pool));
  const info = held ? await o.conn.getAccountInfo(held.positionNftAccount, "confirmed") : null;
  if (!held || !ownsPositionNft(info, o.owner, ps.nftMint)) throw new LpClaimError(403, "wallet does not hold this position NFT");
  const tx = await o.amm.claimPositionFee({
    owner: o.owner, feePayer: o.owner, position: o.position, pool: o.pool, positionNftAccount: held.positionNftAccount,
    tokenAMint: st.tokenAMint, tokenBMint: st.tokenBMint, tokenAVault: st.tokenAVault, tokenBVault: st.tokenBVault,
    tokenAProgram: getTokenProgram(st.tokenAFlag), tokenBProgram: getTokenProgram(st.tokenBFlag),
  });
  return { tx, positionNftAccount: held.positionNftAccount, mint: t.mint };
}