/** Vanity grinder benchmark (no RPC, no secrets printed): pnpm --filter @hb/onchain vanity:bench [--seconds 10] [--threads N] [--real]
 *  --real also grinds one real "high" address with the worker pool and reports the wall time. */
import crypto from "node:crypto";
import { Keypair } from "@solana/web3.js";
import { defaultGrindThreads, grindVanity, residueMatches, suffixTarget, VANITY_SUFFIX } from "./vanity.js";

const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const secs = Number(arg("seconds") ?? 10), threads = Number(arg("threads") ?? defaultGrindThreads());
const expected = 58 ** VANITY_SUFFIX.length;

function rate(name: string, fn: () => void, ms = 3000) {
  const t0 = performance.now(); let n = 0;
  while (performance.now() - t0 < ms) { for (let i = 0; i < 256; i++) fn(); n += 256; }
  const r = n / ((performance.now() - t0) / 1000);
  console.log(`${name.padEnd(44)} ${Math.round(r).toLocaleString("en-US").padStart(9)} keys/s`);
  return r;
}
const { mod, target } = suffixTarget(VANITY_SUFFIX);
console.log(`suffix "${VANITY_SUFFIX}": expected ${expected.toLocaleString("en-US")} attempts per address`);
console.log("-- single thread --");
rate("web3.js Keypair.generate + toBase58", () => { Keypair.generate().publicKey.toBase58(); });
const single = rate("node:crypto ed25519 + jwk + mod-58^4 check", () => {
  const k = crypto.generateKeyPairSync("ed25519");
  residueMatches(Buffer.from(k.publicKey.export({ format: "jwk" }).x as string, "base64url"), mod, target);
});
console.log(`single thread: ${(expected / single).toFixed(0)} s per address (avg)`);
console.log(`-- worker pool, ${threads} threads, ${secs}s --`);
const ac = new AbortController();
setTimeout(() => ac.abort(), secs * 1000);
let multi = 0;
try { await grindVanity({ suffix: "zzzzzzz", threads, signal: ac.signal }); }
catch (e) { const a = (e as { attempts?: number }).attempts ?? 0; multi = a / secs; }
console.log(`pool: ${Math.round(multi).toLocaleString("en-US")} keys/s (${(multi / single).toFixed(1)}x) -> ${(expected / multi).toFixed(1)} s per address avg, ${((50 * expected) / multi / 60).toFixed(1)} min wall for 50 (${((50 * expected) / single / 3600).toFixed(2)} CPU-h single-core)`);
if (process.argv.includes("--real")) {
  const r = await grindVanity({ threads, timeoutMs: 600_000 });
  console.log(`real "${VANITY_SUFFIX}" address in ${(r.ms / 1000).toFixed(1)} s after ${r.attempts.toLocaleString("en-US")} attempts (pubkey ends with ${r.keypairs[0].publicKey.toBase58().slice(-4)})`);
}
process.exit(0);
