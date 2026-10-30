/** Fee claimer / cashback / buyback & burn jobs (BUILD_BRIEF section 6).
 *  tsx src/jobs/run.ts <fees|lprebate|cashback|buyback|epoch> [--period yesterday|YYYY-MM-DD] [--live | --dry-run] [--budget-sol 0.5] [--loop 3600]
 *  Dry-run (DRY_RUN unset/true, or --dry-run) simulates every tx and writes nothing. --live (or DRY_RUN=false) sends; mainnet also needs ALLOW_MAINNET=true.
 *  lprebate = accrue the creator LP rebate on new damm_lp fee claims and pay creators at or above LP_REBATE_MIN_PAYOUT_SOL (services/lpRebate.ts).
 *  epoch = claim fees -> creator LP rebate -> accrue + pay cashback for the closed period -> close the split (rebate, cashback, then 40/50/10)
 *  -> buy back & burn the buyback share.
 *  $HIGHER utility (step 8, BAR_MINT set): cashback adds the holder boost; barsnap = store a $HIGHER holder snapshot (run hourly);
 *  feeshare = accrue the holder fee share for a closed period (after epoch) and pay it (payouts also need BAR_FEE_SHARE_LIVE=true). */
import { referralWallet, loadPlatformKeypair } from "@hb/onchain";
import { requireDb, db } from "../db/pool.js";
import { migrate } from "../db/migrate.js";
import { FeeClaimer } from "../services/feeClaimer.js";
import { computeAccruals, payCashback, writeAccruals } from "../services/cashback.js";
import { closePeriod, previewSplit } from "../services/treasury.js";
import { estimateRebates, runLpRebate, type Excluded } from "../services/lpRebate.js";
import { runBuyback } from "../services/buyback.js";
import { jobs } from "./config.js";
import { assertCluster, show, sleep } from "./chain.js";
import { isClosed, period } from "./period.js";
import { bar } from "./barConfig.js";
import { barHolders, barMint, cashbackBoost, writeSnapshot } from "../services/bar.js";
import { payFeeShare, planFeeShare, writeFeeShare } from "../services/barFeeShare.js";
import { feeShareMinRaw } from "../services/barMath.js";
import { refreshOfficial } from "../services/officialToken.js";

const argv = process.argv.slice(2);
const cmd = argv[0];
const flag = (n: string) => argv.includes(`--${n}`);
const opt = (n: string) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
const live = flag("live") ? true : flag("dry-run") ? false : !jobs.dryRun;
const tag = live ? "" : "[DRY_RUN]";
const log = (m: string) => console.log(new Date().toISOString(), tag, m);

