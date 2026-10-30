/**
 * Vanity mint grinder: ed25519 keypairs whose base58 public key ends with a suffix (highbar mints end in "high").
 *
 * Fast path (benchmarked on a Ryzen 5 5600, Node 25): OpenSSL keygen via node:crypto generateKeyPairSync("ed25519")
 * + JWK export of the public key is ~4.5x faster than @solana/web3.js Keypair.generate (noble, JS). The suffix is
 * checked without a base58 encode: the last k base58 digits of a key are (pubkey as a big-endian integer) mod 58^k,
 * so 32 multiply/mod steps on a JS number decide it; only hits get a full base58 encode (and the private key export).
 *
 * Expected attempts for a 4-char case-sensitive suffix: 58^4 = 11,316,496. Secrets never leave memory here:
 * workers post the 32-byte seed to the parent over postMessage, the parent builds a Keypair and hands it to the caller.
 */
import crypto from "node:crypto";
import os from "node:os";
import { Worker } from "node:worker_threads";
import { Keypair } from "@solana/web3.js";

export const VANITY_SUFFIX = "high";
export const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const MAX_SUFFIX = 7; // 58^7 * 256 < 2^53: the mod loop stays exact on JS numbers

/** modulus 58^k and the residue a key must have for its base58 to end with `suffix`. */
export function suffixTarget(suffix: string): { mod: number; target: number } {
  if (!suffix || suffix.length > MAX_SUFFIX) throw new Error(`vanity suffix must be 1-${MAX_SUFFIX} chars`);
  let target = 0;
  for (const ch of suffix) {
    const d = BASE58_ALPHABET.indexOf(ch);
    if (d < 0) throw new Error(`"${ch}" is not a base58 character (no 0, O, I, l)`);
    target = target * 58 + d;
  }
  return { mod: 58 ** suffix.length, target };
}

/** Cheap pre-check: true when the base58 of `pub` (32 bytes) ends with the suffix behind (mod, target). */
export function residueMatches(pub: Uint8Array, mod: number, target: number): boolean {
  let r = 0;
  for (let j = 0; j < pub.length; j++) r = (r * 256 + pub[j]) % mod;
  return r === target;
}

export const hasVanitySuffix = (pubkeyBase58: string, suffix = VANITY_SUFFIX) => pubkeyBase58.endsWith(suffix);

/** Worker body (plain JS, run with eval so it works the same under tsx, node and a bundler). */
const WORKER_SRC = String.raw`
const crypto = require("node:crypto");
const { parentPort, workerData } = require("node:worker_threads");
const { suffix, mod, target, ctrl, slot, chunk } = workerData;
const stop = new Int32Array(ctrl, 0, 1);
const counts = new BigInt64Array(ctrl, 8);
const A = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function b58(buf) {
  const d = [0];
  for (const byte of buf) { let c = byte; for (let i = 0; i < d.length; i++) { c += d[i] << 8; d[i] = c % 58; c = (c / 58) | 0; } while (c) { d.push(c % 58); c = (c / 58) | 0; } }
  let s = ""; for (const byte of buf) { if (byte) break; s += "1"; }
  for (let i = d.length - 1; i >= 0; i--) s += A[d[i]];
  return s;
}
while (Atomics.load(stop, 0) === 0) {
  for (let n = 0; n < chunk; n++) {
    const k = crypto.generateKeyPairSync("ed25519");
    const pub = Buffer.from(k.publicKey.export({ format: "jwk" }).x, "base64url");
    let r = 0; for (let j = 0; j < 32; j++) r = (r * 256 + pub[j]) % mod;
    if (r !== target) continue;
    const s = b58(pub);
    if (!s.endsWith(suffix)) continue;
    const seed = new Uint8Array(Buffer.from(k.privateKey.export({ format: "jwk" }).d, "base64url"));
    parentPort.postMessage({ pubkey: s, seed }, [seed.buffer]);
  }
  Atomics.add(counts, slot, BigInt(chunk));
}
`;

export class GrindAbortedError extends Error {
  constructor(readonly reason: "aborted" | "timeout", readonly found: number, readonly attempts: number) {
    super(reason === "timeout" ? `vanity grind timed out after ${attempts} attempts` : "vanity grind aborted");
    this.name = reason === "timeout" ? "TimeoutError" : "AbortError";
  }
}

export interface GrindOptions {
  /** base58 suffix (case-sensitive). Default VANITY_SUFFIX ("high"). */
  suffix?: string;
  /** how many keypairs to find. Default 1. */
  count?: number;
  /** worker threads. Default os.availableParallelism(). */
  threads?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** called for every keypair as soon as it is found (persist it here so an abort loses nothing). */
  onKey?: (kp: Keypair) => void | Promise<void>;
  /** keys per worker between stop-flag checks. Default 512. */
  chunk?: number;
}
export interface GrindResult { keypairs: Keypair[]; attempts: number; ms: number; keysPerSec: number }

export const defaultGrindThreads = () => Math.max(1, typeof os.availableParallelism === "function" ? os.availableParallelism() : os.cpus().length);

