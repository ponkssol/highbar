import bs58 from "bs58";
import { PublicKey, TransactionInstruction, VersionedTransaction, type Signer, type Transaction } from "@solana/web3.js";
import { getConnection, rpcUrl } from "@hb/onchain";
import { jobs } from "./config.js";

const GENESIS = { devnet: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG", mainnet: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d" } as const;
export const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
export const memoIx = (text: string) => new TransactionInstruction({ programId: MEMO_PROGRAM_ID, keys: [], data: Buffer.from(text, "utf8") });

/** The RPC must be the NETWORK cluster (genesis hash check); live mainnet sends also need ALLOW_MAINNET=true. */
export async function assertCluster(live: boolean) {
  const g = await getConnection().getGenesisHash();
  if (g !== GENESIS[jobs.network]) throw new Error(`RPC ${rpcUrl()} is not ${jobs.network} (genesis ${g}); fix NETWORK / RPC_URL`);
  if (live && jobs.network === "mainnet" && !jobs.allowMainnet) throw new Error("refusing live mainnet transactions without ALLOW_MAINNET=true");
}

/** Simulate without signatures (dry-run checks and a pre-flight before every live send). */
export async function simulate(tx: Transaction, payer: PublicKey): Promise<{ ok: boolean; err?: string }> {
  const conn = getConnection();
  tx.feePayer = tx.feePayer ?? payer;
  tx.recentBlockhash = (await conn.getLatestBlockhash("confirmed")).blockhash;
  const r = await conn.simulateTransaction(new VersionedTransaction(tx.compileMessage()), { sigVerify: false, replaceRecentBlockhash: true, commitment: "confirmed" });
  if (!r.value.err) return { ok: true };
  const logs = (r.value.logs ?? []).filter((l) => /error|failed|Error/.test(l)).slice(-2).join(" | ");
  return { ok: false, err: `${JSON.stringify(r.value.err)}${logs ? ` ${logs}` : ""}` };
}

/** Sign once, hand the signature to onSigned (persist it as pending), send, confirm. Never re-signs, so a retry can't double-spend. */
export async function sendOnce(tx: Transaction, signers: Signer[], onSigned?: (sig: string) => Promise<void>): Promise<string> {
  const conn = getConnection();
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = tx.feePayer ?? signers[0].publicKey;
  tx.sign(...signers);
  const sig = bs58.encode(tx.signature!);
  await onSigned?.(sig);
  await conn.sendRawTransaction(tx.serialize(), { maxRetries: 5 });
  return confirm(sig, blockhash, lastValidBlockHeight);
}

/** sendOnce for a pre-built versioned tx (Jupiter /swap). */
export async function sendVersionedOnce(vtx: VersionedTransaction, signers: Signer[], lastValidBlockHeight: number, onSigned?: (sig: string) => Promise<void>): Promise<string> {
  const conn = getConnection();
  vtx.sign(signers);
  const sig = bs58.encode(vtx.signatures[0]);
  await onSigned?.(sig);
  await conn.sendRawTransaction(vtx.serialize(), { maxRetries: 5 });
  return confirm(sig, vtx.message.recentBlockhash, lastValidBlockHeight);
}

async function confirm(sig: string, blockhash: string, lastValidBlockHeight: number) {
  const r = await getConnection().confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
  if (r.value.err) throw new Error(`tx ${sig} failed: ${JSON.stringify(r.value.err)}`);
  return sig;
}

/** landed | failed | unknown (not found yet: may still land until its blockhash expires, ~1-2 min). */
export async function sigState(sig: string): Promise<"landed" | "failed" | "unknown"> {
  const s = (await getConnection().getSignatureStatus(sig, { searchTransactionHistory: true })).value;
  if (!s) return "unknown";
  if (s.err) return "failed";
  return s.confirmationStatus === "confirmed" || s.confirmationStatus === "finalized" ? "landed" : "unknown";
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** JSON.stringify that prints bigint / PublicKey. */
export const show = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x instanceof PublicKey ? x.toBase58() : x));
export const sol = (l: bigint | number) => Number(l) / 1e9;
