import { createHash } from "node:crypto";
import { ANTI_SNIPER_SCHEDULE, CURVE_FEE_BPS, SPLIT_BPS, TIERS, periodSeconds, scheduleDurationSeconds, scheduledFeeBps, type TierId } from "@hb/shared";
import type { Q } from "../db/pool.js";
import { claimedOnOrAfter, notMock, periodOnOrAfter, type GoPublic } from "../jobs/goPublic.js";
import { escapeLike, MINT_PREFIX_MIN, type SearchQuery } from "../services/search.js";
import { openbookTables } from "./write.js";
import { cashbackOn, creatorPct, minOutHeadroomPct, OPENBOOK_SNIPER_SLOTS, platformFlow, splitSwapFee, TOTAL_SUPPLY_TOKENS, type FeeSplit } from "./math.js";

/** Open Book read side. DB only: ZERO RPC per request (balances come from wallet_snapshots, written by openbook/snapshot.ts).
 *  Contract: /workspace/openbook-mock/API_SHAPE.final.md. Conventions: SOL as numbers (*Sol), ms timestamps, 0-100 *Pct,
 *  raw sigs / addresses (the client builds Solscan links), null = unknown / not applicable (never a placeholder 0),
 *  provenance "exact" (tx meta / event / balance) | "derived" (config, fee schedule, attribution). */

export type Provenance = "exact" | "derived";
export type Network = "devnet" | "mainnet";
export interface Meta { network: Network; indexState: "pending" | "backfilling" | "synced" | "lagging"; indexedSlot: number | null; indexedAt: number | null;
  generatedAt: number; maxAgeMs: number; costsAvailable: boolean }
export interface ReadCtx {
  network: Network; goPublic: GoPublic | null; barMint: string | null; now?: number;
  /** fee receiver (TREASURY_PUBKEY, else the platform key), the DBC partner fee claimer (configs feeClaimer), the referral wallet */
  wallets: { feeReceiver: string | null; feeClaimer: string | null; referral: string | null; platform: string | null };
}
export const TOKEN_MAX_AGE_MS = 30_000, PLATFORM_MAX_AGE_MS = 60_000;
/** An indexer that has not advanced a token for this long while the token row moved on is 'lagging'. */
const LAG_MS = 10 * 60_000;

// ---------- small helpers ----------
const L = (v: unknown): bigint => { if (v == null) return 0n; if (typeof v === "bigint") return v; const s = String(v); return BigInt(s.includes(".") ? s.split(".")[0] : s); };
const sol = (l: bigint | null | undefined) => (l == null ? null : Number(l) / 1e9);
const S = (l: bigint) => Number(l) / 1e9;
const pct = (a: number | bigint, b: number | bigint): number | null => { const d = Number(b); return d > 0 ? (Number(a) / d) * 100 : null; };
const num = (v: unknown) => (v == null ? null : Number(v));
const supplyPct = (tokens: number) => (tokens / TOTAL_SUPPLY_TOKENS) * 100;
const tierOf = (t: string): TierId => (t === "higher" || t === "max" ? t : "standard");
/** jsonb comes back parsed from pg; a jsonb *string* (e.g. a failed tx err "x") is already the value, so only parse what looks like JSON text. */
const jsonRow = (r: any) => { if (r == null) return null; if (typeof r !== "string") return r; try { return JSON.parse(r); } catch { return r; } };

async function aggRow(q: Q, mint: string) { return jsonRow((await q.query("SELECT to_jsonb(a) AS j FROM token_openbook_agg a WHERE mint = $1", [mint])).rows[0]?.j); }

function indexState(tables: boolean, agg: any, tok: { trades: number; updated_at: number } | null, now: number): Meta["indexState"] {
  if (!tables || !agg) return "pending";
  if (tok && Number(agg.trades) < Number(tok.trades)) return "backfilling";
  if (tok && Number(tok.updated_at) - Number(agg.updated_at) > LAG_MS && now - Number(agg.updated_at) > LAG_MS) return "lagging";
  return "synced";
}

/** DBC anti-sniper schedule as step points (timestamp schedule: one point per period). */
export function antiSniperSchedule() {
  const s = ANTI_SNIPER_SCHEDULE, per = periodSeconds(s) * 1000, out: { offsetMs: number; feeBps: number }[] = [];
  for (let i = 0; i <= s.numberOfPeriod; i++) out.push({ offsetMs: i * per, feeBps: Math.round(scheduledFeeBps(s, i * periodSeconds(s)) * 100) / 100 });
  return { points: out, durationMs: scheduleDurationSeconds(s) * 1000, baseFeeBps: CURVE_FEE_BPS, mode: s.mode, activation: s.activationType };
}

// ---------- fee split of one stored trade row ----------
export interface TradeFeeRow { side: "buy" | "sell"; sol: number; fee_sol: number; fee_lamports: unknown; trading_fee_lamports: unknown; protocol_fee_lamports: unknown;
  referral_fee_lamports: unknown; via_ui: boolean }
/** Same split the indexer writes into the aggregates (rebuild uses it too). Exact event parts when stored, else derived from the total. */
export function splitOfRow(r: TradeFeeRow, tier: TierId, antiSniper: boolean): FeeSplit & { totalExact: boolean } {
  const solL = BigInt(Math.round(Number(r.sol) * 1e9));
  const totalExact = r.fee_lamports != null;
  const fee = totalExact ? L(r.fee_lamports) : BigInt(Math.round(Number(r.fee_sol) * 1e9));
  const parts = r.trading_fee_lamports != null && r.protocol_fee_lamports != null
    ? { trading: L(r.trading_fee_lamports), protocol: L(r.protocol_fee_lamports), referral: fee - L(r.trading_fee_lamports) - L(r.protocol_fee_lamports) } : null;
  if (parts && parts.referral < 0n) parts.referral = 0n;
  const split = splitSwapFee({ side: r.side, solLamports: solL, feeLamports: fee, tier, antiSniper, parts,
    referralLamports: r.referral_fee_lamports == null ? null : L(r.referral_fee_lamports), viaUi: r.via_ui });
  return { ...split, totalExact };
}

function shares(f: FeeSplit, creator: string, ctx: ReadCtx, exactParts: boolean) {
  const t = f.total, pe: Provenance = exactParts ? "exact" : "derived";
  return [
    { recipient: "meteora" as const, pct: pct(f.protocol, t), sol: S(f.protocol), account: null, provenance: pe },
    { recipient: "referral" as const, pct: pct(f.referral, t), sol: S(f.referral), account: f.referral > 0n ? ctx.wallets.referral : null, provenance: pe },
    { recipient: "creator" as const, pct: pct(f.creator, t), sol: S(f.creator), account: creator, provenance: "derived" as Provenance },
    { recipient: "platform" as const, pct: pct(f.platform, t), sol: S(f.platform), account: ctx.wallets.feeClaimer, provenance: "derived" as Provenance },
  ];
}

// =====================================================================================================================
// GET /tokens/:mint/openbook
// =====================================================================================================================
export interface TokenOpts { windowSec: number; earlyLimit: number }

