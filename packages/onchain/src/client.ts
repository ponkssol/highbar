import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction, type Signer } from "@solana/web3.js";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";

const here = path.dirname(fileURLToPath(import.meta.url));

export type DevnetConfigs = Record<string, string>;

export function loadConfigs(): DevnetConfigs {
  const p = path.resolve(here, "..", "configs.devnet.json");
  return JSON.parse(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, ""));
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
  const kpPath = process.env.PLATFORM_KEYPAIR_PATH ?? "./keys/platform.keypair.json";
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(path.resolve(kpPath), "utf8"))));
}

export function configPubkey(tier: string, antiSniper: boolean): PublicKey {
  const key = `${tier}_${antiSniper ? "on" : "off"}`;
  const v = loadConfigs()[key];
  if (!v) throw new Error(`config ${key} not in configs.devnet.json`);
  return new PublicKey(v);
}

export function referralAta(): PublicKey {
  return new PublicKey(loadConfigs().referral_wsol_ata);
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