import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { Connection, Keypair, PublicKey, VersionedTransaction, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  DynamicBondingCurveClient, buildCurve, BaseFeeMode, MigrationOption, MigrationFeeOption,
  ActivationType, TokenType, TokenDecimal, CollectFeeMode, MigratedCollectFeeMode,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import { TIERS, ANTI_SNIPER, CURVE_FEE_BPS, DAMM_V2_POOL_FEE_BPS, thresholdSolFor, type TierId, type ConfigKey, type Network } from "@hb/shared";

const WSOL = new PublicKey("So11111111111111111111111111111111111111112");

/** Migration threshold = thresholdSolFor(tier, network): mainnet (default) 85/150/250 SOL, devnet 40/80/100 SOL.
 *  `thresholdSolOverride` is only for devnet test configs (e.g. the 1 SOL migration test). */
export function buildTierConfig(tierId: TierId, antiSniper: boolean, thresholdSolOverride?: number, network: Network = "mainnet") {
  const tier = TIERS[tierId];
  return buildCurve({
    token: {
      tokenType: TokenType.SPLToken,
      tokenBaseDecimal: TokenDecimal.SIX,
      tokenQuoteDecimal: 9,
      tokenAuthorityOption: 1, // Immutable
      totalTokenSupply: 1_000_000_000,
      leftover: 0,
    },
    fee: {
      baseFeeParams: {
        baseFeeMode: BaseFeeMode.FeeSchedulerExponential,
        feeSchedulerParam: antiSniper
          ? { startingFeeBps: ANTI_SNIPER.startFeeBps, endingFeeBps: ANTI_SNIPER.endFeeBps, numberOfPeriod: 60, totalDuration: ANTI_SNIPER.decaySeconds }
          : { startingFeeBps: CURVE_FEE_BPS, endingFeeBps: CURVE_FEE_BPS, numberOfPeriod: 0, totalDuration: 0 },
      },
      dynamicFeeEnabled: false,
      collectFeeMode: CollectFeeMode.QuoteToken,
      creatorTradingFeePercentage: tier.creatorTradingFeePercentage,
      poolCreationFee: 0,
      enableFirstSwapWithMinFee: antiSniper, // dev buy bundled with pool creation pays the min fee, not the anti-sniper fee
    },
    migration: {
      migrationOption: MigrationOption.MET_DAMM_V2,
      migrationFeeOption: MigrationFeeOption.Customizable,
      migrationFee: { feePercentage: tier.migrationFeePercentage, creatorFeePercentage: tier.creatorMigrationFeePercentage },
      migratedPoolFee: { collectFeeMode: MigratedCollectFeeMode.QuoteToken, dynamicFee: 0, poolFeeBps: DAMM_V2_POOL_FEE_BPS },
    },
    liquidityDistribution: {
      partnerPermanentLockedLiquidityPercentage: tier.lpPlatformPercentage,
      partnerLiquidityPercentage: 0,
      creatorPermanentLockedLiquidityPercentage: tier.lpCreatorPercentage,
      creatorLiquidityPercentage: 0,
    },
    lockedVesting: { totalLockedVestingAmount: 0, numberOfVestingPeriod: 0, cliffUnlockAmount: 0, totalVestingDuration: 0, cliffDurationFromMigrationTime: 0 },
    activationType: ActivationType.Timestamp,
    percentageSupplyOnMigration: 20,
    migrationQuoteThreshold: thresholdSolOverride ?? thresholdSolFor(tierId, network),
  });
}

type Mode = "print" | "simulate" | "send";
const has = (f: string) => process.argv.includes(f);
const argOf = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const pk = (v: string | undefined, name: string) => { if (!v) return undefined; try { return new PublicKey(v.trim()); } catch { throw new Error(`${name} is not a valid public key`); } };
const GENESIS = { devnet: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG", mainnet: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d" } as const;
const PUBLIC_MAINNET_RPC = /api\.mainnet-beta\.solana\.com|api\.mainnet\.solana\.com/;

/** Pubkey of a keypair file without keeping the secret around (used for payer / devnet-key checks). */
function pubkeyOfKeypairFile(file: string): PublicKey | undefined {
  if (!fs.existsSync(file)) return undefined;
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(file, "utf8")))).publicKey;
}

/**
 * Create the 6 tier configs (3 tiers x anti-sniper on/off).
 *   --network devnet|mainnet (default NETWORK env, else devnet)
 *   --print      build + print every config's parameters; no RPC, no keypair needed
 *   --simulate   (default) also build each createConfig tx and simulate it on the RPC (sigVerify off); sends nothing
 *   --send       actually create the configs. Mainnet additionally needs ALLOW_MAINNET=true, --confirm-mainnet,
 *                an explicit FEE_CLAIMER_PUBKEY, a non-public RPC_URL and no existing configs.mainnet.json entries (--force to override).
 * Fee claimer: FEE_CLAIMER_PUBKEY (mainnet: required). Devnet default: TREASURY_PUBKEY, else the payer.
 * Leftover receiver: LEFTOVER_RECEIVER, else TREASURY_PUBKEY, else the fee claimer.
 * Output: configs.<network>.json (only with --send).
 */
