import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Connection, Keypair, PublicKey, SendTransactionError, Transaction, type Signer } from "@solana/web3.js";
import { utils } from "@coral-xyz/anchor";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";

const here = path.dirname(fileURLToPath(import.meta.url));

export type DevnetConfigs = Record<string, string>;
export type LegacyConfig = { key: string; address: string };

/** NETWORK env -> cluster (anything but mainnet/mainnet-beta is devnet). */
export function network(): "devnet" | "mainnet" {
  return process.env.NETWORK === "mainnet" || process.env.NETWORK === "mainnet-beta" ? "mainnet" : "devnet";
}

/** Tier config key -> env var that overrides it (the BUILD_BRIEF names). */
export const CONFIG_ENV: Record<string, string> = {
  standard_off: "CONFIG_STANDARD_OFF", standard_on: "CONFIG_STANDARD_ON",
  higher_off: "CONFIG_HIGHER_OFF", higher_on: "CONFIG_HIGHER_ON",
  max_off: "CONFIG_MAX_OFF", max_on: "CONFIG_MAX_ON",
};

/** configs.<network>.json next to package.json. Mainnet never falls back to the devnet file. */
export function configFilePath(net = network()): string {
  return path.resolve(here, "..", `configs.${net}.json`);
}
function readConfigFile(): Record<string, unknown> {
  const p = configFilePath();
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, ""));
}

/** Active configs (string entries only): configs.<network>.json, overridden by CONFIG_* env vars. New launches use these. */
export function loadConfigs(): DevnetConfigs {
  const file = Object.fromEntries(Object.entries(readConfigFile()).filter(([, v]) => typeof v === "string")) as DevnetConfigs;
  for (const [k, envName] of Object.entries(CONFIG_ENV)) { const v = process.env[envName]?.trim(); if (v) file[k] = v; }
  return file;
}

/** Retired configs: no new launches, but existing pools must still be indexed/cranked. */
export function loadLegacyConfigs(): LegacyConfig[] {
  const l = readConfigFile().legacy;
  return Array.isArray(l) ? (l as LegacyConfig[]) : [];
}

/** Devnet-only test configs from env TEST_CONFIGS="higher_off=<config>,..." (never part of configs.devnet.json / the launch list). */
export function testConfigEntries(): [string, string][] {
  if (network() === "mainnet") return [];
  return (process.env.TEST_CONFIGS ?? "").split(",").map((s) => s.trim().split("=") as [string, string]).filter(([k, v]) => /^(standard|higher|max)_(on|off)$/.test(k ?? "") && !!v);
}

/** Active + legacy tier configs (+ env test configs), e.g. for indexer polling. */
export function allTierConfigEntries(): [string, string][] {
  const tier = /^(standard|higher|max)_(on|off)$/;
  const active = Object.entries(loadConfigs()).filter(([k]) => tier.test(k));
  const legacy = loadLegacyConfigs().filter((c) => tier.test(c.key)).map((c) => [c.key, c.address] as [string, string]);
  return [...active, ...legacy, ...testConfigEntries()];
}

/** Devnet: DEVNET_RPC || RPC_URL || public devnet. Mainnet: RPC_URL only (DEVNET_RPC is ignored; the startup check refuses the public endpoint). */
export function rpcUrl(): string {
  if (network() === "mainnet") return process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
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

/** Platform (claim/buyback/keeper) keypair. Railway: PLATFORM_KEYPAIR_JSON = the secret key JSON array as a sealed variable;
 *  local: PLATFORM_KEYPAIR_PATH = a keypair file. Devnet falls back to keys/devnet.keypair.json; mainnet never does. */
export function loadPlatformKeypair(): Keypair {
  const json = process.env.PLATFORM_KEYPAIR_JSON?.trim();
  if (json) {
    try { return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(json))); }
    catch { throw new Error("PLATFORM_KEYPAIR_JSON is not a valid secret key JSON array"); }
  }
  if (network() === "mainnet" && !process.env.PLATFORM_KEYPAIR_PATH) throw new Error("PLATFORM_KEYPAIR_JSON or PLATFORM_KEYPAIR_PATH must be set on mainnet (no devnet keypair fallback)");
  const kpPath = process.env.PLATFORM_KEYPAIR_PATH ?? path.resolve(here, "..", "keys", "devnet.keypair.json");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(path.resolve(kpPath), "utf8"))));
}