async function once() {
  const o = await refreshOfficial(); // official $HIGHER: BAR_MINT override, else the detected official launch
  log(o.mint ? `[official] $${o.symbol} ${o.mint} (${o.source})` : `[official] $${o.symbol} not launched yet`);
  const payer = loadPlatformKeypair();
  const p = period(opt("period"));
  const closed = isClosed(p);
  if (live && !closed && cmd !== "fees" && cmd !== "lprebate" && cmd !== "barsnap") throw new Error(`period ${p.id} is still open; live cashback / split / buyback only run for closed periods`);
  const exclude = [...new Set([payer.publicKey.toBase58(), jobs.treasury, safe(referralWallet), ...jobs.cashbackExclude].filter((x): x is string => !!x))];
  const res: Record<string, unknown> = { network: jobs.network, period: p.id, live };
  // creators that never get an LP rebate (cashbackExclude is a trader list and does not apply here)
  const rebateExclude: Excluded = new Map();
  for (const [w, label] of [[safe(referralWallet), "referral"], [jobs.treasury, "treasury"], [payer.publicKey.toBase58(), "platform"]] as const) if (w) rebateExclude.set(w, label);
  let accrued: bigint | undefined, wouldClaim = 0n, extraRebate = 0n;
  let wouldLp: { mint: string; lamports: bigint }[] = [];

  if (cmd === "fees" || cmd === "epoch") {
    const claims = await new FeeClaimer(payer, live).runAll(log);
    res.fees = claims.filter((c) => c.status !== "skipped" || c.note);
    if (!live) wouldClaim = claims.filter((c) => c.status === "would-claim").reduce((a, c) => a + c.lamports, 0n);
    if (!live) wouldLp = claims.filter((c) => c.status === "would-claim" && c.source === "damm_lp");
  }
  if (cmd === "lprebate" || cmd === "epoch") {
    const r = await runLpRebate({ payer, live, exclude: rebateExclude, log });
    res.lpRebate = r;
    // dry-run: neither this run's accruals nor its would-be damm_lp claims were written, so the split preview adds their rebates
    if (!live) extraRebate = r.plannedLamports + await estimateRebates(wouldLp, rebateExclude);
  }
  if (cmd === "cashback" || cmd === "epoch") {
    const acc = await computeAccruals(p, exclude, await cashbackBoost(p, live, log));
    if (live) await writeAccruals(p, acc);
    else accrued = acc.reduce((a, x) => a + x.amount, 0n);
    res.cashback = { wallets: acc.length, volumeLamports: acc.reduce((a, x) => a + x.volume, 0n), accruedLamports: acc.reduce((a, x) => a + x.amount, 0n), barBonusLamports: acc.reduce((a, x) => a + (x.bonus ?? 0n), 0n), payouts: await payCashback(payer, live, live ? null : { period: p.id, rows: acc }) };
  }
  if (cmd === "buyback" || cmd === "epoch") {
    // --budget-sol = manual buyback: spends that amount without closing the period's split.
    // dry-run: this run's fee claims / cashback accruals were not written, so the preview adds them.
    const override = opt("budget-sol");
    const split = live && override === undefined ? await closePeriod(p) : await previewSplit(p, accrued, wouldClaim, extraRebate);
    res.split = split;
    const budget = override !== undefined ? BigInt(Math.round(Number(override) * 1e9)) : split.buyback;
    if (override !== undefined && !(Number(override) >= 0)) throw new Error("--budget-sol must be >= 0");
    res.buyback = jobs.barMint ? await runBuyback({ period: p.id, budget, payer, live, log }) : "$HIGHER not launched yet: buyback budget accrues only";
  }
  if (cmd === "barsnap") {
    const m = await barMint(), holders = await barHolders(), at = Date.now();
    const eligible = [...holders.values()].filter((r) => r >= feeShareMinRaw(m.decimals)).length;
    res.barsnap = { holders: holders.size, eligible, written: live ? await writeSnapshot(holders, m.decimals, at) : 0, takenAt: at };
  }
  if (cmd === "feeshare") {
    const plan = await planFeeShare(p, [...exclude, ...bar.feeShareExclude], live);
    if (live) await writeFeeShare(plan);
    const { rows, ...summary } = plan;
    res.feeShare = { ...summary, top: rows.filter((r) => r.amount > 0n).sort((a, b) => (b.amount > a.amount ? 1 : -1)).slice(0, 10), payouts: await payFeeShare(payer, live, live ? null : plan) };
  }
  log(show(res));
}

function safe(f: () => unknown) { try { const v = f(); return v ? String(v) : null; } catch { return null; } }

async function main() {
  if (!["fees", "lprebate", "cashback", "buyback", "epoch", "barsnap", "feeshare"].includes(cmd)) { console.error("usage: tsx src/jobs/run.ts <fees|lprebate|cashback|buyback|epoch|barsnap|feeshare> [--period yesterday|YYYY-MM-DD] [--live|--dry-run] [--budget-sol N] [--loop SEC]"); process.exit(2); }
  requireDb();
  await assertCluster(live);
  if (live) await migrate(() => {});
  else if (!(await db.query("SELECT to_regclass('public.buybacks') AS t")).rows[0].t) throw new Error("jobs tables missing: run pnpm --filter @hb/api db:migrate");
  if ((cmd === "barsnap" || cmd === "feeshare") && !(await refreshOfficial()).mint) {
    // cron-safe no-op before the official launch (exit 0): nothing to snapshot / share yet
    log(`$HIGHER has not launched yet: ${cmd} skipped (set OFFICIAL_TOKEN_CREATOR for auto-detection, or BAR_MINT; devnet: pnpm --filter @hb/api bar:mock-mint)`);
    await db.end(); return;
  }
  if (!live && ["lprebate", "buyback", "epoch"].includes(cmd) && !(await db.query("SELECT to_regclass('public.creator_lp_rebates') AS t")).rows[0].t) throw new Error("creator LP rebate table missing (0007): run pnpm --filter @hb/api db:migrate");
  if (!live && cmd === "feeshare" && !(await db.query("SELECT to_regclass('public.bar_fee_share_ledger') AS t")).rows[0].t) throw new Error("$HIGHER tables missing (0005): run pnpm --filter @hb/api db:migrate");
  const loop = Number(opt("loop") ?? 0);
  do {
    try { await once(); } catch (e) { log(`ERROR ${(e as Error).message}`); if (!loop) process.exitCode = 1; }
    if (loop) await sleep(loop * 1000);
  } while (loop);
  await db.end();
}
main();
