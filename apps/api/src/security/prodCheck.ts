import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Keypair, PublicKey } from "@solana/web3.js";
import { encKeyProblem } from "../services/mintPool/secretBox.js";
import { vanityModeProblem } from "../services/mintPool/mode.js";
import { parseGoPublic } from "../jobs/goPublic.js";
import { CONFIG_ENV, DEVNET_LOCK_TIP_WALLET, getClient, getConnection, LOCK_TIP_SOL_MAX, loadConfigs, loadPlatformKeypair, network, parseLockTipSol, rpcUrl } from "@hb/onchain";

type Env = Record<string, string | undefined>;
export interface CheckResult { network: "devnet" | "mainnet"; errors: string[]; warnings: string[] }

const MAINNET_GENESIS = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";
/** Free public endpoints: rate-limited (429 on getProgramAccounts), no SLA. Not acceptable for mainnet. */
/** Host only: provider keys often sit in the URL path or query, so never log the full RPC URL. */
export const rpcHost = (u: string) => { try { return new URL(u).host; } catch { return "(invalid url)"; } };
export const PUBLIC_RPC = /^(https?|wss?):\/\/(api\.(mainnet-beta|mainnet|devnet|testnet)\.solana\.com|solana-api\.projectserum\.com|rpc\.ankr\.com\/solana\/?$)/i;
const isPk = (v?: string) => { if (!v) return false; try { new PublicKey(v.trim()); return true; } catch { return false; } };
const eq = (a?: string | null, b?: string | null) => !!a && !!b && a.trim() === b.trim();
/** Known non-dedicated wallets LOCK_TIP_WALLET must never be on mainnet: the devnet dev/creator wallet (9TAV...) and the old devnet fallback. */
export const LOCK_TIP_FORBIDDEN: ReadonlyArray<[string, string]> = [
  ["the devnet dev wallet 9TAV...", "9TAVGiMrCG5VoyoDGTpexjuMgCsiiwEdW8RZq5ScCop6"],
  ["the devnet fallback tip/referral wallet", DEVNET_LOCK_TIP_WALLET],
];

/**
 * Pure env check (no RPC). Mainnet: missing required env is an error (the API refuses to start).
 * `platformPubkey` = pubkey of PLATFORM_KEYPAIR_PATH when readable on this host (only the public key is used).
 * `configs` = the effective tier configs (CONFIG_* env over configs.mainnet.json).
 */
