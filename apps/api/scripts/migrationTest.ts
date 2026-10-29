/** Devnet DAMM v2 migration test (1 SOL threshold, separate test config; never added to configs.devnet.json).
 *  Resumable: state in data/migration-test.json. Run: npx tsx scripts/migrationTest.ts [step]
 *  Steps: config -> launch -> fill -> migrate -> verify -> fees. Prints public keys, balances and signatures only. */
import fs from "node:fs";
import path from "node:path";
import BN from "bn.js";
import { Keypair, PublicKey, type Transaction } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import { deriveDbcPoolAddress, deriveDammV2PoolAddress, DAMM_V2_MIGRATION_FEE_ADDRESS, SwapMode, getCurrentPoint } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { CpAmm } from "@meteora-ag/cp-amm-sdk";
import { buildTierConfig, getClient, getConnection, loadPlatformKeypair, sendTx } from "@hb/onchain";

const STATE = path.resolve("data/migration-test.json");
const API = process.env.API_URL ?? "http://localhost:4000";
const U64_MAX = new BN("18446744073709551615");
type St = Record<string, any> & { sigs: Record<string, string | string[]>; balances: Record<string, number> };
const st: St = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : { sigs: {}, balances: {} };
const save = () => { fs.mkdirSync(path.dirname(STATE), { recursive: true }); fs.writeFileSync(STATE, JSON.stringify(st, null, 2)); };
const conn = getConnection(), client = getClient(), payer = loadPlatformKeypair();
const sol = async (pk = payer.publicKey) => (await conn.getBalance(pk, "confirmed")) / 1e9;
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function stepConfig() {
  if (st.config) return log("config exists", st.config);
  // Higher-tier params (1% migration fee, 50% creator migration share, permanently locked LP) with a 1 SOL threshold.
  const curve = buildTierConfig("higher", false, 1);
  const cfg = Keypair.generate();
  const tx = await client.partner.createConfig({ ...curve, config: cfg.publicKey, feeClaimer: payer.publicKey, leftoverReceiver: payer.publicKey, quoteMint: NATIVE_MINT, payer: payer.publicKey });
  st.sigs.createConfig = await sendTx(tx, [payer, cfg]);
  st.config = cfg.publicKey.toBase58(); save(); log("config", st.config, st.sigs.createConfig);
}

