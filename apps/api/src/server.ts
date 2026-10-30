import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import BN from "bn.js";
import { Keypair, PublicKey, type Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { deriveDbcPoolAddress, SwapMode } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { buildClaimTx, buildLockTx, configPubkey, fetchEscrow, fetchEscrows, fetchLocks, lockTip, getClient, getConnection, JUP_LOCK_PROGRAM_ID, quote, usableReferralAta, type LockInfo } from "@hb/onchain";
import { store, type Token } from "./store.js";
import { indexOnce, startIndexer } from "./indexer/poller.js";
import { splitEpoch } from "./services/split.js";
import { registerPages } from "./routes/pages.js";
import { registerRewards } from "./routes/rewards.js";
import { registerBar } from "./routes/bar.js";
import { launchGate } from "./services/bar.js";
import { registerReferralMilestone } from "./routes/referralMilestone.js";
import { rewardsStore } from "./services/rewardsStore.js";
import { initAuth, registerAuth } from "./auth.js";
import { migrate } from "./db/migrate.js";
import { requireDb } from "./db/pool.js";
import { buildLaunchTx, quoteDevBuy, DEV_BUY_MAX_SOL, type LaunchReq } from "./launchTx.js";
import { registerClaim } from "./routes/claim.js";
import { registerScores } from "./routes/scores.js";
import { scoresStore } from "./services/scoresStore.js";
import { runScores } from "./services/scoreJob.js";
import { registerCandles } from "./candles/index.js";
import { imageUrl, initMedia, registerMedia } from "./media.js";

const SOL_USD = Number(process.env.SOL_USD ?? 150);
const DRY_RUN = process.env.DRY_RUN !== "false";
requireDb();
await migrate(() => {});
await initAuth();
await initMedia();
const app = Fastify({ logger: { level: "info" } });
await app.register(cors, { origin: (process.env.CORS_ORIGIN ?? "http://localhost:3000").split(",") });

/** Dev-lock status from our own lock records in Postgres (no RPC): active = not cancelled and tokens still locked. */
async function devLock(mint: string) {
  const u = (await store.devLocks([mint])).get(mint);
  return u !== undefined ? { devLocked: true, unlockAt: u } : { devLocked: false, unlockAt: null as number | null };
}
async function views(ts: Token[]) {
  const dl = await store.devLocks(ts.map((t) => t.mint));
  const sc = await scoresStore.scores(ts.map((t) => t.mint));
  return ts.map((t) => { const u = dl.get(t.mint); return { ...t, mcapUsd: t.mcapSol * SOL_USD, image: imageUrl(t.mint, t.uri), devLocked: u !== undefined, unlockAt: u ?? null,
    score: sc.get(t.mint)?.score ?? null, scoreLabel: sc.get(t.mint)?.breakdown.label ?? null }; });
}
async function recordLocks(infos: LockInfo[]) {
  await store.recordLocks(infos.map((l) => ({ escrow: l.escrow, mint: l.mint, creator: l.creator, cliffTime: l.cliffTime, endTime: l.endTime, total: String(l.total), locked: String(l.locked), cancelled: !!l.cancelled, seenAt: Date.now() })));
}

registerAuth(app);
registerPages(app);
registerRewards(app);
registerBar(app);
registerReferralMilestone(app);
registerClaim(app);
registerCandles(app);
registerMedia(app);
registerScores(app);
app.get("/health", async () => ({ ok: true, tokens: await store.tokenCount(), dryRun: DRY_RUN, time: Date.now() }));

app.get("/tokens", async (req) => {
  const q = req.query as Record<string, string | undefined>;
  const limit = Math.max(0, Math.min(200, Number(q.limit ?? 50) || 0)), offset = Math.max(0, Number(q.offset ?? 0) || 0);
  const r = await store.listTokens({ tier: q.tier, status: q.status, q: q.q, sort: q.sort, order: q.order, limit, offset });
  return { total: r.total, items: await views(r.items) };
});

app.get("/tokens/:mint", async (req, reply) => {
  const { mint } = req.params as { mint: string };
  const t = await store.getToken(mint);
  return t ? (await views([t]))[0] : reply.code(404).send({ error: "not found" });
});

app.get("/tokens/:mint/trades", async (req) => {
  const { mint } = req.params as { mint: string };
  const limit = Math.min(500, Number((req.query as any).limit ?? 100));
  return store.tradesFor(mint, limit);
});

app.get("/activity", async (req) => {
  const q = req.query as Record<string, string | undefined>;
  const since = Number(q.since ?? 0), limit = Math.min(500, Number(q.limit ?? 200));
  return store.listActivity(since, limit);
});

app.get("/stats", async () => {
  const toks = await store.tokens(), trades = await store.allTrades(), now = Date.now(), day = 86400_000;
  const graduated = toks.filter((t) => t.isMigrated).length;
  const perDay = (n: number) => Array.from({ length: n }, (_, i) => {
    const d = new Date(now - (n - 1 - i) * day); d.setHours(0, 0, 0, 0);
    const s = d.getTime(), e = s + day;
    const inDay = toks.filter((t) => t.createdAt >= s && t.createdAt < e);
    return { date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, day: d.toLocaleDateString("en-US", { weekday: "short" }), tokens: inDay.length, graduated: inDay.filter((t) => t.isMigrated).length };
  });
  const vol = (from: number, to: number) => trades.filter((t) => t.ts >= from && t.ts < to).reduce((a, t) => a + t.sol, 0);
  const v7 = vol(now - 7 * day, now), vPrev = vol(now - 14 * day, now - 7 * day);
  const fees = toks.reduce((a, t) => a + t.feesSol, 0);
  const creatorFees = toks.reduce((a, t) => a + t.creatorFeesSol, 0);
  const platformLamports = BigInt(Math.floor(Math.max(0, fees * 0.8 - creatorFees) * 1e9));
  const split = splitEpoch(platformLamports, 0n);
  return {
    totalTokens: toks.length, graduated, graduatedPct: toks.length ? graduated / toks.length : 0,
    launches7d: perDay(7), launches30d: perDay(30),
    totalVolumeSol: trades.reduce((a, t) => a + t.sol, 0), volume7dSol: v7,
    volumeDelta: vPrev ? +(((v7 - vPrev) / vPrev) * 100).toFixed(1) : 0,
    creatorFeesSol: creatorFees, creatorDelta: 0,
    platformFeesSol: Number(platformLamports) / 1e9,
    platformSplitSol: { buyback: Number(split.buyback) / 1e9, ops: Number(split.ops) / 1e9, treasury: Number(split.treasury) / 1e9 },
    barBurned: (await rewardsStore.buybackTotals(process.env.BAR_MINT || null)).barBurned, burnDelta: 0,
    activeTraders24h: new Set(trades.filter((t) => t.ts >= now - day).map((t) => t.wallet)).size,
    updatedAt: now,
  };
});

// ---- unsigned tx builders (wallet signs client-side) ----
const ser = (tx: Transaction) => tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
async function finalize(tx: Transaction, payer: PublicKey) {
  tx.feePayer = payer;
  tx.recentBlockhash = (await getConnection().getLatestBlockhash("confirmed")).blockhash;
  return tx;
}

app.post("/tx/swap", async (req, reply) => {
  const b = req.body as { owner: string; pool: string; side: "buy" | "sell"; amount: string | number; slippageBps?: number };
  try {
    const pool = new PublicKey(b.pool), owner = new PublicKey(b.owner), sell = b.side === "sell";
    const amt = Number(b.amount);
    if (!Number.isFinite(amt) || amt <= 0) return reply.code(400).send({ error: "amount must be a positive number" });
    if (b.side !== "buy" && b.side !== "sell") return reply.code(400).send({ error: "side must be buy|sell" });
    const amountIn = new BN(Math.floor(amt * (sell ? 1e6 : 1e9)).toString());
    const q = await quote({ pool, amountIn, sell, slippageBps: b.slippageBps ?? 100 });
    const minimumAmountOut = q.minimumAmountOut ?? new BN(0);
    const tx = await getClient().pool.swap2({ owner, pool, swapBaseForQuote: sell, referralTokenAccount: await usableReferralAta(), swapMode: SwapMode.ExactIn, amountIn, minimumAmountOut });
    return { tx: ser(await finalize(tx, owner)), minimumAmountOut: minimumAmountOut.toString() };
  } catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
});

app.post("/tx/launch", async (req, reply) => {
  const b = (req.body ?? {}) as LaunchReq;
  const gate = await launchGate(String(b.tier), String(b.creator)); // $BAR holders only for Max tier (step 8)
  if (gate) return reply.code(403).send({ error: gate });
  try { return await buildLaunchTx(b); }
  catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
});

app.get("/tx/launch/quote", async (req, reply) => {
  const q = req.query as { tier?: string; antiSniper?: string; devBuySol?: string; slippageBps?: string };
  try {
    const sol = Number(q.devBuySol ?? 0);
    if (!Number.isFinite(sol) || sol < 0) return reply.code(400).send({ error: "devBuySol must be >= 0" });
    const r = await quoteDevBuy(String(q.tier), q.antiSniper === "true" || q.antiSniper === "1", sol, Number(q.slippageBps ?? 100));
    return { devBuySol: sol, estTokens: r.outTokens, minTokens: Number(r.minOut.toString()) / 1e6, supplyPct: r.supplyPct, feeSol: r.feeSol, feePct: r.feePct,
      minFeeApplied: r.minFeeEligible, thresholdSol: r.thresholdSol, maxDevBuySol: Math.min(r.thresholdSol, DEV_BUY_MAX_SOL) };
  } catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
});

// ---- Jupiter Lock: optional permanent lock of the creator's tokens ----
const BASE_DECIMALS = 1e6;
const lockCache = new Map<string, { at: number; v: LockInfo[] }>();
async function locksFor(mint: string, fresh = false) {
  const c = lockCache.get(mint);
  if (!fresh && c && Date.now() - c.at < 20_000) return c.v;
  const t = await store.getToken(mint);
  const known = (await store.escrowsFor(mint)).map((e) => new PublicKey(e));
  let v: LockInfo[];
  try {
    v = await fetchLocks(new PublicKey(mint), t ? new PublicKey(t.creator) : undefined);
  } catch (e) {
    if (!known.length && c) return c.v; // RPC rate-limited: serve stale
    v = await fetchEscrows(known); // fall back to escrows we built for this mint
  }
  await recordLocks(v);
  lockCache.set(mint, { at: Date.now(), v });
  return v;
}
app.get("/tokens/:mint/locks", async (req, reply) => {
  const { mint } = req.params as { mint: string };
  const { fresh } = req.query as { fresh?: string };
  try {
    const locks = await locksFor(new PublicKey(mint).toBase58(), fresh === "1");
    const sum = (k: "total" | "locked" | "claimable") => locks.reduce((a, l) => a + Number(l[k]), 0) / BASE_DECIMALS;
    return { programId: JUP_LOCK_PROGRAM_ID.toBase58(), tipSol: lockTip().tipSol, locks, totalTokens: sum("total"), lockedTokens: sum("locked"), claimableTokens: sum("claimable") };
  } catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
});
app.post("/tx/lock", async (req, reply) => {
  const b = req.body as { creator?: string; mint?: string; amount?: number; unlockAt?: number; vestingDays?: number };
  try {
    const creator = new PublicKey(String(b.creator)), mint = new PublicKey(String(b.mint));
    const t = await store.getToken(mint.toBase58());
    if (!t || t.mint !== mint.toBase58()) return reply.code(404).send({ error: "token not found" });
    if (t.creator !== creator.toBase58()) return reply.code(403).send({ error: "only the token creator can lock dev tokens here" });
    const amount = Number(b.amount), unlockAt = Math.floor(Number(b.unlockAt)), vestingDays = Number(b.vestingDays ?? 0);
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(amount) || amount <= 0) return reply.code(400).send({ error: "amount must be a positive number" });
    if (!Number.isFinite(unlockAt) || unlockAt < now + 60 || unlockAt > now + 10 * 365 * 86_400) return reply.code(400).send({ error: "unlock date must be between 1 minute and 10 years from now" });
    if (!Number.isInteger(vestingDays) || vestingDays < 0 || vestingDays > 3650) return reply.code(400).send({ error: "vestingDays must be an integer between 0 and 3650" });
    const raw = new BN(Math.floor(amount * BASE_DECIMALS).toString());
    const ata = getAssociatedTokenAddressSync(mint, creator);
    const bal = await getConnection().getTokenAccountBalance(ata).then((r) => new BN(r.value.amount)).catch(() => new BN(0));
    if (raw.gt(bal)) return reply.code(400).send({ error: `amount exceeds wallet balance (${Number(bal.toString()) / BASE_DECIMALS})` });
    const r = await buildLockTx({ creator, mint, amount: raw, unlockAt, vestingSeconds: vestingDays * 86_400 });
    lockCache.delete(mint.toBase58());
    await store.addEscrow(mint.toBase58(), r.escrow.toBase58());
    return { tx: ser(r.tx), escrow: r.escrow.toBase58(), tipSol: r.tip.tipSol, tipWallet: r.tip.tipWallet.toBase58(), schedule: { ...r.schedule, cliffUnlockAmount: r.schedule.cliffUnlockAmount.toString(), amountPerPeriod: r.schedule.amountPerPeriod.toString() }, permanent: true };
  } catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
});
const TOTAL_SUPPLY = 1_000_000_000;
const lockView = (l: LockInfo, toks: Map<string, Token>) => {
  const t = toks.get(l.mint);
  const total = Number(l.total) / BASE_DECIMALS;
  const vestEnd = l.endTime, now = Date.now() / 1000;
  return {
    ...l, id: l.escrow, totalTokens: total, lockedTokens: Number(l.locked) / BASE_DECIMALS, claimableTokens: Number(l.claimable) / BASE_DECIMALS,
    supplyPct: (total / TOTAL_SUPPLY) * 100, unlockedPct: total ? (Number(l.unlocked) / Number(l.total)) * 100 : 0,
    status: l.cancelled ? "cancelled" : now < l.cliffTime ? "locked" : now < vestEnd ? "vesting" : "unlocked",
    lockedAt: lockedAt[l.escrow] ?? null,
    token: t ? { name: t.name, symbol: t.symbol, tier: t.tier, creator: t.creator, image: imageUrl(t.mint, t.uri) } : null,
  };
};
let lockedAt: Record<string, number> = {};
let lockedAtLoaded = false;
async function loadLockedAt() { if (!lockedAtLoaded) { lockedAt = { ...(await store.lockedAt()), ...lockedAt }; lockedAtLoaded = true; } }
async function noteLockedAt(escrow: string) {
  if (escrow in lockedAt) return;
  const sigs = await getConnection().getSignaturesForAddress(new PublicKey(escrow), { limit: 20 }).catch(() => []);
  const first = sigs[sigs.length - 1]; if (first?.blockTime) { lockedAt[escrow] = first.blockTime; await store.setLockedAt(escrow, first.blockTime); }
}
const tokenMap = async () => new Map((await store.tokens()).map((t) => [t.mint, t]));
let allLocksCache: { at: number; v: ReturnType<typeof lockView>[] } | null = null;
async function allLocks() {
  if (allLocksCache && Date.now() - allLocksCache.at < 20_000) return allLocksCache.v;
  const known = await store.allEscrows();
  const infos = await fetchEscrows(known.map((e) => new PublicKey(e)));
  await recordLocks(infos);
  // creation time = block time of the escrow's oldest signature (stored in lock_escrows.locked_at)
  await loadLockedAt();
  for (const l of infos) await noteLockedAt(l.escrow);
  const toks = await tokenMap();
  const v = infos.map((l) => lockView(l, toks)).sort((a, b) => (b.lockedAt ?? 0) - (a.lockedAt ?? 0));
  allLocksCache = { at: Date.now(), v };
  return v;
}
app.get("/locks", async (req, reply) => {
  const q = req.query as { page?: string; limit?: string };
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 15)), page = Math.max(1, Number(q.page) || 1);
  try {
    const all = await allLocks();
    return { total: all.length, page, limit, tipSol: lockTip().tipSol, items: all.slice((page - 1) * limit, page * limit) };
  } catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
});
app.get("/locks/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  try {
    const l = await fetchEscrow(new PublicKey(id));
    if (!l) return reply.code(404).send({ error: "lock not found" });
    await recordLocks([l]);
    await loadLockedAt(); await noteLockedAt(l.escrow);
    return lockView(l, await tokenMap());
  } catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
});
/** Called by the web app after a lock tx confirms: reads the escrow on-chain once and records it. */
app.post("/tx/lock/confirm", async (req, reply) => {
  const b = req.body as { escrow?: string };
  try {
    const l = await fetchEscrow(new PublicKey(String(b.escrow)));
    if (!l) return reply.code(404).send({ error: "escrow not found on-chain yet" });
    await recordLocks([l]); lockCache.delete(l.mint); allLocksCache = null;
    return { ok: true, ...(await devLock(l.mint)) };
  } catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
});
// Locks indexer: refresh every known escrow (one batched getMultipleAccounts) so devLocked/unlockAt stay current.
async function indexLocks() {
  const known = await store.allEscrows();
  if (known.length) await recordLocks(await fetchEscrows(known.map((e) => new PublicKey(e))));
}
setTimeout(() => indexLocks().catch(() => {}), 5_000);
setInterval(() => indexLocks().catch(() => {}), Number(process.env.LOCKS_INDEX_MS ?? 120_000)).unref();
app.post("/tx/lock/claim", async (req, reply) => {
  const b = req.body as { recipient?: string; escrow?: string };
  try {
    const r = await buildClaimTx({ recipient: new PublicKey(String(b.recipient)), escrow: new PublicKey(String(b.escrow)) });
    return { tx: ser(r.tx) };
  } catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
});

// Higher Bar scores / holders / hourly snapshots (off-chain; read-only RPC for graduated tokens' DAMM v2 price).
// Standalone: pnpm --filter @hb/api jobs:scores -- --loop 600. SCORES_INTERVAL_MS=0 disables it here.
const SCORES_MS = Number(process.env.SCORES_INTERVAL_MS ?? 600_000);
if (SCORES_MS > 0) {
  let busy = false;
  const run = async () => { if (busy) return; busy = true; try { await runScores((m) => app.log.info(m)); } catch (e) { app.log.warn(`scores: ${(e as Error).message}`); } finally { busy = false; } };
  setTimeout(run, 15_000).unref(); setInterval(run, SCORES_MS).unref();
}

app.post("/reindex", async () => { await indexOnce((m) => app.log.info(m)); return { ok: true, tokens: await store.tokenCount() }; });

// Fee claimer / cashback / buyback & burn run as separate jobs (src/jobs/run.ts: pnpm --filter @hb/api jobs:epoch -- --loop 3600), not in the API process.

await app.listen({ port: Number(process.env.PORT ?? 4000), host: "0.0.0.0" });
if (process.env.NO_INDEXER !== "1") startIndexer((m) => app.log.info(m));