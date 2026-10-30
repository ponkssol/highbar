import { DAMM_V2_MIGRATION_FEE_ADDRESS } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { PublicKey, type Keypair } from "@solana/web3.js";
import { deriveBaseKeyForLocker, deriveLockerEscrowAddress } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { getClient, getConnection, indexableConfigEntries, isMain, network, loadPlatformKeypair, sendTx, unfilledEnv, withRetry } from "./client.js";
import { HotTracker, keeperLoopConfig, nextDelaySec, ttlCache, type KeeperPoolView } from "./keeperLoop.js";

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

type PoolConfig = NonNullable<Awaited<ReturnType<ReturnType<typeof getClient>["state"]["getPoolConfig"]>>>;
/** DBC pool configs are immutable once created: one getAccountInfo per config per hour, not per pass. */
const configCache = ttlCache<string, PoolConfig>(3_600_000);

export async function runKeeperOnce(): Promise<KeeperResult[]> { return (await runKeeperPass()).results; }

/** One keeper pass: migrate every completed curve. `pools` = every curve seen (for the fast lane), `pendingLive` = completed
 *  curves a live pass did not migrate (error) and should retry soon. */
export async function runKeeperPass(): Promise<{ results: KeeperResult[]; pools: KeeperPoolView[]; pendingLive: number }> {
  const client = getClient();
  const only = (process.env.KEEPER_CONFIGS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const all = indexableConfigEntries(); // mainnet: configs.mainnet.json only (never env / test / devnet configs)
  const entries = only.length ? all.filter(([k, a]) => only.includes(k) || only.includes(a)) : all;
  const results: KeeperResult[] = [];
  const seen: KeeperPoolView[] = [];
  let pendingLive = 0;
  const payer = DRY_RUN ? null : loadPlatformKeypair();

  for (const [key, addr] of entries) {
    const configPk = new PublicKey(addr);
    const config = await configCache(addr, () => client.state.getPoolConfig(configPk));
    if (!config) continue;
    const pools = await withRetry(() => client.state.getPoolsByConfig(configPk), 6, 1500); // getProgramAccounts is rate-limited on public RPC
    for (const { publicKey, account } of pools) {
      const id = publicKey.toBase58();
      const migrated = Number(account.poolState.isMigrated) !== 0;
      seen.push({ pool: id, quoteReserve: BigInt(account.poolState.quoteReserve.toString()), threshold: BigInt(config.migrationQuoteThreshold.toString()), migrated });
      if (migrated) continue; // idempotent: already migrated
      if (account.poolState.quoteReserve.lt(config.migrationQuoteThreshold)) continue; // curve not complete
      const r = await migratePool(publicKey, config, key, payer);
      if (!DRY_RUN && r.action !== "migrated") pendingLive++;
      results.push(r);

    }
  }
  return { results, pools: seen, pendingLive };
}

// CLI: tsx src/keeper.ts [--loop [SEC]]   (no --loop = one pass; interval precedence in keeperLoop.ts:
//   --loop N  >  KEEPER_LOOP_SEC  >  900 s; KEEPER_HOT_LOOP_SEC (30 s) while a curve is about to graduate)
if (isMain(import.meta.url)) {
  const loop = keeperLoopConfig();
  const hotTracker = new HotTracker(loop.hotPct);
  let hot = false;
  const tick = async () => {
    const r = await runKeeperPass();
    hot = hotTracker.update(r.pools, r.pendingLive);
    console.log(new Date().toISOString(), DRY_RUN ? "[DRY_RUN]" : "", JSON.stringify(r.results), loop.loopSec ? `next pass in ${nextDelaySec(loop, hot)}s` : "");
  };
  if (loop.loopSec) console.log(`keeper: every ${loop.loopSec}s, every ${loop.hotSec}s while a curve is >= ${loop.hotPct * 100}% and trading or a migration is pending`);
  (async () => {
    const unfilled = unfilledEnv();
    if (unfilled.length) { console.error(`placeholder <FILL_ME> left in: ${unfilled.join(", ")}`); process.exit(1); }
    if (!DRY_RUN && network() === "mainnet") {
      if (process.env.ALLOW_MAINNET !== "true") { console.error("refusing live mainnet keeper without ALLOW_MAINNET=true"); process.exit(1); }
      const g = await getConnection().getGenesisHash();
      if (g !== "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d") { console.error(`RPC is not mainnet (genesis ${g})`); process.exit(1); }
    }
    do {
      try { await tick(); } catch (e) { console.error(e); hot = true; } // RPC error: retry on the fast lane
      if (loop.loopSec) await new Promise((r) => setTimeout(r, nextDelaySec(loop, hot) * 1000));
    } while (loop.loopSec);
  })();
}