export async function tokenOpenBook(q: Q, mint: string, ctx: ReadCtx, o: TokenOpts = { windowSec: 60, earlyLimit: 25 }) {
  const now = ctx.now ?? Date.now();
  const tok = (await q.query(`SELECT mint, pool, config, tier, anti_sniper, creator, created_at, quote_reserve_sol, threshold_sol, progress, is_migrated, symbol, name,
      volume_sol, fees_sol, trades, updated_at, migrated_at, damm_pool FROM tokens WHERE mint = $1`, [mint])).rows[0];
  if (!tok) return null;
  const tier = tierOf(tok.tier), anti = !!tok.anti_sniper, creator: string = tok.creator, createdAt = Number(tok.created_at);
  const tables = await openbookTables(q, now);
  const agg = tables ? await aggRow(q, mint) : null;

  const [devTrades, locks, holders, early, claims, rebates, burns] = await Promise.all([
    q.query(`SELECT sig, ix_idx, side, sol, tokens, fee_sol, ts, dev_buy${tables ? ", slot" : ", NULL::bigint AS slot"} FROM trades
             WHERE mint = $1 AND wallet = $2 ORDER BY ts, sig, ix_idx LIMIT 501`, [mint, creator]),
    q.query(`SELECT escrow, creator, total, locked, cliff_time, end_time, cancelled, locked_at FROM lock_escrows WHERE mint = $1 ORDER BY locked_at DESC NULLS LAST, escrow`, [mint]),
    holderStats(q, mint, creator),
    earlyBuyers(q, mint, creator, createdAt, agg, tables, o, now),
    q.query(`SELECT source, coalesce(sum(lamports),0)::text AS l, count(*)::int AS n FROM fee_claims WHERE mint = $1 AND ${claimedOnOrAfter("claimed_at", ctx.goPublic)} GROUP BY source`, [mint]),
    q.query(`SELECT coalesce(sum(rebate_lamports),0)::text AS accrued, coalesce(sum(rebate_lamports) FILTER (WHERE paid_sig IS NOT NULL),0)::text AS paid,
               count(*) FILTER (WHERE paid_sig IS NOT NULL)::int AS n,
               (SELECT paid_sig FROM creator_lp_rebates WHERE mint = $1 AND paid_sig IS NOT NULL ORDER BY paid_at DESC LIMIT 1) AS last_sig, max(paid_at) AS last_at
             FROM creator_lp_rebates WHERE mint = $1 AND ${claimedOnOrAfter("created_at", ctx.goPublic)}`, [mint]),
    burnStats(q, ctx.barMint),
  ]);

  // ---- launch ----
  const dev = devTrades.rows.slice(0, 500);
  const devBuy = dev.find((t) => t.dev_buy) ?? null;
  const launchSlot = agg?.create_slot != null ? Number(agg.create_slot) : devBuy?.slot != null ? Number(devBuy.slot) : null;
  const createSig: string | null = agg?.create_sig ?? devBuy?.sig ?? null;
  const offset = (slot: unknown) => (slot == null || launchSlot == null ? null : Number(slot) - launchSlot);
  const launch = { createdAt, launchSlot, createSig, pool: tok.pool as string, config: tok.config as string, creator, tier, antiSniper: anti,
    devBuy: devBuy ? { sol: Number(devBuy.sol), tokens: Number(devBuy.tokens), pctSupply: supplyPct(Number(devBuy.tokens)), feeSol: Number(devBuy.fee_sol), sig: devBuy.sig as string } : null };

  // ---- summary ----
  const a = agg ?? {};
  const vol = tables && agg ? L(a.volume_lamports) : BigInt(Math.round(Number(tok.volume_sol) * 1e9));
  const dbc = tables && agg ? L(a.fee_total_lamports) : BigInt(Math.round(Number(tok.fees_sol) * 1e9));
  const tips = L(a.tips_lamports), prio = L(a.priority_fee_lamports), base = L(a.base_fee_lamports);
  const costs = tables && agg && Number(a.cost_txs) > 0;
  const feeTotal = dbc + (costs ? tips + prio + base : 0n);
  const exactShare = agg && Number(a.trades) > 0 ? Number(a.fee_exact_trades) / Number(a.trades) : 0;
  const sniperTxs = Number(a.sniper_txs ?? 0), costTxs = Number(a.cost_txs ?? 0), sniperTips = L(a.sniper_tips_lamports);
  const sniperAvg = sniperTxs ? S(sniperTips) / sniperTxs : null, othersAvg = costTxs - sniperTxs > 0 ? S(tips - sniperTips) / (costTxs - sniperTxs) : null;
  const tipRows = tables ? (await q.query(`SELECT provider, lamports::text AS l, txs::int AS n, sniper_lamports::text AS s, sniper_txs::int AS sn FROM token_tip_agg WHERE mint = $1 ORDER BY lamports DESC, provider`, [mint])).rows : [];
  const summary = {
    volume: { totalSol: S(vol), totalUsd: null, txCount: agg ? Number(a.trades) : Number(tok.trades), buyCount: agg ? Number(a.buys) : null, sellCount: agg ? Number(a.sells) : null,
      buySol: agg ? S(L(a.buy_volume_lamports)) : null, sellSol: agg ? S(L(a.sell_volume_lamports)) : null, provenance: "exact" as Provenance },
    fees: { totalSol: S(feeTotal), pctOfVolume: pct(feeTotal, vol), complete: !!costs,
      parts: [
        { kind: "dbc", sol: S(dbc), pct: pct(dbc, feeTotal), provenance: (exactShare === 1 ? "exact" : "derived") as Provenance },
        { kind: "tips", sol: costs ? S(tips) : null, pct: costs ? pct(tips, feeTotal) : null, provenance: "exact" as Provenance },
        { kind: "priority", sol: costs ? S(prio) : null, pct: costs ? pct(prio, feeTotal) : null, provenance: "exact" as Provenance },
        { kind: "base", sol: costs ? S(base) : null, pct: costs ? pct(base, feeTotal) : null, provenance: "exact" as Provenance },
      ] },
    antiSniper: anti ? { portionSol: agg ? S(L(a.fee_anti_sniper_lamports)) : null, pctOfDbcFees: agg ? pct(L(a.fee_anti_sniper_lamports), dbc) : null, provenance: "derived" as Provenance,
      schedule: antiSniperSchedule().points, baseFeeBps: CURVE_FEE_BPS, observed: early?.observed ?? [] } : null,
    tips: costs ? { totalSol: S(tips), providerCount: tipRows.length, txCount: Number(a.tip_txs), provenance: "exact" as Provenance,
      snipers: sniperTxs ? { sol: S(sniperTips), pct: pct(sniperTips, tips), walletCount: early?.sniperWallets.length ?? null, txCount: sniperTxs,
        avgTipPerTxSol: sniperAvg, othersAvgTipPerTxSol: othersAvg, multiple: sniperAvg != null && othersAvg ? sniperAvg / othersAvg : null,
        rule: `swap tx within ${OPENBOOK_SNIPER_SLOTS} slots of the pool-creation slot, not paid by the creator` } : null } : null,
  };

  // ---- DBC split ----
  const f: FeeSplit = { total: dbc, protocol: L(a.fee_protocol_lamports), referral: L(a.fee_referral_lamports), trading: L(a.fee_trading_lamports),
    creator: L(a.fee_creator_lamports), platform: L(a.fee_platform_lamports), antiSniper: L(a.fee_anti_sniper_lamports), source: "derived" };
  const feesSplit = agg ? { dbcFeesSol: S(dbc), provenance: (exactShare === 1 ? "exact" : "derived") as Provenance, exactTradeSharePct: exactShare * 100,
    creatorPctOfTradingFee: creatorPct(tier), rows: shares(f, creator, ctx, exactShare === 1).map((r) => ({ ...r, recipientCount: r.recipient === "referral" ? (f.referral > 0n ? 1 : 0) : null })) } : null;

  // ---- platform flow (+ post-migration income) ----
  const cl = new Map<string, { l: bigint; n: number }>(claims.rows.map((r) => [r.source, { l: L(r.l), n: Number(r.n) }]));
  const claimed = [...cl.values()].reduce((s, x) => s + x.l, 0n);
  const rb = rebates.rows[0] ?? {};
  const uiVol = ctx.goPublic && tables ? L((await q.query(`SELECT coalesce(sum(ui_volume_lamports),0)::text AS v FROM token_openbook_daily WHERE mint = $1 AND day >= $2`, [mint, ctx.goPublic.id])).rows[0]?.v) : 0n;
  const cashback = ctx.goPublic ? cashbackOn(uiVol) : 0n;
  const flow = platformFlow(claimed, L(rb.accrued), cashback);
  const platformFlowOut = {
    platformShareSol: agg ? S(f.platform) : null, platformShareProvenance: "derived" as Provenance,
    claimedSol: S(claimed), claimedProvenance: "exact" as Provenance, wallet: ctx.wallets.feeReceiver,
    deductions: { lpRebateSol: S(flow.rebate), cashbackSol: S(flow.cashback), cashbackProvenance: "derived" as Provenance },
    netSol: S(flow.net), provenance: "derived" as Provenance,
    buckets: [
      { bucket: "buyback", pct: SPLIT_BPS.buyback / 100, sol: S(flow.buyback), state: ctx.barMint ? "pooled" : "soon",
        lastAt: burns.lastAt, lastSig: burns.lastSig, txCount: burns.count, account: ctx.wallets.platform, pooled: true },
      { bucket: "ops", pct: SPLIT_BPS.ops / 100, sol: S(flow.ops), state: "accrued", lastAt: null, lastSig: null, txCount: null, account: ctx.wallets.feeReceiver, pooled: true },
      { bucket: "treasury", pct: SPLIT_BPS.treasury / 100, sol: S(flow.treasury), state: "accrued", lastAt: null, lastSig: null, txCount: null, account: ctx.wallets.feeReceiver, pooled: true },
    ],
  };
  const postMigration = {
    provenance: "exact" as Provenance,
    dbcTradingClaimedSol: sol(cl.get("dbc_trading")?.l ?? 0n), migrationFeeSol: sol(cl.get("dbc_migration")?.l ?? 0n),
    surplusSol: sol(cl.get("dbc_surplus")?.l ?? 0n), dammLpFeesSol: tok.is_migrated ? sol(cl.get("damm_lp")?.l ?? 0n) : null,
    lpRebate: { accruedSol: S(L(rb.accrued)), paidSol: S(L(rb.paid)), paidCount: Number(rb.n ?? 0), lastPaidSig: rb.last_sig ?? null, lastPaidAt: num(rb.last_at) },
    claims: (await q.query(`SELECT source, lamports::text AS l, sig, claimed_at FROM fee_claims WHERE mint = $1 AND ${claimedOnOrAfter("claimed_at", ctx.goPublic)}
                            ORDER BY claimed_at DESC, sig LIMIT 20`, [mint])).rows.map((r) => ({ source: r.source, sol: S(L(r.l)), sig: r.sig, ts: Number(r.claimed_at) })),
  };

  // ---- dev ----
  const nowSec = Math.floor(now / 1000);
  const lockRows = locks.rows.map((l) => {
    const lockedTokens = Number(l.locked ?? l.total ?? 0) / 1e6, cliff = Number(l.cliff_time), end = Number(l.end_time);
    return { escrow: l.escrow as string, owner: l.creator as string | null, provider: "jupiter_lock" as const, lockedTokens, lockedPctSupply: supplyPct(lockedTokens),
      lockedAt: l.locked_at == null ? null : Number(l.locked_at) * 1000, cliffAt: cliff * 1000, endAt: end * 1000,
      status: l.cancelled ? "cancelled" : nowSec < cliff ? "locked" : nowSec < end ? "vesting" : "unlocked", active: !l.cancelled && lockedTokens > 0 && end > nowSec, sig: null as string | null };
  });
  const devLocks = lockRows.filter((l) => l.owner === creator);
  const devLock = devLocks.find((l) => l.active) ?? devLocks[0] ?? null;
  const lockedDev = devLocks.filter((l) => l.active).reduce((s, l) => s + l.lockedTokens, 0);
  let bought = 0, boughtTok = 0, sold = 0, soldTok = 0, sells = 0;
  for (const t of dev) { if (t.side === "buy") { bought += Number(t.sol); boughtTok += Number(t.tokens); } else { sold += Number(t.sol); soldTok += Number(t.tokens); sells++; } }
  const events = [
    ...dev.map((t) => ({ action: t.side as "buy" | "sell", wallet: creator, ts: Number(t.ts), slot: num(t.slot), slotOffset: offset(t.slot), offsetMs: Number(t.ts) - createdAt,
      sol: Number(t.sol), tokens: Number(t.tokens), pctSupply: supplyPct(Number(t.tokens)), atomicWithCreate: !!t.dev_buy, fromUnlocked: t.side === "sell" ? true : null, lock: null, sig: t.sig as string, escrow: null })),
    ...devLocks.filter((l) => l.lockedAt != null).map((l) => ({ action: "lock" as const, wallet: creator, ts: l.lockedAt!, slot: null, slotOffset: null, offsetMs: l.lockedAt! - createdAt,
      sol: null, tokens: l.lockedTokens, pctSupply: l.lockedPctSupply, atomicWithCreate: false, fromUnlocked: null,
      lock: { provider: "jupiter_lock" as const, cliffDays: l.lockedAt ? Math.round((l.cliffAt - l.lockedAt) / 86_400_000) : null, unlockAt: l.cliffAt }, sig: null, escrow: l.escrow })),
  ].sort((x, y) => x.ts - y.ts);
  const devHeld = holders.devTokens; // holders table: creator balance NET of active locks
  const devActivity = {
    creator, linkedWallets: [] as { wallet: string; label: string | null; disclosed: boolean }[], undisclosedLinkedCount: null as number | null,
    boughtSol: bought, boughtTokens: boughtTok, boughtPctSupply: supplyPct(boughtTok), soldSol: sold, soldTokens: soldTok, soldPctSupply: supplyPct(soldTok), sellTxCount: sells,
    lockedPctSupply: devLocks.length ? supplyPct(lockedDev) : null,
    holdsPctSupply: devHeld == null ? null : supplyPct(devHeld + lockedDev), holdsInclLockedPct: devLocks.length ? supplyPct(lockedDev) : null,
    holdsAsOf: holders.asOf, truncated: devTrades.rows.length > 500, transfersOut: null as null, events,
  };

  // ---- migration ----
  const migrated = !!tok.is_migrated, progressPct = Math.min(100, Number(tok.progress) * 100);
  const status = migrated ? (tok.damm_pool ? "migrated" : "migrating") : progressPct >= 100 ? "migrating" : "bonding";
  const lp = TIERS[tier];
  const migration = {
    status, quoteReserveSol: Number(tok.quote_reserve_sol), thresholdSol: Number(tok.threshold_sol), progressPct: migrated ? 100 : progressPct,
    remainingSol: migrated ? 0 : Math.max(0, Number(tok.threshold_sol) - Number(tok.quote_reserve_sol)), etaMs: null as number | null,
    steps: {
      poolCreated: { slot: launchSlot, ts: createdAt, sig: createSig, pool: tok.pool as string },
      migrated: migrated ? { slot: null, ts: num(tok.migrated_at), sig: null, dammPool: tok.damm_pool ?? null, lpMint: null } : null,
      lpLocked: migrated ? { ts: num(tok.migrated_at), sig: null, escrow: null, lpPct: lp.lpCreatorPercentage + lp.lpPlatformPercentage, permanent: true,
        method: "damm_v2_permanent_lock", creatorLpPct: lp.lpCreatorPercentage, platformLpPct: lp.lpPlatformPercentage, provenance: "derived" as Provenance } : null,
    },
  };

  // ---- tips by provider ----
  const tipsByProvider = costs ? { provenance: "exact" as Provenance, totalSol: S(tips),
    providers: tipRows.map((r) => ({ provider: r.provider as string, tipSol: S(L(r.l)), sniperTipSol: S(L(r.s)), txCount: Number(r.n), sniperTxCount: Number(r.sn),
      pctOfTips: pct(L(r.l), tips), sniperPct: pct(L(r.s), L(r.l)) })),
    largestTip: a.max_tip_sig ? { sol: S(L(a.max_tip_lamports)), sig: a.max_tip_sig as string } : null, medianTipSol: null as number | null } : null;

  // ---- ledger summary ----
  const failed = Number(a.failed_attempts ?? 0), dup = Number(a.duplicate_attempts ?? 0);
  const ledger = agg ? { total: Number(a.trades) + failed, counts: { all: Number(a.trades) + failed, buys: Number(a.buys), sells: Number(a.sells),
    snipers: early ? early.sniperTradeCount : null, sniperCountCapped: early ? early.sniperTradeCount >= SNIPER_COUNT_CAP : false, failed: failed - dup, duplicate: dup }, csv: true } : null;

  const meta: Meta = { network: ctx.network, indexState: indexState(tables, agg, tok, now), indexedSlot: num(a.last_slot), indexedAt: num(a.updated_at),
    generatedAt: now, maxAgeMs: TOKEN_MAX_AGE_MS, costsAvailable: !!costs };
  return {
    meta, mint, symbol: tok.symbol as string, name: tok.name as string, tier, phase: status,
    coverage: { indexedTrades: agg ? Number(a.trades) : 0, tokenTrades: Number(tok.trades), costTxs: costTxs, rebuiltAt: num(a.rebuilt_at) },
    launch, summary, feesSplit, platformFlow: platformFlowOut, postMigration, devActivity, devLock, locks: lockRows, migration,
    earlyBuyers: early?.out ?? null, tipsByProvider, holders: holders.out, ledger,
  };
}

