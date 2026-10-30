import { PublicKey } from "@solana/web3.js";
import { deriveDbcPoolAddress, getPriceFromSqrtPrice } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { TIERS, networkOf, thresholdSolFor, type TierId } from "@hb/shared";
import { getClient, getConnection, indexableConfigEntries, referralAta, sleep, withRetry } from "@hb/onchain";
import { decodeDbcEvents } from "./decode.js";
import { toRaw } from "./rawTx.js";
import { chronological, nextTradeTs, secondBaseMs } from "./tradeOrder.js";
import { store, type Token, type TradeRow } from "../store.js";
import { recordTrade } from "../candles/index.js";
import { scoresStore } from "../services/scoresStore.js";
import { detectOfficial, officialConfig, pgOfficialRepo, refreshOfficial } from "../services/officialToken.js";
import { db, tx as dbTx } from "../db/pool.js";
import { openbookTables } from "../openbook/write.js";
import { ingestFailed, ingestLandedTx, swapExtra } from "../openbook/ingest.js";
import { collectSignatures, pollConfig, poolFingerprint, PollScheduler, prioritize, tickTxBudget, tradesPerPool, type PoolView } from "./schedule.js";
import { FastIndexer, fastIndexConfig, initForMint, type FastResult } from "./fastIndex.js";
import type { FoundPool } from "./pending.js";

/** RPC-polling indexer (state in Postgres). Pool state via getPoolsByConfig; swaps via the backup's decode.ts (EvtSwap3). */
const METAPLEX = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const SUPPLY = 1_000_000_000;
const L = 1e9;
const REFERRAL = process.env.PLATFORM_REFERRAL_TOKEN_ACCOUNT || referralAta().toBase58();
/** getSignaturesForAddress page size (max 1000; same credits per call whatever the size) and page budget per poll. */
const SIG_PAGE = Math.min(1000, Math.max(1, Number(process.env.INDEXER_SIG_PAGE ?? 1000) || 1000));
const SIG_MAX_PAGES = Math.max(1, Number(process.env.INDEXER_SIG_MAX_PAGES ?? 10) || 10);
/** A signature getTransaction cannot return yet (RPC node lag) stops the batch so the cursor never skips it; after this many polls it is skipped. */
const MISSING_TX_RETRIES = 3;
const missingTx = new Map<string, number>();

export function tierConfigs() {
  return indexableConfigEntries() // mainnet: ONLY configs.mainnet.json; devnet: devnet file + legacy + TEST_CONFIGS
    .map(([k, v]) => { const [tier, a] = k.split("_"); return { key: k, tier: tier as TierId, antiSniper: a === "on", address: v }; });
}

function readStr(buf: Buffer, o: number): [string, number] {
  const len = buf.readUInt32LE(o);
  return [buf.subarray(o + 4, o + 4 + len).toString("utf8").replace(/\0/g, "").trim(), o + 4 + len];
}
async function fetchMetadata(mint: string) {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), METAPLEX.toBuffer(), new PublicKey(mint).toBuffer()], METAPLEX);
  const acc = await withRetry(() => getConnection().getAccountInfo(pda));
  if (!acc) return { name: "", symbol: "", uri: "" };
  const [name, o2] = readStr(acc.data, 65); const [symbol, o3] = readStr(acc.data, o2); const [uri] = readStr(acc.data, o3);
  return { name, symbol, uri };
}

/** Index every signature newer than the pool cursor, oldest first, at most `maxTxs` per call (the rest = backlog, next tick).
 *  The cursor moves to the last signature handled, so nothing between two polls is skipped however long the pool idled. */
