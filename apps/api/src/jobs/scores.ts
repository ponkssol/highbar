/** highbar score + holders + snapshots job (off-chain, read-only RPC). tsx src/jobs/scores.ts [--no-rpc] [--loop SEC] */
import { db, requireDb } from "../db/pool.js";
import { migrate } from "../db/migrate.js";
import { runScores } from "../services/scoreJob.js";
import { sleep } from "./chain.js";

const argv = process.argv.slice(2);
const i = argv.indexOf("--loop"), loop = i >= 0 ? Number(argv[i + 1]) : 0;
const log = (m: string) => console.log(new Date().toISOString(), m);
requireDb();
await migrate(log);
do {
  try { await runScores(log, { rpc: !argv.includes("--no-rpc") }); } catch (e) { log(`ERROR ${(e as Error).message}`); if (!loop) process.exitCode = 1; }
  if (loop) await sleep(loop * 1000);
} while (loop);
await db.end();