export function checkEnv(env: Env, ctx: { platformPubkey?: string | null; configs?: Record<string, string>; devnetPubkey?: string | null } = {}): CheckResult {
  const net = env.NETWORK === "mainnet" || env.NETWORK === "mainnet-beta" ? "mainnet" : "devnet";
  const errors: string[] = [], warnings: string[] = [];
  const vprob = vanityModeProblem(env.VANITY_MINTS); // the API also refuses to start on it (services/mintPool/mode.ts)
  if (vprob) (net === "mainnet" ? errors : warnings).push(vprob);
  const vmode = vprob ? "on" : ((env.VANITY_MINTS ?? "").trim().toLowerCase() || "fallback");
  const req = (k: string, why: string, valid: (v: string) => boolean = () => true) => {
    const v = env[k]?.trim();
    if (!v) errors.push(`${k} is required on mainnet (${why})`);
    else if (!valid(v)) errors.push(`${k} is invalid (${why})`);
  };
  const referral = env.REFERRAL_WALLET || env.REFERRAL_ACCOUNT;
  const unfilled = Object.entries(env).filter(([, v]) => typeof v === "string" && /<FILL_ME>/.test(v)).map(([k]) => k);
  if (unfilled.length) (net === "mainnet" ? errors : warnings).push(`placeholder <FILL_ME> left in: ${unfilled.join(", ")} (fill it in or delete the line)`);
  // GO_PUBLIC_DATE (jobs/goPublic.ts): malformed = error everywhere (the config refuses to load), unset on mainnet = warning
  if (env.GO_PUBLIC_DATE?.trim()) { try { parseGoPublic(env.GO_PUBLIC_DATE); } catch (e) { errors.push((e as Error).message); } }
  else if (net === "mainnet") warnings.push("GO_PUBLIC_DATE unset: no cashback accrues or is paid and the cashback page shows zero awaiting. Set it to the go-public day (UTC YYYY-MM-DD) on api and jobs-epoch");
  if (net === "mainnet") {
    req("TREASURY_PUBKEY", "treasury wallet (fee receiver)", isPk);
    if (!referral) errors.push("REFERRAL_WALLET (alias REFERRAL_ACCOUNT) is required on mainnet (platform referral account on every swap)");
    else if (!isPk(referral)) errors.push("REFERRAL_WALLET is not a valid public key");
    if (env.BAR_MINT?.trim() && !isPk(env.BAR_MINT)) errors.push("BAR_MINT is not a valid public key (optional manual $HIGHER mint override)");
    req("DATABASE_URL", "mainnet Postgres");
    req("RPC_URL", "paid mainnet RPC");
    if (env.RPC_URL && PUBLIC_RPC.test(env.RPC_URL.trim())) errors.push("RPC_URL is a public Solana endpoint; use a paid RPC (Helius, Triton, QuickNode) on mainnet");
    if (env.RPC_URL && /devnet/i.test(env.RPC_URL)) errors.push("RPC_URL looks like a devnet endpoint");
    if (env.DEVNET_RPC) warnings.push("DEVNET_RPC is set but ignored on mainnet (RPC_URL is used)");
    for (const [key, envName] of Object.entries(CONFIG_ENV)) {
      const v = ctx.configs?.[key] ?? env[envName];
      if (!v) errors.push(`${envName} is required on mainnet (${key} DBC config; or configs.mainnet.json)`);
      else if (!isPk(v)) errors.push(`${envName} is not a valid public key`);
    }
    const cfgs = Object.keys(CONFIG_ENV).map((k) => ctx.configs?.[k] ?? env[CONFIG_ENV[k]]).filter(Boolean) as string[];
    if (new Set(cfgs).size !== cfgs.length) errors.push("two tiers share the same DBC config pubkey");
    if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32) errors.push("AUTH_SECRET (>= 32 chars) is required on mainnet");
    if (!env.SITE_URL || !/^https:\/\//.test(env.SITE_URL)) errors.push("SITE_URL must be the https web origin on mainnet (token metadata URIs are built from it)");
    if (!env.CORS_ORIGIN || /localhost|127\.0\.0\.1|\*/.test(env.CORS_ORIGIN)) errors.push("CORS_ORIGIN must list the production web origin(s), not localhost / *");
    if (!env.PROXY_SHARED_SECRET) warnings.push("PROXY_SHARED_SECRET unset: per-IP rate limits see the web proxy's IP, not the user's (set the same value on the Railway web and api services)");
    if (env.ALLOW_MAINNET === "true") warnings.push("ALLOW_MAINNET=true in the API env: payout jobs started from this env can send mainnet txs");
    if ((env.DRY_RUN ?? "true").toLowerCase() === "false") warnings.push("DRY_RUN=false: jobs started with this env send for real");
    if (env.BUYBACK_MODE === "mock") errors.push("BUYBACK_MODE=mock is devnet only");
    if (env.TEST_CONFIGS) warnings.push("TEST_CONFIGS is ignored on mainnet");
    if (env.RATE_LIMIT_OFF === "1") errors.push("RATE_LIMIT_OFF=1 is not allowed on mainnet");
    if (ctx.devnetPubkey && eq(ctx.platformPubkey, ctx.devnetPubkey)) errors.push("PLATFORM_KEYPAIR_PATH is the devnet keypair; use a dedicated mainnet key");
    // lock tip (packages/onchain lock.ts): required on mainnet, no fallback, and a dedicated wallet
    // vanity mint pool (VANITY_MINTS, default fallback): on = key required (no key = no launches); fallback = a missing key
    // only warns (launches use random mints), a malformed one is an error; off = the key is not needed
    const mintKey = encKeyProblem(env.MINT_POOL_ENC_KEY);
    const keyHint = "(32 bytes, hex or base64: openssl rand -base64 32; the same value on the api and mint-pool services)";
    if (mintKey && vmode === "on" && !/<FILL_ME>/.test(env.MINT_POOL_ENC_KEY ?? "")) errors.push(`${mintKey} ${keyHint}`);
    if (mintKey && vmode === "fallback") {
      if (env.MINT_POOL_ENC_KEY?.trim() && !/<FILL_ME>/.test(env.MINT_POOL_ENC_KEY)) errors.push(`${mintKey} ${keyHint}`);
      else warnings.push(`MINT_POOL_ENC_KEY unset: VANITY_MINTS=fallback launches use random (non-...high) mints until it is set ${keyHint}`);
    }
    for (const k of ["MINT_POOL_MIN_AVAILABLE", "MINT_POOL_RESERVATION_MIN"]) if (env[k]?.trim() && !(Number(env[k]) >= 1 && Number.isInteger(Number(env[k])))) errors.push(`${k} must be a positive integer`);
    req("LOCK_TIP_WALLET", "dedicated wallet that receives the lock-tx protocol tip; no fallback on mainnet", isPk);
    if (!env.LOCK_TIP_SOL?.trim()) errors.push("LOCK_TIP_SOL is required on mainnet (protocol tip per lock tx, in SOL)");
    else if (parseLockTipSol(env.LOCK_TIP_SOL) === null) errors.push(`LOCK_TIP_SOL is invalid: must be a number > 0 and <= ${LOCK_TIP_SOL_MAX} SOL`);
    const tip = env.LOCK_TIP_WALLET?.trim();
    if (tip && isPk(tip)) {
      const roles: Array<[string, string | null | undefined]> = [
        ["the platform key", ctx.platformPubkey], ["PLATFORM_PUBKEY", env.PLATFORM_PUBKEY], ["TREASURY_PUBKEY", env.TREASURY_PUBKEY],
        ["REFERRAL_WALLET", referral], ["OFFICIAL_TOKEN_CREATOR", env.OFFICIAL_TOKEN_CREATOR], ["the devnet keypair", ctx.devnetPubkey], ...LOCK_TIP_FORBIDDEN,
      ];
      const clash = [...new Set(roles.filter(([, v]) => eq(tip, v)).map(([n]) => n))];
      if (clash.length) errors.push(`LOCK_TIP_WALLET must be a dedicated wallet; it equals ${clash.join(", ")}`);
    }
  }
  if (net === "devnet" && vmode !== "off" && encKeyProblem(env.MINT_POOL_ENC_KEY)) warnings.push(`vanity mint pool disabled: ${encKeyProblem(env.MINT_POOL_ENC_KEY)} (launches answer 500/503 until it is set)`);
  // official $HIGHER token (optional): auto-detected from OFFICIAL_TOKEN_CREATOR; BAR_MINT is a manual override
  if (env.OFFICIAL_TOKEN_CREATOR?.trim() && !isPk(env.OFFICIAL_TOKEN_CREATOR)) errors.push("OFFICIAL_TOKEN_CREATOR is not a valid public key (official $HIGHER dev wallet)");
  else if (!env.OFFICIAL_TOKEN_CREATOR?.trim()) warnings.push(`OFFICIAL_TOKEN_CREATOR unset: the official $${(env.OFFICIAL_TOKEN_SYMBOL || "HIGHER").toUpperCase()} launch is not auto-detected and every launch with that symbol is refused${env.BAR_MINT?.trim() ? " (BAR_MINT override is set)" : "; set it to the dev wallet before the official launch"}`);
  // both networks: key-role sanity (warnings)
  if (eq(ctx.platformPubkey, referral)) warnings.push("platform keypair = referral wallet: the fee claimer / buyback (Jupiter wrapAndUnwrapSol) can close the referral WSOL account; use separate wallets");
  if (eq(env.TREASURY_PUBKEY, referral)) warnings.push("TREASURY_PUBKEY = referral wallet; keep them separate");
  if (net === "mainnet" && eq(ctx.platformPubkey, env.TREASURY_PUBKEY)) warnings.push("platform hot key = TREASURY_PUBKEY: fees then stay on the hot key that runs on Railway; a separate treasury wallet (later a multisig) is safer");
  return { network: net, errors, warnings };
}