async function indexTrades(t: Token, maxTxs: number, log: (m: string) => void = console.log): Promise<{ newSigs: number; backlog: boolean; handled: number }> {
  const conn = getConnection();
  const pk = new PublicKey(t.pool);
  const until = await store.lastSig(t.pool);
  const { sigs, complete } = await collectSignatures((o) => withRetry(() => conn.getSignaturesForAddress(pk, o)), until, SIG_PAGE, SIG_MAX_PAGES);
  if (!sigs.length) return { newSigs: 0, backlog: false, handled: 0 };
  if (!complete && until) log(`[indexer] ${t.pool}: over ${SIG_PAGE * SIG_MAX_PAGES} new signatures since the cursor; older ones past INDEXER_SIG_PAGE x INDEXER_SIG_MAX_PAGES are skipped`);
  const all = chronological(sigs);
  const batch = all.slice(0, Math.max(1, maxTxs));
  let cursor: string | undefined, stopped = false, handled = 0;
  const lastTsInSecond = new Map<number, number>(); // second (ms) -> last trade ts handed out for this mint
  const ob = await openbookTables(db); // 0012 applied: trades + tx costs + aggregates in one db tx (Open Book)
  // failed txs: also fetched (wallet / fee) inside the launch window only; 0 = never (the backfill can fill them later)
  const failedDetailMs = Number(process.env.OPENBOOK_FAILED_DETAIL_WINDOW_S ?? 60) * 1000;
  try {
  for (const s of batch) {
    handled++;
    if (s.err) {
      if (!ob) continue;
      const inWindow = failedDetailMs > 0 && t.createdAt > 0 && s.blockTime != null && s.blockTime * 1000 - t.createdAt <= failedDetailMs;
      const ftx = inWindow ? await withRetry(() => conn.getTransaction(s.signature, { maxSupportedTransactionVersion: 0 })).catch(() => null) : null;
      if (inWindow) await sleep(120);
      await dbTx((c) => ingestFailed(c, { sig: s.signature, mint: t.mint, pool: t.pool, slot: s.slot, err: s.err, blockTime: s.blockTime ?? null, raw: ftx ? toRaw(ftx) : null }))
        .catch((e) => log(`[openbook] failed ${s.signature}: ${(e as Error).message}`));
      cursor = s.signature;
      continue;
    }
    const tx = await withRetry(() => conn.getTransaction(s.signature, { maxSupportedTransactionVersion: 0 })).catch(() => null);
    await sleep(120); // stay under public RPC limits
    if (!tx) {
      const n = (missingTx.get(s.signature) ?? 0) + 1;
      if (n <= MISSING_TX_RETRIES) { missingTx.set(s.signature, n); stopped = true; break; } // retry from here next poll
      missingTx.delete(s.signature);
      log(`[indexer] ${t.pool}: getTransaction ${s.signature} still empty after ${MISSING_TX_RETRIES} polls, skipped`);
      cursor = s.signature;
      continue;
    }
    missingTx.delete(s.signature);
    const raw = toRaw(tx);
    const ts = secondBaseMs(tx.blockTime); // whole second; each swap gets ts + its chain-order sequence (indexer/tradeOrder.ts)
    let i = 0, initInTx = false, devTagged = false;
    const swaps: { row: TradeRow; extra: ReturnType<typeof swapExtra>; solLamports: bigint }[] = [];
    for (const ev of decodeDbcEvents(raw)) {
      if (ev.kind === "init" && ev.pool === t.pool) {
        t.createdAt = ts; initInTx = true;
        if (ev.name && !t.name) Object.assign(t, { name: ev.name, symbol: ev.symbol, uri: ev.uri });
      }
      if (ev.kind !== "swap" || ev.pool !== t.pool) continue;
      const sig = `${s.signature}:${i++}`;
      const devBuy = initInTx && !devTagged && ev.side === "buy"; if (devBuy) devTagged = true;
      const tradeTs = nextTradeTs(ts, lastTsInSecond.has(ts) ? lastTsInSecond.get(ts) : await store.maxTradeTsInSecond(t.mint, ts));
      lastTsInSecond.set(ts, tradeTs);
      const viaUi = !!REFERRAL && ev.referralTokenAccount === REFERRAL;
      swaps.push({ row: { sig, pool: t.pool, mint: t.mint, side: ev.side, sol: Number(ev.solLamports) / L, tokens: Number(ev.tokenAmount) / 1e6,
        feeSol: Number(ev.feeLamports) / L, wallet: ev.trader, viaUi, ts: tradeTs, ...(devBuy ? { devBuy: true } : {}),
        referralFeeLamports: viaUi ? ev.referralFeeLamports : null }, extra: swapExtra(ev, raw, t, viaUi), solLamports: ev.solLamports });
    }
    let added: boolean[];
    if (ob) added = await dbTx((c) => ingestLandedTx(c, { sig: s.signature, raw, mint: t.mint, pool: t.pool, creator: t.creator, initInTx, swaps }));
    else { added = []; for (const sw of swaps) added.push(await store.addTrade(sw.row)); }
    for (const [k, sw] of swaps.entries()) {
      if (!added[k]) continue;
      const r = sw.row;
      await recordTrade({ sig: r.sig, mint: t.mint, side: r.side, sol: r.sol, tokens: r.tokens, ts: r.ts });
      await store.addActivity({ id: `trade:${r.sig}`, type: "trade", mint: t.mint, symbol: t.symbol, ts: r.ts, amount: r.sol, side: r.side, wallet: r.wallet, sig: s.signature });
    }
    cursor = s.signature;
  }
  } finally {
    if (cursor) await store.setLastSig(t.pool, cursor); // checkpoint even when a later tx threw (ingest is idempotent anyway)
  }
  return { newSigs: sigs.length, backlog: stopped || all.length > batch.length, handled };
}

