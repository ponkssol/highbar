import type { FastifyInstance } from "fastify";
import BN from "bn.js";
import { PublicKey, type Transaction } from "@solana/web3.js";
import { CpAmm } from "@meteora-ag/cp-amm-sdk";
import { allTierConfigEntries, getClient, getConnection } from "@hb/onchain";
import { store } from "../store.js";
import { LP_REBATE_BPS, networkOf, solscanTx } from "@hb/shared";
import { rebateStore } from "../services/lpRebate.js";
import { rewards2 } from "../jobs/rewardsConfig.js";
import { buildLpClaim, canonicalDammPool, creatorPositions, LpClaimError, type LpAmm, type LpConn, type LpPosition } from "../services/creatorLp.js";

const U64_MAX = new BN("18446744073709551615");
const LAMPORTS = 1e9, BASE_DEC = 1e6;
/** DBC migrationFeeWithdrawStatus: bit 1 (0b010) = creator, bit 2 (0b100) = partner (verified in SDK 2.0.0 IDL). */
const CREATOR_WITHDRAWN_MASK = 0b010;
const num = (b: BN, d: number) => Number(b.toString()) / d;

const ser = (tx: Transaction) => tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");

/** Verified against @meteora-ag/dynamic-bonding-curve-sdk@2.0.0 types:
 *  creator.claimCreatorTradingFee({ creator, payer, pool, maxBaseAmount, maxQuoteAmount, receiver? }) — unwraps WSOL to SOL itself
 *  creator.creatorWithdrawMigrationFee({ pool, sender }) — unwraps WSOL to SOL itself
 *  state.getPool(pool).poolState ->creatorBaseFee / creatorQuoteFee / isMigrated / migrationFeeWithdrawStatus
 *  state.getPoolConfig(config) -> migrationQuoteThreshold / migrationFeePercentage / creatorMigrationFeePercentage */
/** Injectable for route tests; production uses the real DBC client, CpAmm, connection, store and platform configs. */
export interface ClaimDeps {
  dbc?: any;
  amm?: LpAmm;
  conn?: LpConn & { getLatestBlockhash(c?: "confirmed"): Promise<{ blockhash: string }> };
  store?: Pick<typeof store, "getToken" | "tokensByCreator">;
  platformConfigs?: () => Set<string>;
  rebates?: Pick<typeof rebateStore, "forCreator">;
}