export function configPubkey(tier: string, antiSniper: boolean): PublicKey {
  const key = `${tier}_${antiSniper ? "on" : "off"}`;
  const v = loadConfigs()[key];
  if (!v) throw new Error(`config ${key} not set (${CONFIG_ENV[key] ?? key} or configs.${network()}.json)`);
  return new PublicKey(v);
}

const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ATA_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const wsolAta = (owner: PublicKey) => PublicKey.findProgramAddressSync([owner.toBuffer(), TOKEN_PROGRAM.toBuffer(), WSOL_MINT.toBuffer()], ATA_PROGRAM)[0];

/** Platform referral wallet: env REFERRAL_WALLET (alias REFERRAL_ACCOUNT), else configs.<network>.json referral_wallet. */
export function referralWallet(): PublicKey | null {
  const w = process.env.REFERRAL_WALLET || process.env.REFERRAL_ACCOUNT || loadConfigs().referral_wallet;
  return w ? new PublicKey(w) : null;
}

/** Referral token account (quote/WSOL ATA of the referral wallet; legacy fallback: configs.referral_wsol_ata). */
export function referralAta(): PublicKey {
  const w = referralWallet();
  if (w) return wsolAta(w);
  const legacy = loadConfigs().referral_wsol_ata;
  if (!legacy) throw new Error(`REFERRAL_WALLET is not set (and configs.${network()}.json has no referral_wallet)`);
  return new PublicKey(legacy);
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

/** Sign once, then re-broadcast the SAME signed bytes and confirm by that signature.
 *  Only when the blockhash has expired (block height > lastValidBlockHeight) and the signature has not landed
 *  is the tx rebuilt with a fresh blockhash and re-signed, so a retry can never double-execute. */
export async function sendTx(tx: Transaction, signers: Signer[], opts: { blockhashes?: number; pollMs?: number } = {}): Promise<string> {
  const conn = getConnection();
  const blockhashes = opts.blockhashes ?? 3, pollMs = opts.pollMs ?? 2000;
  tx.feePayer = tx.feePayer ?? signers[0].publicKey;
  for (let round = 0; round < blockhashes; round++) {
    const { blockhash, lastValidBlockHeight } = await withRetry(() => conn.getLatestBlockhash("confirmed"));
    tx.recentBlockhash = blockhash;
    tx.sign(...signers);
    const raw = tx.serialize();
    const sig = utils.bytes.bs58.encode(tx.signature!);
    let preflight = true;
    for (;;) {
      try {
        await conn.sendRawTransaction(raw, { skipPreflight: !preflight, maxRetries: 0, preflightCommitment: "confirmed" });
        preflight = false;
      } catch (e) {
        // a simulation failure is deterministic: surface it; transport errors just mean "rebroadcast next poll"
        if (e instanceof SendTransactionError && preflight) throw e;
      }
      await sleep(pollMs);
      const st = (await withRetry(() => conn.getSignatureStatuses([sig]))).value[0];
      if (st?.err) throw new Error(`tx ${sig} failed: ${JSON.stringify(st.err)}`);
      if (st?.confirmationStatus === "confirmed" || st?.confirmationStatus === "finalized") return sig;
      if (st) continue; // processed: landed, wait for confirmation without rebuilding
      const height = await withRetry(() => conn.getBlockHeight("confirmed"));
      if (height <= lastValidBlockHeight) continue;
      const late = (await withRetry(() => conn.getSignatureStatus(sig, { searchTransactionHistory: true }))).value;
      if (late?.err) throw new Error(`tx ${sig} failed: ${JSON.stringify(late.err)}`);
      if (late) continue; // landed after all
      break; // expired and never landed: safe to rebuild with a fresh blockhash
    }
  }
  throw new Error(`transaction not confirmed after ${blockhashes} blockhashes`);
}

export function arg(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
}

export const isMain = (metaUrl: string) =>
  !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(metaUrl);
/** Env vars still holding the deploy/mainnet template placeholder. */
export function unfilledEnv(env: NodeJS.ProcessEnv = process.env): string[] {
  return Object.entries(env).filter(([, v]) => typeof v === "string" && v.includes("<FILL_ME>")).map(([k]) => k);
}
/** RPC URL without query string / api keys, for logs. */
export const maskRpc = (u: string) => u.replace(/\?.*$/, "?…").replace(/(api[-_]?key[=/])[^&/]+/i, "$1…");