/** DBC pool configs are immutable once created: read each one once an hour, not on every tick (was one getAccountInfo per config per tick). */
const CONFIG_TTL_MS = 3_600_000;
type PoolAccount = Awaited<ReturnType<ReturnType<typeof getClient>["state"]["getPoolsByConfig"]>>[number]["account"];
const configCache = new Map<string, { at: number; v: Awaited<ReturnType<ReturnType<typeof getClient>["state"]["getPoolConfig"]>> }>();
async function poolConfig(address: string) {
  const hit = configCache.get(address);
  if (hit && Date.now() - hit.at < CONFIG_TTL_MS) return hit.v;
  const v = await withRetry(() => getClient().state.getPoolConfig(address));
  if (v) configCache.set(address, { at: Date.now(), v });
  return v;
}

type PoolConfigV = Awaited<ReturnType<typeof poolConfig>>;
type Item = { cfg: ReturnType<typeof tierConfigs>[number]; config: PoolConfigV; creatorPct: number; publicKey: PublicKey; account: PoolAccount };
interface PassCtx { sched?: PollScheduler; now: number; limit: number; budget: { left: number }; log: (m: string) => void }

/** Pools being indexed right now by the /mint/confirm fast path (pool -> its run): the tick skips them, the fast path waits for a tick
 *  already on the pool. One writer per pool at a time; the inserts stay idempotent anyway (tokens / trades / Open Book ON CONFLICT). */
const poolBusy = new Map<string, Promise<unknown>>();
/** The running indexer's scheduler (startIndexer), so the fast path can mark a fresh pool hot. */
let activeSched: PollScheduler | undefined;

