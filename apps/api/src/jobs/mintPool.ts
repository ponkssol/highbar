/** Vanity mint pool refill: keeps >= MINT_POOL_MIN_AVAILABLE "...high" mints available, grinding in worker threads.
 *  pnpm --filter @hb/api mint-pool:refill [--loop [SEC]] [--threads N] [--status]
 *    --loop SEC  run forever, re-checking every SEC seconds (default 30); without it: one refill pass, then exit
 *    --status    print the pool counts and exit (no grinding)
 *  Env: DATABASE_URL, MINT_POOL_ENC_KEY (required), MINT_POOL_MIN_AVAILABLE (50), MINT_POOL_THREADS (default: all CPUs),
 *  RPC_URL (expired-reservation sweep). Each key is encrypted and inserted the moment it is found; nothing secret is logged. */
import { defaultGrindThreads, grindVanity, GrindAbortedError, rpcUrl, VANITY_SUFFIX } from "@hb/onchain";
import { db, requireDb } from "../db/pool.js";
import { encKeyFromEnv, mintPoolConfig, poolCounts, storeKeypair, sweepExpired } from "../services/mintPool/index.js";

const argv = process.argv.slice(2);
const flag = (n: string) => argv.includes(`--${n}`);
const opt = (n: string) => { const i = argv.indexOf(`--${n}`); const v = i >= 0 ? argv[i + 1] : undefined; return v && !v.startsWith("--") ? v : undefined; };
/** only the host: the RPC URL usually carries an API key */
const rpcHost = () => { try { return new URL(rpcUrl()).host; } catch { return "(invalid RPC_URL)"; } };
const log = (m: string) => console.log(new Date().toISOString(), "[mint-pool]", m);
const threads = Number(opt("threads") ?? process.env.MINT_POOL_THREADS ?? 0) || defaultGrindThreads();
const stop = new AbortController();
for (const s of ["SIGINT", "SIGTERM"] as const) process.on(s, () => { log(`${s}: stopping`); stop.abort(); });

async function pass(key: Buffer) {
  const sw = await sweepExpired(db).catch((e) => { log(`sweep skipped: ${(e as Error).message.slice(0, 120)}`); return { freed: 0, used: 0 }; });
  if (sw.freed || sw.used) log(`expired reservations: ${sw.freed} freed, ${sw.used} marked used (on-chain)`);
  const c = await poolCounts(db), min = mintPoolConfig().minAvailable;
  log(`available ${c.available} / min ${min} (reserved ${c.reserved}, used ${c.used})`);
  const need = min - c.available;
  if (need <= 0 || stop.signal.aborted) return;
  log(`grinding ${need} "...${VANITY_SUFFIX}" mint(s) on ${threads} thread(s)`);
  let n = 0;
  try {
    const r = await grindVanity({ count: need, threads, signal: stop.signal, onKey: async (kp) => { if (await storeKeypair(db, kp, key)) n++; } });
    log(`+${n} mint(s) in ${(r.ms / 1000).toFixed(0)} s (${Math.round(r.keysPerSec).toLocaleString("en-US")} keys/s)`);
  } catch (e) {
    if (e instanceof GrindAbortedError) log(`stopped after +${n} mint(s)`); else throw e;
  }
}

async function main() {
  requireDb();
  if (flag("status")) { console.log(await poolCounts(db)); await db.end(); return; }
  const key = encKeyFromEnv(); // throws when missing / not 32 bytes (value never printed)
  if (!(await db.query("SELECT to_regclass('public.mint_pool') AS t")).rows[0].t) throw new Error("mint_pool table missing: run pnpm --filter @hb/api db:migrate (0010)");
  log(`rpc host ${rpcHost()}, min available ${mintPoolConfig().minAvailable}, threads ${threads}`);
  const loop = flag("loop") ? Number(opt("loop") ?? 30) || 30 : 0;
  do {
    try { await pass(key); } catch (e) { log(`ERROR ${(e as Error).message.slice(0, 200)}`); if (!loop) process.exitCode = 1; }
    if (loop && !stop.signal.aborted) await new Promise<void>((r) => { const t = setTimeout(r, loop * 1000); stop.signal.addEventListener("abort", () => { clearTimeout(t); r(); }, { once: true }); });
  } while (loop && !stop.signal.aborted);
  await db.end();
}
main().catch((e) => { console.error(`[mint-pool] ${(e as Error).message}`); process.exit(1); });
