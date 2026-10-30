/**
 * Vanity mint pool: every highbar launch gets a pre-ground mint whose base58 ends in "high".
 *
 *  refill (jobs/mintPool.ts, own Railway service): keep >= MINT_POOL_MIN_AVAILABLE rows 'available', grinding in worker threads.
 *  POST /tx/launch         -> reserveMint (atomic, SKIP LOCKED; a creator's unsigned live reservation is reused) and the
 *                             unsigned DBC create tx with that mint. Only the pubkey leaves the API.
 *  wallet signTransaction  -> the creator signs FIRST (fee payer / pool creator).
 *  POST /tx/launch/sign    -> signLaunchTx: strict validation (validateLaunchTx.ts), then the API adds the mint signature.
 *  POST /mint/confirm      -> marks the mint used once its account exists on-chain.
 *  sweep (API + refill)    -> expired reservations go back to 'available' ONLY if the mint account does not exist on-chain;
 *                             if it exists the row becomes 'used'. A mint is never handed out twice nor reused once on-chain.
 *
 * Secrets: decrypted only inside signLaunchTx, in memory, and wiped right after signing. Never logged or returned.
 */
import bs58 from "bs58";
import { PublicKey, Transaction } from "@solana/web3.js";
import { getConnection, indexableConfigSet, keypairFromSeed, loadConfigs, network, VANITY_SUFFIX, hasVanitySuffix, referralAta, wipeKeypair } from "@hb/onchain";
import { encKeyFromEnv, openSeed, sealSeed } from "./secretBox.js";
import * as store from "./store.js";
import type { Sql } from "./store.js";
import { LaunchTxRejected, validateLaunchTx } from "./validateLaunchTx.js";

export { LaunchTxRejected, validateLaunchTx } from "./validateLaunchTx.js";
export type { Sql } from "./store.js";

const num = (k: string, d: number, min = 1) => { const n = Number(process.env[k]); return Number.isFinite(n) && n >= min ? Math.floor(n) : d; };
export const mintPoolConfig = () => ({
  minAvailable: num("MINT_POOL_MIN_AVAILABLE", 50),
  reservationMin: num("MINT_POOL_RESERVATION_MIN", 10),
  /** a signed tx's blockhash lives ~60-90 s; hold a signed reservation at least this long before the sweeper may look at it */
  signedHoldMin: 5,
  /** max simultaneous reservations per creator wallet (anti-drain) */
  maxPerCreator: num("MINT_POOL_MAX_PER_CREATOR", 3),
});

export class MintPoolError extends Error {
  constructor(readonly code: "MINT_POOL_EMPTY" | "MINT_POOL_DISABLED" | "TOO_MANY_RESERVATIONS" | "RESERVATION_INVALID", msg: string, readonly status: number) { super(msg); this.name = "MintPoolError"; }
}

/** The 6 tier configs new launches may use: configs.<network>.json (+ CONFIG_* env, as configPubkey). On mainnet a config
 *  must also be in configs.mainnet.json itself (indexableConfigSet), so a stray env override can never get a mint signed. */
export function launchConfigs(): string[] {
  const tier = Object.entries(loadConfigs()).filter(([k]) => /^(standard|higher|max)_(on|off)$/.test(k)).map(([, v]) => v);
  if (network() !== "mainnet") return tier;
  const file = indexableConfigSet("mainnet");
  return tier.filter((c) => file.has(c));
}

export async function reserveMint(q: Sql, creator: string): Promise<store.Reservation> {
  const c = mintPoolConfig();
  const again = await store.reuseUnsigned(q, creator, c.reservationMin);
  if (again) return again;
  if ((await store.activeReservations(q, creator)) >= c.maxPerCreator) throw new MintPoolError("TOO_MANY_RESERVATIONS", "too many pending launches for this wallet; wait a few minutes", 429);
  const r = await store.reserveFresh(q, creator, c.reservationMin);
  if (!r) throw new MintPoolError("MINT_POOL_EMPTY", `no ...${VANITY_SUFFIX} mint address is available right now; please try again in a few minutes`, 503);
  if (!hasVanitySuffix(r.mint)) { await store.markUsed(q, r.mint); throw new Error("mint pool returned a non-vanity mint"); } // never hand it out
  return r;
}

