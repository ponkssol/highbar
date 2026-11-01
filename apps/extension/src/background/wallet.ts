/** Wallets in the background worker. Several wallets, one active. There is no lock and no password: chrome.storage.local holds
 *  the list (label, public address and the sealed key of each wallet: AES-GCM under one non-extractable device CryptoKey kept
 *  in IndexedDB, see lib/keystore.ts). Only this worker opens a key. Content scripts and pages get labels and addresses only.
 *  Older layouts are moved into the list on first read: a single sealed wallet (hb.vault, v2) and a password vault (v1, which
 *  then waits for its old password once). */
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { decryptSecret, unwrapSecret, wrapSecret, type Vault, type Wrapped } from "../lib/crypto";
import { decodeSecret, encodeSecret, exportText, keypairOf, parseImport, type Secret } from "../lib/keys";
import { deviceKey, idbKeyStore, type KeyStore } from "../lib/keystore";
import { newMnemonic } from "../lib/seed";
import { wipe } from "../lib/bytes";
import { cleanWalletLabel, nextWalletLabel } from "../lib/wallets";

const LIST = "hb.wallets";
/** The single wallet layout before multi wallet support. Read once, moved into LIST, then removed. */
const LEGACY = "hb.vault";
export const MAX_WALLETS = 20;

let keys: KeyStore = idbKeyStore();
/** Tests only: an in-memory key store instead of IndexedDB. Also forgets the opened keypairs, like a worker restart. */
export function useKeyStore(k: KeyStore) { keys = k; mem.clear(); }

/** One wallet. `sealed` (v2) is the usable form. A record with only `vault` (v1, password) waits for migrate(). */
export interface WalletRec { id: string; label: string; address: string; kind: Secret["kind"]; createdAt: number; sealed?: Wrapped; vault?: Vault }
export interface WalletList { v: 3; active: string | null; wallets: WalletRec[] }
/** What pages and the content script see. No key material. */
export interface WalletInfo { id: string; label: string; address: string; kind: Secret["kind"]; createdAt: number; active: boolean; needsMigration: boolean }

export class NeedsMigration extends Error { code = "MIGRATE"; constructor() { super("Enter your old wallet password once in the side panel to finish the update"); } }
export class UnknownWallet extends Error { code = "NO_WALLET"; constructor() { super("That wallet is not in this browser any more. Pick another one"); } }

/** Opened keypairs by wallet id, worker memory only. */
const mem = new Map<string, Keypair>();

// All writes go through one queue so two quick requests (add + rename) cannot overwrite each other.
let queue: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> { const r = queue.then(fn, fn); queue = r.catch(() => {}); return r; }

const newId = () => { const b = crypto.getRandomValues(new Uint8Array(9)); return "w_" + bs58.encode(b); };
const needs = (w: WalletRec) => !w.sealed && !!w.vault;
const info = (l: WalletList) => (w: WalletRec): WalletInfo => ({ id: w.id, label: w.label, address: w.address, kind: w.kind, createdAt: w.createdAt, active: w.id === l.active, needsMigration: needs(w) });

async function save(l: WalletList) { await chrome.storage.local.set({ [LIST]: l }); }

/** The wallet list. Moves an older single wallet in as "Wallet 1" the first time (idempotent, the old entry goes only after the list is written). */
async function load(): Promise<WalletList> {
  const r = await chrome.storage.local.get([LIST, LEGACY]);
  let l = r[LIST] as WalletList | undefined;
  const old = r[LEGACY] as { sealed?: Wrapped; vault?: Vault; address: string; kind: Secret["kind"]; createdAt: number } | undefined;
  if (!l || l.v !== 3 || !Array.isArray(l.wallets)) l = { v: 3, active: null, wallets: [] };
  if (old?.address && (old.sealed || old.vault)) {
    if (!l.wallets.some((w) => w.address === old.address)) {
      const w: WalletRec = { id: newId(), label: nextWalletLabel(l.wallets.map((x) => x.label)), address: old.address, kind: old.kind, createdAt: old.createdAt || Date.now(),
        ...(old.sealed ? { sealed: old.sealed } : {}), ...(!old.sealed && old.vault ? { vault: old.vault } : {}) };
      l.wallets.unshift(w);
      l.active ??= w.id;
    }
    await save(l);
    await chrome.storage.local.remove(LEGACY);
  }
  if (l.active && !l.wallets.some((w) => w.id === l!.active)) l.active = l.wallets[0]?.id ?? null;
  if (!l.active && l.wallets.length) l.active = l.wallets[0].id;
  return l;
}

export async function list(): Promise<WalletInfo[]> { const l = await locked(load); return l.wallets.map(info(l)); }
export async function active(): Promise<WalletInfo | null> { const l = await locked(load); const w = l.wallets.find((x) => x.id === l.active); return w ? info(l)(w) : null; }
/** A wallet by id or address, else the active one when `ref` is empty. Throws UnknownWallet for a ref that is not in the list. */
export async function find(ref?: string | null): Promise<WalletInfo | null> {
  const l = await locked(load);
  if (!ref) { const w = l.wallets.find((x) => x.id === l.active); return w ? info(l)(w) : null; }
  const w = l.wallets.find((x) => x.id === ref || x.address === ref);
  if (!w) throw new UnknownWallet();
  return info(l)(w);
}

async function sealRec(secret: Secret): Promise<{ sealed: Wrapped; kp: Keypair }> {
  const kp = keypairOf(secret);
  const key = (await deviceKey(keys, true))!;
  const bytes = encodeSecret(secret);
  try { return { sealed: await wrapSecret(bytes, key), kp }; } finally { wipe(bytes); }
}

