/** jobs:autoclaim entry (tsx src/jobs/run.ts autoclaim [--live | --dry-run]); Railway cron jobs-autoclaim, "5 * * * *".
 *  Logic lives in services/autoClaim.ts. Live only with CLAIM_LIVE=true (or --live) and, on mainnet, ALLOW_MAINNET=true. */
import { getClient, getConnection, loadPlatformKeypair } from "@hb/onchain";
import { db, tx } from "../db/pool.js";
import { autoclaimSettings, dbcDecoder, runAutoclaim, withAutoclaimLock } from "../services/autoClaim.js";
import { assertCluster } from "./chain.js";
import { jobs } from "./config.js";

export async function autoclaimMain(argv: string[]) {
  const s = autoclaimSettings(process.env, jobs.network, argv);
  const log = (m: string) => console.log(new Date().toISOString(), s.live ? "" : "[SIMULATE]", m);
  if (s.reason) log(`[autoclaim] ${s.reason}`);
  await assertCluster(s.live); // RPC must be the NETWORK cluster; s.live is already false on mainnet without ALLOW_MAINNET
  if (!(await db.query("SELECT to_regclass('public.fee_claims') AS t")).rows[0].t) throw new Error("fee_claims table missing: run pnpm --filter @hb/api db:migrate");
  const signer = loadPlatformKeypair();
  const r = await withAutoclaimLock(tx, () => runAutoclaim({ q: db, conn: getConnection(), decode: dbcDecoder(getClient().program), signer, settings: s, log }));
  if (!r.ran) log("[autoclaim] another autoclaim run holds the advisory lock: nothing done");
}