/** A live reservation of `mint` held by `creator`, else a MintPoolError. */
export async function requireReservation(q: Sql, mint: string, creator: string) {
  const r = await store.getReservation(q, mint);
  if (!r || r.status !== "reserved" || r.creator !== creator || !r.live) throw new MintPoolError("RESERVATION_INVALID", "mint reservation missing or expired; start the launch again", 409);
  return r;
}

export interface SignOpts { configs?: string[]; referrals?: string[]; key?: Buffer }

/** Validate the wallet-signed launch tx and add the mint signature. Returns the fully signed tx (base64). */
export async function signLaunchTx(q: Sql, mint: string, txB64: string, opts: SignOpts = {}): Promise<{ tx: string; mint: string; pool: string; signature: string }> {
  const key = opts.key ?? encKeyFromEnv();
  const res = await store.getReservation(q, mint);
  if (!res || res.status !== "reserved" || !res.live || !res.creator) throw new MintPoolError("RESERVATION_INVALID", "mint reservation missing or expired; start the launch again", 409);
  const info = validateLaunchTx(txB64, { mint, creator: res.creator, configs: opts.configs ?? launchConfigs(), referrals: opts.referrals ?? platformReferrals() });
  const sealed = await store.claimForSigning(q, mint, res.creator, mintPoolConfig().signedHoldMin);
  if (!sealed) throw new MintPoolError("RESERVATION_INVALID", "mint reservation missing or expired; start the launch again", 409);
  const seed = openSeed(sealed, mint, key);
  const kp = keypairFromSeed(seed, mint); // wipes seed
  const tx: Transaction = info.tx;
  try { tx.partialSign(kp); }
  finally { wipeKeypair(kp); }
  if (!tx.verifySignatures(true)) throw new LaunchTxRejected("signatures do not verify after co-signing");
  const bytes = tx.serialize({ requireAllSignatures: true, verifySignatures: true });
  const sig = tx.signatures[0].signature!;
  return { tx: bytes.toString("base64"), mint, pool: info.pool, signature: bs58.encode(sig) };
}

export function platformReferrals(): string[] { try { return [referralAta().toBase58()]; } catch { return []; } }

export type ExistsFn = (pubkeys: string[]) => Promise<boolean[]>;
export const accountsExist: ExistsFn = async (pubkeys) => {
  const infos = await getConnection().getMultipleAccountsInfo(pubkeys.map((p) => new PublicKey(p)), "confirmed");
  return infos.map((i) => i !== null);
};

/** Expired reservations: free when the mint account is absent on-chain, mark used when present. RPC failure = leave them. */
export async function sweepExpired(q: Sql, exists: ExistsFn = accountsExist, limit = 100): Promise<{ freed: number; used: number }> {
  const keys = await store.expiredReservations(q, limit);
  if (!keys.length) return { freed: 0, used: 0 };
  const on = await exists(keys);
  if (on.length !== keys.length) throw new Error("account lookup size mismatch");
  let freed = 0, used = 0;
  for (let i = 0; i < keys.length; i++) {
    if (on[i]) { if (await store.markUsed(q, keys[i])) used++; }
    else if (await store.freeExpired(q, keys[i])) freed++;
  }
  return { freed, used };
}

/** Called after the client broadcast: used as soon as the mint account exists. */
export async function confirmMint(q: Sql, mint: string, exists: ExistsFn = accountsExist): Promise<boolean> {
  const r = await store.getReservation(q, mint);
  if (!r) return false;
  if (r.status === "used") return true;
  const [on] = await exists([mint]);
  return on ? (await store.markUsed(q, mint), true) : false;
}

/** Encrypt + insert ground keypairs (the refill job's onKey). */
export async function storeKeypair(q: Sql, kp: { publicKey: PublicKey; secretKey: Uint8Array }, key: Buffer): Promise<boolean> {
  const pub = kp.publicKey.toBase58();
  if (!hasVanitySuffix(pub)) throw new Error("refusing to store a non-vanity mint");
  const seed = kp.secretKey.slice(0, 32);
  try { return await store.insertMint(q, pub, sealSeed(seed, pub, key)); }
  finally { seed.fill(0); }
}

export { poolCounts } from "./store.js";
export { encKeyUsable, resolveLaunchMint, vanityMode, vanityModeProblem, VANITY_MODES, type LaunchMint, type VanityMode } from "./mode.js";
export { sealSeed, openSeed, parseEncKey, encKeyProblem, encKeyFromEnv } from "./secretBox.js";
