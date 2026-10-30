import BN from "bn.js";
import { AnchorProvider, Program, utils, type Idl } from "@coral-xyz/anchor";
import { ComputeBudgetProgram, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { createRequire } from "node:module";
import { getConnection, withRetry } from "./client.js";

const require = createRequire(import.meta.url);
const IDL = require("./idl/locker.json") as Idl; // Jupiter Lock IDL (locker v0.4.0), fetched on-chain from the program
/** Jupiter Lock program (same ID on mainnet and devnet). */
export const JUP_LOCK_PROGRAM_ID = new PublicKey("LocpQgucEQHbqNABEYvBvwoxCPsSbG91A1QaQhQQqjn");
const ESCROW_DISC = utils.bytes.bs58.encode(Buffer.from([244, 119, 183, 4, 73, 116, 135, 195]));
/** Permanent: nobody can cancel the lock or change its recipient. */
export const LOCK_MODE_NONE = 0;

function program() {
  const wallet = { publicKey: PublicKey.default, signTransaction: async <T>(t: T) => t, signAllTransactions: async <T>(t: T[]) => t } as any;
  return new Program(IDL, new AnchorProvider(getConnection(), wallet, { commitment: "confirmed" }));
}
export const escrowPda = (base: PublicKey) => PublicKey.findProgramAddressSync([Buffer.from("escrow"), base.toBuffer()], JUP_LOCK_PROGRAM_ID)[0];
const eventAuthority = () => PublicKey.findProgramAddressSync([Buffer.from("__event_authority")], JUP_LOCK_PROGRAM_ID)[0];

export interface LockSchedule { cliffTime: number; frequency: number; cliffUnlockAmount: BN; amountPerPeriod: BN; numberOfPeriod: number; vestingStartTime: number }

/** Everything unlocks at `unlockAt`, or (with vestingSeconds) linear daily release starting at `unlockAt`. */
export function lockSchedule(amount: BN, unlockAt: number, vestingSeconds = 0): LockSchedule {
  const day = 86_400;
  if (vestingSeconds <= 0) return { vestingStartTime: unlockAt, cliffTime: unlockAt, frequency: 1, cliffUnlockAmount: amount, amountPerPeriod: new BN(0), numberOfPeriod: 0 };
  const frequency = vestingSeconds >= day ? day : vestingSeconds;
  const n = Math.max(1, Math.round(vestingSeconds / frequency));
  const per = amount.divn(n);
  return { vestingStartTime: unlockAt, cliffTime: unlockAt, frequency, cliffUnlockAmount: amount.sub(per.muln(n)), amountPerPeriod: per, numberOfPeriod: n };
}

/** Devnet-only defaults for LOCK_TIP_WALLET / LOCK_TIP_SOL (the devnet platform/referral wallet). Mainnet has no fallback. */
export const DEVNET_LOCK_TIP_WALLET = "87xbpDawHmNdmnWfZfXvLQyKbXhF2kck41NoPxTWB9sJ";
export const DEVNET_LOCK_TIP_SOL = 0.005;
/** Sanity cap for LOCK_TIP_SOL (SOL per lock tx). */
export const LOCK_TIP_SOL_MAX = 0.1;

/** LOCK_TIP_SOL as a number when it is a plain decimal > 0 and <= LOCK_TIP_SOL_MAX, else null. */
export function parseLockTipSol(v: string | undefined | null): number | null {
  const s = v?.trim();
  if (!s || !/^(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 && n <= LOCK_TIP_SOL_MAX ? n : null;
}

/** Flat protocol tip per lock tx: LOCK_TIP_SOL paid to LOCK_TIP_WALLET.
 *  Mainnet: both REQUIRED (a dedicated wallet; security/prodCheck.ts refuses to start without them); throws when missing or invalid.
 *  Devnet: falls back to DEVNET_LOCK_TIP_WALLET / 0.005 SOL. */
export function lockTip(env: NodeJS.ProcessEnv = process.env) {
  if (env.NETWORK === "mainnet" || env.NETWORK === "mainnet-beta") {
    const w = env.LOCK_TIP_WALLET?.trim();
    if (!w || w.includes("<FILL_ME>")) throw new Error("LOCK_TIP_WALLET is required on mainnet (dedicated tip wallet, no fallback)");
    let tipWallet: PublicKey;
    try { tipWallet = new PublicKey(w); } catch { throw new Error("LOCK_TIP_WALLET is not a valid public key"); }
    const tipSol = parseLockTipSol(env.LOCK_TIP_SOL);
    if (tipSol === null) throw new Error(`LOCK_TIP_SOL is required on mainnet: a number > 0 and <= ${LOCK_TIP_SOL_MAX} (SOL per lock tx)`);
    return { tipSol, tipLamports: Math.round(tipSol * LAMPORTS_PER_SOL), tipWallet };
  }
  const sol = Number(env.LOCK_TIP_SOL ?? String(DEVNET_LOCK_TIP_SOL));
  const tipSol = Number.isFinite(sol) && sol >= 0 ? sol : DEVNET_LOCK_TIP_SOL;
  return { tipSol, tipLamports: Math.round(tipSol * LAMPORTS_PER_SOL), tipWallet: new PublicKey(env.LOCK_TIP_WALLET || DEVNET_LOCK_TIP_WALLET) };
}

export async function buildLockTx(p: { creator: PublicKey; mint: PublicKey; amount: BN; unlockAt: number; vestingSeconds?: number }) {
  const base = Keypair.generate();
  const escrow = escrowPda(base.publicKey);
  const escrowToken = getAssociatedTokenAddressSync(p.mint, escrow, true);
  const senderToken = getAssociatedTokenAddressSync(p.mint, p.creator);
  const s = lockSchedule(p.amount, p.unlockAt, p.vestingSeconds ?? 0);
  const ix = await program().methods.createVestingEscrow({
    vestingStartTime: new BN(s.vestingStartTime), cliffTime: new BN(s.cliffTime), frequency: new BN(s.frequency),
    cliffUnlockAmount: s.cliffUnlockAmount, amountPerPeriod: s.amountPerPeriod, numberOfPeriod: new BN(s.numberOfPeriod),
    updateRecipientMode: LOCK_MODE_NONE, cancelMode: LOCK_MODE_NONE,
  }).accountsPartial({
    base: base.publicKey, escrow, escrowToken, sender: p.creator, senderToken, recipient: p.creator,
    tokenProgram: TOKEN_PROGRAM_ID, eventAuthority: eventAuthority(), program: JUP_LOCK_PROGRAM_ID,
  }).instruction();
  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 120_000 }),
    createAssociatedTokenAccountIdempotentInstruction(p.creator, escrowToken, escrow, p.mint),
    ix,
  );
  const tip = lockTip();
  if (tip.tipLamports > 0) tx.add(SystemProgram.transfer({ fromPubkey: p.creator, toPubkey: tip.tipWallet, lamports: tip.tipLamports }));
  tx.feePayer = p.creator;
  tx.recentBlockhash = (await getConnection().getLatestBlockhash("confirmed")).blockhash;
  tx.partialSign(base);
  return { tx, escrow, schedule: s, tip };
}

