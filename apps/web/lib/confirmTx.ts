"use client";
import { SendTransactionError, Transaction, type Connection } from "@solana/web3.js";

/** Raised for a launch that did not land, with copy the launch page shows as is. */
export class TxNotLanded extends Error {}

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
/** Base58 of the fee payer signature (the transaction id), so we can poll it even if the first broadcast had a transport error. */
function b58(bytes: Uint8Array): string {
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) { carry += digits[i] << 8; digits[i] = carry % 58; carry = (carry / 58) | 0; }
    while (carry) { digits.push(carry % 58); carry = (carry / 58) | 0; }
  }
  let out = "";
  for (const byte of bytes) { if (byte !== 0) break; out += "1"; }
  for (let i = digits.length - 1; i >= 0; i--) out += ALPHABET[digits[i]];
  return out;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Simulation and validation failures are deterministic: retrying the same bytes cannot help. Anything else is treated as a transport hiccup. */
const DETERMINISTIC = /simulation failed|custom program error|insufficient|blockhash not found|invalid|signature verification|account in use|already in use/i;
const ALREADY = /already been processed|already processed/i;

export interface ConfirmOpts { pollMs?: number; rebroadcastMs?: number; timeoutMs?: number; onSent?: (sig: string) => void }

/**
 * Broadcast fully signed bytes and wait for "confirmed" (not "finalized", which adds about 13 s).
 * The SAME bytes are rebroadcast every couple of seconds until they land or the blockhash expires, so a retry can never
 * double-execute. Transient RPC errors (timeouts, 429, 5xx) on send or on status polls are swallowed and retried.
 */
export async function sendAndConfirmRaw(conn: Connection, raw: Uint8Array, opts: ConfirmOpts = {}): Promise<string> {
  const pollMs = opts.pollMs ?? 500, rebroadcastMs = opts.rebroadcastMs ?? 2000, timeoutMs = opts.timeoutMs ?? 90_000;
  const tx = Transaction.from(raw);
  if (!tx.signature || !tx.recentBlockhash) throw new TxNotLanded("The launch transaction is not signed. Try again.");
  const sig = b58(tx.signature);
  const blockhash = tx.recentBlockhash;

  // 1. First send with preflight (simulation at "confirmed"): a real program error surfaces here with its logs.
  for (let attempt = 0; ; attempt++) {
    try { await conn.sendRawTransaction(raw, { skipPreflight: false, preflightCommitment: "confirmed", maxRetries: 0 }); break; }
    catch (e) {
      const msg = (e as Error)?.message ?? "";
      if (ALREADY.test(msg)) break; // an earlier attempt already reached the leader
      if (/blockhash not found/i.test(msg)) throw new TxNotLanded("The launch took too long to approve and expired. Launch again to get a fresh transaction.");
      if (e instanceof SendTransactionError && DETERMINISTIC.test(msg)) throw e;
      if (attempt >= 2) break; // keep going: the poll loop below rebroadcasts without preflight
      await sleep(400 * (attempt + 1));
    }
  }
  opts.onSent?.(sig);

  // 2. Poll the signature, rebroadcast the same bytes, stop on confirmed, on-chain error, blockhash expiry or timeout.
  const start = Date.now();
  let lastSend = Date.now(), polls = 0;
  for (;;) {
    await sleep(pollMs);
    polls++;
    const st = await conn.getSignatureStatuses([sig]).then((r) => r.value[0]).catch(() => undefined); // undefined = RPC hiccup
    if (st?.err) throw new TxNotLanded(`The launch transaction failed on-chain (${JSON.stringify(st.err)}). Nothing was created. Try again.`);
    if (st?.confirmationStatus === "confirmed" || st?.confirmationStatus === "finalized") return sig;
    if (st === null && Date.now() - lastSend >= rebroadcastMs) {
      lastSend = Date.now();
      void conn.sendRawTransaction(raw, { skipPreflight: true, maxRetries: 0 }).catch(() => {});
    }
    if (st === null && polls % 8 === 0) {
      const valid = await conn.isBlockhashValid(blockhash, { commitment: "confirmed" }).then((r) => r.value).catch(() => true);
      if (!valid) {
        const late = await conn.getSignatureStatus(sig, { searchTransactionHistory: true }).then((r) => r.value).catch(() => undefined);
        if (late?.err) throw new TxNotLanded(`The launch transaction failed on-chain (${JSON.stringify(late.err)}). Nothing was created. Try again.`);
        if (late?.confirmationStatus === "confirmed" || late?.confirmationStatus === "finalized") return sig;
        if (late === null) throw new TxNotLanded("The network dropped the launch transaction before it landed. Nothing was created. Launch again.");
      }
    }
    if (Date.now() - start > timeoutMs)
      throw new TxNotLanded(`The launch is not confirmed yet (tx ${sig.slice(0, 8)}). Check your wallet activity before launching again.`);
  }
}
