import type { FastifyInstance } from "fastify";
import { networkOf, solscanTx, REFERRAL_PARAM } from "@hb/shared";
import { referralWallet } from "@hb/onchain";
import { verifyToken } from "../auth.js";
import { ADDR, bindReferral, referralStore } from "../services/referral.js";
import { dayOf, milestoneStore, progressFor, snapshots, tracked } from "../services/milestone.js";
import { rewards2 } from "../jobs/rewardsConfig.js";
import { jobs } from "../jobs/config.js";

const network = () => networkOf(process.env.NETWORK);
const bearer = (h?: string) => (h?.startsWith("Bearer ") ? h.slice(7) : undefined);
const platformWallets = () => { const r: string[] = [...jobs.cashbackExclude]; if (jobs.treasury) r.push(jobs.treasury); try { const w = referralWallet(); if (w) r.push(w.toBase58()); } catch {} return r; };

/** Step 8: GET /referrals/:wallet, POST /referrals (signed-in wallet binds its referrer), GET /milestones, GET /milestones/:mint. */
export function registerReferralMilestone(app: FastifyInstance) {
  app.get("/referrals/:wallet", async (req, reply) => {
    const { wallet } = req.params as { wallet: string };
    if (!ADDR.test(wallet)) return reply.code(400).send({ error: "bad wallet" });
    const net = network();
    const [by, refs, ledger, totals] = await Promise.all([referralStore.referrerOf(wallet), referralStore.referees(wallet), referralStore.ledger(wallet), referralStore.totals(wallet)]);
    const pendingSol = await referralStore.openEstimate(wallet, totals.closedThrough);
    return {
      wallet, network: net, param: REFERRAL_PARAM, rewardBps: rewards2.referralRewardBps, minPayoutSol: Number(rewards2.referralMinPayout) / 1e9, live: totals.closedThrough > 0, closedThrough: totals.closedThrough,
      referredBy: by, referees: refs.total, referredVolumeSol: refs.items.reduce((a, r) => a + r.volumeSol, 0),
      earnedSol: totals.paidSol + totals.unpaidSol + pendingSol, paidSol: totals.paidSol, unpaidSol: totals.unpaidSol, pendingSol,
      ledger: ledger.map((l) => ({ ...l, paidUrl: l.paidSig ? solscanTx(l.paidSig, net) : null })),
      items: refs.items,
    };
  });

  app.post("/referrals", async (req, reply) => {
    const referee = await verifyToken(bearer(req.headers.authorization));
    if (!referee) return reply.code(401).send({ error: "sign in with your wallet first" });
    const b = (req.body ?? {}) as { referrer?: string; source?: string };
    const r = await bindReferral(referee, String(b.referrer ?? "").trim(), b.source === "manual" ? "manual" : "link", platformWallets());
    if (!r.ok) return reply.code(r.code).send({ error: r.error, referrer: r.referrer });
    return r;
  });

  app.get("/milestones", async (req) => {
    const q = req.query as { creator?: string; limit?: string };
    const creator = q.creator && ADDR.test(q.creator) ? q.creator : undefined;
    const limit = Math.max(1, Math.min(200, Number(q.limit ?? 50) || 50));
    const net = network(), now = Date.now();
    const all = (await tracked()).filter((t) => !creator || t.creator === creator).slice(0, limit);
    const [snaps, bonuses] = await Promise.all([snapshots(all.map((t) => t.mint)), milestoneStore.bonuses({ creator, limit: 200 })]);
    return {
      network: net, dryRun: jobs.dryRun, milestones: rewards2.milestones, minSamplesPerDay: rewards2.milestoneMinSamples, today: dayOf(now),
      tokens: all.map((t) => ({
        mint: t.mint, name: t.name, symbol: t.symbol, creator: t.creator, migratedAt: t.migratedAt, mcapSol: t.lastMcapSol, sampledAt: t.lastSampledAt,
        progress: progressFor(t, snaps.get(t.mint) ?? [], rewards2.milestones, now),
      })),
      bonuses: bonuses.map((b) => ({ ...b, paidUrl: b.paidSig ? solscanTx(b.paidSig, net) : null })),
      totals: { paidSol: bonuses.filter((b) => b.paidSig).reduce((a, b) => a + b.amountSol, 0), unpaidSol: bonuses.filter((b) => !b.paidSig).reduce((a, b) => a + b.amountSol, 0) },
    };
  });

  app.get("/milestones/:mint", async (req, reply) => {
    const { mint } = req.params as { mint: string };
    if (!ADDR.test(mint)) return reply.code(400).send({ error: "bad mint" });
    const t = (await tracked()).find((x) => x.mint === mint);
    const net = network();
    const bonuses = (await milestoneStore.bonuses({ mint })).map((b) => ({ ...b, paidUrl: b.paidSig ? solscanTx(b.paidSig, net) : null }));
    if (!t) return { mint, migrated: false, milestones: rewards2.milestones, progress: [], days: [], bonuses };
    const days = (await snapshots([mint])).get(mint) ?? [];
    return { mint, migrated: true, migratedAt: t.migratedAt, mcapSol: t.lastMcapSol, sampledAt: t.lastSampledAt, milestones: rewards2.milestones,
      progress: progressFor(t, days), days: days.slice(-60), bonuses };
  });
}
