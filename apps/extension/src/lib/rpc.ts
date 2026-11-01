/** Minimal JSON-RPC client: the user's own RPC when set, else the API's allowlisted /rpc proxy (no RPC URL ships in the extension). */
import bs58 from "bs58";
import { b64 } from "./bytes";

/** `detail` is the short technical reason (HTTP status, timeout, network error) the Settings RPC card shows in small text. */
export class RpcError extends Error { constructor(message: string, readonly code?: number, readonly data?: unknown, readonly detail?: string) { super(message); this.name = "RpcError"; } }
export const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

export interface SigStatus { err: unknown; confirmationStatus?: "processed" | "confirmed" | "finalized" | null }
export interface ParsedTokenAccount { pubkey: string; account: { data: { parsed: { info: { mint: string; tokenAmount: { uiAmount: number | null; amount: string; decimals: number } } } } } }

export const SERVER_RPC_DOWN = "Server RPC unavailable, set a custom RPC in Settings";
export const CUSTOM_RPC_DOWN = "Your custom RPC did not answer. Check it in Settings or switch back to the default";
export const GENESIS: Record<"mainnet" | "devnet", string> = { mainnet: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d", devnet: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG" };

/** `down` replaces the message when the endpoint itself is unusable (unreachable, missing route, server error, not JSON-RPC).
 *  JSON-RPC errors (a rejected transaction, a bad param) keep their own message. */
export function rpc(endpoint: string, down = "Could not reach the RPC", timeoutMs = 15_000) {
  let id = 0;
  async function call<T>(method: string, params: unknown[]): Promise<T> {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    let r: Response;
    try { r = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }), signal: ctl.signal }); }
    catch (e) {
      const timedOut = ctl.signal.aborted || (e as Error)?.name === "AbortError";
      throw new RpcError(down, undefined, undefined, timedOut ? `No answer within ${Math.max(1, Math.round(timeoutMs / 1000))} second${Math.max(1, Math.round(timeoutMs / 1000)) === 1 ? "" : "s"}` : `Network error${(e as Error)?.message ? ` (${String((e as Error).message).slice(0, 80)})` : ""}`);
    }
    finally { clearTimeout(t); }
    const j = await r.json().catch(() => null) as { result?: T; error?: { code?: number; message?: string; data?: unknown } | string } | null;
    // A JSON-RPC error object is the node answering (keep its text). Anything else (a 404 page, {"error":"Not Found"}) means the endpoint is unusable.
    const http = `HTTP ${r.status}${r.statusText ? ` ${r.statusText}` : ""}`;
    if (j?.error && typeof j.error === "object" && typeof j.error.message === "string") throw new RpcError(j.error.message, j.error.code, j.error.data, r.ok ? `RPC error ${j.error.code ?? ""}`.trim() : http);
    if (r.status === 429) throw new RpcError("Too many requests, try again shortly", undefined, undefined, http);
    if (!r.ok || !j || !("result" in j)) throw new RpcError(down, undefined, undefined, !r.ok ? http : !j ? `${http}, not JSON` : `${http}, not a JSON-RPC answer`);
    return j.result as T;
  }
  return {
    call,
    balance: (a: string) => call<{ value: number }>("getBalance", [a, { commitment: "confirmed" }]).then((x) => x.value),
    genesisHash: () => call<string>("getGenesisHash", []),
    latestBlockhash: () => call<{ value: { blockhash: string; lastValidBlockHeight: number } }>("getLatestBlockhash", [{ commitment: "confirmed" }]).then((x) => x.value),
    // getParsedTokenAccountsByOwner is only a web3.js helper name, not a Solana RPC method (a node answers -32601 "Method not found").
    // The real method is getTokenAccountsByOwner with the jsonParsed encoding, which is what web3.js sends under the hood.
    tokenAccounts: (owner: string, programId: string) => call<{ value: ParsedTokenAccount[] }>("getTokenAccountsByOwner", [owner, { programId }, { commitment: "confirmed", encoding: "jsonParsed" }]).then((x) => x.value),
    statuses: (sigs: string[], history = false) => call<{ value: (SigStatus | null)[] }>("getSignatureStatuses", [sigs, { searchTransactionHistory: history }]).then((x) => x.value),
    send: (raw: Uint8Array, skipPreflight: boolean) => call<string>("sendTransaction", [b64(raw), { encoding: "base64", skipPreflight, preflightCommitment: "confirmed", maxRetries: 0 }]),
  };
}
export type Rpc = ReturnType<typeof rpc>;

export class TxNotLanded extends Error {}
/** The fee payer's signature of a signed legacy or v0 transaction: the wire format starts with a compact-u16 signature count
 *  and the 64 byte signatures, the first one is the transaction id. Null when the count is 0 or the slot is all zeros (unsigned). */
export function firstSignature(raw: Uint8Array): Uint8Array | null {
  const n = raw[0] ?? 0;
  if (n === 0 || n > 0x7f || raw.length < 65) return null;
  const sig = raw.slice(1, 65);
  return sig.some((b) => b !== 0) ? sig : null;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const DETERMINISTIC = /simulation failed|custom program error|insufficient|invalid|signature verification|account in use|already in use/i;
const ALREADY = /already been processed|already processed/i;

/** Sends fully signed bytes and waits for "confirmed". The SAME bytes are rebroadcast until they land or time runs out, so a retry
 *  can never execute twice (ported from apps/web/lib/confirmTx.ts; blockhash expiry is detected by time, the proxy has no getBlockHeight). */
export async function sendAndConfirm(r: Rpc, raw: Uint8Array, opts: { onSent?: (sig: string) => void; timeoutMs?: number; what?: string } = {}): Promise<string> {
  const what = opts.what ?? "transaction";
  const first = firstSignature(raw);
  if (!first) throw new TxNotLanded(`The ${what} is not signed.`);
  const sig = bs58.encode(first);
  for (let attempt = 0; ; attempt++) {
    try { await r.send(raw, false); break; }
    catch (e) {
      const msg = (e as Error).message ?? "";
      if (ALREADY.test(msg)) break;
      if (/blockhash not found/i.test(msg)) throw new TxNotLanded(`The ${what} expired before it was sent. Try again for a fresh one.`);
      if (e instanceof RpcError && e.code !== undefined && DETERMINISTIC.test(msg)) throw new TxNotLanded(`The ${what} was rejected: ${msg.slice(0, 200)}`);
      if (attempt >= 2) break;
      await sleep(400 * (attempt + 1));
    }
  }
  opts.onSent?.(sig);
  const start = Date.now(), timeout = opts.timeoutMs ?? 90_000;
  let lastSend = Date.now();
  for (;;) {
    await sleep(700);
    const st = await r.statuses([sig]).then((v) => v[0]).catch(() => undefined);
    if (st?.err) throw new TxNotLanded(`The ${what} failed on-chain (${JSON.stringify(st.err)}).`);
    if (st?.confirmationStatus === "confirmed" || st?.confirmationStatus === "finalized") return sig;
    if (st === null && Date.now() - lastSend >= 2000) { lastSend = Date.now(); void r.send(raw, true).catch(() => {}); }
    if (Date.now() - start > timeout) {
      const late = await r.statuses([sig], true).then((v) => v[0]).catch(() => undefined);
      if (late?.confirmationStatus === "confirmed" || late?.confirmationStatus === "finalized") return sig;
      if (late?.err) throw new TxNotLanded(`The ${what} failed on-chain (${JSON.stringify(late.err)}).`);
      throw new TxNotLanded(`The ${what} is not confirmed yet (tx ${sig.slice(0, 8)}). Check the wallet activity before trying again.`);
    }
  }
}