/** Token row + (when due) new signatures for one pool. Shared by the tick (config scan) and the /mint/confirm fast path (targeted getPool). */
async function indexPool(it: Item, ctx: PassCtx): Promise<{ view: PoolView; due: boolean; deferred: boolean }> {
  const { cfg, config, creatorPct, publicKey, account } = it;
  const { sched, now, limit, budget, log } = ctx;
  const ps = account.poolState;
  const mint = ps.baseMint.toBase58();
  const prev = await store.getToken(mint).then((x) => (x?.mint === mint ? x : null));
  const thresholdSol = config ? Number(config.migrationQuoteThreshold.toString()) / L : thresholdSolFor(cfg.tier, networkOf(process.env.NETWORK)); // on-chain value wins; fallback per network
  const quoteReserveSol = Number(ps.quoteReserve.toString()) / L;
  const priceSol = Number(getPriceFromSqrtPrice(ps.sqrtPrice, 6, 9).toString());
  const isMigrated = Number(ps.isMigrated) !== 0;
  const pool = publicKey.toBase58();
  const view: PoolView = { createdAt: prev?.createdAt ?? 0, isMigrated, fingerprint: poolFingerprint(account) };
  let due = sched ? sched.due(pool, view, now) : true, deferred = false;
  if (due && budget.left <= 0 && prev) { due = false; deferred = true; sched?.defer(pool, now); } // tick budget spent: stays due, handled next tick (a token not in the db yet is never held back)
  // metadata (on-chain only, never client input): once for a new token; a token stored without a name retries only when its pool is polled
  const meta = prev && (prev.name || !due) ? prev : await fetchMetadata(mint).catch(() => ({ name: "", symbol: "", uri: "" }));
  const t: Token = {
    mint, pool, config: cfg.address, tier: cfg.tier, antiSniper: cfg.antiSniper,
    creator: ps.creator.toBase58(), createdAt: prev?.createdAt ?? 0,
    quoteReserveSol, thresholdSol, progress: Math.min(1, quoteReserveSol / thresholdSol),
    isMigrated, priceSol, mcapSol: priceSol * SUPPLY, name: meta.name, symbol: meta.symbol, uri: meta.uri,
    volumeSol: 0, volume24hSol: 0, trades: 0, creatorFeesSol: 0, feesSol: 0, updatedAt: Date.now(),
  };
  const r = due ? await indexTrades(t, prev ? Math.max(1, Math.min(limit, budget.left)) : limit, log).catch((e) => { log(`trades ${t.pool}: ${e.message}`); return null; }) : null;
  if (r) budget.left -= r.handled;
  if (!t.createdAt) t.createdAt = Date.now();
  if (r && sched) sched.record(pool, { ...view, createdAt: t.createdAt }, r, Date.now()); // failed poll: not recorded, retried next tick
  if (!prev) await store.addActivity({ id: `launch:${mint}`, type: "launch", mint, symbol: t.symbol, ts: t.createdAt });
  if (isMigrated && !prev?.isMigrated) await store.addActivity({ id: `graduate:${mint}`, type: "graduate", mint, symbol: t.symbol, ts: prev ? Date.now() : t.createdAt, amount: quoteReserveSol });
  const agg = await store.tradeAgg(mint, Date.now() - 86400_000);
  t.trades = agg.n; t.volumeSol = agg.vol; t.volume24hSol = agg.vol24; t.feesSol = agg.fees;
  // creator share of the non-protocol (80%) part of curve fees
  t.creatorFeesSol = t.feesSol * 0.8 * (creatorPct / 100);
  await store.upsertToken(t);
  if (isMigrated && !prev?.isMigrated) await scoresStore.markMigrated(mint, prev ? Date.now() : t.createdAt);
  return { view, due, deferred };
}

/** One indexer pass. With a scheduler (startIndexer) only due pools fetch signatures / txs; without one (POST /reindex) every pool does. */
export async function indexOnce(log: (m: string) => void = console.log, sched?: PollScheduler) {
  const client = getClient();
  const ctx: PassCtx = {
    sched, now: Date.now(), log,
    limit: tradesPerPool(), // max txs handled per pool per poll; the rest is backlog for the next tick
    budget: { left: sched ? tickTxBudget() : Number.POSITIVE_INFINITY }, // max txs per tick across pools (POST /reindex: no cap); new tokens are never held back by it
  };
  const views = new Map<string, PoolView>();
  let polled = 0, deferred = 0;
  // 1) scan every config first, so a freshly launched pool is handled at the top of the tick (not after other pools' trades)
  const items: Item[] = [];
  for (const cfg of tierConfigs()) {
    const pools = await withRetry(() => client.state.getPoolsByConfig(cfg.address)).catch((e) => { log(`config ${cfg.key}: ${e.message}`); return []; });
    if (!pools.length) continue;
    const config = await poolConfig(cfg.address);
    const creatorPct = config ? Number(config.creatorTradingFeePercentage) : TIERS[cfg.tier].creatorTradingFeePercentage;
    for (const { publicKey, account } of pools) items.push({ cfg, config, creatorPct, publicKey, account });
  }
  const ordered = sched ? prioritize(items, (it) => sched.rank(it.publicKey.toBase58())) : items;
  // 2) per pool: token row + (when due) its new signatures
  for (const it of ordered) {
    const key = it.publicKey.toBase58();
    if (poolBusy.has(key)) continue; // the /mint/confirm fast path is indexing it right now; next tick sees it (hot)
    const run = indexPool(it, ctx);
    poolBusy.set(key, run); // check + set without an await in between: one writer per pool
    let r: Awaited<typeof run>;
    try { r = await run; } finally { poolBusy.delete(key); }
    views.set(it.publicKey.toBase58(), r.view);
    if (r.due) polled++;
    if (r.deferred) deferred++;
  }
  await store.trimActivity();
  await detectOfficialLaunch(log).catch((e) => log(`official token: ${(e as Error).message}`));
  return { pools: views.size, polled, deferred, classes: sched?.stats(views, Date.now()) };
}

