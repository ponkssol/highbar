/** Fee claimer / cashback / buyback & burn jobs (BUILD_BRIEF section 6).
 *  tsx src/jobs/run.ts <fees|cashback|buyback|epoch> [--period yesterday|YYYY-MM-DD] [--live | --dry-run] [--budget-sol 0.5] [--loop 3600]
 *  Dry-run (DRY_RUN unset/true, or --dry-run) simulates every tx and writes nothing. --live (or DRY_RUN=false) sends; mainnet also needs ALLOW_MAINNET=true.
 *  epoch = claim fees -> accrue + pay cashback for the closed period -> close the 40/50/10 split -> buy back & burn the buyback share. */
import { referralWallet, loadPlatformKeypair } from "@hb/onchain";
import { requireDb, db } from "../db/pool.js";
import { migrate } from "../db/migrate.js";
import { FeeClaimer } from "../services/feeClaimer.js";
import { computeAccruals, payCashback, writeAccruals } from "../services/cashback.js";
import { closePeriod, previewSplit } from "../services/treasury.js";
import { runBuyback } from "../services/buyback.js";
import { jobs } from "./config.js";
import { assertCluster, show, sleep } from "./chain.js";
import { isClosed, period } from "./period.js";

const argv = process.argv.slice(2);
const cmd = argv[0];
const flag = (n: string) => argv.includes(`--${n}`);
const opt = (n: string) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
const live = flag("live") ? true : flag("dry-run") ? false : !jobs.dryRun;
const tag = live ? "" : "[DRY_RUN]";
const log = (m: string) => console.log(new Date().toISOString(), tag, m);

async function once() {
  const payer = loadPlatformKeypair();
  const p = period(opt("period"));
  const closed = isClosed(p);
  if (live && !closed && cmd !== "fees") throw new Error(`period ${p.id} is still open; live cashback / split / buyback only run for closed periods`);
  const exclude = [...new Set([payer.publicKey.toBase58(), jobs.treasury, safe(referralWallet), ...jobs.cashbackExclude].filter((x): x is string => !!x))];
  const res: Record<string, unknown> = { network: jobs.network, period: p.id, live };
  let accrued: bigint | undefined, wouldClaim = 0n;

  if (cmd === "fees" || cmd === "epoch") {
    const claims = await new FeeClaimer(payer, live).runAll(log);
    res.fees = claims.filter((c) => c.status !== "skipped" || c.note);
    if (!live) wouldClaim = claims.filter((c) => c.status === "would-claim").reduce((a, c) => a + c.lamports, 0n);
  }
  if (cmd === "cashback" || cmd === "epoch") {
    const acc = await computeAccruals(p, exclude);
    if (live) await writeAccruals(p, acc);
    else accrued = acc.reduce((a, x) => a + x.amount, 0n);
    res.cashback = { wallets: acc.length, volumeLamports: acc.reduce((a, x) => a + x.volume, 0n), accruedLamports: acc.reduce((a, x) => a + x.amount, 0n), payouts: await payCashback(payer, live, live ? null : { period: p.id, rows: acc }) };
  }
  if (cmd === "buyback" || cmd === "epoch") {
    // --budget-sol = manual buyback: spends that amount without closing the period's split.
    // dry-run: this run's fee claims / cashback accruals were not written, so the preview adds them.
    const override = opt("budget-sol");
    const split = live && override === undefined ? await closePeriod(p) : await previewSplit(p, accrued, wouldClaim);
    res.split = split;
    const budget = override !== undefined ? BigInt(Math.round(Number(override) * 1e9)) : split.buyback;
    if (override !== undefined && !(Number(override) >= 0)) throw new Error("--budget-sol must be >= 0");
    res.buyback = jobs.barMint ? await runBuyback({ period: p.id, budget, payer, live, log }) : "BAR_MINT not set: buyback budget accrues only";
  }
  log(show(res));
}

function safe(f: () => unknown) { try { const v = f(); return v ? String(v) : null; } catch { return null; } }

async function main() {
  if (!["fees", "cashback", "buyback", "epoch"].includes(cmd)) { console.error("usage: tsx src/jobs/run.ts <fees|cashback|buyback|epoch> [--period yesterday|YYYY-MM-DD] [--live|--dry-run] [--budget-sol N] [--loop SEC]"); process.exit(2); }
  requireDb();
  await assertCluster(live);
  if (live) await migrate(() => {});
  else if (!(await db.query("SELECT to_regclass('public.buybacks') AS t")).rows[0].t) throw new Error("jobs tables missing: run pnpm --filter @hb/api db:migrate");
  const loop = Number(opt("loop") ?? 0);
  do {
    try { await once(); } catch (e) { log(`ERROR ${(e as Error).message}`); if (!loop) process.exitCode = 1; }
    if (loop) await sleep(loop * 1000);
  } while (loop);
  await db.end();
}
main();
