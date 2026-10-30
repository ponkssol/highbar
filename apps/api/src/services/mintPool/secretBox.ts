/** AES-256-GCM sealing of vanity mint seeds (mint_pool.secret_enc). Key: env MINT_POOL_ENC_KEY, 32 bytes as 64 hex chars or base64.
 *  Format (versioned): "v1.<iv b64url, 12 B>.<tag b64url, 16 B>.<ciphertext b64url>", AAD = "hb-mint-pool:v1:<pubkey>" so a
 *  ciphertext only opens for its own row. Plaintext = the 32-byte ed25519 seed. Never log the key, the seed or the ciphertext. */
import crypto from "node:crypto";

export const ENC_VERSION = "v1";
const aad = (pubkey: string) => Buffer.from(`hb-mint-pool:${ENC_VERSION}:${pubkey}`);

/** Parse MINT_POOL_ENC_KEY. Returns null when unset; throws (without echoing the value) when it is not exactly 32 bytes. */
export function parseEncKey(v: string | undefined): Buffer | null {
  const s = v?.trim();
  if (!s) return null;
  if (/^[0-9a-fA-F]{64}$/.test(s)) return Buffer.from(s, "hex");
  if (/^[A-Za-z0-9+/_-]+={0,2}$/.test(s)) {
    const b = Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    if (b.length === 32) return b;
  }
  throw new Error("MINT_POOL_ENC_KEY must be 32 bytes (64 hex chars or base64)");
}

/** Error message when the key is unusable, else null. Never includes the value. */
export function encKeyProblem(v: string | undefined): string | null {
  if (!v?.trim()) return "MINT_POOL_ENC_KEY is not set";
  if (v.includes("<FILL_ME>")) return "MINT_POOL_ENC_KEY still holds <FILL_ME>";
  try { parseEncKey(v); return null; } catch (e) { return (e as Error).message; }
}

export function encKeyFromEnv(env: Record<string, string | undefined> = process.env): Buffer {
  const k = parseEncKey(env.MINT_POOL_ENC_KEY);
  if (!k) throw new Error("MINT_POOL_ENC_KEY is not set (vanity mint pool disabled)");
  return k;
}

export function sealSeed(seed: Uint8Array, pubkey: string, key: Buffer): string {
  if (seed.length !== 32) throw new Error("seed must be 32 bytes");
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  c.setAAD(aad(pubkey));
  const ct = Buffer.concat([c.update(seed), c.final()]);
  return [ENC_VERSION, iv.toString("base64url"), c.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

/** Decrypt in memory. Throws a generic error on a wrong key, a tampered ciphertext or a ciphertext of another pubkey. Caller wipes the result. */
export function openSeed(sealed: string, pubkey: string, key: Buffer): Uint8Array {
  const parts = sealed.split(".");
  if (parts.length !== 4 || parts[0] !== ENC_VERSION) throw new Error("mint secret: unsupported format");
  const [, ivS, tagS, ctS] = parts;
  try {
    const iv = Buffer.from(ivS, "base64url"), tag = Buffer.from(tagS, "base64url"), ct = Buffer.from(ctS, "base64url");
    if (iv.length !== 12 || tag.length !== 16 || ct.length !== 32) throw new Error("len");
    const d = crypto.createDecipheriv("aes-256-gcm", key, iv);
    d.setAAD(aad(pubkey)); d.setAuthTag(tag);
    return new Uint8Array(Buffer.concat([d.update(ct), d.final()]));
  } catch { throw new Error("mint secret: decryption failed"); }
}
