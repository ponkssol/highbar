/** Imported FIRST by backfillTradeCosts.ts: records whether DATABASE_URL came from the shell, before any module loads apps/api/.env
 *  (db/pool.ts imports dotenv/config). The backfill refuses to run on a DATABASE_URL that was only picked up from .env. */
export const shellDatabaseUrl = !!process.env.DATABASE_URL;
