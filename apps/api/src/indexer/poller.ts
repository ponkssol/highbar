import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { getPriceFromSqrtPrice } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { TIERS, networkOf, thresholdSolFor, type TierId } from "@hb/shared";
import { getClient, getConnection, allTierConfigEntries, referralAta, sleep, withRetry } from "@hb/onchain";
import { decodeDbcEvents, type RawTx } from "./decode.js";
import { store, type Token } from "../store.js";
import { recordTrade } from "../candles/index.js";
import { scoresStore } from "../services/scoresStore.js";
import { detectOfficial, officialConfig, pgOfficialRepo, refreshOfficial } from "../services/officialToken.js";

/** RPC-polling indexer (state in Postgres). Pool state via getPoolsByConfig; swaps via the backup's decode.ts (EvtSwap3). */
const METAPLEX = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const SUPPLY = 1_000_000_000;
const L = 1e9;
const REFERRAL = process.env.PLATFORM_REFERRAL_TOKEN_ACCOUNT || referralAta().toBase58();

export function tierConfigs() {
  return allTierConfigEntries()
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

async function indexTrades(t: Token, limit: number) {
  const conn = getConnection();
  const until = await store.lastSig(t.pool);
  const sigs = await withRetry(() => conn.getSignaturesForAddress(new PublicKey(t.pool), { limit, until }));
  if (!sigs.length) return;
  const newest = sigs[0].signature;
  for (const s of sigs.reverse()) {
    if (s.err) continue;
    const tx = await withRetry(() => conn.getTransaction(s.signature, { maxSupportedTransactionVersion: 0 })).catch(() => null);
    await sleep(120); // stay under public RPC limits
    if (!tx) continue;
    const raw: RawTx = {
      slot: tx.slot, blockTime: tx.blockTime ?? null,
      transaction: { signatures: tx.transaction.signatures, message: {
        accountKeys: tx.transaction.message.staticAccountKeys.map((k) => k.toBase58()),
        instructions: tx.transaction.message.compiledInstructions.map((ix) => ({ programIdIndex: ix.programIdIndex, accounts: ix.accountKeyIndexes, data: bs58.encode(ix.data) })) } },
      meta: tx.meta ? { err: tx.meta.err, innerInstructions: tx.meta.innerInstructions as any,
        loadedAddresses: tx.meta.loadedAddresses ? { writable: tx.meta.loadedAddresses.writable.map(String), readonly: tx.meta.loadedAddresses.readonly.map(String) } : null } : null,
    };
    const ts = (tx.blockTime ?? Date.now() / 1000) * 1000;
    let i = 0, initInTx = false, devTagged = false;
    for (const ev of decodeDbcEvents(raw)) {
      if (ev.kind === "init" && ev.pool === t.pool) {
        t.createdAt = ts; initInTx = true;
        if (ev.name && !t.name) Object.assign(t, { name: ev.name, symbol: ev.symbol, uri: ev.uri });
      }
      if (ev.kind !== "swap" || ev.pool !== t.pool) continue;
      const sig = `${s.signature}:${i++}`;
      const devBuy = initInTx && !devTagged && ev.side === "buy"; if (devBuy) devTagged = true;
      const added = await store.addTrade({ sig, pool: t.pool, mint: t.mint, side: ev.side, sol: Number(ev.solLamports) / L, tokens: Number(ev.tokenAmount) / 1e6,
        feeSol: Number(ev.feeLamports) / L, wallet: ev.trader, viaUi: !!REFERRAL && ev.referralTokenAccount === REFERRAL, ts, ...(devBuy ? { devBuy: true } : {}) });
      if (added) await recordTrade({ sig, mint: t.mint, side: ev.side, sol: Number(ev.solLamports) / L, tokens: Number(ev.tokenAmount) / 1e6, ts });
      if (added) await store.addActivity({ id: `trade:${sig}`, type: "trade", mint: t.mint, symbol: t.symbol, ts, amount: Number(ev.solLamports) / L, side: ev.side, wallet: ev.trader, sig: s.signature });
    }
  }
  await store.setLastSig(t.pool, newest);
}

export async function indexOnce(log: (m: string) => void = console.log) {
  const client = getClient();
  const limit = Number(process.env.TRADES_PER_POOL ?? 25);
  for (const cfg of tierConfigs()) {
    const pools = await withRetry(() => client.state.getPoolsByConfig(cfg.address)).catch((e) => { log(`config ${cfg.key}: ${e.message}`); return []; });
    if (!pools.length) continue;
    const config = await withRetry(() => client.state.getPoolConfig(cfg.address));
    const creatorPct = config ? Number(config.creatorTradingFeePercentage) : TIERS[cfg.tier].creatorTradingFeePercentage;
    for (const { publicKey, account } of pools) {
      const ps = account.poolState;
      const mint = ps.baseMint.toBase58();
      const prev = await store.getToken(mint).then((x) => (x?.mint === mint ? x : null));
      const thresholdSol = config ? Number(config.migrationQuoteThreshold.toString()) / L : thresholdSolFor(cfg.tier, networkOf(process.env.NETWORK)); // on-chain value wins; fallback per network
      const quoteReserveSol = Number(ps.quoteReserve.toString()) / L;
      const priceSol = Number(getPriceFromSqrtPrice(ps.sqrtPrice, 6, 9).toString());
      const meta = prev?.name ? prev : await fetchMetadata(mint).catch(() => ({ name: "", symbol: "", uri: "" }));
      const isMigrated = Number(ps.isMigrated) !== 0;
      const t: Token = {
        mint, pool: publicKey.toBase58(), config: cfg.address, tier: cfg.tier, antiSniper: cfg.antiSniper,
        creator: ps.creator.toBase58(), createdAt: prev?.createdAt ?? 0,
        quoteReserveSol, thresholdSol, progress: Math.min(1, quoteReserveSol / thresholdSol),
        isMigrated, priceSol, mcapSol: priceSol * SUPPLY, name: meta.name, symbol: meta.symbol, uri: meta.uri,
        volumeSol: 0, volume24hSol: 0, trades: 0, creatorFeesSol: 0, feesSol: 0, updatedAt: Date.now(),
      };
      await indexTrades(t, limit).catch((e) => log(`trades ${t.pool}: ${e.message}`));
      if (!t.createdAt) t.createdAt = Date.now();
      if (!prev) await store.addActivity({ id: `launch:${mint}`, type: "launch", mint, symbol: t.symbol, ts: t.createdAt });
      if (isMigrated && !prev?.isMigrated) await store.addActivity({ id: `graduate:${mint}`, type: "graduate", mint, symbol: t.symbol, ts: prev ? Date.now() : t.createdAt, amount: quoteReserveSol });
      const agg = await store.tradeAgg(mint, Date.now() - 86400_000);
      t.trades = agg.n; t.volumeSol = agg.vol; t.volume24hSol = agg.vol24; t.feesSol = agg.fees;
      // creator share of the non-protocol (80%) part of curve fees
      t.creatorFeesSol = t.feesSol * 0.8 * (creatorPct / 100);
      await store.upsertToken(t);
      if (isMigrated && !prev?.isMigrated) await scoresStore.markMigrated(mint, prev ? Date.now() : t.createdAt);
    }
  }
  await store.trimActivity();
  await detectOfficialLaunch(log).catch((e) => log(`official token: ${(e as Error).message}`));
}

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
  let running = false;
  const tick = async () => {
    if (running) return; running = true;
    try { await indexOnce(log); log(`indexed ${await store.tokenCount()} tokens`); } catch (e) { log(`indexer: ${(e as Error).message}`); }
    finally { running = false; }
  };
  void tick();
  return setInterval(tick, Number(process.env.INDEX_INTERVAL_MS ?? 30000));
}