export async function buildClaimTx(p: { recipient: PublicKey; escrow: PublicKey }) {
  const e = await fetchEscrow(p.escrow);
  if (!e) throw new Error("escrow not found");
  if (!new PublicKey(e.recipient).equals(p.recipient)) throw new Error("only the lock recipient can claim");
  const mint = new PublicKey(e.mint);
  const recipientToken = getAssociatedTokenAddressSync(mint, p.recipient);
  const ix = await program().methods.claim(new BN("18446744073709551615")).accountsPartial({
    escrow: p.escrow, escrowToken: getAssociatedTokenAddressSync(mint, p.escrow, true), recipient: p.recipient, recipientToken,
    tokenProgram: TOKEN_PROGRAM_ID, eventAuthority: eventAuthority(), program: JUP_LOCK_PROGRAM_ID,
  }).instruction();
  const tx = new Transaction().add(createAssociatedTokenAccountIdempotentInstruction(p.recipient, recipientToken, p.recipient, mint), ix);
  tx.feePayer = p.recipient;
  tx.recentBlockhash = (await getConnection().getLatestBlockhash("confirmed")).blockhash;
  return { tx };
}

export interface LockInfo {
  escrow: string; mint: string; recipient: string; creator: string; cancelMode: number; updateRecipientMode: number;
  cliffTime: number; frequency: number; numberOfPeriod: number; vestingStartTime: number; endTime: number;
  total: string; claimed: string; unlocked: string; claimable: string; locked: string; cancelled: boolean;
}

