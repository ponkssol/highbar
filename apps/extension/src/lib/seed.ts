/** Seed phrases: BIP39 (English) to a 64 byte seed, then SLIP-10 ed25519 at m/44'/501'/<account>'/0' (Phantom, Solflare, Backpack). */
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { hmac } from "@noble/hashes/hmac.js";
import { sha512 } from "@noble/hashes/sha2.js";
import { utf8 } from "./bytes";

export const SOLANA_PATH = (account = 0) => `m/44'/501'/${account}'/0'`;
const HARDENED = 0x80000000;

export const normalizeMnemonic = (m: string) => m.trim().toLowerCase().split(/\s+/).filter(Boolean).join(" ");
export const isMnemonic = (m: string) => { const n = normalizeMnemonic(m); const w = n.split(" ").length; return (w === 12 || w === 24) && validateMnemonic(n, wordlist); };
export const newMnemonic = (words: 12 | 24 = 12) => generateMnemonic(wordlist, words === 24 ? 256 : 128);

/** SLIP-10 ed25519 (only hardened steps exist for ed25519). Returns the 32 byte private seed of the leaf. */
export function slip10Ed25519(seed: Uint8Array, path: string): Uint8Array {
  if (!/^m(\/\d+')*$/.test(path)) throw new Error("ed25519 paths must be fully hardened");
  let I = hmac(sha512, utf8("ed25519 seed"), seed);
  let key = I.slice(0, 32), chain = I.slice(32);
  for (const seg of path.split("/").slice(1)) {
    const idx = (Number(seg.slice(0, -1)) + HARDENED) >>> 0;
    const data = new Uint8Array(37);
    data[0] = 0; data.set(key, 1);
    data[33] = idx >>> 24; data[34] = (idx >>> 16) & 0xff; data[35] = (idx >>> 8) & 0xff; data[36] = idx & 0xff;
    I.fill(0);
    I = hmac(sha512, chain, data);
    data.fill(0); key.fill(0);
    key = I.slice(0, 32); chain = I.slice(32);
  }
  I.fill(0); chain.fill(0);
  return key;
}

/** 32 byte ed25519 private seed for a mnemonic at the Phantom path. */
export function seedFromMnemonic(mnemonic: string, account = 0, passphrase = ""): Uint8Array {
  const n = normalizeMnemonic(mnemonic);
  if (!isMnemonic(n)) throw new Error("That is not a valid 12 or 24 word seed phrase");
  const seed = mnemonicToSeedSync(n, passphrase);
  try { return slip10Ed25519(seed, SOLANA_PATH(account)); } finally { seed.fill(0); }
}
