/** Public client config + a narrow Solana JSON-RPC proxy (used by the browser extension, which ships no RPC URL).
 *  GET  /config -> { network, siteUrl }
 *  POST /rpc    one JSON-RPC 2.0 call, method allowlist only:
 *               getBalance, getLatestBlockhash, getTokenAccountsByOwner, getParsedTokenAccountsByOwner,
 *               getSignatureStatuses, sendTransaction (base64, fully signed bytes; the API never signs here)
 *  Params are rebuilt from validated fields (unknown config keys are dropped), batches are refused, and the upstream
 *  URL (RPC_URL / DEVNET_RPC via @hb/onchain rpcUrl()) is never returned, logged or put in an error message.
 *  Rate limits: the "rpc" class per IP (security/rateLimit.ts) plus a stricter per-IP limit on sendTransaction. */
import type { FastifyInstance } from "fastify";
import { networkOf } from "@hb/shared";
import { rpcUrl } from "@hb/onchain";
import { clientIp, WindowLimiter } from "../security/rateLimit.js";
import { isAddress } from "../security/validate.js";

export const RPC_METHODS = ["getBalance", "getLatestBlockhash", "getTokenAccountsByOwner", "getParsedTokenAccountsByOwner", "getSignatureStatuses", "sendTransaction"] as const;
export type RpcMethod = (typeof RPC_METHODS)[number];

/** SPL Token and Token-2022: the only programs a token-accounts query may name. */
export const TOKEN_PROGRAMS = new Set(["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"]);
const COMMITMENTS = new Set(["processed", "confirmed", "finalized"]);
/** A legacy or v0 tx is at most 1232 bytes, 1644 base64 chars. */
const MAX_TX_B64 = 1644;
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;
const B58_SIG = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;

export class RpcReject extends Error { constructor(message: string) { super(message); } }

const obj = (v: unknown): Record<string, unknown> => {
  if (v === undefined || v === null) return {};
  if (typeof v !== "object" || Array.isArray(v)) throw new RpcReject("config must be an object");
  return v as Record<string, unknown>;
};
const commitment = (c: Record<string, unknown>, out: Record<string, unknown>, key = "commitment") => {
  if (c[key] === undefined) return;
  if (typeof c[key] !== "string" || !COMMITMENTS.has(c[key] as string)) throw new RpcReject(`${key} must be processed, confirmed or finalized`);
  out[key] = c[key];
};
const minContextSlot = (c: Record<string, unknown>, out: Record<string, unknown>) => {
  if (c.minContextSlot === undefined) return;
  if (!Number.isSafeInteger(c.minContextSlot) || (c.minContextSlot as number) < 0) throw new RpcReject("minContextSlot must be a non-negative integer");
  out.minContextSlot = c.minContextSlot;
};
const addr = (v: unknown, name: string) => { if (typeof v !== "string" || !isAddress(v)) throw new RpcReject(`${name} must be a valid Solana address`); return v; };

/** Validates one call and returns params rebuilt from known fields only. Throws RpcReject with a plain reason. */
export function sanitizeRpc(method: string, params: unknown): unknown[] {
  if (!(RPC_METHODS as readonly string[]).includes(method)) throw new RpcReject("method not allowed");
  const p = params === undefined ? [] : params;
  if (!Array.isArray(p)) throw new RpcReject("params must be an array");
  switch (method as RpcMethod) {
    case "getBalance": {
      if (p.length < 1 || p.length > 2) throw new RpcReject("getBalance takes [address, config?]");
      const c = obj(p[1]), out: Record<string, unknown> = {};
      commitment(c, out); minContextSlot(c, out);
      return [addr(p[0], "address"), out];
    }
    case "getLatestBlockhash": {
      if (p.length > 1) throw new RpcReject("getLatestBlockhash takes [config?]");
      const c = obj(p[0]), out: Record<string, unknown> = {};
      commitment(c, out); minContextSlot(c, out);
      return [out];
    }
    case "getTokenAccountsByOwner":
    case "getParsedTokenAccountsByOwner": {
      if (p.length < 2 || p.length > 3) throw new RpcReject(`${method} takes [owner, filter, config?]`);
      const owner = addr(p[0], "owner"), f = obj(p[1]);
      const filter: Record<string, string> = {};
      if (f.programId !== undefined && f.mint === undefined) {
        if (typeof f.programId !== "string" || !TOKEN_PROGRAMS.has(f.programId)) throw new RpcReject("programId must be the SPL Token or Token-2022 program");
        filter.programId = f.programId;
      } else if (f.mint !== undefined && f.programId === undefined) filter.mint = addr(f.mint, "mint");
      else throw new RpcReject("filter must have exactly one of programId or mint");
      const c = obj(p[2]), out: Record<string, unknown> = {};
      commitment(c, out); minContextSlot(c, out);
      if (method === "getTokenAccountsByOwner") {
        const enc = c.encoding ?? "base64";
        if (enc !== "base64" && enc !== "jsonParsed") throw new RpcReject("encoding must be base64 or jsonParsed");
        out.encoding = enc;
      } else if (c.encoding !== undefined && c.encoding !== "jsonParsed") throw new RpcReject("encoding must be jsonParsed");
      return [owner, filter, out];
    }
    case "getSignatureStatuses": {
      if (p.length < 1 || p.length > 2) throw new RpcReject("getSignatureStatuses takes [signatures, config?]");
      const sigs = p[0];
      if (!Array.isArray(sigs) || sigs.length < 1 || sigs.length > 50) throw new RpcReject("signatures must be an array of 1 to 50");
      for (const s of sigs) if (typeof s !== "string" || !B58_SIG.test(s)) throw new RpcReject("signatures must be base58 transaction signatures");
      const c = obj(p[1]), out: Record<string, unknown> = {};
      if (c.searchTransactionHistory !== undefined) {
        if (typeof c.searchTransactionHistory !== "boolean") throw new RpcReject("searchTransactionHistory must be a boolean");
        out.searchTransactionHistory = c.searchTransactionHistory;
      }
      return [sigs, out];
    }
    case "sendTransaction": {
      if (p.length < 1 || p.length > 2) throw new RpcReject("sendTransaction takes [tx, config?]");
      const tx = p[0];
      if (typeof tx !== "string" || tx.length < 100 || tx.length > MAX_TX_B64 || !B64.test(tx)) throw new RpcReject("tx must be a base64 signed transaction of at most 1232 bytes");
      const c = obj(p[1]), out: Record<string, unknown> = { encoding: "base64" };
      if (c.encoding !== undefined && c.encoding !== "base64") throw new RpcReject("encoding must be base64");
      if (c.skipPreflight !== undefined) { if (typeof c.skipPreflight !== "boolean") throw new RpcReject("skipPreflight must be a boolean"); out.skipPreflight = c.skipPreflight; }
      commitment(c, out, "preflightCommitment");
      if (c.maxRetries !== undefined) { if (!Number.isInteger(c.maxRetries) || (c.maxRetries as number) < 0 || (c.maxRetries as number) > 10) throw new RpcReject("maxRetries must be an integer from 0 to 10"); out.maxRetries = c.maxRetries; }
      minContextSlot(c, out);
      return [tx, out];
    }
  }
}

