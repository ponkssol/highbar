import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair } from "@solana/web3.js";
import { LP_REBATE_BPS, postMigrationSplit, TIERS } from "@hb/shared";
import { splitEpoch } from "./split.js";
import { waterfall } from "./treasury.js";
import { accrueRebates, dueByCreator, planRebate, refOf, runLpRebate, type LpClaim, type Rebate, type RebateStore } from "./lpRebate.js";
import type { Due, PayoutResult } from "./payouts.js";

const payer = Keypair.generate();
const creatorA = Keypair.generate().publicKey.toBase58(), creatorB = Keypair.generate().publicKey.toBase58();
const treasury = Keypair.generate().publicKey.toBase58(), referral = Keypair.generate().publicKey.toBase58();
const exclude = new Map([[payer.publicKey.toBase58(), "platform"], [treasury, "treasury"], [referral, "referral"]]);
const MIN = 10_000_000n; // 0.01 SOL

/** In-memory creator_lp_rebates + fee_claims with the same semantics as pgRebateStore. */
function memStore(claims: LpClaim[]) {
  const rows = new Map<string, Rebate & { pending?: string; paid?: string }>();
  const store: RebateStore & { rows: typeof rows; claims: LpClaim[] } = {
    rows, claims,
    async unaccrued() { return claims.filter((c) => !rows.has(`${c.sig}:${c.pool}`)); },
    async insert(rs) { let n = 0; for (const r of rs) if (!rows.has(refOf(r))) { rows.set(refOf(r), { ...r }); n++; } return n; },
    async unpaid() { return [...rows.values()].filter((r) => !r.paid && !r.pending && !r.skipReason && r.rebateLamports > 0n).map((r) => ({ creator: r.creator, ref: refOf(r), lamports: r.rebateLamports })); },
    async markPending(sig, b) { for (const d of b) for (const ref of d.ref) { const r = rows.get(ref)!; if (!r.paid && !r.pending && r.creator === d.wallet) r.pending = sig; } },
    async markPaid(sig) { for (const r of rows.values()) if (r.pending === sig) r.paid = sig; },
    async reconcile() {},
  };
  return store;
}
/** payBatches stand-in: one "tx" per wallet, pending then paid (live) or would-pay (dry-run). */
const paid: Due[] = [];
let n = 0;
const fakePay = async (o: { live: boolean; due: Due[]; markPending: (s: string, b: Due[]) => Promise<void>; markPaid: (s: string) => Promise<void> }): Promise<PayoutResult[]> => {
  const out: PayoutResult[] = [];
  for (const d of o.due) {
    if (!o.live) { out.push({ wallets: [d.wallet], refs: d.ref, lamports: d.lamports, status: "would-pay" }); continue; }
    const sig = `sig${++n}`;
    await o.markPending(sig, [d]); await o.markPaid(sig); paid.push(d);
    out.push({ wallets: [d.wallet], refs: d.ref, lamports: d.lamports, sig, status: "paid" });
  }
  return out;
};
const claim = (sig: string, lamports: bigint, tier: LpClaim["tier"] = "standard", baseAmount = 0n, mint = "MintA"): LpClaim => ({ sig, pool: "DammPool", mint, lamports, baseAmount, tier, dbcPool: `dbc-${mint}` });
const run = (store: RebateStore, creators: Record<string, string>, live = true) =>
  runLpRebate({ payer, live, exclude, store, creatorOf: async (p) => creators[p] ?? null, min: MIN, batch: 8, pay: fakePay as any, log: () => {} });

test("post-migration net shares: creator 0.60/0.65/0.70 %, platform 0.20/0.15/0.10 %, Meteora 0.20 % of volume", () => {
  const pct = (bps: number) => Math.round(bps * 1e4) / 1e4;
  const exp = { standard: [0.6, 0.2], higher: [0.65, 0.15], max: [0.7, 0.1] } as const;
  for (const t of Object.values(TIERS)) {
    const s = postMigrationSplit(t);
    assert.deepEqual([pct(s.creator / 100), pct(s.platform / 100), pct(s.protocol / 100)], [...exp[t.id], 0.2], t.id);
  }
});

test("rebate = floor(claimed * bps / 10000); dust stays with the platform (treasury)", () => {
  const r = planRebate(claim("s1", 1_000_001n), creatorA, exclude);
  assert.equal(r.rebateBps, LP_REBATE_BPS.standard);
  assert.equal(r.rebateLamports, 687_500n); // 687_500.6875 floored
  assert.equal(planRebate(claim("s2", 999n, "max"), creatorA, exclude).rebateLamports, 749n); // 749.25
  assert.equal(r.skipReason, null);
});

