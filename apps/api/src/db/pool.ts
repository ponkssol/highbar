import "dotenv/config";
import pg from "pg";

// BIGINT (epoch ms, lamports) -> number; values stay well under 2^53.
pg.types.setTypeParser(20, (v) => Number(v));

/** Pool for DATABASE_URL (Railway PgBouncer, transaction mode): only unnamed statements, no LISTEN / session locks / session SET. */
export const db = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: Number(process.env.PG_POOL_MAX ?? 10), idleTimeoutMillis: 30_000, connectionTimeoutMillis: 15_000 });
db.on("error", (e) => console.error("pg pool:", e.message));
export const requireDb = () => { if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (apps/api/.env)"); };

/** Run fn inside one transaction (BEGIN/COMMIT, ROLLBACK on error); safe under PgBouncer transaction pooling. */
export async function tx<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await db.connect();
  try { await c.query("BEGIN"); const r = await fn(c); await c.query("COMMIT"); return r; }
  catch (e) { await c.query("ROLLBACK").catch(() => {}); throw e; }
  finally { c.release(); }
}
export type Q = Pick<pg.PoolClient, "query">;
