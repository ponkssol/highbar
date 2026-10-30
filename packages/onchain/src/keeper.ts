import { DAMM_V2_MIGRATION_FEE_ADDRESS } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { PublicKey, type Keypair } from "@solana/web3.js";
import { deriveBaseKeyForLocker, deriveLockerEscrowAddress } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { getClient, getConnection, indexableConfigEntries, isMain, network, loadPlatformKeypair, sendTx, unfilledEnv, withRetry } from "./client.js";

/** DRY_RUN defaults to true; set DRY_RUN=false to actually send. */
export const DRY_RUN = (process.env.DRY_RUN ?? "true").toLowerCase() !== "false";

export interface KeeperResult { pool: string; action: string; signature?: string; error?: string }

/** DAMM v2 config to migrate into; set DAMM_V2_CONFIG in .env (depends on migrationFeeOption). */
function dammV2Config(migrationFeeOption: number): PublicKey | null {
  // env override, else the SDK DAMM v2 config matching the pool config's on-chain migrationFeeOption
  return process.env.DAMM_V2_CONFIG ? new PublicKey(process.env.DAMM_V2_CONFIG) : (DAMM_V2_MIGRATION_FEE_ADDRESS[migrationFeeOption] ?? null);
}

/** Migrate one completed curve to DAMM v2 (createLocker first if vesting needs it). Used by the keeper loop and the devnet migration test. */
export async function migratePool(publicKey: PublicKey, config: NonNullable<Awaited<ReturnType<ReturnType<typeof getClient>["state"]["getPoolConfig"]>>>, key: string, payer: Keypair | null): Promise<KeeperResult> {
  const client = getClient(), conn = getConnection(), id = publicKey.toBase58();
  try {
    const lv = config.lockedVestingConfig;
    const needsLocker = !lv.amountPerPeriod.isZero() || !lv.cliffUnlockAmount.isZero();
    const escrow = deriveLockerEscrowAddress(deriveBaseKeyForLocker(publicKey));
    const hasLocker = needsLocker ? !!(await conn.getAccountInfo(escrow)) : true;
    if (DRY_RUN || !payer) return { pool: id, action: `DRY_RUN would ${hasLocker ? "" : "createLocker + "}migrateToDammV2 (${key})` };
    if (!hasLocker) await sendTx(await client.migration.createLocker({ payer: payer.publicKey, pool: publicKey }), [payer]);
    const dammConfig = dammV2Config(Number(config.migrationFeeOption));
    if (!dammConfig) throw new Error("DAMM_V2_CONFIG not set");
    const { transaction, firstPositionNftKeypair, secondPositionNftKeypair } =
      await client.migration.migrateToDammV2({ payer: payer.publicKey, pool: publicKey, dammConfig });
    const signature = await sendTx(transaction, [payer, firstPositionNftKeypair, secondPositionNftKeypair]);
    return { pool: id, action: "migrated", signature };
  } catch (e) {
    return { pool: id, action: "error", error: (e as Error).message };
  }
}

export async function runKeeperOnce(): Promise<KeeperResult[]> {
  const client = getClient();
  const conn = getConnection();
  const only = (process.env.KEEPER_CONFIGS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const all = indexableConfigEntries(); // mainnet: configs.mainnet.json only (never env / test / devnet configs)
  const entries = only.length ? all.filter(([k, a]) => only.includes(k) || only.includes(a)) : all;
  const results: KeeperResult[] = [];
  const payer = DRY_RUN ? null : loadPlatformKeypair();

  for (const [key, addr] of entries) {
    const configPk = new PublicKey(addr);
    const config = await client.state.getPoolConfig(configPk);
    if (!config) continue;
    const pools = await withRetry(() => client.state.getPoolsByConfig(configPk), 6, 1500); // getProgramAccounts is rate-limited on public RPC
    for (const { publicKey, account } of pools) {
      const id = publicKey.toBase58();
      if (Number(account.poolState.isMigrated) !== 0) continue; // idempotent: already migrated
      if (account.poolState.quoteReserve.lt(config.migrationQuoteThreshold)) continue; // curve not complete
      results.push(await migratePool(publicKey, config, key, payer));

    }
  }
  return results;
}

// CLI: tsx src/keeper.ts [--loop 30]
if (isMain(import.meta.url)) {
  const i = process.argv.indexOf("--loop");
  const loopSec = i >= 0 ? Number(process.argv[i + 1] ?? 30) : 0;
  const tick = async () => console.log(new Date().toISOString(), DRY_RUN ? "[DRY_RUN]" : "", JSON.stringify(await runKeeperOnce()));
  (async () => {
    const unfilled = unfilledEnv();
    if (unfilled.length) { console.error(`placeholder <FILL_ME> left in: ${unfilled.join(", ")}`); process.exit(1); }
    if (!DRY_RUN && network() === "mainnet") {
      if (process.env.ALLOW_MAINNET !== "true") { console.error("refusing live mainnet keeper without ALLOW_MAINNET=true"); process.exit(1); }
      const g = await getConnection().getGenesisHash();
      if (g !== "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d") { console.error(`RPC is not mainnet (genesis ${g})`); process.exit(1); }
    }
    do {
      try { await tick(); } catch (e) { console.error(e); }
      if (loopSec) await new Promise((r) => setTimeout(r, loopSec * 1000));
    } while (loopSec);
  })();
}