function decode(addr: PublicKey, d: Buffer, now: number): LockInfo {
  const pk = (o: number) => new PublicKey(d.subarray(o, o + 32)).toBase58();
  const u = (o: number) => new BN(d.subarray(o, o + 8), "le");
  const o = 8 + 128; // after discriminator + 4 pubkeys
  const updateRecipientMode = d[o + 1], cancelMode = d[o + 2];
  const b = o + 8;
  const cliffTime = u(b).toNumber(), frequency = u(b + 8).toNumber(), cliffUnlock = u(b + 16), perPeriod = u(b + 24), n = u(b + 32).toNumber();
  const claimed = u(b + 40), start = u(b + 48).toNumber(), cancelledAt = u(b + 56).toNumber();
  const total = cliffUnlock.add(perPeriod.muln(n));
  let unlocked = new BN(0);
  if (now >= cliffTime) { const periods = Math.min(n, Math.floor((now - cliffTime) / Math.max(1, frequency))); unlocked = cliffUnlock.add(perPeriod.muln(periods)); }
  const claimable = unlocked.sub(claimed);
  return {
    escrow: addr.toBase58(), recipient: pk(8), mint: pk(40), creator: pk(72), cancelMode, updateRecipientMode,
    cliffTime, frequency, numberOfPeriod: n, vestingStartTime: start, endTime: cliffTime + frequency * n,
    total: total.toString(), claimed: claimed.toString(), unlocked: unlocked.toString(), claimable: (claimable.isNeg() ? new BN(0) : claimable).toString(),
    locked: total.sub(unlocked).toString(), cancelled: cancelledAt > 0,
  };
}

export async function fetchEscrow(escrow: PublicKey, now = Math.floor(Date.now() / 1000)) {
  const a = await getConnection().getAccountInfo(escrow);
  return a && a.owner.equals(JUP_LOCK_PROGRAM_ID) ? decode(escrow, a.data, now) : null;
}

/** All Jupiter Lock escrows for a mint (memcmp on token_mint), optionally created by `creator`. */
export async function fetchLocks(mint: PublicKey, creator?: PublicKey, now = Math.floor(Date.now() / 1000)): Promise<LockInfo[]> {
  const filters: any[] = [{ memcmp: { offset: 0, bytes: ESCROW_DISC } }, { memcmp: { offset: 40, bytes: mint.toBase58() } }];
  if (creator) filters.push({ memcmp: { offset: 72, bytes: creator.toBase58() } });
  const accs = await withRetry(() => getConnection().getProgramAccounts(JUP_LOCK_PROGRAM_ID, { filters }), 4, 800);
  return accs.map((a) => decode(a.pubkey, a.account.data as Buffer, now)).sort((x, y) => x.cliffTime - y.cliffTime);
}
/** Known escrow addresses (cheap path, one getMultipleAccounts call). */
export async function fetchEscrows(escrows: PublicKey[], now = Math.floor(Date.now() / 1000)): Promise<LockInfo[]> {
  if (!escrows.length) return [];
  const infos = await withRetry(() => getConnection().getMultipleAccountsInfo(escrows));
  return infos.flatMap((a, i) => (a && a.owner.equals(JUP_LOCK_PROGRAM_ID) ? [decode(escrows[i], a.data, now)] : [])).sort((x, y) => x.cliffTime - y.cliffTime);
}