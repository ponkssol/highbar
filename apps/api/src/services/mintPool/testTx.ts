/** Test helper (no RPC): builds launch txs with the real DBC SDK 2.0.0 builders over a stubbed connection + pool config. */
import BN from "bn.js";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { MINT_SIZE, MintLayout, NATIVE_MINT, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";

export const BLOCKHASH = "GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi";
const conn = new Connection("http://127.0.0.1:9", "confirmed");
const c = conn as unknown as Record<string, unknown>;
// the only account the builders read: the WSOL mint (to pick its token program)
const wsolData = Buffer.alloc(MINT_SIZE);
MintLayout.encode({ mintAuthorityOption: 0, mintAuthority: PublicKey.default, supply: 0n, decimals: 9, isInitialized: true, freezeAuthorityOption: 0, freezeAuthority: PublicKey.default }, wsolData);
const account = (k: PublicKey) => k.equals(NATIVE_MINT) ? { data: wsolData, owner: TOKEN_PROGRAM_ID, lamports: 1e9, executable: false, rentEpoch: 0 } : null;
c.getAccountInfo = async (k: PublicKey) => account(k);
c.getAccountInfoAndContext = async (k: PublicKey) => ({ context: { slot: 1 }, value: account(k) });
c.getMultipleAccountsInfo = async (keys: PublicKey[]) => keys.map(account);
c.getLatestBlockhash = async () => ({ blockhash: BLOCKHASH, lastValidBlockHeight: 1 });
c.getEpochInfo = async () => ({ epoch: 800, slotIndex: 0, slotsInEpoch: 432000, absoluteSlot: 345600000, blockHeight: 1, transactionCount: null });
c._rpcRequest = async (method: string) => { throw new Error(`test: unexpected RPC ${method}`); };

export function client(opts: { tokenType?: 0 | 1; minFee?: boolean } = {}) {
  const cl = new DynamicBondingCurveClient(conn, "confirmed");
  const fake = { tokenType: opts.tokenType ?? 0, quoteMint: NATIVE_MINT, version: 0, enableFirstSwapWithMinFee: opts.minFee ? 1 : 0, quoteTokenFlag: 0 };
  for (const svc of [cl.creator, cl.pool, cl.partner] as unknown as Record<string, unknown>[]) if (svc) svc.getPoolConfigForNewPool = async () => fake;
  return cl;
}

export interface Built { tx: Transaction; mint: PublicKey; creator: Keypair; config: PublicKey }
export async function buildLaunch(o: { mint: PublicKey; creator: Keypair; config: PublicKey; devBuyLamports?: number; referral?: PublicKey | null; tokenType?: 0 | 1; minFee?: boolean }): Promise<Transaction> {
  const cl = client({ tokenType: o.tokenType, minFee: o.minFee });
  const creator = o.creator.publicKey;
  const tx: Transaction = await cl.creator.createPoolWithFirstBuy({
    createPoolParam: { name: "Test Coin", symbol: "TEST", uri: "https://example.com/meta/test.json", payer: creator, poolCreator: creator, config: o.config, baseMint: o.mint },
    firstBuyParam: o.devBuyLamports ? { buyer: creator, receiver: creator, buyAmount: new BN(o.devBuyLamports), minimumAmountOut: new BN(1), referralTokenAccount: o.referral ?? null } : undefined,
  } as never);
  tx.feePayer = creator;
  tx.recentBlockhash = BLOCKHASH;
  return tx;
}

/** wallet half: creator signs first, returns base64 of the partially signed tx */
export function walletSign(tx: Transaction, creator: Keypair): string {
  tx.partialSign(creator);
  return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
}
