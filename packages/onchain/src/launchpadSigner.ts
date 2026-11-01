/**
 * Launchpad identity signer (terminal indexing).
 *
 * GMGN, Jupiter, Axiom and other terminals attribute a Meteora DBC launch to a launchpad by a common signer: one fixed key
 * that signs every create-pool tx of that launchpad. Meteora's example (tx mnKk9poL...) carries it as an extra read-only
 * signer that no instruction references (header signer list only), which needs a hand-built v0 message.
 *
 * Our launch tx is a legacy web3.js Transaction that the creator's wallet may re-compile (Phantom adds ComputeBudget and
 * Lighthouse instructions), and a legacy Transaction can only carry signers that an instruction references. So the key is
 * appended as a read-only signer remaining account of the DBC initialize_virtual_pool_* instruction. DBC reads
 * remaining_accounts[0] of that instruction only as the quote mint's token badge, and only when the quote mint is not a plain
 * SPL Token mint (utils/token.rs get_mint_score). Our quote mint is always WSOL, so the account is ignored on chain.
 * Cost: +97 bytes (32 key, 64 signature, 1 account index), the minimum for an extra signer.
 *
 * The key holds no SOL, pays nothing and is never writable. It only proves "built by highbar".
 *   LAUNCHPAD_SIGNER_KEYPAIR_JSON   secret key JSON array (Railway: a sealed variable on the api service)
 *   LAUNCHPAD_SIGNER_KEYPAIR_PATH   or a key file (local / CLI)
 *   LAUNCHPAD_SIGNER_PUBKEY         optional: the expected public key (a different key is refused)
 *   LAUNCHPAD_SIGNER_DISABLED=true  kill switch: build launches without it
 * Unset: no launchpad signer (devnet / dev). Mainnet policy lives in the API startup check (apps/api security/prodCheck.ts).
 * The secret is never logged or returned. Errors never echo the env values.
 */
import fs from "node:fs";
import path from "node:path";
import { Keypair, PublicKey, type Transaction } from "@solana/web3.js";
import { DYNAMIC_BONDING_CURVE_PROGRAM_ID, DynamicBondingCurveIdl } from "@meteora-ag/dynamic-bonding-curve-sdk";

type Env = Record<string, string | undefined>;
export const LAUNCHPAD_SIGNER_ENV = {
  json: "LAUNCHPAD_SIGNER_KEYPAIR_JSON", path: "LAUNCHPAD_SIGNER_KEYPAIR_PATH", pubkey: "LAUNCHPAD_SIGNER_PUBKEY", disabled: "LAUNCHPAD_SIGNER_DISABLED",
} as const;

export type LaunchpadSignerStatus =
  | { state: "disabled" } | { state: "unset" }
  | { state: "ok"; pubkey: string; keypair: Keypair }
  | { state: "bad"; problem: string };

const truthy = (v?: string) => /^(1|true|yes|on)$/i.test((v ?? "").trim());

/** Reads the env (and the key file when PATH is used). Never throws, never echoes a value. */
export function launchpadSignerStatus(env: Env = process.env): LaunchpadSignerStatus {
  if (truthy(env[LAUNCHPAD_SIGNER_ENV.disabled])) return { state: "disabled" };
  const json = env[LAUNCHPAD_SIGNER_ENV.json]?.trim(), file = env[LAUNCHPAD_SIGNER_ENV.path]?.trim();
  if (!json && !file) return { state: "unset" };
  if (/<FILL_ME>/.test(json ?? "") || /<FILL_ME>/.test(file ?? "")) return { state: "bad", problem: "launchpad signer env still holds <FILL_ME>" };
  let raw: string;
  if (json) raw = json;
  else {
    try { raw = fs.readFileSync(path.resolve(file!), "utf8"); }
    catch { return { state: "bad", problem: `${LAUNCHPAD_SIGNER_ENV.path} is not a readable key file` }; }
  }
  let kp: Keypair;
  try {
    const arr = JSON.parse(raw.replace(/^\uFEFF/, ""));
    if (!Array.isArray(arr) || arr.length !== 64) throw new Error("shape");
    kp = Keypair.fromSecretKey(Uint8Array.from(arr));
  } catch { return { state: "bad", problem: `${json ? LAUNCHPAD_SIGNER_ENV.json : LAUNCHPAD_SIGNER_ENV.path} is not a valid secret key JSON array (64 numbers)` }; }
  const want = env[LAUNCHPAD_SIGNER_ENV.pubkey]?.trim();
  if (want) {
    let w: PublicKey;
    try { w = new PublicKey(want); } catch { return { state: "bad", problem: `${LAUNCHPAD_SIGNER_ENV.pubkey} is not a valid public key` }; }
    if (!w.equals(kp.publicKey)) return { state: "bad", problem: `launchpad signer key does not match ${LAUNCHPAD_SIGNER_ENV.pubkey}` };
  }
  return { state: "ok", pubkey: kp.publicKey.toBase58(), keypair: kp };
}

/** The launchpad signer, or null when unset / disabled. Throws (fixed message, no secret) on a malformed or mismatched key. */
export function loadLaunchpadSigner(env: Env = process.env): Keypair | null {
  const s = launchpadSignerStatus(env);
  if (s.state === "bad") throw new Error(s.problem);
  return s.state === "ok" ? s.keypair : null;
}

let cached: { kp: Keypair | null } | null = null;
/** Process-wide cached loadLaunchpadSigner() (env is read once). */
export function launchpadSigner(): Keypair | null {
  if (!cached) cached = { kp: loadLaunchpadSigner() };
  return cached.kp;
}
/** tests only */
export function resetLaunchpadSignerCache() { cached = null; }

const INIT_DISCS = (DynamicBondingCurveIdl as unknown as { instructions: { name: string; discriminator: number[] }[] }).instructions
  .filter((i) => i.name === "initialize_virtual_pool_with_spl_token" || i.name === "initialize_virtual_pool_with_token2022")
  .map((i) => Buffer.from(i.discriminator));
if (INIT_DISCS.length !== 2) throw new Error("DBC IDL: initialize_virtual_pool instructions not found");

/** Index of the DBC initialize pool instruction in tx.instructions (exactly one), else -1 (more than one throws). */
export function dbcInitIndex(tx: Transaction): number {
  const hits = tx.instructions.map((ix, i) => ix.programId.equals(DYNAMIC_BONDING_CURVE_PROGRAM_ID) && INIT_DISCS.some((d) => ix.data.subarray(0, 8).equals(d)) ? i : -1).filter((i) => i >= 0);
  if (hits.length > 1) throw new Error("more than one DBC initialize pool instruction");
  return hits.length ? hits[0] : -1;
}

/** Appends `signer` as a read-only signer (last account) of the DBC initialize pool instruction. Call before any signature. */
export function addLaunchpadSigner(tx: Transaction, signer: PublicKey): Transaction {
  const i = dbcInitIndex(tx);
  if (i < 0) throw new Error("launch tx has no DBC initialize pool instruction");
  if (tx.instructions.some((ix) => ix.programId.equals(signer) || ix.keys.some((k) => k.pubkey.equals(signer)))) throw new Error("launchpad signer already referenced in the launch tx");
  if (tx.signatures.some((s) => s.signature)) throw new Error("add the launchpad signer before signing");
  tx.instructions[i].keys.push({ pubkey: signer, isSigner: true, isWritable: false });
  return tx;
}