const SNIPER_COUNT_CAP = 10_000;

async function holderStats(q: Q, mint: string, creator: string) {
  const [s, top] = await Promise.all([
    q.query(`SELECT count(*) FILTER (WHERE balance > 0.000001)::int AS n, coalesce(sum(balance) FILTER (WHERE balance > 0.000001),0)::float8 AS held,
               max(updated_at) AS at, max(balance) FILTER (WHERE wallet = $2)::float8 AS dev FROM holders WHERE mint = $1`, [mint, creator]),
    q.query(`SELECT wallet, balance::float8 AS b FROM holders WHERE mint = $1 AND balance > 0.000001 ORDER BY balance DESC, wallet LIMIT 20`, [mint]),
  ]);
  const r = s.rows[0] ?? {}, rows = top.rows.map((x) => ({ wallet: x.wallet as string, label: null, tokens: Number(x.b), pctSupply: supplyPct(Number(x.b)), isCreator: x.wallet === creator }));
  const sum = (n: number) => rows.slice(0, n).reduce((s, x) => s + x.tokens, 0);
  const asOf = num(r.at);
  return { devTokens: r.dev == null ? (asOf == null ? null : 0) : Number(r.dev), asOf,
    out: asOf == null ? null : { count: Number(r.n), heldTokens: Number(r.held), top10Pct: supplyPct(sum(10)), top20Pct: supplyPct(sum(20)),
      devPct: r.dev == null ? 0 : supplyPct(Number(r.dev)), top: rows, asOf, provenance: "derived" as Provenance,
      rule: "net indexed buys - sells per wallet > 0.000001 tokens; creator net of active locks (scoreJob, every 10 min)" } };
}

async function burnStats(q: Q, barMint: string | null) {
  if (!barMint) return { count: 0, lastSig: null as string | null, lastAt: null as number | null, burnedTokens: 0, solSpent: 0 };
  const r = (await q.query(`SELECT count(*) FILTER (WHERE status = 'burned')::int AS n, coalesce(sum(bar_bought::numeric / power(10, bar_decimals)) FILTER (WHERE status = 'burned'),0)::float8 AS burned,
      coalesce(sum(sol_spent_lamports) FILTER (WHERE status <> 'failed'),0)::text AS spent,
      (SELECT burn_sig FROM buybacks WHERE bar_mint = $1 AND status = 'burned' AND ${notMock()} ORDER BY updated_at DESC LIMIT 1) AS sig,
      max(updated_at) FILTER (WHERE status = 'burned') AS at FROM buybacks WHERE bar_mint = $1 AND ${notMock()}`, [barMint])).rows[0];
  return { count: Number(r.n), lastSig: r.sig ?? null, lastAt: num(r.at), burnedTokens: Number(r.burned), solSpent: S(L(r.spent)) };
}

