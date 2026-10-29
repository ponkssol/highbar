import { PublicKey } from "@solana/web3.js";
import { deriveBaseKeyForLocker, deriveLockerEscrowAddress } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { getClient, getConnection, isMain, loadConfigs, loadPlatformKeypair, sendTx } from "./client.js";

/** DRY_RUN defaults to true; set DRY_RUN=false to actually send. */
export const DRY_RUN = (process.env.DRY_RUN ?? "true").toLowerCase() !== "false";

export interface KeeperResult { pool: string; action: string; signature?: string; error?: string }

/** DAMM v2 config to migrate into; set DAMM_V2_CONFIG in .env (depends on migrationFeeOption). */
function dammV2Config(): PublicKey | null {
  return process.env.DAMM_V2_CONFIG ? new PublicKey(process.env.DAMM_V2_CONFIG) : null;
}

export async function runKeeperOnce(): Promise<KeeperResult[]> {
  const client = getClient();
  const conn = getConnection();
  const cfgs = loadConfigs();
  const keys = Object.keys(cfgs).filter((k) => /_(on|off)$/.test(k));
  const results: KeeperResult[] = [];
  const payer = DRY_RUN ? null : loadPlatformKeypair();

  for (const key of keys) {
    const configPk = new PublicKey(cfgs[key]);
    const config = await client.state.getPoolConfig(configPk);
    if (!config) continue;
    const pools = await client.state.getPoolsByConfig(configPk);
    for (const { publicKey, account } of pools) {
      const id = publicKey.toBase58();
      if (Number(account.poolState.isMigrated) !== 0) continue; // idempotent: already migrated
      if (account.poolState.quoteReserve.lt(config.migrationQuoteThreshold)) continue; // curve not complete
      try {
        const lv = config.lockedVestingConfig;
        const needsLocker = !lv.amountPerPeriod.isZero() || !lv.cliffUnlockAmount.isZero();
        const escrow = deriveLockerEscrowAddress(deriveBaseKeyForLocker(publicKey));
        const hasLocker = needsLocker ? !!(await conn.getAccountInfo(escrow)) : true;
        if (DRY_RUN || !payer) {
          results.push({ pool: id, action: `DRY_RUN would ${hasLocker ? "" : "createLocker + "}migrateToDammV2 (${key})` });
          continue;
        }
        if (!hasLocker) {
          const ltx = await client.migration.createLocker({ payer: payer.publicKey, pool: publicKey });
          await sendTx(ltx, [payer]);
        }
        const dammConfig = dammV2Config();
        if (!dammConfig) throw new Error("DAMM_V2_CONFIG not set");
        const { transaction, firstPositionNftKeypair, secondPositionNftKeypair } =
          await client.migration.migrateToDammV2({ payer: payer.publicKey, pool: publicKey, dammConfig });
        const signature = await sendTx(transaction, [payer, firstPositionNftKeypair, secondPositionNftKeypair]);
        results.push({ pool: id, action: "migrated", signature });
      } catch (e) {
        results.push({ pool: id, action: "error", error: (e as Error).message });
      }
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
    do {
      try { await tick(); } catch (e) { console.error(e); }
      if (loopSec) await new Promise((r) => setTimeout(r, loopSec * 1000));
    } while (loopSec);
  })();
}