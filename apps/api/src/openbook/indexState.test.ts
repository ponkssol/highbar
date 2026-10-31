/** Open Book indexState on PGlite (every migration verbatim; never DATABASE_URL). Test data: "Test Coin" (TEST), throwaway keys only. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { Keypair } from "@solana/web3.js";
import type { Q } from "../db/pool.js";
import type { TradeRow } from "../store.js";
import { splitSwapFee } from "./math.js";
import { parseLedgerQuery } from "./params.js";
import { indexState, LAG_MS, platformOpenBook, platformTokens, tokenLedger, tokenOpenBook, type ReadCtx } from "./read.js";
import { addTradeWithAgg, resetOpenbookTablesCache } from "./write.js";

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../db/migrations");
const key = () => Keypair.generate().publicKey.toBase58();
const NOW = 1_793_400_000_000, HOUR = 3_600_000;
const ctx: ReadCtx = { network: "mainnet", goPublic: null, barMint: null, now: NOW, hiddenMints: [],
  wallets: { feeReceiver: key(), feeClaimer: key(), referral: null, platform: null } };
const LEDGER = parseLedgerQuery({});
const TOKENS = { q: null, status: "all", sort: "volume", order: "desc", limit: 10, cursor: null } as const;

async function freshDb() {
  resetOpenbookTablesCache();
  const pg = new PGlite();
  for (const f of fs.readdirSync(DIR).filter((x) => /^\d+_.+\.sql$/.test(x)).sort()) await pg.exec(fs.readFileSync(path.join(DIR, f), "utf8"));
  const q = { query: (t: string, p?: unknown[]) => pg.query(t, p as any[]).then((r: any) => ({ ...r, rowCount: r.affectedRows ?? r.rows.length })) } as unknown as Q;
  return { pg, q };
}

async function addToken(q: Q, trades: number) {
  const mint = key(), pool = key(), creator = key();
  // token row touched by the indexer just now (price / progress refresh), long after its last trade
  await q.query(`INSERT INTO tokens (mint, pool, config, tier, anti_sniper, creator, created_at, name, symbol, uri, trades, updated_at)
    VALUES ($1,$2,'cfg','standard',false,$3,$4,'Test Coin','TEST','',$5,$6)`, [mint, pool, creator, NOW - 5 * HOUR, trades, NOW]);
  return { mint, pool };
}
/** A trade through the Open Book write path (trade row + agg bump), as the poller writes it. */
async function indexedTrade(q: Q, t: { mint: string; pool: string }, ts: number) {
  const row: TradeRow = { sig: `${key()}:0`, pool: t.pool, mint: t.mint, side: "buy", sol: 0.5, tokens: 1_000_000, feeSol: 0.005, wallet: key(), viaUi: false, ts, referralFeeLamports: null };
  const split = splitSwapFee({ side: "buy", solLamports: 500_000_000n, feeLamports: 5_000_000n, tier: "standard", antiSniper: false, referralLamports: null, viaUi: false });
  await addTradeWithAgg(q, row, { slot: 1000, txIdx: null, exactParts: false, pricePre: null, pricePost: null, minOutRaw: null, split }, 500_000_000n);
}
/** A trade stored WITHOUT the Open Book agg bump (fallback insert path): real unindexed work. */
async function rawTrade(q: Q, t: { mint: string; pool: string }, ts: number) {
  await q.query(`INSERT INTO trades (sig,ix_idx,pool,mint,side,sol,tokens,wallet,ts) VALUES ($1,0,$2,$3,'buy',0.5,1000000,$4,$5)`, [key(), t.pool, t.mint, key(), ts]);
}
async function states(q: Q, mint: string) {
  return { token: (await tokenOpenBook(q, mint, ctx))!.meta.indexState, ledger: (await tokenLedger(q, mint, ctx, LEDGER))!.meta.indexState,
    platform: (await platformOpenBook(q, ctx, "all")).meta.indexState, tokens: (await platformTokens(q, ctx, TOKENS)).meta.indexState };
}

test("indexState: no new trades + stale Open Book record + freshly touched token row -> synced everywhere", async () => {
  const { pg, q } = await freshDb();
  try {
    const t = await addToken(q, 2);
    await indexedTrade(q, t, NOW - 3 * HOUR);
    await indexedTrade(q, t, NOW - 3 * HOUR + 1000);
    // Open Book record last written hours before the token row was touched (the old rule called this 'lagging')
    await q.query("UPDATE token_openbook_agg SET updated_at = $2 WHERE mint = $1", [t.mint, NOW - 3 * HOUR + 1000]);
    assert.deepEqual(await states(q, t.mint), { token: "synced", ledger: "synced", platform: "synced", tokens: "synced" });
  } finally { await pg.close(); }
});

test("indexState: a trade newer than the Open Book cursor -> lagging once it is past the grace window", async () => {
  const { pg, q } = await freshDb();
  try {
    const t = await addToken(q, 1);
    await indexedTrade(q, t, NOW - 2 * HOUR);
    // just landed and not counted yet: inside the grace window, still synced
    await rawTrade(q, t, NOW - 30_000);
    assert.deepEqual(await states(q, t.mint), { token: "synced", ledger: "synced", platform: "synced", tokens: "synced" });
    // a trade past the cursor that has waited longer than the grace window
    await rawTrade(q, t, NOW - LAG_MS - 60_000);
    assert.deepEqual(await states(q, t.mint), { token: "lagging", ledger: "lagging", platform: "lagging", tokens: "lagging" });
    // a fully synced second token stays synced on its own page
    const u = await addToken(q, 1);
    await indexedTrade(q, u, NOW - HOUR);
    assert.equal((await tokenOpenBook(q, u.mint, ctx))!.meta.indexState, "synced");
  } finally { await pg.close(); }
});

test("indexState: never indexed (no Open Book record) -> pending; fewer counted trades than the token row -> backfilling", async () => {
  const { pg, q } = await freshDb();
  try {
    const t = await addToken(q, 3);
    await rawTrade(q, t, NOW - 2 * HOUR);
    assert.equal((await tokenOpenBook(q, t.mint, ctx))!.meta.indexState, "pending");
    assert.equal((await tokenLedger(q, t.mint, ctx, LEDGER))!.meta.indexState, "pending");
    // a token with no Open Book record does not make the platform lag
    assert.equal((await platformOpenBook(q, ctx, "all")).meta.indexState, "synced");
    await indexedTrade(q, t, NOW - HOUR);
    assert.equal((await tokenOpenBook(q, t.mint, ctx))!.meta.indexState, "backfilling");
    // pure rule
    assert.equal(indexState(false, { trades: 1 }, { trades: 1 }, true), "pending");
    assert.equal(indexState(true, null, { trades: 0 }, false), "pending");
    assert.equal(indexState(true, { trades: 1 }, { trades: 1 }, false), "synced");
    assert.equal(indexState(true, { trades: 1 }, { trades: 1 }, true), "lagging");
  } finally { await pg.close(); }
});