async function main() {
  if (has("--dry-run")) { for (const t of Object.keys(TIERS) as TierId[]) for (const on of has("--only-on") ? [true] : [false, true]) { buildTierConfig(t, on); console.log(`${t}_${on ? "on" : "off"} ok (dry run)`); } return; }
  const net = (argOf("network") ?? (process.env.NETWORK === "mainnet" || process.env.NETWORK === "mainnet-beta" ? "mainnet" : "devnet")) as "devnet" | "mainnet";
  if (net !== "devnet" && net !== "mainnet") throw new Error("--network must be devnet or mainnet");
  const mode: Mode = has("--send") ? "send" : has("--print") ? "print" : "simulate";
  const onlyOn = has("--only-on");
  const rpc = process.env.RPC_URL || (net === "devnet" ? process.env.DEVNET_RPC || "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com");
  const kpPath = process.env.PLATFORM_KEYPAIR_PATH ?? (net === "devnet" ? "./keys/devnet.keypair.json" : "");
  const payerPub = pk(process.env.PAYER_PUBKEY, "PAYER_PUBKEY") ?? (kpPath ? pubkeyOfKeypairFile(path.resolve(kpPath)) : undefined);
  const treasury = pk(process.env.TREASURY_PUBKEY, "TREASURY_PUBKEY");
  const explicitClaimer = pk(process.env.FEE_CLAIMER_PUBKEY, "FEE_CLAIMER_PUBKEY");
  const feeClaimer = explicitClaimer ?? (net === "devnet" ? treasury ?? payerPub : undefined);
  const leftoverReceiver = pk(process.env.LEFTOVER_RECEIVER, "LEFTOVER_RECEIVER") ?? treasury ?? feeClaimer;
  const referral = pk(process.env.REFERRAL_WALLET || process.env.REFERRAL_ACCOUNT, "REFERRAL_WALLET");
  const devnetKey = pubkeyOfKeypairFile(path.resolve("./keys/devnet.keypair.json"));

  const problems: string[] = [], warnings: string[] = [];
  if (!feeClaimer) problems.push(net === "mainnet" ? "FEE_CLAIMER_PUBKEY is required on mainnet (the platform claim key or the treasury; see docs/MAINNET_CHECKLIST.md)" : "no fee claimer: set FEE_CLAIMER_PUBKEY or PLATFORM_KEYPAIR_PATH");
  if (net === "mainnet") {
    if (feeClaimer && devnetKey && feeClaimer.equals(devnetKey)) problems.push(`fee claimer ${feeClaimer.toBase58()} is the DEVNET platform key (keys/devnet.keypair.json); use the mainnet platform/treasury key`);
    if (feeClaimer && referral && feeClaimer.equals(referral)) problems.push("fee claimer must not be the referral wallet");
    if (payerPub && devnetKey && payerPub.equals(devnetKey)) warnings.push("payer is the devnet keypair; it is only the rent payer, but prefer a mainnet key");
    if (feeClaimer && payerPub && !feeClaimer.equals(payerPub) && !(treasury && feeClaimer.equals(treasury))) warnings.push("fee claimer is neither the payer/platform key nor TREASURY_PUBKEY: the jobs:fees claimer signs with PLATFORM_KEYPAIR_PATH and will not be able to claim");
    if (feeClaimer && treasury && feeClaimer.equals(treasury)) warnings.push("fee claimer = TREASURY_PUBKEY: jobs:fees signs claims with the platform key, so claims only work if the platform key IS the treasury; otherwise claim manually with the treasury wallet");
    if (!leftoverReceiver) problems.push("LEFTOVER_RECEIVER / TREASURY_PUBKEY not set");
    if (mode !== "print" && PUBLIC_MAINNET_RPC.test(rpc)) (mode === "send" ? problems : warnings).push("RPC_URL is the public mainnet endpoint; use a paid RPC (Helius etc.)");
    if (mode === "send") {
      if (process.env.ALLOW_MAINNET !== "true") problems.push("--send on mainnet needs ALLOW_MAINNET=true (set it in the shell for this one command only)");
      if (!has("--confirm-mainnet")) problems.push("--send on mainnet needs --confirm-mainnet");
      if (!explicitClaimer) problems.push("--send on mainnet needs an explicit FEE_CLAIMER_PUBKEY");
      const out = path.resolve("configs.mainnet.json");
      if (fs.existsSync(out) && Object.keys(JSON.parse(fs.readFileSync(out, "utf8"))).some((k) => /_(on|off)$/.test(k)) && !has("--force")) problems.push("configs.mainnet.json already has configs (creating again makes duplicates); --force to override");
    }
  }
  if (mode !== "print" && !payerPub) problems.push("no payer: set PLATFORM_KEYPAIR_PATH (or PAYER_PUBKEY for --simulate)");

  console.log(JSON.stringify({ network: net, mode, rpc: rpc.replace(/(api[-_]?key=)[^&]+/i, "$1***"), payer: payerPub?.toBase58() ?? null, feeClaimer: feeClaimer?.toBase58() ?? null, leftoverReceiver: leftoverReceiver?.toBase58() ?? null, treasury: treasury?.toBase58() ?? null, referral: referral?.toBase58() ?? null }, null, 2));
  for (const w of warnings) console.warn("WARN", w);
  if (problems.length) { for (const p of problems) console.error("BLOCKED", p); process.exit(1); }

  const keys: [ConfigKey, TierId, boolean][] = [];
  for (const tierId of Object.keys(TIERS) as TierId[]) for (const on of onlyOn ? [true] : [false, true]) keys.push([`${tierId}_${on ? "on" : "off"}` as ConfigKey, tierId, on]);
  for (const [key, tierId, on] of keys) {
    const t = TIERS[tierId];
    console.log(key, JSON.stringify({ thresholdSol: thresholdSolFor(tierId, net), creatorTradingFeePct: t.creatorTradingFeePercentage, migrationFeePct: t.migrationFeePercentage, creatorMigrationFeePct: t.creatorMigrationFeePercentage,
      lpPlatformPct: t.lpPlatformPercentage, lpCreatorPct: t.lpCreatorPercentage, baseFee: on ? `${ANTI_SNIPER.startFeeBps}->${ANTI_SNIPER.endFeeBps} bps over ${ANTI_SNIPER.decaySeconds}s` : `${CURVE_FEE_BPS} bps flat`, migration: "DAMM v2", poolFeeBps: DAMM_V2_POOL_FEE_BPS }));
  }
  if (mode === "print") { console.log("print only: nothing built on-chain"); return; }

  const connection = new Connection(rpc, "confirmed");
  const genesis = await connection.getGenesisHash();
  if (genesis !== GENESIS[net]) throw new Error(`RPC is not ${net} (genesis ${genesis})`);
  const client = new DynamicBondingCurveClient(connection, "confirmed");
  const payer = mode === "send" ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(path.resolve(kpPath), "utf8")))) : null;
  const out: Partial<Record<ConfigKey, string>> = {};
  for (const [key, tierId, on] of keys) {
    const params = buildTierConfig(tierId, on, undefined, net);
    const config = Keypair.generate();
    const tx = await client.partner.createConfig({ ...params, config: config.publicKey, feeClaimer: feeClaimer!, leftoverReceiver: leftoverReceiver!, quoteMint: WSOL, payer: payerPub! });
    if (mode === "simulate") {
      tx.feePayer = payerPub!;
      tx.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
      const r = await connection.simulateTransaction(new VersionedTransaction(tx.compileMessage()), { sigVerify: false, replaceRecentBlockhash: true, commitment: "confirmed" });
      const errLog = (r.value.logs ?? []).filter((l) => /error|failed/i.test(l)).slice(-2).join(" | ");
      console.log(key, r.value.err ? `SIMULATION FAILED ${JSON.stringify(r.value.err)} ${errLog}` : `simulation ok (${r.value.unitsConsumed ?? "?"} CU)`);
      continue;
    }
    const sig = await sendAndConfirmTransaction(connection, tx, [payer!, config]);
    out[key] = config.publicKey.toBase58();
    console.log(key, out[key], sig);
  }
  if (mode === "send") {
    const file = path.resolve(`configs.${net}.json`);
    const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")) : {};
    const legacy: { key: string; address: string }[] = Array.isArray(prev.legacy) ? prev.legacy : [];
    for (const [k, v] of Object.entries(out)) if (typeof prev[k] === "string" && prev[k] !== v) legacy.push({ key: k, address: prev[k] });
    fs.writeFileSync(file, JSON.stringify({ ...prev, ...out, ...(net === "mainnet" ? { feeClaimer: feeClaimer!.toBase58(), leftoverReceiver: leftoverReceiver!.toBase58() } : {}), legacy }, null, 2));
    console.log(`Saved configs.${net}.json; copy into the CONFIG_* env vars of the API, keeper and jobs`);
  }
}

if (process.argv[1]?.includes("createConfigs")) main().catch((e) => { console.error(e); process.exit(1); });