function pubkeyOf(file: string | undefined): string | null {
  if (!file) return null;
  try { const p = path.resolve(file); return fs.existsSync(p) ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf8")))).publicKey.toBase58() : null; } catch { return null; }
}
const devnetKeyPath = () => path.resolve(path.dirname(fileURLToPath(import.meta.resolve("@hb/onchain"))), "..", "keys", "devnet.keypair.json");

/** On-chain checks: RPC cluster = NETWORK, every config exists and its fee claimer is the platform key or the treasury. */
export async function checkChain(ctx: { platformPubkey?: string | null; treasury?: string | null; configs: Record<string, string> }): Promise<CheckResult> {
  const net = network(), errors: string[] = [], warnings: string[] = [];
  try {
    const g = await getConnection().getGenesisHash();
    if (net === "mainnet" && g !== MAINNET_GENESIS) errors.push(`RPC_URL is not mainnet (genesis ${g})`);
    if (net === "devnet" && g === MAINNET_GENESIS) errors.push("NETWORK=devnet but RPC_URL is mainnet");
  } catch (e) { warnings.push(`genesis check failed: ${(e as Error).message.slice(0, 120)}`); return { network: net, errors, warnings }; }
  const allowed = [ctx.platformPubkey, ctx.treasury].filter(Boolean) as string[];
  for (const [key] of Object.entries(CONFIG_ENV)) {
    const addr = ctx.configs[key];
    if (!addr) continue;
    try {
      const c = await getClient().state.getPoolConfig(new PublicKey(addr));
      if (!c) { (net === "mainnet" ? errors : warnings).push(`${key} config ${addr} not found on ${net}`); continue; }
      const claimer = c.feeClaimer.toBase58();
      if (allowed.length && !allowed.includes(claimer)) warnings.push(`${key} config fee claimer ${claimer} is neither the platform key nor TREASURY_PUBKEY: partner fees cannot be claimed by jobs:fees`);
    } catch (e) { warnings.push(`${key} config check failed: ${(e as Error).message.slice(0, 120)}`); }
  }
  return { network: net, errors, warnings };
}

/** Startup gate used by the API (and the payout jobs): throws on mainnet misconfiguration, logs warnings. The RPC part runs on mainnet (or CHECK_CHAIN=1); SKIP_CHAIN_CHECK=1 skips it. */
export async function assertProductionConfig(log: { warn: (m: string) => void; info: (m: string) => void } = console) {
  let platformPubkey = process.env.PLATFORM_PUBKEY || null;
  if (!platformPubkey && (process.env.PLATFORM_KEYPAIR_JSON || process.env.PLATFORM_KEYPAIR_PATH)) {
    try { platformPubkey = loadPlatformKeypair().publicKey.toBase58(); } catch { platformPubkey = null; } // public key only
  }
  let devnetPubkey: string | null = null;
  try { devnetPubkey = pubkeyOf(devnetKeyPath()); } catch { /* not resolvable: skip */ }
  const configs = loadConfigs();
  const env = checkEnv(process.env, { platformPubkey, configs, devnetPubkey });
  const runChain = process.env.SKIP_CHAIN_CHECK !== "1" && (env.network === "mainnet" || process.env.CHECK_CHAIN === "1");
  const chain = !runChain ? { errors: [], warnings: [] } : await checkChain({ platformPubkey, treasury: process.env.TREASURY_PUBKEY || null, configs });
  const errors = [...env.errors, ...chain.errors], warnings = [...env.warnings, ...chain.warnings];
  for (const w of warnings) log.warn(`[config] ${w}`);
  if (errors.length) {
    const msg = `refusing to start on ${env.network}:\n - ${errors.join("\n - ")}`;
    if (env.network === "mainnet") throw new Error(msg);
    for (const e of errors) log.warn(`[config] ${e}`);
  }
  log.info(`[config] ${env.network} config ok (rpc ${rpcHost(rpcUrl())}, ${Object.keys(configs).filter((k) => k in CONFIG_ENV).length}/6 configs)`);
}