async function add(secret: Secret, label?: string): Promise<WalletInfo> {
  return locked(async () => {
    const l = await load();
    if (l.wallets.length >= MAX_WALLETS) throw new Error(`Up to ${MAX_WALLETS} wallets`);
    const address = keypairOf(secret).publicKey.toBase58();
    const dup = l.wallets.find((w) => w.address === address);
    if (dup) throw Object.assign(new Error(`This wallet is already added as ${dup.label}`), { code: "EXISTS" });
    const name = label ? cleanWalletLabel(label) : nextWalletLabel(l.wallets.map((w) => w.label));
    if (!name) throw new Error("Use 1 to 24 characters for the label");
    const { sealed, kp } = await sealRec(secret);
    const w: WalletRec = { id: newId(), label: name, address, kind: secret.kind, createdAt: Date.now(), sealed };
    l.wallets.push(w);
    l.active = w.id; // the wallet just added becomes the active one
    await save(l);
    mem.set(w.id, kp);
    return info(l)(w);
  });
}

export async function create(words: 12 | 24, label?: string) {
  const mnemonic = newMnemonic(words);
  const w = await add({ kind: "mnemonic", mnemonic, account: 0 }, label);
  return { id: w.id, address: w.address, mnemonic };
}
export async function importWallet(input: string, label?: string) {
  const w = await add(parseImport(input), label);
  return { id: w.id, address: w.address };
}

/** One time per old wallet: opens a v1 password vault and re-seals it with the device key. The password is not kept. */
export async function migrate(id: string | null, password: string) {
  return locked(async () => {
    const l = await load();
    const w = l.wallets.find((x) => x.id === (id ?? l.active));
    if (!w?.vault || w.sealed) throw new Error("Nothing to update");
    const bytes = await decryptSecret(w.vault, password);
    let secret: Secret;
    try { secret = decodeSecret(bytes); } finally { wipe(bytes); }
    if (keypairOf(secret).publicKey.toBase58() !== w.address) throw new Error("Wallet data does not match its address");
    const { sealed, kp } = await sealRec(secret);
    w.sealed = sealed; delete w.vault;
    await save(l);
    mem.set(w.id, kp);
    return { id: w.id, address: w.address };
  });
}

export async function rename(id: string, label: string) {
  return locked(async () => {
    const l = await load();
    const w = l.wallets.find((x) => x.id === id);
    if (!w) throw new UnknownWallet();
    const name = cleanWalletLabel(label);
    if (!name) throw new Error("Use 1 to 24 characters for the label");
    w.label = name;
    await save(l);
    return info(l)(w);
  });
}

export async function setActive(id: string) {
  return locked(async () => {
    const l = await load();
    if (!l.wallets.some((x) => x.id === id)) throw new UnknownWallet();
    l.active = id;
    await save(l);
    return { ok: true as const };
  });
}

async function openSecret(w: WalletRec): Promise<Secret> {
  if (!w.sealed) throw new NeedsMigration();
  const key = await deviceKey(keys, false);
  if (!key) throw new Error("This wallet can no longer be opened on this browser. Import it again from your backup.");
  const bytes = await unwrapSecret(w.sealed, key);
  try { return decodeSecret(bytes); } finally { wipe(bytes); }
}

/** Keypair.secretKey returns a copy, so the internal buffer is cleared directly (web3.js v1 keeps it in _keypair). */
function wipeKeypair(kp: Keypair) { const inner = (kp as unknown as { _keypair?: { secretKey?: Uint8Array } })._keypair; wipe(inner?.secretKey); }

/** The keypair of one wallet (by id or address, else the active one). Worker only. Throws NeedsMigration for a v1 wallet. */
export async function keypair(ref?: string | null): Promise<Keypair> {
  const l = await locked(load);
  const w = ref ? l.wallets.find((x) => x.id === ref || x.address === ref) : l.wallets.find((x) => x.id === l.active);
  if (!w) { if (ref) throw new UnknownWallet(); throw new Error("No wallet yet"); }
  const hit = mem.get(w.id);
  if (hit && hit.publicKey.toBase58() === w.address) return hit;
  const kp = keypairOf(await openSecret(w));
  if (kp.publicKey.toBase58() !== w.address) { wipeKeypair(kp); throw new Error("Wallet data does not match its address"); }
  mem.set(w.id, kp);
  return kp;
}

/** Reveal needs an explicit confirm from the side panel (checked by the caller too). */
export async function exportSecret(id: string) {
  const l = await locked(load);
  const w = l.wallets.find((x) => x.id === id);
  if (!w) throw new UnknownWallet();
  const secret = await openSecret(w);
  const kp = keypairOf(secret);
  try { return { address: w.address, privateKey: bs58.encode(kp.secretKey), mnemonic: secret.kind === "mnemonic" ? exportText(secret) : null }; } finally { wipeKeypair(kp); }
}

/** Removes one wallet. The next one becomes active. With the last one gone the device key is deleted too. */
export async function remove(id: string) {
  return locked(async () => {
    const l = await load();
    const w = l.wallets.find((x) => x.id === id);
    if (!w) throw new UnknownWallet();
    const kp = mem.get(id); if (kp) wipeKeypair(kp); mem.delete(id);
    l.wallets = l.wallets.filter((x) => x.id !== id);
    if (l.active === id) l.active = l.wallets[0]?.id ?? null;
    await save(l);
    if (!l.wallets.length) await keys.clear().catch(() => {});
    return { address: w.address };
  });
}
