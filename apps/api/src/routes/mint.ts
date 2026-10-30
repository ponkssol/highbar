/** Vanity mint launch flow (see services/mintPool/index.ts):
 *  (the reservation itself happens in POST /tx/launch, behind the launch rate limits / creator gates: it returns the mint pubkey
 *   with the unsigned tx; an empty pool is 503 MINT_POOL_EMPTY. There is no separate public reserve endpoint to drain the pool.)
 *  POST /tx/launch/sign   { mint, tx }                -> { tx, mint, pool, signature }  (tx = wallet-signed; returned fully signed)
 *  POST /mint/confirm     { mint }                    -> { used }
 *  Never returns or logs a secret; errors are fixed strings or validation reasons. */
import type { FastifyInstance, FastifyReply } from "fastify";
import { db } from "../db/pool.js";
import { confirmMint, LaunchTxRejected, MintPoolError, signLaunchTx, sweepExpired, type Sql } from "../services/mintPool/index.js";
import { address } from "../security/validate.js";

export interface MintDeps { q?: Sql; sign?: typeof signLaunchTx; confirm?: typeof confirmMint }

export function mintPoolFailure(reply: FastifyReply, e: unknown, log?: { warn: (o: object, m: string) => void }) {
  if (e instanceof MintPoolError) return reply.code(e.status).send({ error: e.message, code: e.code });
  if (e instanceof LaunchTxRejected) return reply.code(400).send({ error: e.message, code: "LAUNCH_TX_REJECTED" });
  log?.warn({ err: (e as Error)?.name }, "mint pool request failed"); // no message: it could carry DB / RPC details
  return reply.code(500).send({ error: "mint pool unavailable, try again", code: "MINT_POOL_ERROR" });
}

export function registerMint(app: FastifyInstance, deps: MintDeps = {}) {
  const q = () => deps.q ?? db;

  app.post("/tx/launch/sign", async (req, reply) => {
    if (process.env.LAUNCHES_PAUSED === "true") return reply.code(503).send({ error: "launches are paused" });
    const b = (req.body ?? {}) as { mint?: unknown; tx?: unknown };
    let mint: string;
    try { mint = address(b.mint, "mint"); } catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
    if (typeof b.tx !== "string" || b.tx.length > 4096) return reply.code(400).send({ error: "tx must be a base64 transaction" });
    try { return await (deps.sign ?? signLaunchTx)(q(), mint, b.tx); }
    catch (e) { return mintPoolFailure(reply, e, req.log); }
  });

  app.post("/mint/confirm", async (req, reply) => {
    let mint: string;
    try { mint = address((req.body as { mint?: unknown })?.mint, "mint"); } catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
    try { return { used: await (deps.confirm ?? confirmMint)(q(), mint) }; }
    catch (e) { return mintPoolFailure(reply, e, req.log); }
  });
}

/** API-side safety net next to the refill service: sweep expired reservations every MINT_POOL_SWEEP_SEC (60). */
export function startMintSweeper(log: { warn: (m: string) => void; info: (m: string) => void }) {
  const sec = Number(process.env.MINT_POOL_SWEEP_SEC ?? 60);
  if (!(sec > 0)) return;
  const run = () => sweepExpired(db).then((r) => { if (r.freed || r.used) log.info(`[mint-pool] expired reservations: ${r.freed} freed, ${r.used} marked used`); })
    .catch((e) => log.warn(`[mint-pool] sweep skipped: ${String((e as Error).message).slice(0, 120)}`));
  setInterval(run, sec * 1000).unref();
}