const NATIVE_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const sleepMs = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * /mint/confirm fast path: index one freshly launched token right away instead of waiting for the next tick (<= INDEX_INTERVAL_MS).
 * Nothing from the client is trusted except the mint and launch signature, and both are verified on-chain:
 *  1. the launch tx (at `confirmed`) must have succeeded and hold a DBC init event for this mint (decodeDbcEvents),
 *  2. from one of our configs (tierConfigs) and for the pool PDA of (that config, this mint, WSOL),
 *  3. targeted getPool of that pool (no config-wide scan), then the tick's own indexPool (metadata from chain, trades, Open Book).
 * Without a signature (vanity reservation only) the mint's oldest recent signature is its creation tx. Gating / caps: fastIndex.ts.
 * With `found` (GET /tokens/:mint/pending: our pool PDA exists on-chain, owned by the DBC program) step 1 is skipped (no tx lookup);
 * steps 2 and 3 still run, so the config must be ours, the pool must be its PDA and getPool must hold this base mint.
 */
export async function indexNewMint(mint: string, signature: string | undefined, log: (m: string) => void = console.log, found?: FoundPool): Promise<FastResult> {
  const configs = tierConfigs();
  const init = found ?? await launchInit(mint, signature, configs);
  if ("status" in init) return init;
  const cfg = configs.find((c) => c.address === init.config);
  if (!cfg) return { status: "rejected", detail: "config is not one of ours" };
  return indexPoolOf(mint, init, cfg, log);
}

/** Steps 1-2 without `found`: the launch tx (given, or the mint's oldest recent signature) and its DBC init event from one of our configs. */
async function launchInit(mint: string, signature: string | undefined, configs: ReturnType<typeof tierConfigs>): Promise<FoundPool | FastResult> {
  const conn = getConnection();
  let sig = signature;
  if (!sig) {
    const sigs = await withRetry(() => conn.getSignaturesForAddress(new PublicKey(mint), { limit: 20 }, "confirmed"));
    sig = sigs.at(-1)?.signature; // newest first: the last one is the mint's creation (launch) tx while it has < 20 signatures
    if (!sig) return { status: "not_found", detail: "no signature for this mint yet" };
  }
  let tx: Awaited<ReturnType<typeof conn.getTransaction>> = null;
  for (let i = 0; i < 3 && !tx; i++) { // the web confirms at `confirmed`; an RPC node may lag a moment behind
    tx = await conn.getTransaction(sig, { commitment: "confirmed", maxSupportedTransactionVersion: 0 }).catch(() => null);
    if (!tx && i < 2) await sleepMs(400);
  }
  if (!tx) return { status: "not_found", detail: "launch tx not visible yet" };
  if (tx.meta?.err) return { status: "rejected", detail: "launch tx failed" };
  return initForMint(decodeDbcEvents(toRaw(tx)), mint, configs) ?? { status: "rejected", detail: "no DBC init for this mint from our configs" };
}

