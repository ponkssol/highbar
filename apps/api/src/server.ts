import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import BN from "bn.js";
import { Keypair, PublicKey, type Transaction } from "@solana/web3.js";
import { deriveDbcPoolAddress, SwapMode } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { configPubkey, getClient, getConnection, quote, referralAta } from "@hb/onchain";
import { store, type Token } from "./store.js";
import { indexOnce, startIndexer } from "./indexer/poller.js";
import { splitEpoch } from "./services/split.js";
import { registerPages } from "./routes/pages.js";
import { registerAuth } from "./auth.js";

const SOL_USD = Number(process.env.SOL_USD ?? 150);
const DRY_RUN = process.env.DRY_RUN !== "false";
const app = Fastify({ logger: { level: "info" } });
await app.register(cors, { origin: (process.env.CORS_ORIGIN ?? "http://localhost:3000").split(",") });

const view = (t: Token) => ({ ...t, mcapUsd: t.mcapSol * SOL_USD });

registerAuth(app);
registerPages(app);
app.get("/health", async () => ({ ok: true, tokens: store.tokens().length, dryRun: DRY_RUN, time: Date.now() }));

app.get("/tokens", async (req) => {
  const q = req.query as Record<string, string | undefined>;
  let rows = store.tokens();
  if (q.tier) rows = rows.filter((t) => t.tier === q.tier);
  if (q.status === "graduated") rows = rows.filter((t) => t.isMigrated);
  if (q.status === "bonding") rows = rows.filter((t) => !t.isMigrated);
  if (q.q) { const s = q.q.toLowerCase(); rows = rows.filter((t) => [t.name, t.symbol, t.mint].some((x) => x.toLowerCase().includes(s))); }
  const key = (q.sort ?? "createdAt") as keyof Token;
  const dir = q.order === "asc" ? 1 : -1;
  rows.sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * dir);
  const limit = Math.min(200, Number(q.limit ?? 50)), offset = Number(q.offset ?? 0);
  return { total: rows.length, items: rows.slice(offset, offset + limit).map(view) };
});

app.get("/tokens/:mint", async (req, reply) => {
  const { mint } = req.params as { mint: string };
  const t = store.db.tokens[mint] ?? store.tokens().find((x) => x.pool === mint);
  return t ? view(t) : reply.code(404).send({ error: "not found" });
});

app.get("/tokens/:mint/trades", async (req) => {
  const { mint } = req.params as { mint: string };
  const limit = Math.min(500, Number((req.query as any).limit ?? 100));
  return store.tradesFor(mint).slice(0, limit);
});

app.get("/activity", async (req) => {
  const q = req.query as Record<string, string | undefined>;
  const since = Number(q.since ?? 0), limit = Math.min(500, Number(q.limit ?? 200));
  const sym = (m: string) => store.db.tokens[m]?.symbol ?? "";
  return [...store.db.activity, ...store.db.burns]
    .filter((a) => a.ts > since)
    .map((a) => ({ ...a, symbol: a.symbol || sym(a.mint) }))
    .sort((a, b) => b.ts - a.ts)
    .slice(0, limit);
});

app.get("/stats", async () => {
  const toks = store.tokens(), trades = store.allTrades(), now = Date.now(), day = 86400_000;
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
    barBurned: 0, burnDelta: 0, // $BAR not live yet
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
    const amountIn = new BN(Math.floor(Number(b.amount) * (sell ? 1e6 : 1e9)).toString());
    const q = await quote({ pool, amountIn, sell, slippageBps: b.slippageBps ?? 100 });
    const minimumAmountOut = q.minimumAmountOut ?? new BN(0);
    const tx = await getClient().pool.swap2({ owner, pool, swapBaseForQuote: sell, referralTokenAccount: referralAta(), swapMode: SwapMode.ExactIn, amountIn, minimumAmountOut });
    return { tx: ser(await finalize(tx, owner)), minimumAmountOut: minimumAmountOut.toString() };
  } catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
});

app.post("/tx/launch", async (req, reply) => {
  const b = req.body as { creator: string; name: string; symbol: string; uri?: string; tier: string; antiSniper: boolean };
  try {
    const creator = new PublicKey(b.creator), config = configPubkey(b.tier, !!b.antiSniper), baseMint = Keypair.generate();
    const tx = await getClient().creator.createPool({ name: b.name, symbol: b.symbol, uri: b.uri ?? "", payer: creator, poolCreator: creator, config, baseMint: baseMint.publicKey });
    await finalize(tx, creator);
    tx.partialSign(baseMint);
    const pool = deriveDbcPoolAddress(new PublicKey("So11111111111111111111111111111111111111112"), baseMint.publicKey, config);
    return { tx: ser(tx), mint: baseMint.publicKey.toBase58(), pool: pool.toBase58() };
  } catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
});

app.post("/reindex", async () => { await indexOnce((m) => app.log.info(m)); return { ok: true, tokens: store.tokens().length }; });

// Fee claimer / cashback / buyback (from hb-backend backup) need Postgres (DATABASE_URL) + keypair; not started here.
if (process.env.DATABASE_URL) app.log.warn("DATABASE_URL set: run services via src/jobs/run.ts (DRY_RUN=" + DRY_RUN + ")");

await app.listen({ port: Number(process.env.PORT ?? 4000), host: "0.0.0.0" });
if (process.env.NO_INDEXER !== "1") startIndexer((m) => app.log.info(m));