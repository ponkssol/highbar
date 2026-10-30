import { shellDatabaseUrl } from "./backfillEnvGuard.js";
import { Connection, PublicKey, type ConfirmedSignatureInfo } from "@solana/web3.js";
import pg from "pg";
import { decodeDbcEvents } from "../indexer/decode.js";
import { toRaw } from "../indexer/rawTx.js";
import { swapExtra } from "../openbook/ingest.js";
import { rebuildAgg } from "../openbook/rebuild.js";
import { addCostWithAgg, addFailedWithAgg, lockMint } from "../openbook/write.js";
import { txCosts } from "../indexer/txCosts.js";

/**
 * Open Book backfill: fills the 0012 columns of EXISTING trades (slot, exact fee parts, prices, min-out), trade_costs and (with --failed)
 * failed_attempts from getTransaction, then rebuilds each mint's aggregates from the stored rows (openbook/rebuild.ts).
 * Never inserts trades (candles / volume stay as indexed); swaps the indexer missed are only counted.
 *
 *   DATABASE_URL=<postgres-url> BACKFILL_RPC_URL=<rpc> pnpm --filter @hb/api exec tsx src/scripts/backfillTradeCosts.ts [--write]
 *     --dry-run (default)  read + count only, no writes
 *     --write              write rows and rebuild aggregates
 *     --mint <mint>        one token (repeatable); default all tokens
 *     --failed             also fetch failed txs (wallet / fee / duplicate detection)
 *     --rebuild-only       no RPC: only rebuild aggregates from what is stored
 *     --limit <n>          max signatures per pool (default 5000)
 * Env: BACKFILL_RPC_URL (default: the public RPC of NETWORK), BACKFILL_CONCURRENCY 1..2 (default 1), BACKFILL_DELAY_MS (default 250).
 * DATABASE_URL must be set in the shell (a value only present in apps/api/.env is refused). Requires migration 0012.
 */
const argv = process.argv.slice(2);
const flag = (f: string) => argv.includes(f);
const opt = (f: string) => argv.flatMap((a, i) => (a === f && argv[i + 1] ? [argv[i + 1]!] : []));
const write = flag("--write"), failedToo = flag("--failed"), rebuildOnly = flag("--rebuild-only");
const perPool = Math.max(1, Number(opt("--limit")[0] ?? 5000));
const concurrency = Math.min(2, Math.max(1, Number(process.env.BACKFILL_CONCURRENCY ?? 1)));
const delayMs = Math.max(0, Number(process.env.BACKFILL_DELAY_MS ?? 250));
const mainnet = process.env.NETWORK === "mainnet" || process.env.NETWORK === "mainnet-beta";
const rpcUrl = process.env.BACKFILL_RPC_URL || (mainnet ? "https://api.mainnet-beta.solana.com" : "https://api.devnet.solana.com");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const tierOf = (t: string) => (t === "higher" || t === "max" ? t : "standard") as "standard" | "higher" | "max";

/** Exponential backoff on 429 / rate limits / transient network errors (max ~1 min per call). */
async function rpc<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; ; i++) {
    try { return await fn(); } catch (e) {
      const m = String((e as Error).message ?? e);
      if (i >= 7 || !/429|Too Many|rate|ECONNRESET|ETIMEDOUT|fetch failed|503|502/i.test(m)) throw e;
      await sleep(Math.min(60_000, 500 * 2 ** i));
    }
  }
}