async function indexPoolOf(mint: string, init: FoundPool, cfg: ReturnType<typeof tierConfigs>[number], log: (m: string) => void): Promise<FastResult> {
  if (deriveDbcPoolAddress(NATIVE_MINT, new PublicKey(mint), new PublicKey(cfg.address)).toBase58() !== init.pool) return { status: "rejected", detail: "pool is not the config/mint PDA" };
  const account = await withRetry(() => getClient().state.getPool(init.pool));
  if (!account || account.poolState.baseMint.toBase58() !== mint) return { status: "not_found", detail: "pool account not found" };
  const config = await poolConfig(cfg.address);
  const creatorPct = config ? Number(config.creatorTradingFeePercentage) : TIERS[cfg.tier].creatorTradingFeePercentage;
  const pool = init.pool;
  while (poolBusy.has(pool)) await poolBusy.get(pool)!.catch(() => undefined); // a tick is on this pool: wait, then re-check the db
  const run = (async (): Promise<FastResult> => {
    if (await store.getToken(mint).then((x) => x?.mint === mint)) return { status: "exists" }; // the tick got there first
    await indexPool({ cfg, config, creatorPct, publicKey: new PublicKey(pool), account: account as PoolAccount },
      { sched: activeSched, now: Date.now(), limit: tradesPerPool(), budget: { left: Number.POSITIVE_INFINITY }, log });
    return { status: "indexed" };
  })();
  poolBusy.set(pool, run); // set right after the wait (no await in between), so the tick skips this pool meanwhile
  try { return await run; }
  finally {
    poolBusy.delete(pool);
    activeSched?.markHot(pool, Date.now()); // the next tick polls it again (early buys) and it stays hot for INDEXER_ACTIVE_WINDOW_MIN
  }
}

/** Process-wide gate for indexNewMint (per-mint once, shared promise, global caps); used by POST /mint/confirm and GET /tokens/:mint/pending. */
export const fastIndexer = new FastIndexer(fastIndexConfig(), {
  tokenExists: async (mint) => (await store.getToken(mint))?.mint === mint,
  run: (mint, signature, found) => indexNewMint(mint, signature, console.log, found),
});

/** Official $HIGHER: record the FIRST launch by OFFICIAL_TOKEN_CREATOR with symbol OFFICIAL_TOKEN_SYMBOL (once; see services/officialToken.ts). */
export async function detectOfficialLaunch(log: (m: string) => void = console.log) {
  const cfg = officialConfig();
  if (cfg.creator) {
    const row = await detectOfficial(await store.tokensByCreator(cfg.creator), cfg, pgOfficialRepo);
    if (row) log(`official token detected: $${row.symbol} ${row.mint} (creator ${row.creator})`);
  }
  await refreshOfficial();
}

export function startIndexer(log: (m: string) => void = console.log) {
  const cfg = pollConfig();
  const sched = new PollScheduler(cfg);
  activeSched = sched;
  log(cfg.adaptive
    ? `indexer: adaptive polling (hot every ${cfg.baseMs / 1000}s for ${cfg.activeWindowMs / 60_000} min after activity / ${cfg.newPoolHotMs / 60_000} min after launch, idle backoff to ${cfg.idleMaxMs / 1000}s, migrated ${cfg.migratedMs > 0 ? `every ${cfg.migratedMs / 1000}s` : "never"})`
    : `indexer: INDEXER_ADAPTIVE=0, every pool every ${cfg.baseMs / 1000}s`);
  let running = false;
  const tick = async () => {
    if (running) return; running = true;
    try {
      const r = await indexOnce(log, sched);
      const c = r.classes;
      log(`indexed ${await store.tokenCount()} tokens (polled ${r.polled}/${r.pools} pools${r.deferred ? `, ${r.deferred} deferred (INDEXER_TICK_MAX_TXS)` : ""}${c ? `; new ${c.new}, active ${c.active}, idle ${c.idle}, migrated ${c.migrated}` : ""})`);
    } catch (e) { log(`indexer: ${(e as Error).message}`); }
    finally { running = false; }
  };
  void tick();
  return setInterval(tick, cfg.baseMs);
}