test("platform / treasury / referral (and off-curve) creators are skipped with a reason and rebate 0", () => {
  for (const [w, label] of exclude) {
    const r = planRebate(claim("s", 5_000_000_000n), w, exclude);
    assert.equal(r.rebateLamports, 0n); assert.match(r.skipReason!, new RegExp(label));
  }
  const pda = "Co24yjRpSdUBaycV24uZe9j7PnAqVmdiTrHqesV5U4XT"; // PDA of seed "x" under the system program: off-curve
  assert.equal(planRebate(claim("s", 5_000_000_000n), pda, exclude).skipReason, "creator is not an on-curve wallet");
  assert.equal(planRebate({ ...claim("s", 1n), tier: null }, "", exclude).skipReason, "token not indexed");
});

test("base-side LP fee > 0 raises an ALERT and only the SOL side is rebated", async () => {
  const store = memStore([claim("b1", 1_000_000_000n, "standard", 123n)]);
  const alerts: string[] = [];
  const acc = await accrueRebates(store, async () => creatorA, exclude, (m) => alerts.push(m));
  assert.equal(acc.alerts.length, 1); assert.match(alerts[0], /ALERT base-side LP fee 123/);
  assert.equal(acc.rows[0].rebateLamports, 687_500_000n);
  assert.equal(acc.rows[0].baseAmount, 123n);
});

test("rerun does not double-accrue or double-pay (idempotent per claim sig + pool)", async () => {
  paid.length = 0;
  const store = memStore([claim("r1", 1_000_000_000n), claim("r2", 2_000_000_000n, "max", 0n, "MintB")]);
  const creators = { "dbc-MintA": creatorA, "dbc-MintB": creatorB };
  const first = await run(store, creators);
  assert.equal(first.written, 2);
  assert.deepEqual(paid.map((d) => [d.wallet, d.lamports]), [[creatorA, 687_500_000n], [creatorB, 1_500_000_000n]]);
  const second = await run(store, creators);
  assert.equal(second.claims, 0); assert.equal(second.written, 0); assert.equal(second.payouts.length, 0);
  assert.equal(paid.length, 2);
  // a re-inserted row (e.g. a crashed run replaying its plan) is ignored too
  assert.equal(await store.insert(first.claims ? [...store.rows.values()] : []), 0);
  // a pending (sent, unconfirmed) payout is not paid again
  store.claims.push(claim("r3", 1_000_000_000n));
  await store.insert([planRebate(claim("r3", 1_000_000_000n), creatorA, exclude)]);
  await store.markPending("inflight", [{ wallet: creatorA, lamports: 687_500_000n, ref: ["r3:DammPool"] }]);
  assert.equal((await run(store, creators)).payouts.length, 0);
});

test("below LP_REBATE_MIN_PAYOUT_SOL the balance carries over and is paid once it reaches the minimum", async () => {
  paid.length = 0;
  // standard: 7_000_000 * 0.6875 = 4_812_500 lamports (< 0.01 SOL)
  const store = memStore([claim("c1", 7_000_000n)]);
  const creators = { "dbc-MintA": creatorA };
  const a = await run(store, creators);
  assert.equal(a.payouts.length, 0); assert.deepEqual(a.carried, [{ wallet: creatorA, lamports: 4_812_500n }]);
  store.claims.push(claim("c2", 8_000_000n)); // + 5_500_000 -> 10_312_500 >= min
  const b = await run(store, creators);
  assert.equal(b.carried.length, 0);
  assert.deepEqual(paid.map((d) => [d.wallet, d.lamports, d.ref.length]), [[creatorA, 10_312_500n, 2]]);
  assert.deepEqual(dueByCreator([{ creator: creatorB, ref: "x", lamports: MIN - 1n }], MIN).due, []);
});

test("dry-run plans and simulates but writes nothing", async () => {
  const store = memStore([claim("d1", 1_000_000_000n)]);
  const r = await run(store, { "dbc-MintA": creatorA }, false);
  assert.equal(r.written, 0); assert.equal(store.rows.size, 0);
  assert.equal(r.plannedLamports, 687_500_000n);
  assert.equal(r.payouts[0].status, "would-pay");
});

test("unreadable creator leaves the claim unaccrued for the next run", async () => {
  const store = memStore([claim("u1", 1_000_000_000n)]);
  const r = await run(store, {});
  assert.equal(r.unresolved, 1); assert.equal(store.rows.size, 0);
});

test("waterfall: rebate first, then cashback, then 40/50/10 (dust to treasury)", () => {
  assert.deepEqual(splitEpoch(1_000_001n, 50_000n, 300_000n), { gross: 1_000_001n, rebate: 300_000n, cashback: 50_000n, buyback: 260_000n, ops: 325_000n, treasury: 65_001n });
  assert.deepEqual(splitEpoch(1_000n, 0n), { gross: 1_000n, rebate: 0n, cashback: 0n, buyback: 400n, ops: 500n, treasury: 100n });
  assert.throws(() => splitEpoch(100n, 10n, 101n));
  assert.deepEqual(waterfall(100n, 30n, 80n), { gross: 100n, rebate: 80n, cashback: 30n, buyback: 0n, ops: 0n, treasury: 0n, shortfall: 10n });
});
