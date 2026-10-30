import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type pg from "pg";
import { db, requireDb } from "./pool.js";
import { checksumAccepted, migrationChecksum } from "./checksum.js";

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../db/migrations");

/** Apply db/migrations/*.sql in name order inside ONE transaction guarded by pg_advisory_xact_lock
 *  (PgBouncer transaction mode safe: no session locks), tracked in schema_migrations with checksums (sha256 of the LF file;
 *  a row recorded from a CRLF checkout of the same content is accepted, see checksum.ts). */
export async function migrate(log: (m: string) => void = console.log, pool: pg.Pool = db) {
  requireDb();
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock(727001)");
    await c.query("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())");
    const done = new Map((await c.query<{ name: string; checksum: string }>("SELECT name, checksum FROM schema_migrations")).rows.map((r) => [r.name, r.checksum]));
    const files = fs.readdirSync(DIR).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
    let n = 0;
    for (const f of files) {
      const sql = fs.readFileSync(path.join(DIR, f), "utf8");
      const sum = migrationChecksum(sql);
      if (done.has(f)) { if (!checksumAccepted(f, sql, done.get(f)!)) throw new Error(`migration ${f} changed after it was applied`); continue; }
      try { await c.query(sql); } catch (e) { throw new Error(`migration ${f}: ${(e as Error).message}`); }
      await c.query("INSERT INTO schema_migrations (name, checksum) VALUES ($1,$2)", [f, sum]);
      log(`migrated ${f}`); n++;
    }
    await c.query("COMMIT");
    return n;
  } catch (e) { await c.query("ROLLBACK").catch(() => {}); throw e; }
  finally { c.release(); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  migrate().then((n) => { console.log(`${n} migration(s) applied`); return db.end(); }).catch((e) => { console.error(e.message); process.exit(1); });
}