// ---------- early buyers ----------
async function earlyBuyers(q: Q, mint: string, creator: string, createdAt: number, agg: any, tables: boolean, o: TokenOpts, now: number) {
  const end = createdAt + o.windowSec * 1000;
  const buys = (await q.query(`SELECT sig, ix_idx, wallet, sol, tokens, fee_sol, ts${tables ? ", slot, fee_lamports" : ", NULL::bigint AS slot, NULL::bigint AS fee_lamports"}
      FROM trades WHERE mint = $1 AND side = 'buy' AND ts >= $2 AND ts <= $3 ORDER BY ts, sig, ix_idx LIMIT 2000`, [mint, createdAt - 1000, end])).rows;
  const createSlot = agg?.create_slot != null ? Number(agg.create_slot) : null;
  const by = new Map<string, { wallet: string; first: any; sigs: Set<string>; sol: number; tokens: number; fee: number }>();
  const observed: { slotOffset: number | null; offsetMs: number; feeBps: number; sig: string }[] = [];
  for (const b of buys) {
    let w = by.get(b.wallet);
    if (!w) by.set(b.wallet, (w = { wallet: b.wallet, first: b, sigs: new Set(), sol: 0, tokens: 0, fee: 0 }));
    w.sigs.add(b.sig); w.sol += Number(b.sol); w.tokens += Number(b.tokens); w.fee += Number(b.fee_sol);
    if (b.fee_lamports != null && Number(b.sol) > 0 && observed.length < 200)
      observed.push({ slotOffset: b.slot == null || createSlot == null ? null : Number(b.slot) - createSlot, offsetMs: Number(b.ts) - createdAt,
        feeBps: Math.round((Number(b.fee_lamports) / (Number(b.sol) * 1e9)) * 1e6) / 100, sig: b.sig });
  }
  const all = [...by.values()];
  const slotOff = (w: { first: any }) => (w.first.slot == null || createSlot == null ? null : Number(w.first.slot) - createSlot);
  const tagOf = (w: { wallet: string; first: any }) => {
    if (w.wallet === creator) return "dev";
    const so = slotOff(w);
    return so != null && so <= OPENBOOK_SNIPER_SLOTS ? "sniper" : "early";
  };
  const sniperWallets = all.filter((w) => tagOf(w) === "sniper").map((w) => w.wallet);
  const windowWallets = all.filter((w) => w.wallet !== creator).map((w) => w.wallet);
  const shown = all.slice(0, o.earlyLimit);
  const wallets = [...new Set([...shown.map((w) => w.wallet), ...sniperWallets])];
  const sigs = [...new Set(shown.flatMap((w) => [...w.sigs]))];
  const [sells, held, costs, fails, sniperCount] = await Promise.all([
    q.query(`SELECT wallet, sum(sol)::float8 AS sol, sum(tokens)::float8 AS tokens, count(*)::int AS n FROM trades WHERE mint = $1 AND wallet = ANY($2) AND side = 'sell' GROUP BY wallet`, [mint, wallets]),
    q.query(`SELECT wallet, balance::float8 AS b, updated_at FROM holders WHERE mint = $1 AND wallet = ANY($2)`, [mint, wallets]),
    tables ? q.query(`SELECT sig, tips_lamports::text AS t, tips FROM trade_costs WHERE sig = ANY($1)`, [sigs]) : Promise.resolve({ rows: [] as any[] }),
    tables ? q.query(`SELECT wallet, count(*)::int AS n FROM failed_attempts WHERE mint = $1 AND wallet = ANY($2) GROUP BY wallet`, [mint, wallets]) : Promise.resolve({ rows: [] as any[] }),
    windowWallets.length ? q.query(`SELECT count(*)::int AS n FROM (SELECT 1 FROM trades WHERE mint = $1 AND wallet = ANY($2) LIMIT ${SNIPER_COUNT_CAP}) x`, [mint, windowWallets]) : Promise.resolve({ rows: [{ n: 0 }] }),
  ]);
  const sold = new Map(sells.rows.map((r) => [r.wallet, r])), hold = new Map(held.rows.map((r) => [r.wallet, Number(r.b)]));
  const holdersKnown = held.rows.length > 0 || (await q.query("SELECT 1 FROM holders WHERE mint = $1 LIMIT 1", [mint])).rows.length > 0;
  const cost = new Map(costs.rows.map((r) => [r.sig, r])), failed = new Map(fails.rows.map((r) => [r.wallet, Number(r.n)]));
  const rows = shown.map((w, i) => {
    let tipL = 0n; const prov = new Map<string, bigint>(); let anyCost = false;
    for (const s of w.sigs) { const c = cost.get(s); if (!c) continue; anyCost = true; tipL += L(c.t);
      for (const t of jsonRow(c.tips) ?? []) prov.set(t.provider, (prov.get(t.provider) ?? 0n) + L(t.lamports)); }
    const topProv = [...prov.entries()].sort((x, y) => (y[1] > x[1] ? 1 : y[1] < x[1] ? -1 : 0))[0]?.[0] ?? null;
    const sr = sold.get(w.wallet), h = hold.get(w.wallet);
    return { rank: i + 1, wallet: w.wallet, label: null, tag: tagOf(w), slot: num(w.first.slot), slotOffset: slotOff(w), offsetMs: Number(w.first.ts) - createdAt,
      solIn: w.sol, tokens: w.tokens, pctSupply: supplyPct(w.tokens), feeSol: w.fee, txCount: w.sigs.size,
      tipSol: anyCost ? (tipL > 0n ? S(tipL) : null) : null, tipProviders: [...prov.keys()], tipProvider: topProv, tipKnown: anyCost,
      sold: sr ? { sol: Number(sr.sol), tokens: Number(sr.tokens), txCount: Number(sr.n) } : null,
      holdsNowTokens: holdersKnown ? (h ?? 0) : null, holdsNowPct: holdersKnown ? supplyPct(h ?? 0) : null,
      failedAttempts: tables ? (failed.get(w.wallet) ?? 0) : null, firstSig: w.first.sig as string, tokenAccount: null };
  });
  const sn = all.filter((w) => tagOf(w) === "sniper");
  const out = { window: { kind: "seconds" as const, value: o.windowSec }, createSlot, total: all.length, shown: rows.length, rows,
    snipers: { walletCount: sn.length, pctSupplyTaken: supplyPct(sn.reduce((s, w) => s + w.tokens, 0)), slotRange: [0, OPENBOOK_SNIPER_SLOTS] as [number, number],
      heldNowPct: holdersKnown ? supplyPct(sn.reduce((s, w) => s + (hold.get(w.wallet) ?? 0), 0)) : null },
    truncated: buys.length >= 2000, rules: { dev: "the token creator", sniper: `first buy within ${OPENBOOK_SNIPER_SLOTS} slots of the pool-creation slot`, early: `any other buy within ${o.windowSec}s of creation`, bundle: null } };
  return { out, observed, sniperWallets, windowWallets, sniperTradeCount: Number(sniperCount.rows[0]?.n ?? 0) };
}

// =====================================================================================================================
// GET /tokens/:mint/openbook/ledger
// =====================================================================================================================
export interface LedgerFilter { wallet: string | null; side: "buy" | "sell" | null; status: "success" | "failed" | "duplicate" | "notok" | null; sniper: boolean; windowSec: number; order: "desc" | "asc" }
export interface LedgerParams extends LedgerFilter { limit: number; cursor: string | null }
interface Key { ts: number; sig: string; ix: number }
export class CursorError extends Error {}

export const filterHash = (f: LedgerFilter, scope = "") =>
  createHash("sha256").update(JSON.stringify([scope, f.wallet, f.side, f.status, f.sniper, f.sniper ? f.windowSec : null, f.order])).digest("base64url").slice(0, 12);
export const encodeCursor = (k: Key, dir: "after" | "before", h: string) => Buffer.from(JSON.stringify({ v: 1, h, d: dir, k: [k.ts, k.sig, k.ix] })).toString("base64url");
/** Decode an opaque cursor; throws CursorError when it is malformed or was issued for another filter set / mint. */
export function decodeCursor(c: string, h: string): { key: Key; dir: "after" | "before" } {
  let o: any;
  try { o = JSON.parse(Buffer.from(c, "base64url").toString("utf8")); } catch { throw new CursorError("bad cursor"); }
  if (!o || o.v !== 1 || !Array.isArray(o.k) || o.k.length !== 3 || (o.d !== "after" && o.d !== "before")) throw new CursorError("bad cursor");
  if (o.h !== h) throw new CursorError("cursor was issued for a different filter set");
  const [ts, sig, ix] = o.k;
  if (!Number.isSafeInteger(ts) || typeof sig !== "string" || sig.length > 100 || !Number.isSafeInteger(ix)) throw new CursorError("bad cursor");
  return { key: { ts, sig, ix }, dir: o.d };
}

const cmpKey = (x: Key, y: Key) => (x.ts !== y.ts ? x.ts - y.ts : x.sig !== y.sig ? (x.sig < y.sig ? -1 : 1) : x.ix - y.ix);

