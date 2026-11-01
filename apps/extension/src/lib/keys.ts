/** Wallet secrets: what the vault stores and how imports are parsed. The vault holds a JSON payload with either a
 *  base58 64 byte secret key or a seed phrase (kept so the user can export it again). */
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { isMnemonic, normalizeMnemonic, seedFromMnemonic } from "./seed";
import { utf8 } from "./bytes";

export type Secret = { kind: "key"; secretKey: string } | { kind: "mnemonic"; mnemonic: string; account: number };

export function keypairOf(s: Secret): Keypair {
  if (s.kind === "key") return Keypair.fromSecretKey(bs58.decode(s.secretKey));
  const seed = seedFromMnemonic(s.mnemonic, s.account);
  try { return Keypair.fromSeed(seed); } finally { seed.fill(0); }
}

/** Parses what a user pastes: a seed phrase (12 or 24 words), a base58 secret key (64 bytes) or a JSON byte array (solana-keygen file). */
export function parseImport(input: string): Secret {
  const t = input.trim();
  if (!t) throw new Error("Paste a private key or a seed phrase");
  if (/\s/.test(t) || /^[a-z]+$/.test(t)) {
    if (!isMnemonic(t)) throw new Error("That is not a valid 12 or 24 word seed phrase");
    return { kind: "mnemonic", mnemonic: normalizeMnemonic(t), account: 0 };
  }
  let bytes: Uint8Array;
  if (t.startsWith("[")) {
    let arr: unknown;
    try { arr = JSON.parse(t); } catch { throw new Error("That key file is not valid JSON"); }
    if (!Array.isArray(arr) || !arr.every((x) => Number.isInteger(x) && x >= 0 && x <= 255)) throw new Error("A key file is a list of 64 numbers");
    bytes = Uint8Array.from(arr as number[]);
  } else {
    try { bytes = bs58.decode(t); } catch { throw new Error("That private key is not valid base58"); }
  }
  if (bytes.length !== 64) { bytes.fill(0); throw new Error("A private key is 64 bytes (88 base58 characters)"); }
  try {
    const kp = Keypair.fromSecretKey(bytes); // checks the public half matches
    return { kind: "key", secretKey: bs58.encode(kp.secretKey) };
  } catch { throw new Error("That private key does not match its public key"); } finally { bytes.fill(0); }
}

export const encodeSecret = (s: Secret) => utf8(JSON.stringify(s));
export function decodeSecret(b: Uint8Array): Secret {
  const s = JSON.parse(new TextDecoder().decode(b)) as Secret;
  if (s.kind !== "key" && s.kind !== "mnemonic") throw new Error("Unknown wallet secret");
  return s;
}
export const exportText = (s: Secret) => (s.kind === "key" ? s.secretKey : s.mnemonic);
