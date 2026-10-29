import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { db, tx } from "../src/db/pool.js";
import { migrate } from "../src/db/migrate.js";
import { store, type Token, type TradeRow, type Activity } from "../src/store.js";

/** One-off import of data/db.json, data/trades.json and data/media into Postgres (idempotent: ON CONFLICT DO NOTHING / upserts). */
const DATA = path.resolve(process.env.DATA_DIR ?? "./data");
const j = <T>(f: string, d: T): T => { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8")); } catch { return d; } };
await migrate();
const src = j<any>("db.json", {});
const pts = j<any[]>("trades.json", []);
await tx(async (c) => {
  for (const t of Object.values<Token>(src.tokens ?? {})) await store.upsertToken(t, c);
  for (const t of Object.values<TradeRow>(src.trades ?? {})) await store.addTrade(t, c);
  for (const [pool, sig] of Object.entries<string>(src.lastSig ?? {})) await store.setLastSig(pool, sig, c);
  for (const a of (src.activity ?? []) as Activity[]) await store.addActivity(a, c);
  for (const a of (src.burns ?? []) as Activity[]) await store.addActivity(a, c, "burn");
  for (const p of pts) await store.addPoint(p, c);
  for (const t of Object.values<TradeRow>(src.trades ?? {})) if (t.tokens > 0 && t.sol > 0) { const k = t.sig.lastIndexOf(":");
    await store.addPoint({ mint: t.mint, sig: k > 0 ? t.sig.slice(0, k) : t.sig, ixIdx: k > 0 ? Number(t.sig.slice(k + 1)) || 0 : 0, ts: t.ts, priceSol: t.sol / t.tokens, amount: t.tokens, side: t.side, sol: t.sol }, c); }
  const now = Date.now();
  for (const [mint, escs] of Object.entries<string[]>(src.locks ?? {})) for (const e of escs)
    await c.query("INSERT INTO lock_escrows (escrow,mint,added_at) VALUES ($1,$2,$3) ON CONFLICT (escrow) DO NOTHING", [e, mint, now]);
  for (const [e, m] of Object.entries<any>(src.lockMeta ?? {}))
    await c.query(`INSERT INTO lock_escrows (escrow,mint,creator,cliff_time,end_time,total,locked,cancelled,seen_at,added_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (escrow) DO UPDATE SET creator=EXCLUDED.creator, cliff_time=EXCLUDED.cliff_time, end_time=EXCLUDED.end_time, total=EXCLUDED.total, locked=EXCLUDED.locked, cancelled=EXCLUDED.cancelled, seen_at=EXCLUDED.seen_at`,
      [e, m.mint, m.creator, m.cliffTime, m.endTime, m.total, m.locked, !!m.cancelled, m.seenAt ?? now, now]);
});
// media + logo cache
const MD = path.join(DATA, "media"), MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", gif: "image/gif", json: "application/json" };
for (const f of fs.existsSync(MD) ? fs.readdirSync(MD) : []) { const m = /^([a-f0-9]{24})\.(\w+)$/.exec(f); if (m && MIME[m[2]]) await store.putMedia(m[1], m[2], MIME[m[2]], fs.readFileSync(path.join(MD, f))); }
const CD = path.join(MD, "cache"), uris = new Map((await store.tokens()).map((t) => [crypto.createHash("sha1").update(t.uri).digest("hex"), t.uri]));
for (const f of fs.existsSync(CD) ? fs.readdirSync(CD) : []) { const m = /^([a-f0-9]{40})\.json$/.exec(f); if (!m) continue;
  const meta = JSON.parse(fs.readFileSync(path.join(CD, f), "utf8")); const img = path.join(CD, `${m[1]}.img`);
  await store.putLogo(m[1], uris.get(m[1]) ?? "", meta.none ? null : meta.type, meta.none || !fs.existsSync(img) ? null : fs.readFileSync(img)); }
const counts: Record<string, number> = {};
for (const t of ["tokens", "trades", "trade_points", "pool_cursors", "activity", "lock_escrows", "media_files", "logo_cache", "auth_nonces", "auth_sessions", "settings"]) counts[t] = (await db.query(`SELECT count(*)::int n FROM ${t}`)).rows[0].n;
console.log(JSON.stringify({ source: { tokens: Object.keys(src.tokens ?? {}).length, trades: Object.keys(src.trades ?? {}).length, points: pts.length, activity: (src.activity ?? []).length, burns: (src.burns ?? []).length, locks: Object.values(src.locks ?? {}).flat().length, lockMeta: Object.keys(src.lockMeta ?? {}).length }, db: counts }));
await db.end();