export async function tokenLedger(q: Q, mint: string, ctx: ReadCtx, p: LedgerParams) {
  const now = ctx.now ?? Date.now();
  const tok = (await q.query("SELECT mint, symbol, tier, anti_sniper, creator, created_at, trades, updated_at FROM tokens WHERE mint = $1", [mint])).rows[0];
  if (!tok) return null;
  const tables = await openbookTables(q, now);
  const agg = tables ? await aggRow(q, mint) : null;
  const h = filterHash(p, mint);
  const cur = p.cursor ? decodeCursor(p.cursor, h) : null;
  const createdAt = Number(tok.created_at), creator: string = tok.creator, tier = tierOf(tok.tier), anti = !!tok.anti_sniper;
  const createSlot = agg?.create_slot != null ? Number(agg.create_slot) : null;

  let sniperWallets: string[] | null = null;
  if (p.sniper) sniperWallets = (await q.query(`SELECT DISTINCT wallet FROM (SELECT wallet FROM trades WHERE mint = $1 AND side = 'buy' AND ts >= $2 AND ts <= $3 AND wallet <> $4
      ORDER BY ts LIMIT 2000) x`, [mint, createdAt - 1000, createdAt + p.windowSec * 1000, creator])).rows.map((r) => r.wallet);

  // page direction: 'after' walks in p.order; 'before' walks back (reverse order) and the page is flipped afterwards
  const back = cur?.dir === "before";
  const desc = (p.order === "desc") !== back;
  const op = desc ? "<" : ">", ord = desc ? "DESC" : "ASC", n = p.limit + 1;
  const wantTrades = (p.status == null || p.status === "success") && (!sniperWallets || sniperWallets.length > 0);
  const wantFailed = tables && p.side == null && p.status !== "success" && (!sniperWallets || sniperWallets.length > 0);

  const tw: string[] = ["t.mint = $1"], tp: unknown[] = [mint];
  const add = (w: string[], ps: unknown[], sql: (i: number) => string, v: unknown) => { ps.push(v); w.push(sql(ps.length)); };
  if (p.wallet) add(tw, tp, (i) => `t.wallet = $${i}`, p.wallet);
  if (p.side) add(tw, tp, (i) => `t.side = $${i}`, p.side);
  if (sniperWallets) add(tw, tp, (i) => `t.wallet = ANY($${i})`, sniperWallets);
  if (cur) { tp.push(cur.key.ts, cur.key.sig, cur.key.ix); tw.push(`(t.ts, t.sig, t.ix_idx) ${op} ($${tp.length - 2}::bigint, $${tp.length - 1}::text, $${tp.length}::int)`); }
  const ext = tables ? `, t.slot, t.tx_idx, t.fee_lamports, t.trading_fee_lamports, t.protocol_fee_lamports, t.anti_sniper_fee_lamports, t.price_pre_sol, t.price_post_sol, t.min_out_raw`
    : `, NULL::bigint AS slot, NULL::int AS tx_idx, NULL::bigint AS fee_lamports, NULL::bigint AS trading_fee_lamports, NULL::bigint AS protocol_fee_lamports,
       NULL::bigint AS anti_sniper_fee_lamports, NULL::float8 AS price_pre_sol, NULL::float8 AS price_post_sol, NULL::text AS min_out_raw`;
  const trades = wantTrades ? (await q.query(`SELECT t.sig, t.ix_idx, t.ts, t.side, t.wallet, t.sol, t.tokens, t.fee_sol, t.via_ui, t.dev_buy, t.referral_fee_lamports${ext}
      FROM trades t WHERE ${tw.join(" AND ")} ORDER BY t.ts ${ord}, t.sig ${ord}, t.ix_idx ${ord} LIMIT ${n}`, tp)).rows : [];

  const fw: string[] = ["f.mint = $1"], fp: unknown[] = [mint];
  if (p.wallet) add(fw, fp, (i) => `f.wallet = $${i}`, p.wallet);
  if (sniperWallets) add(fw, fp, (i) => `f.wallet = ANY($${i})`, sniperWallets);
  if (p.status === "failed" || p.status === "duplicate") add(fw, fp, (i) => `f.status = $${i}`, p.status);
  if (cur) { fp.push(cur.key.ts, cur.key.sig, cur.key.ix); fw.push(`(f.ts, f.sig, -1) ${op} ($${fp.length - 2}::bigint, $${fp.length - 1}::text, $${fp.length}::int)`); }
  const failed = wantFailed ? (await q.query(`SELECT f.sig, f.ts, f.slot, f.wallet, f.err, f.fee_lamports, f.status, f.duplicate_of FROM failed_attempts f
      WHERE ${fw.join(" AND ")} ORDER BY f.ts ${ord}, f.sig ${ord} LIMIT ${n}`, fp)).rows : [];

  type Item = { key: Key; t?: any; f?: any };
  let items: Item[] = [...trades.map((t) => ({ key: { ts: Number(t.ts), sig: t.sig, ix: Number(t.ix_idx) }, t })), ...failed.map((f) => ({ key: { ts: Number(f.ts), sig: f.sig, ix: -1 }, f }))];
  items.sort((x, y) => (desc ? -cmpKey(x.key, y.key) : cmpKey(x.key, y.key)));
  const more = items.length > p.limit;
  items = items.slice(0, p.limit);
  if (back) items.reverse();

  // enrich: tx costs + duplicate sends of landed rows
  const landed = items.filter((i) => i.t).map((i) => i.key.sig);
  const [costs, dups] = tables && landed.length ? await Promise.all([
    q.query(`SELECT * FROM trade_costs WHERE sig = ANY($1)`, [landed]),
    q.query(`SELECT sig, duplicate_of, status FROM failed_attempts WHERE duplicate_of = ANY($1)`, [landed]),
  ]) : [{ rows: [] as any[] }, { rows: [] as any[] }];
  const cost = new Map(costs.rows.map((c) => [c.sig, c]));
  const dupOf = new Map<string, { sig: string; status: string }[]>();
  for (const d of dups.rows) { const l = dupOf.get(d.duplicate_of) ?? []; l.push({ sig: d.sig, status: d.status }); dupOf.set(d.duplicate_of, l); }

  const rows = items.map((it) => (it.t ? landedRow(it.t, cost.get(it.t.sig) ?? null, dupOf.get(it.t.sig) ?? [], { createdAt, createSlot, creator, tier, anti, windowSec: p.windowSec, ctx })
    : failedRow(it.f, { createdAt, createSlot, creator })));

  // totals: aggregate counters for unfiltered / side / status views (exact), capped counts for wallet / sniper views
  const a = agg ?? {};
  let total: number | null = null, totalExact = true;
  if (!p.wallet && !sniperWallets) {
    const tr = agg ? (p.side === "buy" ? Number(a.buys) : p.side === "sell" ? Number(a.sells) : Number(a.trades)) : Number(tok.trades);
    const fa = Number(a.failed_attempts ?? 0), du = Number(a.duplicate_attempts ?? 0);
    total = p.status === "success" ? tr : p.status === "failed" ? fa - du : p.status === "duplicate" ? du : p.status === "notok" ? fa : tr + (p.side ? 0 : fa);
  } else {
    const CAP = 10_000; totalExact = false;
    const tc = wantTrades ? Number((await q.query(`SELECT count(*)::int AS n FROM (SELECT 1 FROM trades t WHERE ${tw.filter((w) => !w.startsWith("(t.ts")).join(" AND ")} LIMIT ${CAP}) x`,
      tp.slice(0, cur ? tp.length - 3 : tp.length))).rows[0].n) : 0;
    const fc = wantFailed ? Number((await q.query(`SELECT count(*)::int AS n FROM (SELECT 1 FROM failed_attempts f WHERE ${fw.filter((w) => !w.startsWith("(f.ts")).join(" AND ")} LIMIT ${CAP}) x`,
      fp.slice(0, cur ? fp.length - 3 : fp.length))).rows[0].n) : 0;
    total = tc + fc; totalExact = tc < CAP && fc < CAP;
  }
  const first = items[0]?.key, last = items[items.length - 1]?.key;
  const nextCursor = back ? (last && cur ? encodeCursor(last, "after", h) : null) : more && last ? encodeCursor(last, "after", h) : null;
  const prevCursor = back ? (more && first ? encodeCursor(first, "before", h) : null) : cur && first ? encodeCursor(first, "before", h) : null;
  const meta: Meta = { network: ctx.network, indexState: indexState(tables, agg, tok, now), indexedSlot: num(a.last_slot), indexedAt: num(a.updated_at),
    generatedAt: now, maxAgeMs: cur ? TOKEN_MAX_AGE_MS : 10_000, costsAvailable: tables && Number(a.cost_txs ?? 0) > 0 };
  return { meta, mint, symbol: tok.symbol as string, filter: { wallet: p.wallet, side: p.side, status: p.status, sniper: p.sniper, window: p.windowSec, order: p.order },
    total, totalExact, totalCap: totalExact ? null : 10_000, nextCursor, prevCursor, rows };
}

interface RowCtx { createdAt: number; createSlot: number | null; creator: string; tier: TierId; anti: boolean; windowSec: number; ctx: ReadCtx }