/** Keypair from a 32-byte seed, verified against the expected base58 pubkey. Wipes the seed buffer. */
export function keypairFromSeed(seed: Uint8Array, expected?: string): Keypair {
  try {
    const kp = Keypair.fromSeed(seed);
    if (expected && kp.publicKey.toBase58() !== expected) throw new Error("vanity seed does not match its public key");
    return kp;
  } finally { seed.fill(0); }
}

/** Best-effort wipe of a Keypair's secret (web3.js keeps it in _keypair.secretKey; the secretKey getter returns a copy). */
export function wipeKeypair(kp: Keypair) {
  const inner = (kp as unknown as { _keypair?: { secretKey?: Uint8Array } })._keypair?.secretKey;
  if (inner instanceof Uint8Array) inner.fill(0);
}

/** Grind with a worker_threads pool. Rejects with GrindAbortedError on abort / timeout (onKey already got every key found). */
export function grindVanity(opts: GrindOptions = {}): Promise<GrindResult> {
  const suffix = opts.suffix ?? VANITY_SUFFIX, want = Math.max(1, Math.floor(opts.count ?? 1));
  const threads = Math.max(1, Math.floor(opts.threads ?? defaultGrindThreads()));
  const { mod, target } = suffixTarget(suffix);
  const ctrl = new SharedArrayBuffer(8 + 8 * threads);
  const stop = new Int32Array(ctrl, 0, 1), counts = new BigInt64Array(ctrl, 8);
  const attempts = () => Number(counts.reduce((a, b) => a + b, 0n));
  const t0 = performance.now();
  const keypairs: Keypair[] = [];
  return new Promise<GrindResult>((resolve, reject) => {
    const workers: Worker[] = [];
    let done = false, pending = Promise.resolve();
    let timer: NodeJS.Timeout | undefined;
    const finish = (err?: Error) => {
      if (done) return; done = true;
      Atomics.store(stop, 0, 1);
      if (timer) clearTimeout(timer);
      opts.signal?.removeEventListener("abort", onAbort);
      for (const w of workers) void w.terminate();
      pending.then(() => {
        const ms = performance.now() - t0, n = attempts();
        if (err) reject(err); else resolve({ keypairs, attempts: n, ms, keysPerSec: n / (ms / 1000) });
      }, reject);
    };
    const onAbort = () => finish(new GrindAbortedError("aborted", keypairs.length, attempts()));
    if (opts.signal?.aborted) return onAbort();
    opts.signal?.addEventListener("abort", onAbort, { once: true });
    if (opts.timeoutMs && opts.timeoutMs > 0) timer = setTimeout(() => finish(new GrindAbortedError("timeout", keypairs.length, attempts())), opts.timeoutMs);
    for (let slot = 0; slot < threads; slot++) {
      const w = new Worker(WORKER_SRC, { eval: true, workerData: { suffix, mod, target, ctrl, slot, chunk: opts.chunk ?? 512 } });
      w.on("message", (m: { pubkey: string; seed: Uint8Array }) => {
        if (done || keypairs.length >= want) { m.seed.fill(0); return; }
        let kp: Keypair;
        try { kp = keypairFromSeed(m.seed, m.pubkey); } catch (e) { return finish(e as Error); }
        if (!kp.publicKey.toBase58().endsWith(suffix)) return finish(new Error("vanity worker returned a key without the suffix"));
        keypairs.push(kp);
        if (opts.onKey) { const cb = opts.onKey; pending = pending.then(() => cb(kp)); pending.catch((e) => finish(e as Error)); }
        if (keypairs.length >= want) finish();
      });
      w.on("error", (e) => finish(e));
      w.on("exit", (code) => { if (!done && code !== 0) finish(new Error(`vanity worker exited with code ${code}`)); });
      workers.push(w);
    }
  });
}

/** Single-thread grinder on the calling thread (benchmarks, tiny suffixes in tests). Same fast path as the workers. */
export function grindVanitySync(opts: { suffix?: string; maxAttempts?: number; signal?: AbortSignal } = {}): { keypair: Keypair | null; attempts: number } {
  const suffix = opts.suffix ?? VANITY_SUFFIX;
  const { mod, target } = suffixTarget(suffix);
  const max = opts.maxAttempts ?? Number.MAX_SAFE_INTEGER;
  for (let i = 1; i <= max; i++) {
    if ((i & 1023) === 0 && opts.signal?.aborted) throw new GrindAbortedError("aborted", 0, i);
    const k = crypto.generateKeyPairSync("ed25519");
    const pub = Buffer.from(k.publicKey.export({ format: "jwk" }).x as string, "base64url");
    if (!residueMatches(pub, mod, target)) continue;
    const seed = new Uint8Array(Buffer.from(k.privateKey.export({ format: "jwk" }).d as string, "base64url"));
    const kp = keypairFromSeed(seed);
    if (kp.publicKey.toBase58().endsWith(suffix)) return { keypair: kp, attempts: i };
  }
  return { keypair: null, attempts: max };
}