const num = (k: string, d: number) => { const n = Number(process.env[k]); return Number.isFinite(n) && n > 0 ? n : d; };

export interface RpcDeps {
  /** Upstream URL resolver; defaults to @hb/onchain rpcUrl() (RPC_URL / DEVNET_RPC). */
  upstream?: () => string;
  fetch?: typeof fetch;
  network?: () => string;
  siteUrl?: () => string;
  sendLimiter?: WindowLimiter;
  timeoutMs?: number;
}

type RpcId = string | number | null;
const rpcId = (v: unknown): RpcId => (typeof v === "number" && Number.isSafeInteger(v)) || (typeof v === "string" && v.length <= 64) ? (v as string | number) : null;
const rpcError = (id: RpcId, code: number, message: string) => ({ jsonrpc: "2.0" as const, id, error: { code, message } });

export function registerConfigAndRpc(app: FastifyInstance, deps: RpcDeps = {}) {
  const network = () => networkOf(deps.network ? deps.network() : process.env.NETWORK);
  const siteUrl = () => (deps.siteUrl ? deps.siteUrl() : process.env.SITE_URL || "https://highbar.capital").replace(/\/$/, "");
  const upstream = deps.upstream ?? rpcUrl;
  const doFetch = deps.fetch ?? fetch;
  const sendLimiter = deps.sendLimiter ?? new WindowLimiter(num("RATE_LIMIT_RPC_SEND_PER_MIN", 10), 60_000);
  const timeoutMs = deps.timeoutMs ?? 10_000;
  if (!deps.sendLimiter) setInterval(() => sendLimiter.sweep(), 5 * 60_000).unref();

  app.get("/config", async (_req, reply) => {
    reply.header("cache-control", "public, max-age=60");
    return { network: network(), siteUrl: siteUrl() };
  });

  app.post("/rpc", { bodyLimit: 8 * 1024 }, async (req, reply) => {
    const b = req.body as Record<string, unknown> | unknown[] | null;
    if (Array.isArray(b)) return reply.code(400).send(rpcError(null, -32600, "batch requests are not supported"));
    if (!b || typeof b !== "object") return reply.code(400).send(rpcError(null, -32600, "invalid request"));
    const id = rpcId(b.id);
    if (b.jsonrpc !== undefined && b.jsonrpc !== "2.0") return reply.code(400).send(rpcError(id, -32600, "jsonrpc must be 2.0"));
    const method = typeof b.method === "string" ? b.method : "";
    let params: unknown[];
    try { params = sanitizeRpc(method, b.params); }
    catch (e) {
      if (!(e instanceof RpcReject)) throw e;
      const notAllowed = e.message === "method not allowed";
      return reply.code(notAllowed ? 403 : 400).send(rpcError(id, notAllowed ? -32601 : -32602, e.message));
    }
    if (method === "sendTransaction") {
      const ip = clientIp(req);
      const wait = ip === null || process.env.RATE_LIMIT_OFF === "1" ? 0 : sendLimiter.take(ip);
      if (wait) return reply.code(429).header("retry-after", String(Math.max(1, Math.ceil(wait / 1000)))).send(rpcError(id, -32005, "rate limited, try again shortly"));
    }
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const r = await doFetch(upstream(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: ctl.signal });
      const j = (await r.json().catch(() => null)) as { result?: unknown; error?: { code?: unknown; message?: unknown; data?: unknown } } | null;
      if (!j || (!("result" in j) && !j.error)) return reply.code(502).send(rpcError(id, -32603, "upstream RPC error"));
      if (j.error) {
        // Node errors (simulation logs, blockhash not found) are safe to pass on; only code / message / data, never transport details.
        const code = typeof j.error.code === "number" ? j.error.code : -32603;
        const message = typeof j.error.message === "string" ? j.error.message.slice(0, 500) : "upstream RPC error";
        return { jsonrpc: "2.0", id, error: { code, message, ...(j.error.data !== undefined && method === "sendTransaction" ? { data: j.error.data } : {}) } };
      }
      return { jsonrpc: "2.0", id, result: j.result };
    } catch {
      req.log.warn(`[rpc] upstream ${method} failed`); // no URL, no params
      return reply.code(502).send(rpcError(id, -32603, "upstream RPC unavailable"));
    } finally { clearTimeout(timer); }
  });
}