function landedRow(t: any, c: any | null, dups: { sig: string; status: string }[], r: RowCtx) {
  const split = splitOfRow(t, r.tier, r.anti);
  const exactParts = t.trading_fee_lamports != null && t.protocol_fee_lamports != null;
  const slot = num(t.slot), slotOffset = slot == null || r.createSlot == null ? null : slot - r.createSlot, offsetMs = Number(t.ts) - r.createdAt;
  const solN = Number(t.sol), solL = BigInt(Math.round(solN * 1e9));
  const tags: string[] = [];
  if (t.wallet === r.creator) tags.push("dev");
  else {
    if (slotOffset != null && slotOffset <= OPENBOOK_SNIPER_SLOTS) tags.push("sniper");
    if (t.side === "buy" && offsetMs <= r.windowSec * 1000) tags.push("early");
  }
  const tipsList = c ? (jsonRow(c.tips) ?? []).map((x: any) => ({ provider: x.provider as string, sol: S(L(x.lamports)), account: x.to as string })) : [];
  const tipsL = c ? L(c.tips_lamports) : null, otherL = c ? L(c.other_transfer_lamports) : 0n;
  const basis = t.side === "buy" ? solL : solL + split.total;
  const feeBps = basis > 0n ? (Number(split.total) / Number(basis)) * 10_000 : null;
  const tokensRaw = BigInt(Math.round(Number(t.tokens) * 1e6));
  const allInL = split.total + (c ? L(c.base_fee_lamports) + L(c.priority_fee_lamports) + (tipsL ?? 0n) + otherL : 0n);
  return {
    sig: t.sig as string, ixIdx: Number(t.ix_idx), ts: Number(t.ts), slot, slotOffset, offsetMs, type: t.side as "buy" | "sell", wallet: t.wallet as string, label: null,
    sol: solN, tokenAmount: Number(t.tokens), viaUi: !!t.via_ui,
    baseFeeSol: c ? S(L(c.base_fee_lamports)) : null, priorityFeeSol: c ? S(L(c.priority_fee_lamports)) : null,
    tipSol: tipsL != null && tipsL > 0n ? S(tipsL) : null, tipProviders: [...new Set(tipsList.map((x: any) => x.provider))],
    dbcFeeSol: S(split.total), status: "success" as const, tags,
    detail: {
      network: c ? { feePayer: c.fee_payer as string, signatures: Number(c.signatures), feeSol: S(L(c.fee_lamports)), baseFeeSol: S(L(c.base_fee_lamports)),
        priorityFeeSol: S(L(c.priority_fee_lamports)), computeUnitLimit: num(c.cu_limit), computeUnitsConsumed: num(c.cu_consumed), cuPriceMicroLamports: num(c.cu_price_micro_lamports),
        priorityFeeFromBudgetSol: S(L(c.priority_fee_budget_lamports)), txIdx: num(c.tx_idx),
        provenance: { baseFeeSol: "exact", priorityFeeSol: "exact", priorityFeeFromBudgetSol: "derived" } } : null,
      tips: tipsList, tipsTotalSol: tipsL == null ? null : S(tipsL),
      otherTransfers: c ? (jsonRow(c.other_transfers) ?? []).map((x: any) => ({ to: x.to as string, sol: S(L(x.lamports)), kind: x.kind })) : [],
      setupSol: c ? S(L(c.setup_lamports)) : null, signerSolDeltaSol: c && c.signer_sol_delta_lamports != null ? S(L(c.signer_sol_delta_lamports)) : null,
      dbc: { feeBps, offsetMs, slotOffset, totalSol: S(split.total), totalProvenance: (split.totalExact ? "exact" : "derived") as Provenance,
        shares: shares(split, r.creator, r.ctx, exactParts), antiSniperSol: r.anti ? S(split.antiSniper) : null, antiSniperProvenance: "derived" as Provenance, baseFeeBps: CURVE_FEE_BPS,
        pricePreSol: num(t.price_pre_sol), pricePostSol: num(t.price_post_sol),
        priceImpactPct: t.price_pre_sol && t.price_post_sol ? (Number(t.price_post_sol) / Number(t.price_pre_sol) - 1) * 100 : null,
        priceProvenance: { pricePreSol: "derived", pricePostSol: "exact" },
        minOutHeadroomPct: t.side === "buy" ? minOutHeadroomPct(tokensRaw, t.min_out_raw == null ? null : BigInt(t.min_out_raw)) : null },
      tx: { tokenAmount: Number(t.tokens), duplicates: dups },
      allIn: c ? { costSol: S(allInL), pctOnTop: solN > 0 ? (S(allInL) / solN) * 100 : null, spentSol: solN } : null,
    },
  };
}

function failedRow(f: any, r: { createdAt: number; createSlot: number | null; creator: string }) {
  const slot = Number(f.slot), slotOffset = r.createSlot == null ? null : slot - r.createSlot;
  const fee = f.fee_lamports == null ? null : S(L(f.fee_lamports));
  return {
    sig: f.sig as string, ixIdx: null, ts: Number(f.ts), slot, slotOffset, offsetMs: Number(f.ts) - r.createdAt, type: null, wallet: (f.wallet ?? null) as string | null, label: null,
    sol: null, tokenAmount: null, viaUi: null, baseFeeSol: null, priorityFeeSol: null, feeSol: fee, tipSol: null, tipProviders: [] as string[], dbcFeeSol: null,
    status: f.status as "failed" | "duplicate", duplicateOf: (f.duplicate_of ?? null) as string | null, tags: f.wallet === r.creator ? ["dev"] : [],
    detail: { network: fee == null ? null : { feeSol: fee, provenance: { feeSol: "exact" } }, err: jsonRow(f.err), tips: [], tipsTotalSol: null, dbc: null,
      tx: { tokenAmount: null, duplicates: [] }, allIn: fee == null ? null : { costSol: fee, pctOnTop: null, spentSol: null } },
  };
}

