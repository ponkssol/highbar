/** Wallet crypto, all WebCrypto.
 *  v1 (legacy, read only for the one time migration): AES-GCM-256 under a PBKDF2-SHA256 key (600,000 iterations, 16 byte salt, 12 byte IV) from the old password.
 *  v2 (current) is below: no password. */
import { b64, unb64, utf8 } from "./bytes";

export const PBKDF2_ITERATIONS = 600_000;
export interface Vault { v: 1; kdf: "PBKDF2-SHA256"; iter: number; salt: string; iv: string; ct: string }

export class WrongPassword extends Error { constructor() { super("Wrong password"); this.name = "WrongPassword"; } }

const subtle = () => globalThis.crypto.subtle;

async function deriveKey(password: string, salt: Uint8Array, iter: number) {
  const base = await subtle().importKey("raw", utf8(password) as BufferSource, "PBKDF2", false, ["deriveKey"]);
  return subtle().deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: iter }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export const MIN_PASSWORD = 8;
export function passwordProblem(p: string): string | null {
  if (p.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters`;
  return null;
}

export async function encryptSecret(secret: Uint8Array, password: string, iter = PBKDF2_ITERATIONS): Promise<Vault> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, iter);
  const ct = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, secret as BufferSource));
  return { v: 1, kdf: "PBKDF2-SHA256", iter, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}

/** Throws WrongPassword when the password (or the ciphertext) does not authenticate. */
export async function decryptSecret(vault: Vault, password: string): Promise<Uint8Array> {
  if (vault?.v !== 1 || vault.kdf !== "PBKDF2-SHA256" || !(vault.iter >= 100_000)) throw new Error("Unsupported wallet vault");
  const key = await deriveKey(password, unb64(vault.salt), vault.iter);
  try { return new Uint8Array(await subtle().decrypt({ name: "AES-GCM", iv: unb64(vault.iv) as BufferSource }, key, unb64(vault.ct) as BufferSource)); }
  catch { throw new WrongPassword(); }
}

/** Wallet vault v2 (no password): the secret is sealed with AES-GCM-256 under a device key that WebCrypto generates as
 *  non-extractable. The background worker keeps that CryptoKey in IndexedDB (a structured clone of the handle, the raw
 *  key bytes are never readable by script), and only the ciphertext goes to chrome.storage.local. */
export interface Wrapped { v: 2; alg: "AES-GCM-256"; iv: string; ct: string }

export const newWrapKey = (): Promise<CryptoKey> => subtle().generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]) as Promise<CryptoKey>;

export async function wrapSecret(secret: Uint8Array, key: CryptoKey): Promise<Wrapped> {
  if (key.extractable) throw new Error("The wallet key must be non-extractable");
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, secret as BufferSource));
  return { v: 2, alg: "AES-GCM-256", iv: b64(iv), ct: b64(ct) };
}

export class KeyMismatch extends Error { constructor() { super("This wallet can no longer be opened on this browser. Import it again from your backup."); this.name = "KeyMismatch"; } }

/** Throws KeyMismatch when the device key does not authenticate the ciphertext (other key, or tampered data). */
export async function unwrapSecret(w: Wrapped, key: CryptoKey): Promise<Uint8Array> {
  if (w?.v !== 2 || w.alg !== "AES-GCM-256") throw new Error("Unsupported wallet vault");
  try { return new Uint8Array(await subtle().decrypt({ name: "AES-GCM", iv: unb64(w.iv) as BufferSource }, key, unb64(w.ct) as BufferSource)); }
  catch { throw new KeyMismatch(); }
}
