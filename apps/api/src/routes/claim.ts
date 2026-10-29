import type { FastifyInstance } from "fastify";
import BN from "bn.js";
import { PublicKey, type Transaction } from "@solana/web3.js";
import { getClient, getConnection } from "@hb/onchain";
import { store } from "../store.js";

const U64_MAX = new BN("18446744073709551615");
const LAMPORTS = 1e9, BASE_DEC = 1e6;
/** DBC migrationFeeWithdrawStatus bit for the creator (partner = 0b001? creator = 0b010). Best effort; the program rejects double-withdraws anyway. */
const CREATOR_WITHDRAWN_MASK = 0b010;
const num = (b: BN, d: number) => Number(b.toString()) / d;

const ser = (tx: Transaction) => tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");

/** Verified against @meteora-ag/dynamic-bonding-curve-sdk@2.0.0 types:
 *  creator.claimCreatorTradingFee({ creator, payer, pool, maxBaseAmount, maxQuoteAmount, receiver? }) — unwraps WSOL to SOL itself
 *  creator.creatorWithdrawMigrationFee({ pool, sender }) — unwraps WSOL to SOL itself
 *  state.getPool(pool).poolState ->creatorBaseFee / creatorQuoteFee / isMigrated / migrationFeeWithdrawStatus
 *  state.getPoolConfig(config) -> migrationQuoteThreshold / migrationFeePercentage / creatorMigrationFeePercentage */
export function registerClaim(app: FastifyInstance) {
  app.get("/claim/:creator", async (req, reply) => {
    const { creator } = req.params as { creator: string };
    try { new PublicKey(creator); } catch { return reply.code(400).send({ error: "invalid creator address" }); }
    const client = getClient();
    const mine = store.tokens().filter((t) => t.creator === creator);
    const cfgCache = new Map<string, any>();
    const rows = await Promise.all(mine.map(async (t) => {
      const base = { mint: t.mint, pool: t.pool, name: t.name, symbol: t.symbol, tier: t.tier, image: (t as any).image ?? null };
      try {
        const raw: any = await client.state.getPool(t.pool);
        if (!raw) throw new Error("pool not found on-chain");
        const p: any = raw.poolState ?? raw; // SDK 2.0 wraps the account as { poolState, ... }
        let cfg = cfgCache.get(p.config.toBase58());
        if (!cfg) { cfg = await client.state.getPoolConfig(p.config); cfgCache.set(p.config.toBase58(), cfg); }
        const migrated = Number(p.isMigrated) === 1;
        const migPct = Number(cfg.migrationFeePercentage), creatorPct = Number(cfg.creatorMigrationFeePercentage);
        const migFeeTotal = num(cfg.migrationQuoteThreshold, LAMPORTS) * migPct / 100;
        const creatorMig = migFeeTotal * creatorPct / 100;
        const migWithdrawn = (Number(p.migrationFeeWithdrawStatus) & CREATOR_WITHDRAWN_MASK) !== 0;
        return {
          ...base, migrated,
          tradingFeeSol: num(p.creatorQuoteFee, LAMPORTS),
          tradingFeeToken: num(p.creatorBaseFee, BASE_DEC),
          migrationFeeSharePct: creatorPct,
          migrationFeeSol: migrated && !migWithdrawn ? creatorMig : 0,
          migrationFeeEstimateSol: creatorMig,
          migrationFeeWithdrawn: migWithdrawn,
          lpFees: migrated ? "coming_soon" : null,
          error: null as string | null,
        };
      } catch (e) {
        return { ...base, migrated: t.isMigrated, tradingFeeSol: 0, tradingFeeToken: 0, migrationFeeSharePct: 0, migrationFeeSol: 0,
          migrationFeeEstimateSol: 0, migrationFeeWithdrawn: false, lpFees: null, error: (e as Error).message };
      }
    }));
    return {
      creator, tokens: rows,
      totalSol: rows.reduce((s, r) => s + r.tradingFeeSol + r.migrationFeeSol, 0),
      totalTradingSol: rows.reduce((s, r) => s + r.tradingFeeSol, 0),
      totalMigrationSol: rows.reduce((s, r) => s + r.migrationFeeSol, 0),
      updatedAt: Date.now(),
    };
  });

  app.post("/claim/build", async (req, reply) => {
    const b = (req.body ?? {}) as { creator?: string; pool?: string; kind?: string };
    try {
      if (b.kind !== "trading" && b.kind !== "migration") return reply.code(400).send({ error: "kind must be trading|migration" });
      const creator = new PublicKey(String(b.creator)), pool = new PublicKey(String(b.pool));
      const t = store.tokens().find((x) => x.pool === pool.toBase58());
      if (t && t.creator !== creator.toBase58()) return reply.code(403).send({ error: "wallet is not the creator of this pool" });
      const client = getClient();
      const tx = b.kind === "trading"
        ? await client.creator.claimCreatorTradingFee({ creator, payer: creator, pool, maxBaseAmount: U64_MAX, maxQuoteAmount: U64_MAX })
        : await client.creator.creatorWithdrawMigrationFee({ pool, sender: creator });
      tx.feePayer = creator;
      tx.recentBlockhash = (await getConnection().getLatestBlockhash("confirmed")).blockhash;
      return { tx: ser(tx), kind: b.kind, pool: pool.toBase58() };
    } catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
  });
}