export const LEDGER_CSV_COLUMNS = ["ts", "slot", "slotOffset", "type", "wallet", "sol", "tokenAmount", "baseFeeSol", "priorityFeeSol", "tipSol", "tipProviders", "dbcFeeSol", "status", "tags", "sig"] as const;
export function ledgerCsvLine(r: Record<string, any>): string {
  return LEDGER_CSV_COLUMNS.map((k) => { const v = r[k]; const s = v == null ? "" : Array.isArray(v) ? v.join("+") : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(",");
}

// =====================================================================================================================
// GET /openbook?window=all|30d|7d|24h
// =====================================================================================================================
export type Window = "all" | "30d" | "7d" | "24h";
const WINDOW_DAYS: Record<Window, number | null> = { all: null, "30d": 30, "7d": 7, "24h": 1 };
export function windowStart(w: Window, now: number): { startMs: number | null; startDay: string | null } {
  const d = WINDOW_DAYS[w];
  if (d == null) return { startMs: null, startDay: null };
  const startMs = now - d * 86_400_000;
  return { startMs, startDay: new Date(startMs).toISOString().slice(0, 10) };
}

export async function platformOpenBook(q: Q, ctx: ReadCtx, window: Window) {
  const now = ctx.now ?? Date.now();
  const tables = await openbookTables(q, now);
  const { startMs, startDay } = windowStart(window, now);
  const g = ctx.goPublic;
  const tk = (await q.query(`SELECT count(*)::int AS n, count(*) FILTER (WHERE is_migrated)::int AS m, count(DISTINCT creator)::int AS c,
      coalesce(sum(volume_sol),0)::float8 AS v, coalesce(sum(fees_sol),0)::float8 AS f, coalesce(sum(trades),0)::int AS t, max(updated_at) AS u
      FROM tokens WHERE ($1::bigint IS NULL OR created_at >= $1)`, [startMs])).rows[0];
  const migratedInWindow = startMs == null ? Number(tk.m) : Number((await q.query("SELECT count(*)::int AS n FROM tokens WHERE migrated_at >= $1", [startMs])).rows[0].n);

  let totals: any, feeFlowRecipients: any, tipsRows: any[] = [], agg: any = null;
  if (tables) {
    agg = (await q.query(`SELECT coalesce(sum(trades),0)::text AS trades, coalesce(sum(volume_lamports),0)::text AS vol, coalesce(sum(fee_total_lamports),0)::text AS dbc,
        coalesce(sum(fee_protocol_lamports),0)::text AS prot, coalesce(sum(fee_referral_lamports),0)::text AS refl, coalesce(sum(fee_creator_lamports),0)::text AS cre,
        coalesce(sum(fee_platform_lamports),0)::text AS plat, coalesce(sum(fee_anti_sniper_lamports),0)::text AS anti, coalesce(sum(tips_lamports),0)::text AS tips,
        coalesce(sum(sniper_tips_lamports),0)::text AS stips, coalesce(sum(base_fee_lamports),0)::text AS base, coalesce(sum(priority_fee_lamports),0)::text AS prio,
        coalesce(sum(cost_txs),0)::text AS ctx, max(last_slot) AS slot, max(updated_at) AS at, count(*)::int AS n,
        count(*) FILTER (WHERE fee_creator_lamports > 0)::int AS creators FROM token_openbook_agg`)).rows[0];
    const src = startDay == null ? agg : (await q.query(`SELECT coalesce(sum(trades),0)::text AS trades, coalesce(sum(volume_lamports),0)::text AS vol, coalesce(sum(fee_lamports),0)::text AS dbc,
        coalesce(sum(fee_protocol_lamports),0)::text AS prot, coalesce(sum(fee_referral_lamports),0)::text AS refl, coalesce(sum(fee_creator_lamports),0)::text AS cre,
        coalesce(sum(fee_platform_lamports),0)::text AS plat, coalesce(sum(fee_anti_sniper_lamports),0)::text AS anti, coalesce(sum(tips_lamports),0)::text AS tips,
        coalesce(sum(sniper_tips_lamports),0)::text AS stips, coalesce(sum(base_fee_lamports),0)::text AS base, coalesce(sum(priority_fee_lamports),0)::text AS prio,
        (SELECT count(DISTINCT k.creator)::int FROM token_openbook_daily d2 JOIN tokens k ON k.mint = d2.mint WHERE d2.day >= $1 AND d2.fee_creator_lamports > 0) AS creators
        FROM token_openbook_daily WHERE day >= $1`, [startDay])).rows[0];
    const vol = L(src.vol), dbc = L(src.dbc), tips = L(src.tips), base = L(src.base), prio = L(src.prio), paid = dbc + tips + base + prio;
    totals = { tokensLaunched: Number(tk.n), migratedCount: migratedInWindow, volumeSol: S(vol), volumeUsd: null, txCount: Number(src.trades),
      feesPaidSol: S(paid), feesPctOfVolume: pct(paid, vol), dbcFeesSol: S(dbc), dbcPctOfVolume: pct(dbc, vol),
      creatorsEarnedSol: S(L(src.cre)), creatorCount: Number(src.creators), tipsSol: S(tips), sniperTipPct: pct(L(src.stips), tips),
      antiSniperSol: S(L(src.anti)), provenance: { volumeSol: "exact", dbcFeesSol: "exact", creatorsEarnedSol: "derived", tipsSol: "exact", feesPaidSol: "exact" } };
    feeFlowRecipients = { src, vol, dbc, tips, base, prio, paid };
    tipsRows = (await q.query(`SELECT provider, sum(lamports)::text AS l, sum(txs)::int AS n, sum(sniper_lamports)::text AS s FROM token_tip_agg GROUP BY provider ORDER BY sum(lamports) DESC, provider`)).rows;
  } else {
    totals = { tokensLaunched: Number(tk.n), migratedCount: migratedInWindow, volumeSol: Number(tk.v), volumeUsd: null, txCount: Number(tk.t),
      feesPaidSol: null, feesPctOfVolume: null, dbcFeesSol: Number(tk.f), dbcPctOfVolume: pct(Number(tk.f), Number(tk.v)), creatorsEarnedSol: null, creatorCount: Number(tk.c),
      tipsSol: null, sniperTipPct: null, antiSniperSol: null, provenance: { volumeSol: "exact", dbcFeesSol: "derived" } };
  }

  // fee flow
  const splits = (await q.query(`SELECT count(*)::int AS n, coalesce(sum(gross_lamports),0)::text AS g, coalesce(sum(cashback_lamports),0)::text AS c, coalesce(sum(buyback_lamports),0)::text AS b,
      coalesce(sum(ops_lamports),0)::text AS o, coalesce(sum(treasury_lamports),0)::text AS t, coalesce(sum(creator_rebate_lamports),0)::text AS r, coalesce(sum(shortfall_lamports),0)::text AS s
      FROM treasury_splits WHERE ${periodOnOrAfter("period", g)} AND ($1::text IS NULL OR period >= $1)`, [startDay])).rows[0];
  const claims = (await q.query(`SELECT source, coalesce(sum(lamports),0)::text AS l, count(*)::int AS n FROM fee_claims WHERE ${claimedOnOrAfter("claimed_at", g)}
      AND ($1::bigint IS NULL OR claimed_at >= $1) GROUP BY source`, [startMs])).rows;
  const cashback = (await q.query(`SELECT coalesce(sum(amount_lamports),0)::text AS l, count(*)::int AS n, count(DISTINCT wallet)::int AS w FROM cashback_ledger
      WHERE paid_sig IS NOT NULL AND ${periodOnOrAfter("period", g)} AND ($1::bigint IS NULL OR paid_at >= $1)`, [startMs])).rows[0];
  const burns = await burnStats(q, ctx.barMint);
  const ff = feeFlowRecipients;
  const TOP = 3;
  const tipsOut = tipsRows.slice(0, TOP).map((r) => ({ provider: r.provider as string, sol: S(L(r.l)), txCount: Number(r.n), sniperSol: S(L(r.s)) }));
  const rest = tipsRows.slice(TOP);
  if (rest.length) tipsOut.push({ provider: "others", sol: S(rest.reduce((s, r) => s + L(r.l), 0n)), txCount: rest.reduce((s, r) => s + Number(r.n), 0), sniperSol: S(rest.reduce((s, r) => s + L(r.s), 0n)) });
  const feeFlow = ff ? {
    window: window === "all" ? "all" : window, tipsWindow: "all" as const,
    tradersSol: S(ff.paid), feeTypes: { dbcSol: S(ff.dbc), tipsSol: S(ff.tips), networkSol: S(ff.base + ff.prio) },
    recipients: { meteoraSol: S(L(ff.src.prot)), creatorsSol: S(L(ff.src.cre)), platformSol: S(L(ff.src.plat)), referrersSol: S(L(ff.src.refl)), tips: tipsOut,
      validatorsSol: S(ff.prio + ff.base / 2n), burnedBaseFeeSol: S(ff.base - ff.base / 2n) },
    splitPct: { meteora: pct(L(ff.src.prot), ff.dbc), creators: pct(L(ff.src.cre), ff.dbc), platform: pct(L(ff.src.plat), ff.dbc), referrers: pct(L(ff.src.refl), ff.dbc) },
    platformPctOfFees: pct(L(ff.src.plat), ff.paid), tipsPctOfFees: pct(ff.tips, ff.paid), provenance: "derived" as Provenance,
  } : null;
  const platformUse = { basis: "closed treasury periods on or after GO_PUBLIC_DATE (treasury_splits)", periods: Number(splits.n), grossSol: S(L(splits.g)),
    lpRebateSol: S(L(splits.r)), cashbackSol: S(L(splits.c)), buybackSol: S(L(splits.b)), opsSol: S(L(splits.o)), treasurySol: S(L(splits.t)), shortfallSol: S(L(splits.s)),
    pct: { buyback: SPLIT_BPS.buyback / 100, ops: SPLIT_BPS.ops / 100, treasury: SPLIT_BPS.treasury / 100 }, provenance: "exact" as Provenance };
  const claimMap = Object.fromEntries(claims.map((r) => [r.source, { sol: S(L(r.l)), count: Number(r.n) }]));

  const meta: Meta = { network: ctx.network, indexState: !tables ? "pending" : "synced", indexedSlot: num(agg?.slot), indexedAt: num(agg?.at), generatedAt: now, maxAgeMs: PLATFORM_MAX_AGE_MS,
    costsAvailable: tables && Number(agg?.ctx ?? 0) > 0 };
  return {
    meta, window, windowStartMs: startMs, windowGranularity: startDay ? "utc-day" : null, higherMint: ctx.barMint,
    totals, feeFlow, platformUse,
    claims: { dbcTrading: claimMap.dbc_trading ?? { sol: 0, count: 0 }, dbcMigration: claimMap.dbc_migration ?? { sol: 0, count: 0 },
      dbcSurplus: claimMap.dbc_surplus ?? { sol: 0, count: 0 }, dammLp: claimMap.damm_lp ?? { sol: 0, count: 0 }, provenance: "exact" as Provenance },
    cashbackPaid: { sol: S(L(cashback.l)), payouts: Number(cashback.n), wallets: Number(cashback.w), provenance: "exact" as Provenance },
    buyback: { status: ctx.barMint ? "live" : "soon", burnedTokens: burns.burnedTokens, buybackTxCount: burns.count, lastSig: burns.lastSig, lastAt: burns.lastAt, solSpent: burns.solSpent },
    treasuryWallets: tables ? await walletCards(q, window, now) : [],
  };
}

/** Wallet cards from wallet_snapshots (job-written; never a live read). spark = 24 evenly spaced points over the window (all = 30 d). */
export async function walletCards(q: Q, window: Window, now: number) {
  const span = (WINDOW_DAYS[window] ?? 30) * 86_400_000, step = Math.floor(span / 24), from = now - span;
  const latest = (await q.query(`SELECT DISTINCT ON (address) address, taken_at, roles, lamports::text AS l, wsol_lamports::text AS w, bar_raw, slot
      FROM wallet_snapshots ORDER BY address, taken_at DESC`)).rows;
  if (!latest.length) return [];
  const hist = (await q.query(`SELECT DISTINCT ON (address, b) address, b, taken_at, lamports::text AS l FROM (
        SELECT address, LEAST(floor((taken_at - $1) / $2::float8)::int, 23) AS b, taken_at, lamports FROM wallet_snapshots WHERE taken_at >= $1) x
      ORDER BY address, b, taken_at DESC`, [from, step])).rows;
  const ago = (await q.query(`SELECT DISTINCT ON (address) address, lamports::text AS l, taken_at FROM wallet_snapshots WHERE taken_at <= $1 ORDER BY address, taken_at DESC`, [now - 86_400_000])).rows;
  const agoMap = new Map(ago.map((r) => [r.address, L(r.l)]));
  const sp = new Map<string, { ts: number; balanceSol: number }[]>();
  for (const h of hist) { const l = sp.get(h.address) ?? []; if (Number(h.b) < 24) l.push({ ts: Number(h.taken_at), balanceSol: S(L(h.l)) }); sp.set(h.address, l); }
  return latest.map((r) => {
    const bal = r.l == null ? null : L(r.l), prev = agoMap.get(r.address);
    return { address: r.address as string, roles: String(r.roles).split(",").filter(Boolean), owner: null, ownerLabel: null,
      balanceSol: bal == null ? null : S(bal), wsolSol: r.w == null ? null : S(L(r.w)), higherHeldTokens: r.bar_raw == null ? null : Number(r.bar_raw) / 1e6,
      balanceAt: Number(r.taken_at), slot: num(r.slot), netChange24hSol: bal != null && prev != null ? S(bal - prev) : null,
      spark: (sp.get(r.address) ?? []).sort((x, y) => x.ts - y.ts), provenance: "exact" as Provenance };
  });
}

// =====================================================================================================================
// GET /openbook/tokens?q&status&sort&order&cursor&limit
// =====================================================================================================================
export type TokenSort = "relevance" | "volume" | "dbcFees" | "creatorEarned" | "tips" | "sniperTipPct" | "created";
export interface TokensParams { q: SearchQuery | null; status: "all" | "bonding" | "migrated"; sort: TokenSort; order: "desc" | "asc"; limit: number; cursor: string | null }
const SORT_EXPR = (tables: boolean): Record<Exclude<TokenSort, "relevance">, string> => tables ? {
  volume: "coalesce(a.volume_lamports, round(t.volume_sol * 1e9)::bigint)::numeric", dbcFees: "coalesce(a.fee_total_lamports, round(t.fees_sol * 1e9)::bigint)::numeric",
  creatorEarned: "coalesce(a.fee_creator_lamports, 0)::numeric", tips: "coalesce(a.tips_lamports, 0)::numeric",
  sniperTipPct: "(CASE WHEN coalesce(a.tips_lamports,0) > 0 THEN round(a.sniper_tips_lamports::numeric * 1000000 / a.tips_lamports) ELSE 0 END)::numeric", created: "t.created_at::numeric",
} : { volume: "round(t.volume_sol * 1e9)::numeric", dbcFees: "round(t.fees_sol * 1e9)::numeric", creatorEarned: "0::numeric", tips: "0::numeric", sniperTipPct: "0::numeric", created: "t.created_at::numeric" };

export async function platformTokens(q: Q, ctx: ReadCtx, p: TokensParams) {
  const now = ctx.now ?? Date.now();
  const tables = await openbookTables(q, now);
  const sort: TokenSort = p.sort === "relevance" && !p.q ? "volume" : p.sort;
  const fh = createHash("sha256").update(JSON.stringify(["tokens", p.q?.q ?? null, p.status, sort, p.order])).digest("base64url").slice(0, 12);
  const w: string[] = [], ps: unknown[] = [];
  const push = (v: unknown) => { ps.push(v); return `$${ps.length}`; };
  let rankExpr = "0", whereParams = 0;
  if (p.q) {
    // services/search.ts searchTokens: symbol / name ILIKE (wildcards escaped), mint exact or case-sensitive prefix (>= MINT_PREFIX_MIN chars)
    const like = `${push(escapeLike(p.q.lower))}::text`, prefix = `${push(p.q.base58 && p.q.q.length >= MINT_PREFIX_MIN ? `${escapeLike(p.q.q)}%` : null)}::text`, exact = `${push(p.q.q)}::text`;
    whereParams = ps.length; // the count query reuses only the WHERE params (pg rejects an unused $n)
    const lower = `${push(p.q.lower)}::text`;
    w.push(`(lower(t.symbol) LIKE '%' || ${like} || '%' ESCAPE '\\' OR lower(t.name) LIKE '%' || ${like} || '%' ESCAPE '\\' OR t.mint = ${exact} OR (${prefix} IS NOT NULL AND t.mint LIKE ${prefix} ESCAPE '\\'))`);
    rankExpr = `(CASE WHEN lower(t.symbol) = ${lower} OR t.mint = ${exact} THEN 0 WHEN lower(t.symbol) LIKE ${like} || '%' ESCAPE '\\' THEN 1
      WHEN lower(t.name) LIKE ${like} || '%' ESCAPE '\\' OR (${prefix} IS NOT NULL AND t.mint LIKE ${prefix} ESCAPE '\\') THEN 2 ELSE 3 END)`;
  }
  if (p.status === "bonding") w.push("NOT t.is_migrated"); else if (p.status === "migrated") w.push("t.is_migrated");
  const ex = SORT_EXPR(tables);
  // ordered keys: relevance = rank ASC, volume DESC, mint ASC; otherwise sortExpr <order>, mint <order>
  const keys: { expr: string; dir: "ASC" | "DESC" }[] = sort === "relevance"
    ? [{ expr: rankExpr, dir: "ASC" }, { expr: ex.volume, dir: "DESC" }, { expr: "t.mint", dir: "ASC" }]
    : [{ expr: ex[sort], dir: p.order === "asc" ? "ASC" : "DESC" }, { expr: "t.mint", dir: p.order === "asc" ? "ASC" : "DESC" }];
  const baseWhere = [...w], baseParams = ps.slice(0, whereParams);
  if (p.cursor) {
    let c: any;
    try { c = JSON.parse(Buffer.from(p.cursor, "base64url").toString("utf8")); } catch { throw new CursorError("bad cursor"); }
    if (!c || c.v !== 1 || c.h !== fh || !Array.isArray(c.k) || c.k.length !== keys.length) throw new CursorError("cursor was issued for a different filter set");
    const ors: string[] = [];
    const lit = (j: number) => `${push(String(c.k[j]))}${keys[j].expr === "t.mint" ? "" : "::numeric"}`;
    for (let i = 0; i < keys.length; i++) {
      const eq = keys.slice(0, i).map((k, j) => `${k.expr} = ${lit(j)}`);
      ors.push(`(${[...eq, `${keys[i].expr} ${keys[i].dir === "DESC" ? "<" : ">"} ${lit(i)}`].join(" AND ")})`);
    }
    w.push(`(${ors.join(" OR ")})`);
  }
  const join = tables ? "LEFT JOIN token_openbook_agg a ON a.mint = t.mint" : "";
  const sel = tables
    ? `a.volume_lamports::text AS vol, a.fee_total_lamports::text AS dbc, a.fee_creator_lamports::text AS cre, a.tips_lamports::text AS tips, a.sniper_tips_lamports::text AS stips`
    : `NULL AS vol, NULL AS dbc, NULL AS cre, NULL AS tips, NULL AS stips`;
  const rows = (await q.query(`SELECT t.mint, t.name, t.symbol, t.uri, t.tier, t.pool, t.damm_pool, t.is_migrated, t.progress, t.volume_sol, t.fees_sol, ${sel},
      ${keys.map((k, i) => `(${k.expr})::text AS k${i}`).join(", ")}
      FROM tokens t ${join} ${w.length ? "WHERE " + w.join(" AND ") : ""} ORDER BY ${keys.map((k) => `${k.expr} ${k.dir}`).join(", ")} LIMIT ${p.limit + 1}`, ps)).rows;
  const total = Number((await q.query(`SELECT count(*)::int AS n FROM tokens t ${baseWhere.length ? "WHERE " + baseWhere.join(" AND ") : ""}`, baseParams)).rows[0].n);
  const more = rows.length > p.limit, page = rows.slice(0, p.limit), last = page[page.length - 1];
  const nextCursor = more && last ? Buffer.from(JSON.stringify({ v: 1, h: fh, k: keys.map((_, i) => last[`k${i}`]) })).toString("base64url") : null;
  const meta: Meta = { network: ctx.network, indexState: tables ? "synced" : "pending", indexedSlot: null, indexedAt: null, generatedAt: now, maxAgeMs: PLATFORM_MAX_AGE_MS, costsAvailable: tables };
  return { meta, total, sort, order: sort === "relevance" ? null : p.order, nextCursor, rows: page.map((r) => {
    const tips = r.tips == null ? null : L(r.tips);
    return { mint: r.mint as string, name: r.name as string, symbol: r.symbol as string, uri: r.uri as string, tier: tierOf(r.tier),
      volumeSol: r.vol == null ? Number(r.volume_sol) : S(L(r.vol)), dbcFeesSol: r.dbc == null ? Number(r.fees_sol) : S(L(r.dbc)),
      creatorEarnedSol: r.cre == null ? null : S(L(r.cre)), tipsSol: tips == null ? null : S(tips), sniperTipPct: tips == null ? null : pct(L(r.stips), tips),
      status: r.is_migrated ? (r.damm_pool ? "migrated" : "migrating") : "bonding", progressPct: r.is_migrated ? null : Math.min(100, Number(r.progress) * 100),
      pool: r.pool as string, dammPool: (r.damm_pool ?? null) as string | null,
      provenance: { volumeSol: "exact", dbcFeesSol: r.dbc == null ? "derived" : "exact", creatorEarnedSol: "derived", tipsSol: "exact" } };
  }) };
}
