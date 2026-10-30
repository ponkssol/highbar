/** Step-8 jobs: user referral rewards + milestone bonus (BUILD_BRIEF section 7). Same safety model as run.ts (cashback):
 *  tsx src/jobs/runReferralMilestone.ts <referral|milestone> [--period yesterday|YYYY-MM-DD] [--live | --dry-run] [--snapshots] [--loop 900]
 *  Dry-run (DRY_RUN unset/true, or --dry-run) simulates every payout tx and writes no rewards / bonuses. --live (or DRY_RUN=false) sends;
 *  mainnet also needs ALLOW_MAINNET=true. The RPC genesis hash must match NETWORK. Payout txs are signed once (pending sig persisted before send).
 *  referral: referrers are funded ONLY from the referral wallet's swap-referral income (services/referral.ts) and paid BY the referral wallet
 *  (REFERRAL_KEYPAIR_PATH / REFERRAL_KEYPAIR_JSON; without it the job is dry-run only). The platform key never pays referrers.
 *  milestone reads the score job's hourly DAMM v2 snapshots (token_snapshots, 0003). --snapshots runs that score job first (off-chain
 *  writes + read-only RPC, same in both modes); normally the API's SCORES_INTERVAL_MS loop or jobs:scores keeps them fresh. */
import { referralWallet, loadPlatformKeypair } from "@hb/onchain";
import { requireDb, db } from "../db/pool.js";
import { migrate } from "../db/migrate.js";
import { payReferrals, planReferralPeriod, referralSigner, writeReferralPeriod } from "../services/referral.js";
import { evaluate, payMilestones, writeBonuses } from "../services/milestone.js";
import { runScores } from "../services/scoreJob.js";
import { jobs } from "./config.js";
import { rewards2 } from "./rewardsConfig.js";
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
  const exclude = [...new Set([payer.publicKey.toBase58(), jobs.treasury, safe(referralWallet), ...jobs.cashbackExclude].filter((x): x is string => !!x))];
  const res: Record<string, unknown> = { network: jobs.network, live };

  if (cmd === "referral") {
    const p = period(opt("period"));
    if (live && !isClosed(p)) throw new Error(`period ${p.id} is still open; live referral rewards only run for closed periods`);
    res.period = p.id;
    const signer = referralSigner(payer);
    const plan = await planReferralPeriod(p, [...exclude, signer.publicKey.toBase58()]);
    const ledger = live ? await writeReferralPeriod(p, plan) : "not written (dry-run)";
    const { rows, ...pool } = plan;
    res.referral = {
      source: "Meteora DBC swap referral fee received by REFERRAL_WALLET (not the platform share)", signer: signer.publicKey.toBase58(),
      signerHasKey: "secretKey" in signer, ...pool, ledger, top: rows.slice().sort((a, b) => (b.amount > a.amount ? 1 : -1)).slice(0, 10),
      ...(await payReferrals(signer, live, live ? null : { plan })),
    };
  }
  if (cmd === "milestone") {
    if (flag("snapshots")) res.snapshots = await runScores(log, { rpc: true });
    const q = await evaluate(exclude);
    if (live) await writeBonuses(q);
    res.milestones = rewards2.milestones;
    res.qualified = q.map((x) => ({ mint: x.mint, creator: x.creator, milestone: x.milestone.id, qualifiedDay: x.qualifiedDay, lamports: x.lamports }));
    res.payouts = await payMilestones(payer, live, live ? [] : q);
  }
  log(show(res));
}

function safe(f: () => unknown) { try { const v = f(); return v ? String(v) : null; } catch { return null; } }

async function main() {
  if (!["referral", "milestone"].includes(cmd)) { console.error("usage: tsx src/jobs/runReferralMilestone.ts <referral|milestone> [--period yesterday|YYYY-MM-DD] [--live|--dry-run] [--snapshots] [--loop SEC]"); process.exit(2); }
  requireDb();
  await assertCluster(live);
  if (live) await migrate(() => {});
  else if (!(await db.query("SELECT to_regclass('public.referral_rewards') AS t")).rows[0].t) throw new Error("referral / milestone tables missing: run pnpm --filter @hb/api db:migrate");
  const loop = Number(opt("loop") ?? 0);
  do {
    try { await once(); } catch (e) { log(`ERROR ${(e as Error).message}`); if (!loop) process.exitCode = 1; }
    if (loop) await sleep(loop * 1000);
  } while (loop);
  await db.end();
}
main();