export function registerClaim(app: FastifyInstance, deps: ClaimDeps = {}) {
  const dbc = () => deps.dbc ?? getClient();
  const conn = () => deps.conn ?? getConnection();
  const amm = (): LpAmm => deps.amm ?? (new CpAmm(getConnection()) as unknown as LpAmm);
  const db = () => deps.store ?? store;
  const platformConfigs = () => deps.platformConfigs?.() ?? new Set(allTierConfigEntries().map(([, a]) => a));

  /** Creator LP rebate history (post-migration share of the platform's claimed LP SOL; paid by the lprebate job, nothing to sign). */
  app.get("/claim/:creator/rebates", async (req, reply) => {
    const { creator } = req.params as { creator: string };
    try { new PublicKey(creator); } catch { return reply.code(400).send({ error: "invalid creator address" }); }
    const r = await (deps.rebates ?? rebateStore).forCreator(creator, 200);
    const net = networkOf(process.env.NETWORK);
    return {
      creator, rebateBps: LP_REBATE_BPS, minPayoutSol: Number(rewards2.lpRebateMinPayout) / 1e9,
      pendingSol: r.pendingSol, paidSol: r.paidSol,
      rows: r.rows.map((x) => ({ ...x, claimUrl: solscanTx(x.claimSig, net), paidUrl: x.paidSig ? solscanTx(x.paidSig, net) : null })),
    };
  });

  app.get("/claim/:creator", async (req, reply) => {
    const { creator } = req.params as { creator: string };
    let owner: PublicKey;
    try { owner = new PublicKey(creator); } catch { return reply.code(400).send({ error: "invalid creator address" }); }
    const client = dbc();
    const mine = await db().tokensByCreator(creator);
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
        // Post-migration LP fees: positions in our canonical DAMM v2 pool whose NFT this wallet holds now. Isolated so an LP read
        // failure does not hide the DBC numbers above.
        let lp: { dammPool: string | null; positions: LpPosition[]; sol: number; token: number; error: string | null } | null = null;
        if (migrated) {
          const dammPool = canonicalDammPool(t.mint, Number(cfg.migrationFeeOption));
          try {
            const positions = dammPool ? await creatorPositions(amm(), owner, t.mint, dammPool) : [];
            lp = { dammPool: dammPool?.toBase58() ?? null, positions, sol: positions.reduce((s, x) => s + x.unclaimedSol, 0),
              token: positions.reduce((s, x) => s + x.unclaimedToken, 0), error: dammPool ? null : "unknown DAMM v2 config" };
          } catch (e) { lp = { dammPool: dammPool?.toBase58() ?? null, positions: [], sol: 0, token: 0, error: (e as Error).message }; }
        }
        return {
          ...base, migrated,
          tradingFeeSol: num(p.creatorQuoteFee, LAMPORTS),
          tradingFeeToken: num(p.creatorBaseFee, BASE_DEC),
          migrationFeeSharePct: creatorPct,
          migrationFeeSol: migrated && !migWithdrawn ? creatorMig : 0,
          migrationFeeEstimateSol: creatorMig,
          migrationFeeWithdrawn: migWithdrawn,
          lp,
          lpFeeSol: lp?.sol ?? 0,
          lpFeeToken: lp?.token ?? 0,
          error: null as string | null,
        };
      } catch (e) {
        return { ...base, migrated: t.isMigrated, tradingFeeSol: 0, tradingFeeToken: 0, migrationFeeSharePct: 0, migrationFeeSol: 0,
          migrationFeeEstimateSol: 0, migrationFeeWithdrawn: false, lp: null, lpFeeSol: 0, lpFeeToken: 0, error: (e as Error).message };
      }
    }));
    return {
      creator, tokens: rows,
      totalSol: rows.reduce((s, r) => s + r.tradingFeeSol + r.migrationFeeSol + r.lpFeeSol, 0),
      totalTradingSol: rows.reduce((s, r) => s + r.tradingFeeSol, 0),
      totalMigrationSol: rows.reduce((s, r) => s + r.migrationFeeSol, 0),
      totalLpSol: rows.reduce((s, r) => s + r.lpFeeSol, 0),
      updatedAt: Date.now(),
    };
  });

  app.post("/claim/build", async (req, reply) => {
    const b = (req.body ?? {}) as { creator?: string; pool?: string; kind?: string; position?: string };
    try {
      if (b.kind !== "trading" && b.kind !== "migration" && b.kind !== "lp") return reply.code(400).send({ error: "kind must be trading|migration|lp" });
      const creator = new PublicKey(String(b.creator)), pool = new PublicKey(String(b.pool));
      if (b.kind === "lp") {
        // pool = DAMM v2 pool, position = position account. Ownership is the position NFT, not the DB creator field.
        const position = new PublicKey(String(b.position));
        const configOf = new Map<string, number | null>();
        const built = await buildLpClaim({
          amm: amm(), conn: conn(), owner: creator, pool, position, platformConfigs: platformConfigs(),
          tokenOf: (mint) => db().getToken(mint).then((t) => (t && t.mint === mint ? { mint: t.mint, config: t.config } : null)),
          migrationFeeOptionOf: async (config) => {
            if (!configOf.has(config)) configOf.set(config, await dbc().state.getPoolConfig(new PublicKey(config)).then((c: any) => (c ? Number(c.migrationFeeOption) : null)).catch(() => null));
            return configOf.get(config) ?? null;
          },
        }).catch((e) => { if (e instanceof LpClaimError) return e; throw e; });
        if (built instanceof LpClaimError) return reply.code(built.status).send({ error: built.message });
        const tx = built.tx;
        tx.feePayer = creator;
        tx.recentBlockhash = (await conn().getLatestBlockhash("confirmed")).blockhash;
        return { tx: ser(tx), kind: "lp", pool: pool.toBase58(), position: position.toBase58(), positionNftAccount: built.positionNftAccount.toBase58(), mint: built.mint };
      }
      const t = await db().getToken(pool.toBase58());
      if (t && t.creator !== creator.toBase58()) return reply.code(403).send({ error: "wallet is not the creator of this pool" });
      const client = dbc();
      if (b.kind === "migration") {
        const rawPs: any = await client.state.getPool(pool); const ps: any = rawPs?.poolState ?? rawPs;
        if (!ps) return reply.code(404).send({ error: "pool not found" });
        if (Number(ps.isMigrated) !== 1) return reply.code(400).send({ error: "pool has not migrated yet" });
        if ((Number(ps.migrationFeeWithdrawStatus) & CREATOR_WITHDRAWN_MASK) !== 0) return reply.code(400).send({ error: "migration fee already withdrawn" });
      }
      const tx = b.kind === "trading"
        ? await client.creator.claimCreatorTradingFee({ creator, payer: creator, pool, maxBaseAmount: U64_MAX, maxQuoteAmount: U64_MAX })
        : await client.creator.creatorWithdrawMigrationFee({ pool, sender: creator });
      tx.feePayer = creator;
      tx.recentBlockhash = (await conn().getLatestBlockhash("confirmed")).blockhash;
      return { tx: ser(tx), kind: b.kind, pool: pool.toBase58() };
    } catch (e) { return reply.code(400).send({ error: (e as Error).message }); }
  });
}