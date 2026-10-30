/** GET /tokens/:mint/pending -> { status: "indexed" | "pending" | "unknown", pool? }  (indexer/pending.ts)
 *  429 { status: "rate_limited" } over the RPC caps, 503 { status: "error" } on a db / RPC failure (both: try again, not a 404).
 *  Used by the web token page (server-side) and its TokenPending state, so a fresh on-chain mint never shows a 404. */
import type { FastifyInstance } from "fastify";
import { isAddress } from "../security/validate.js";
import { clientIp } from "../security/rateLimit.js";
import type { PendingLookup } from "../indexer/pending.js";

/** Lazy: the indexer (RPC client etc.) loads on the first lookup, not when the routes are registered. */
async function defaultLookup(): Promise<PendingLookup> {
  const [{ PendingLookup, pendingConfig, tokenExistsSql }, poller, { getConnection }, { db }] = await Promise.all([
    import("../indexer/pending.js"), import("../indexer/poller.js"), import("@hb/onchain"), import("../db/pool.js"),
  ]);
  return new PendingLookup(pendingConfig(), {
    tokenExists: tokenExistsSql(db),
    configs: () => poller.tierConfigs(),
    getMultipleAccounts: (keys) => getConnection().getMultipleAccountsInfo(keys, "confirmed"),
    kick: (mint, found) => poller.fastIndexer.kick(mint, { found }, (m) => console.log(m)),
  });
}

export function registerPending(app: FastifyInstance, deps: { lookup?: PendingLookup } = {}) {
  let lookup: Promise<PendingLookup> | undefined = deps.lookup ? Promise.resolve(deps.lookup) : undefined;
  app.get("/tokens/:mint/pending", async (req, reply) => {
    const { mint } = req.params as { mint: string };
    if (!isAddress(mint)) return reply.code(400).send({ error: "mint must be a valid Solana address" });
    reply.header("cache-control", "no-store");
    let r;
    try { r = await (await (lookup ??= defaultLookup())).lookup(mint, clientIp(req)); }
    catch { lookup = undefined; r = { status: "error" as const }; }
    if (r.status === "rate_limited") return reply.code(429).header("retry-after", String(Math.max(1, Math.ceil(r.retryAfterMs / 1000)))).send({ status: "rate_limited" });
    if (r.status === "error") return reply.code(503).send({ status: "error" });
    return r.pool ? { status: r.status, pool: r.pool } : { status: r.status };
  });
}
