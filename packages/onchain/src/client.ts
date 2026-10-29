import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction, type Signer } from "@solana/web3.js";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";

const here = path.dirname(fileURLToPath(import.meta.url));

export type DevnetConfigs = Record<string, string>;
export type LegacyConfig = { key: string; address: string };

function readConfigFile(): Record<string, unknown> {
  const p = path.resolve(here, "..", "configs.devnet.json");
  return JSON.parse(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, ""));
}

/** Active configs (string entries only). New launches use these. */
export function loadConfigs(): DevnetConfigs {
  return Object.fromEntries(Object.entries(readConfigFile()).filter(([, v]) => typeof v === "string")) as DevnetConfigs;
}

/** Retired configs: no new launches, but existing pools must still be indexed/cranked. */
export function loadLegacyConfigs(): LegacyConfig[] {
  const l = readConfigFile().legacy;
  return Array.isArray(l) ? (l as LegacyConfig[]) : [];
}

/** Devnet-only test configs from env TEST_CONFIGS="higher_off=<config>,..." (never part of configs.devnet.json / the launch list). */
export function testConfigEntries(): [string, string][] {
  return (process.env.TEST_CONFIGS ?? "").split(",").map((s) => s.trim().split("=") as [string, string]).filter(([k, v]) => /^(standard|higher|max)_(on|off)$/.test(k ?? "") && !!v);
}

/** Active + legacy tier configs (+ env test configs), e.g. for indexer polling. */
export function allTierConfigEntries(): [string, string][] {
  const tier = /^(standard|higher|max)_(on|off)$/;
  const active = Object.entries(loadConfigs()).filter(([k]) => tier.test(k));
  const legacy = loadLegacyConfigs().filter((c) => tier.test(c.key)).map((c) => [c.key, c.address] as [string, string]);
  return [...active, ...legacy, ...testConfigEntries()];
}

export function rpcUrl(): string {
  return process.env.DEVNET_RPC || process.env.RPC_URL || "https://api.devnet.solana.com";
}

let _conn: Connection | undefined;
let _client: DynamicBondingCurveClient | undefined;

export function getConnection(): Connection {
  if (!_conn) _conn = new Connection(rpcUrl(), "confirmed");
  return _conn;
}

export function getClient(): DynamicBondingCurveClient {
  if (!_client) _client = new DynamicBondingCurveClient(getConnection(), "confirmed");
  return _client;
}

export function loadPlatformKeypair(): Keypair {
  const kpPath = process.env.PLATFORM_KEYPAIR_PATH ?? path.resolve(here, "..", "keys", "devnet.keypair.json");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(path.resolve(kpPath), "utf8"))));
}

export function configPubkey(tier: string, antiSniper: boolean): PublicKey {
  const key = `${tier}_${antiSniper ? "on" : "off"}`;
  const v = loadConfigs()[key];
  if (!v) throw new Error(`config ${key} not in configs.devnet.json`);
  return new PublicKey(v);
}

const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ATA_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const wsolAta = (owner: PublicKey) => PublicKey.findProgramAddressSync([owner.toBuffer(), TOKEN_PROGRAM.toBuffer(), WSOL_MINT.toBuffer()], ATA_PROGRAM)[0];

/** Platform referral wallet: env REFERRAL_WALLET, else configs.referral_wallet. */
export function referralWallet(): PublicKey | null {
  const w = process.env.REFERRAL_WALLET || loadConfigs().referral_wallet;
  return w ? new PublicKey(w) : null;
}

/** Referral token account (quote/WSOL ATA of the referral wallet; legacy fallback: configs.referral_wsol_ata). */
export function referralAta(): PublicKey {
  const w = referralWallet();
  return w ? wsolAta(w) : new PublicKey(loadConfigs().referral_wsol_ata);
}

let _refOk: { at: number; ok: boolean } | undefined;
/** Referral account to put in a swap, or null if it does not exist on-chain (swap would fail with AccountNotInitialized). Cached 5 min when present, 30 s when missing. */
export async function usableReferralAta(): Promise<PublicKey | null> {
  const pk = referralAta();
  const ttl = _refOk?.ok ? 300_000 : 30_000;
  if (!_refOk || Date.now() - _refOk.at > ttl) {
    try { _refOk = { at: Date.now(), ok: !!(await getConnection().getAccountInfo(pk, "confirmed")) }; }
    catch { return _refOk?.ok ? pk : null; }
    if (!_refOk.ok) console.warn(`[referral] ${pk.toBase58()} not initialized; swaps omit the referral`);
  }
  return _refOk.ok ? pk : null;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function withRetry<T>(fn: () => Promise<T>, attempts = 4, baseMs = 500): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < attempts - 1) await sleep(baseMs * 2 ** i);
    }
  }
  throw last;
}

/** Sign + send with retries; refreshes blockhash each attempt. */
export async function sendTx(tx: Transaction, signers: Signer[]): Promise<string> {
  const conn = getConnection();
  return withRetry(async () => {
    const { blockhash } = await conn.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
    tx.feePayer = tx.feePayer ?? signers[0].publicKey;
    return sendAndConfirmTransaction(conn, tx, signers, { commitment: "confirmed" });
  });
}

export function arg(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
}

export const isMain = (metaUrl: string) =>
  !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(metaUrl);