async function main() {
  if (!shellDatabaseUrl) throw new Error("set DATABASE_URL in the shell for this run (the apps/api/.env value is not used by the backfill)");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  const conn = new Connection(rpcUrl, "confirmed");
  console.log(JSON.stringify({ mode: write ? "write" : "dry-run", rebuildOnly, failed: failedToo, concurrency, rpc: process.env.BACKFILL_RPC_URL ? "BACKFILL_RPC_URL" : rpcUrl }));
  const has = (await pool.query("SELECT to_regclass('public.trade_costs') AS t")).rows[0]?.t;
  if (!has) throw new Error("migration 0012 is not applied (trade_costs missing)");
  const mints = opt("--mint");
  const toks = (await pool.query(`SELECT mint, pool, tier, anti_sniper, creator FROM tokens ${mints.length ? "WHERE mint = ANY($1)" : ""} ORDER BY created_at`, mints.length ? [mints] : [])).rows;
  const total = { tokens: 0, sigs: 0, fetched: 0, tradesUpdated: 0, costs: 0, failed: 0, missingSwaps: 0, rebuilt: 0 };

  const runOne = async (t: any) => {
    total.tokens++;
    if (!rebuildOnly) {
      const sigs: ConfirmedSignatureInfo[] = [];
      for (let before: string | undefined; sigs.length < perPool;) {
        const page = await rpc(() => conn.getSignaturesForAddress(new PublicKey(t.pool), { before, limit: Math.min(1000, perPool - sigs.length) }));
        sigs.push(...page); if (page.length < 1000) break; before = page[page.length - 1]!.signature; await sleep(delayMs);
      }
      total.sigs += sigs.length;
      const known = new Set((await pool.query(`SELECT sig FROM trade_costs WHERE mint = $1 UNION SELECT sig FROM failed_attempts WHERE mint = $1 AND fee_lamports IS NOT NULL`, [t.mint])).rows.map((r) => r.sig));
      for (const s of sigs.reverse()) {
        if (known.has(s.signature) || (s.err && !failedToo)) continue;
        const tx = await rpc(() => conn.getTransaction(s.signature, { maxSupportedTransactionVersion: 0 })).catch(() => null);
        total.fetched++; await sleep(delayMs);
        if (!tx) continue;
        const raw = toRaw(tx);
        if (s.err) {
          total.failed++;
          if (write) await inTx(pool, async (c) => { await lockMint(c, t.mint);
            await addFailedWithAgg(c, { sig: s.signature, mint: t.mint, pool: t.pool, slot: s.slot, err: s.err, ts: (s.blockTime ?? tx.blockTime ?? Math.floor(Date.now() / 1000)) * 1000,
              wallet: raw.transaction.message.accountKeys[0] ?? null, feeLamports: raw.meta?.fee == null ? null : BigInt(raw.meta.fee) }); });
          continue;
        }
        const evs = decodeDbcEvents(raw);
        const init = evs.some((e) => e.kind === "init" && e.pool === t.pool);
        const swaps = evs.filter((e): e is Extract<typeof e, { kind: "swap" }> => e.kind === "swap" && e.pool === t.pool);
        if (!init && !swaps.length) continue;
        const stored = (await pool.query("SELECT ix_idx, via_ui FROM trades WHERE sig = $1", [s.signature])).rows;
        const byIx = new Map(stored.map((r) => [Number(r.ix_idx), r]));
        const costs = txCosts(raw);
        await inTx(pool, async (c) => {
          await lockMint(c, t.mint);
          for (const [i, ev] of swaps.entries()) {
            const row = byIx.get(i);
            if (!row) { total.missingSwaps++; continue; }
            const x = swapExtra(ev, raw, { tier: tierOf(t.tier), antiSniper: !!t.anti_sniper }, !!row.via_ui);
            if (!write) { total.tradesUpdated++; continue; }
            const u = await c.query(`UPDATE trades SET slot = $3, tx_idx = $4, fee_lamports = $5, trading_fee_lamports = $6, protocol_fee_lamports = $7, anti_sniper_fee_lamports = $8,
                price_pre_sol = $9, price_post_sol = $10, min_out_raw = $11 WHERE sig = $1 AND ix_idx = $2 AND slot IS NULL`,
              [s.signature, i, x.slot, x.txIdx, x.split.total.toString(), x.exactParts ? x.split.trading.toString() : null, x.exactParts ? x.split.protocol.toString() : null,
                x.split.antiSniper.toString(), x.pricePre, x.pricePost, x.minOutRaw == null ? null : x.minOutRaw.toString()]);
            total.tradesUpdated += u.rowCount ?? 0;
          }
          if (costs) { total.costs++; if (write) await addCostWithAgg(c, { sig: s.signature, mint: t.mint, pool: t.pool, kind: init ? (swaps.length ? "create_swap" : "create") : "swap",
            slot: raw.slot, txIdx: raw.transactionIndex ?? null, blockTime: raw.blockTime, costs, creator: t.creator }); }
        });
      }
    }
    if (write) { await inTx(pool, (c) => rebuildAgg(c, t.mint)); total.rebuilt++; }
    console.log(`${t.mint} done (${JSON.stringify(total)})`);
  };

  const queue = [...toks];
  await Promise.all(Array.from({ length: concurrency }, async () => { for (let t = queue.shift(); t; t = queue.shift()) await runOne(t); }));
  console.log(JSON.stringify({ ...total, mode: write ? "write" : "dry-run" }));
  await pool.end();
}

async function inTx<T>(pool: pg.Pool, fn: (c: pg.PoolClient) => Promise<T>) {
  const c = await pool.connect();
  try { await c.query("BEGIN"); const r = await fn(c); await c.query(write ? "COMMIT" : "ROLLBACK"); return r; }
  catch (e) { await c.query("ROLLBACK").catch(() => {}); throw e; } finally { c.release(); }
}

main().catch((e) => { console.error((e as Error).message); process.exit(1); });
