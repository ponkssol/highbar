import type { FastifyInstance } from "fastify";
import { BPS, CASHBACK_BPS, networkOf, solscanAccount, solscanTx } from "@hb/shared";
import { store } from "../store.js";
import { splitEpoch } from "../services/split.js";
import { rewardsStore } from "../services/rewardsStore.js";
import { buybackMode, jobs } from "../jobs/config.js";

const ADDR = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const network = () => networkOf(process.env.NETWORK);
const lam = (sol: number) => BigInt(Math.round(sol * 1e9));
const cb = (lamports: bigint) => Number((lamports * BigInt(CASHBACK_BPS)) / BigInt(BPS)) / 1e9;

/** GET /cashback/:wallet, GET /buybacks, GET /burn: cashback ledger + buyback & burn proofs (Solscan links follow NETWORK). */
export function registerRewards(app: FastifyInstance) {
  app.get("/cashback/:wallet", async (req, reply) => {
    const { wallet } = req.params as { wallet: string };
    if (!ADDR.test(wallet)) return reply.code(400).send({ error: "bad wallet" });
    const net = network();
    const closedThrough = await rewardsStore.cashbackClosedThrough();
    const [ledger, totals, t] = await Promise.all([rewardsStore.cashbackLedger(wallet), rewardsStore.cashbackTotals(wallet), rewardsStore.walletPlatformTrades(wallet, closedThrough)]);
    const pendingSol = cb(t.openVolumeLamports); // trades after the last closed period: estimate until the job writes them
    return {
      wallet, network: net, bps: CASHBACK_BPS, live: closedThrough > 0, closedThrough,
      volumeSol: Number(t.volumeLamports) / 1e9, accruedSol: totals.paidSol + totals.unpaidSol + pendingSol,
      paidSol: totals.paidSol, unpaidSol: totals.unpaidSol, pendingSol, minPayoutSol: Number(jobs.cashbackMinPayout) / 1e9,
      trades: t.via, otherTrades: t.other,
      ledger: ledger.map((l) => ({ ...l, paidUrl: l.paidSig ? solscanTx(l.paidSig, net) : null })),
      rows: t.rows.map((r) => ({ ...r, cashbackSol: cb(lam(r.sol)) })),
    };
  });

  app.get("/buybacks", async (req) => {
    const q = req.query as { limit?: string; offset?: string };
    const limit = Math.max(1, Math.min(200, Number(q.limit ?? 50) || 50)), offset = Math.max(0, Number(q.offset ?? 0) || 0);
    const net = network();
    const [items, totals] = await Promise.all([rewardsStore.buybacks(limit, offset), rewardsStore.buybackTotals(jobs.barMint)]);
    return {
      network: net, barMint: jobs.barMint, barMintUrl: jobs.barMint ? solscanAccount(jobs.barMint, net) : null, mode: buybackMode(), totals, limit, offset,
      items: items.map((b) => ({ ...b, buyUrl: b.buySig ? solscanTx(b.buySig, net) : null, burnUrl: b.burnSig ? solscanTx(b.burnSig, net) : null })),
    };
  });

  app.get("/burn", async () => {
    const net = network();
    const [s, bt, runs] = await Promise.all([rewardsStore.splitTotals(), rewardsStore.buybackTotals(jobs.barMint), rewardsStore.buybacks(50)]);
    // Before the fee job has run, fall back to the indexed estimate (pool fees * 80% partner+creator share - creator).
    let estimate = 0;
    if (!s.claims) { const toks = await store.tokens(); estimate = Math.max(0, toks.reduce((a, t) => a + t.feesSol, 0) * 0.8 - toks.reduce((a, t) => a + t.creatorFeesSol, 0)); }
    const est = splitEpoch(lam(estimate), 0n);
    const split = s.periods ? { buyback: s.buybackSol, ops: s.opsSol, treasury: s.treasurySol } : { buyback: Number(est.buyback) / 1e9, ops: Number(est.ops) / 1e9, treasury: Number(est.treasury) / 1e9 };
    return {
      network: net, barMint: jobs.barMint, barLaunched: !!jobs.barMint, barMintUrl: jobs.barMint ? solscanAccount(jobs.barMint, net) : null, mode: buybackMode(), dryRun: jobs.dryRun, estimated: !s.claims,
      barBurned: bt.barBurned, burnOrders: bt.orders, solSpent: bt.solSpent,
      platformFeesSol: s.claims ? s.claimedSol : estimate, unsplitFeesSol: s.unsplitSol, cashbackSol: s.cashbackSol, split,
      pendingBuybackSol: Math.max(0, (s.periods ? s.buybackSol : split.buyback) - bt.solSpent),
      maxOrderSol: Number(jobs.maxOrder) / 1e9, maxSlippageBps: jobs.maxSlippageBps,
      runs: runs.map((b) => ({
        id: String(b.id), ts: b.ts, period: b.period, mode: b.mode, status: b.status, sol: b.solSpent, amount: b.barBought,
        sig: b.burnSig ?? b.buySig ?? undefined, buySig: b.buySig, burnSig: b.burnSig,
        buyUrl: b.buySig ? solscanTx(b.buySig, net) : null, burnUrl: b.burnSig ? solscanTx(b.burnSig, net) : null,
      })),
    };
  });
}
