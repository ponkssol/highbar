import type { FastifyInstance } from "fastify";
import { BAR_TIERS, MAX_TIER_MIN_BAR, SPLIT_BPS, TRADER_CASHBACK_BPS, networkOf, solscanAccount, solscanTx } from "@hb/shared";
import { bar } from "../jobs/barConfig.js";
import { barStatus } from "../services/bar.js";
import { official } from "../services/officialToken.js";
import { feeShareFor } from "../services/barFeeShare.js";
import { maxTierGate, nextTier } from "../services/barMath.js";

const ADDR = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const network = () => networkOf(process.env.NETWORK);

/** What is enforced where (shown on /bar so the perks are not over-promised). */
const LIMITS = [
  "On-chain trading fees are fixed per Meteora DBC config, so the fee discount is paid back as a cashback rebate, not deducted at swap time.",
  "Max tier access is checked by the highbar API and UI. DBC pool creation itself is permissionless.",
  "Tiers for cashback and fee share use the lowest $HIGHER balance across the period's snapshots.",
  "Fee share payouts are off until legal review. Accruals are recorded and shown here.",
];

/** GET /bar (tiers + settings), GET /bar/:wallet ($HIGHER balance, tier, perks, fee share ledger). Balances are read on-chain and cached. */
export function registerBar(app: FastifyInstance) {
  app.get("/bar", async () => {
    const net = network();
    return {
      network: net, barMint: bar.mint, barMintUrl: bar.mint ? solscanAccount(bar.mint, net) : null, enabled: !!bar.mint,
      symbol: official().symbol, launched: !!bar.mint, officialSource: official().source,
      tiers: BAR_TIERS, baseCashbackBps: TRADER_CASHBACK_BPS, maxTierMinBar: MAX_TIER_MIN_BAR, ...maxTierGate(bar.gateMaxTier, bar.mint),
      feeShareBps: bar.feeShareBps, opsSplitBps: SPLIT_BPS.ops, feeShareLive: bar.feeShareLive, limits: LIMITS,
    };
  });

  app.get("/bar/:wallet", async (req, reply) => {
    const { wallet } = req.params as { wallet: string };
    if (!ADDR.test(wallet)) return reply.code(400).send({ error: "bad wallet" });
    const net = network();
    const share = await feeShareFor(wallet);
    const ledger = share.ledger.map((l) => ({ ...l, paidUrl: l.paidSig ? solscanTx(l.paidSig, net) : null }));
    if (!bar.mint) return { wallet, network: net, enabled: false, balance: 0, tier: BAR_TIERS[0], next: null, maxTierAccess: !bar.gateMaxTier, ...share, ledger };
    try {
      const s = await barStatus(wallet);
      const n = nextTier(s.raw, s.decimals);
      return {
        wallet, network: net, enabled: true, balance: s.balance, tier: s.tier, next: n ? { tier: n.tier, needBar: n.needBar } : null,
        maxTierAccess: !bar.gateMaxTier || s.tier.maxTierAccess, ...share, ledger,
      };
    } catch (e) { return reply.code(502).send({ error: `$HIGHER balance unavailable: ${(e as Error).message}` }); }
  });
}