async function stepLaunch() {
  if (st.mint) return log("token exists", st.mint, st.pool);
  st.balances.start = await sol(); save();
  const meta = await fetch(`${API}/metadata`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Mig Test", symbol: "MIGT", description: "DAMM v2 migration test" }) }).then((r) => r.json()).catch(() => ({ uri: "" }));
  const baseMint = Keypair.generate(), config = new PublicKey(st.config);
  const tx = await client.creator.createPool({ name: "Mig Test", symbol: "MIGT", uri: meta.uri ?? "", payer: payer.publicKey, poolCreator: payer.publicKey, config, baseMint: baseMint.publicKey });
  st.sigs.launch = await sendTx(tx, [payer, baseMint]);
  st.mint = baseMint.publicKey.toBase58(); st.pool = deriveDbcPoolAddress(NATIVE_MINT, baseMint.publicKey, config).toBase58(); save();
  log("launched", st.mint, "pool", st.pool, st.sigs.launch);
}

async function stepFill() {
  const pool = new PublicKey(st.pool);
  // No referral: configs.devnet.json referral_wsol_ata (2LAj43...) does not exist on devnet.
  st.sigs.buys = (st.sigs.buys as string[]) ?? [];
  for (let i = 0; i < 12; i++) {
    const vp = await client.state.getPool(pool); const cfg = await client.state.getPoolConfig(new PublicKey(st.config));
    if (!vp || !cfg) throw new Error("pool/config not found");
    const reserve = vp.poolState.quoteReserve, thr = cfg.migrationQuoteThreshold;
    log("quoteReserve", reserve.toString(), "/", thr.toString());
    if (reserve.gte(thr)) { st.filled = true; save(); return log("curve complete"); }
    const left = thr.sub(reserve);
    const amountIn = BN.min(new BN(400_000_000), left.muln(105).divn(100).addn(1_000_000));
    const q = await client.pool.swapQuote2({ virtualPool: vp, config: cfg, swapBaseForQuote: false, hasReferral: false, eligibleForFirstSwapWithMinFee: false,
      currentPoint: await getCurrentPoint(conn, cfg.activationType), slippageBps: 300, swapMode: SwapMode.PartialFill, amountIn });
    const tx = await client.pool.swap2({ owner: payer.publicKey, pool, swapBaseForQuote: false, referralTokenAccount: null, swapMode: SwapMode.PartialFill, amountIn, minimumAmountOut: q.minimumAmountOut ?? new BN(0) });
    const sig = await sendTx(tx, [payer]); (st.sigs.buys as string[]).push(sig); save(); log("buy", amountIn.toString(), sig);
  }
}

async function stepMigrate() {
  process.env.DRY_RUN = "false";
  process.env.TEST_CONFIGS = `higher_off=${st.config}`;
  process.env.KEEPER_CONFIGS = st.config; // only scan the test config (avoids getProgramAccounts 429s on public RPC)
  st.balances.beforeMigrate = await sol(); save();
  // Same code path as the keeper loop, but for the known pool (getProgramAccounts scan is 429-limited on public devnet RPC).
  const { migratePool } = await import("@hb/onchain");
  const cfg = await client.state.getPoolConfig(new PublicKey(st.config));
  const res = [await migratePool(new PublicKey(st.pool), cfg!, "higher_off(test)", payer)];
  log("keeper", JSON.stringify(res));
  const m = res.find((r) => r.action === "migrated");
  if (m?.signature) st.sigs.migrate = m.signature;
  st.balances.afterMigrate = await sol(); save();
}

async function stepVerify() {
  const vp = await client.state.getPool(new PublicKey(st.pool)); const cfg = await client.state.getPoolConfig(new PublicKey(st.config));
  const dammConfig = DAMM_V2_MIGRATION_FEE_ADDRESS[Number(cfg!.migrationFeeOption)];
  const damm = deriveDammV2PoolAddress(dammConfig, new PublicKey(st.mint), NATIVE_MINT);
  const amm = new CpAmm(conn);
  const ps = await amm.fetchPoolState(damm);
  const positions = await amm.getUserPositionByPool(damm, payer.publicKey);
  const pos = positions.map((p) => ({ position: p.position.toBase58(), permanentLocked: p.positionState.permanentLockedLiquidity.toString(), unlocked: p.positionState.unlockedLiquidity.toString(), vested: p.positionState.vestedLiquidity.toString() }));
  const total = pos.reduce((s, p) => s + Number(p.permanentLocked), 0);
  st.verify = { isMigrated: Number(vp!.poolState.isMigrated), dammConfig: dammConfig.toBase58(), dammPool: damm.toBase58(), poolLiquidity: ps.liquidity.toString(),
    positions: pos.map((p) => ({ ...p, sharePct: total ? +(Number(p.permanentLocked) / total * 100).toFixed(2) : 0 })),
    allPermanentlyLocked: pos.length > 0 && pos.every((p) => p.unlocked === "0" && p.vested === "0" && p.permanentLocked !== "0"), expectedSplit: "creator 40 / partner 60 (Higher tier)" };
  save(); log("verify", JSON.stringify(st.verify, null, 1));
}

async function sendLabeled(label: string, build: () => Promise<Transaction>) {
  const before = await sol();
  try { const sig = await sendTx(await build(), [payer]); const after = await sol(); st.sigs[label] = sig; st.balances[label] = +(after - before).toFixed(9); log(label, sig, "delta SOL", st.balances[label]); }
  catch (e) { st.sigs[label] = `ERROR ${(e as Error).message.slice(0, 300)}`; log(label, "ERROR", (e as Error).message.slice(0, 300)); }
  save();
}

async function stepFees() {
  const pool = new PublicKey(st.pool), me = payer.publicKey;
  // Creator side through our own /claim API (the /claim page data + tx builder), signed by the creator wallet.
  st.claimBefore = await fetch(`${API}/claim/${me.toBase58()}`).then((r) => r.json()).then((j) => (j.items ?? j.rows ?? j.tokens ?? []).find((x: any) => x.pool === st.pool) ?? j).catch((e) => ({ error: String(e) }));
  log("claim API before", JSON.stringify(st.claimBefore));
  const viaApi = async (kind: "trading" | "migration") => {
    const r = await fetch(`${API}/claim/build`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ creator: me.toBase58(), pool: st.pool, kind }) });
    const j = await r.json(); if (!r.ok) throw new Error(`/claim/build ${kind}: ${r.status} ${j.error}`);
    const { Transaction } = await import("@solana/web3.js"); return Transaction.from(Buffer.from(j.tx, "base64"));
  };
  await sendLabeled("creatorWithdrawMigrationFee", () => viaApi("migration"));
  await sendLabeled("claimCreatorTradingFee", () => viaApi("trading"));
  // Partner side (same calls as apps/api FeeClaimer).
  await sendLabeled("partnerWithdrawMigrationFee", () => client.partner.partnerWithdrawMigrationFee({ pool, sender: me }));
  await sendLabeled("claimPartnerTradingFee", () => client.partner.claimPartnerTradingFee({ pool, feeClaimer: me, payer: me, maxBaseAmount: U64_MAX, maxQuoteAmount: U64_MAX }));
  st.claimAfter = await fetch(`${API}/claim/${me.toBase58()}`).then((r) => r.json()).then((j) => (j.items ?? j.rows ?? j.tokens ?? []).find((x: any) => x.pool === st.pool) ?? j).catch((e) => ({ error: String(e) }));
  st.balances.end = await sol(); save();
  log("claim API after", JSON.stringify(st.claimAfter));
}

const steps: Record<string, () => Promise<unknown>> = { config: stepConfig, launch: stepLaunch, fill: stepFill, migrate: stepMigrate, verify: stepVerify, fees: stepFees };
const only = process.argv[2];
log("wallet", payer.publicKey.toBase58(), "balance", await sol(), "SOL");
for (const [k, f] of Object.entries(steps)) if (!only || only === k) await f();
log("state saved to", STATE);