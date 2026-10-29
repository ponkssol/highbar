import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  DynamicBondingCurveClient, buildCurve, BaseFeeMode, MigrationOption, MigrationFeeOption,
  ActivationType, TokenType, TokenDecimal, CollectFeeMode, MigratedCollectFeeMode,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import { TIERS, ANTI_SNIPER, CURVE_FEE_BPS, DAMM_V2_POOL_FEE_BPS, type TierId, type ConfigKey } from "@hb/shared";

const WSOL = new PublicKey("So11111111111111111111111111111111111111112");

/** `thresholdSolOverride` is only for devnet test configs (e.g. the 1 SOL migration test). */
export function buildTierConfig(tierId: TierId, antiSniper: boolean, thresholdSolOverride?: number) {
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
    migrationQuoteThreshold: thresholdSolOverride ?? tier.migrationQuoteThresholdSol,
  });
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const onlyOn = process.argv.includes("--only-on");
  if (dryRun) { for (const t of Object.keys(TIERS) as TierId[]) for (const on of onlyOn ? [true] : [false, true]) { buildTierConfig(t, on); console.log(`${t}_${on ? "on" : "off"} ok (dry run)`); } return; }
  const rpc = process.env.RPC_URL ?? "https://api.devnet.solana.com";
  const kpPath = process.env.PLATFORM_KEYPAIR_PATH ?? "./keys/devnet.keypair.json";
  const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(path.resolve(kpPath), "utf8"))));
  const feeClaimer = process.env.TREASURY_PUBKEY ? new PublicKey(process.env.TREASURY_PUBKEY) : payer.publicKey;
  const connection = new Connection(rpc, "confirmed");
  const client = new DynamicBondingCurveClient(connection, "confirmed");
  const out: Partial<Record<ConfigKey, string>> = {};

  for (const tierId of Object.keys(TIERS) as TierId[]) {
    for (const on of onlyOn ? [true] : [false, true]) {
      const key = `${tierId}_${on ? "on" : "off"}` as ConfigKey;
      const params = buildTierConfig(tierId, on);
      const config = Keypair.generate();
      if (dryRun) { console.log(key, "ok (dry run)"); continue; }
      const tx = await client.partner.createConfig({
        ...params, config: config.publicKey, feeClaimer, leftoverReceiver: feeClaimer, quoteMint: WSOL, payer: payer.publicKey,
      });
      const sig = await sendAndConfirmTransaction(connection, tx, [payer, config]);
      out[key] = config.publicKey.toBase58();
      console.log(key, out[key], sig);
    }
  }
  if (!dryRun) {
    const file = path.resolve("configs.devnet.json");
    const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")) : {};
    const legacy: { key: string; address: string }[] = Array.isArray(prev.legacy) ? prev.legacy : [];
    for (const [k, v] of Object.entries(out)) if (typeof prev[k] === "string" && prev[k] !== v) legacy.push({ key: k, address: prev[k] });
    fs.writeFileSync(file, JSON.stringify({ ...prev, ...out, legacy }, null, 2));
    console.log("Saved configs.devnet.json; copy into .env CONFIG_* vars");
  }
}

if (process.argv[1]?.includes("createConfigs")) main().catch((e) => { console.error(e); process.exit(1); });

