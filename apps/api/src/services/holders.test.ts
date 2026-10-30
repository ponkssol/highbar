/** One holder rule for the Score tab and the Holders tab (PGlite, every migration verbatim, never DATABASE_URL).
 *  Test data: "Test Coin" (TEST) and throwaway keys only. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { Keypair } from "@solana/web3.js";
import type { Q } from "../db/pool.js";
import { computeScore, HOLDER_MIN_TOKENS } from "./score.js";
import { scoresStore } from "./scoresStore.js";

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../db/migrations");
const key = () => Keypair.generate().publicKey.toBase58();
const MINT = key(), OTHER = key(), CREATOR = key(), A = key(), B = key(); // "Test Coin" (TEST) and a second test mint

async function freshDb() {
  const pg = new PGlite();
  for (const f of fs.readdirSync(DIR).filter((x) => /^\d+_.+\.sql$/.test(x)).sort()) await pg.exec(fs.readFileSync(path.join(DIR, f), "utf8"));
  return { pg, q: { query: (t: string, p?: unknown[]) => pg.query(t, p) } as unknown as Q };
}
let n = 0;
const trade = (q: Q, mint: string, wallet: string, side: "buy" | "sell", tokens: number, devBuy = false) =>
  q.query("INSERT INTO trades (sig, ix_idx, pool, mint, side, sol, tokens, wallet, dev_buy, ts) VALUES ($1,0,'pool',$2,$3,0.1,$4,$5,$6,$7)",
    [`sig${++n}`, mint, side, tokens, wallet, devBuy, 1_800_000_000_000 + n]);

/** The Holders tab rule (apps/web TokenView holderRows): net buys - sells per wallet above 0.000001 tokens. */
function tabCount(trades: { wallet: string; side: "buy" | "sell"; tokens: number }[]) {
  const net = new Map<string, number>();
  for (const t of trades) net.set(t.wallet, (net.get(t.wallet) ?? 0) + (t.side === "buy" ? t.tokens : -t.tokens));
  return [...net.values()].filter((v) => v > 1e-6).length;
}

test("score read path: breakdown.holders is the live count, not the cached job value (creator with a fully locked dev buy counts)", async () => {
  const { pg, q } = await freshDb();
  try {
    // Test Coin: the creator dev-buys and locks it all. The last job run wrote holders 0 (stale, or creator dropped by the lock).
    await trade(q, MINT, CREATOR, "buy", 5_000_000, true);
    await q.query("INSERT INTO scores (mint, score, breakdown_json, updated_at) VALUES ($1, 12, $2, 1)",
      [MINT, JSON.stringify({ tier: 10, antiSniper: 0, devLock: 2, spread: 0, holders: 0, top10Pct: 100, lockedPct: 0.5, lockDaysLeft: 30, label: "Early" })]);
    const s = (await scoresStore.scores([MINT], { q })).get(MINT)!;
    assert.equal(s.breakdown.holders, 1); assert.equal(s.score, 12); assert.equal(s.breakdown.label, "Early");
    assert.equal((await scoresStore.scores([MINT], { q, holders: false })).get(MINT)!.breakdown.holders, 0); // opt-out keeps the stored value
    // trades after the job ran show up at once, sellers and dust do not count
    await trade(q, MINT, A, "buy", 1_000); await trade(q, MINT, B, "buy", 2_000); await trade(q, MINT, B, "sell", 2_000);
    await trade(q, MINT, key(), "buy", HOLDER_MIN_TOKENS / 2);
    assert.equal((await scoresStore.scores([MINT], { q })).get(MINT)!.breakdown.holders, 2);
    // no trades at all = 0, and the all-mints read uses the same rule
    await q.query("INSERT INTO scores (mint, score, breakdown_json, updated_at) VALUES ($1, 10, $2, 1)", [OTHER, JSON.stringify({ holders: 7, tier: 10 })]);
    const all = await scoresStore.scores(undefined, { q });
    assert.equal(all.get(OTHER)!.breakdown.holders, 0); assert.equal(all.get(MINT)!.breakdown.holders, 2);
  } finally { await pg.close(); }
});

test("holderCounts matches the Holders tab rule on the same trades", async () => {
  const { pg, q } = await freshDb();
  try {
    const ws = Array.from({ length: 6 }, key), log: { wallet: string; side: "buy" | "sell"; tokens: number }[] = [];
    const plan: [number, "buy" | "sell", number][] = [[0, "buy", 100], [1, "buy", 50], [1, "sell", 50], [2, "buy", 0.0000004], [3, "buy", 10], [3, "sell", 4], [4, "buy", 1], [5, "buy", 3], [5, "sell", 3.5]];
    for (const [i, side, tokens] of plan) { await trade(q, MINT, ws[i], side, tokens); log.push({ wallet: ws[i], side, tokens }); }
    assert.equal(tabCount(log), 3);
    assert.equal((await scoresStore.holderCounts([MINT], q)).get(MINT), tabCount(log));
    assert.equal((await scoresStore.holderCounts(undefined, q)).get(MINT), 3);
    assert.equal((await scoresStore.holderCounts([OTHER], q)).has(OTHER), false);
  } finally { await pg.close(); }
});

test("computeScore: a fully locked creator still counts as a holder, concentration uses circulating balances", () => {
  const now = 1_800_000_000, lock = { lockedTokens: 5_000_000, unlockAt: now + 30 * 86400 };
  const locked = computeScore({ tier: "standard", antiSniper: false, lock, balances: [0], holders: 1, nowSec: now }).breakdown;
  assert.equal(locked.holders, 1);
  const plain = computeScore({ tier: "standard", antiSniper: false, lock: null, balances: [5_000_000], nowSec: now }).breakdown;
  assert.equal(plain.holders, 1); // default = positive balances, unchanged
  assert.equal(computeScore({ tier: "standard", antiSniper: false, lock: null, balances: [], nowSec: now }).breakdown.holders, 0);
});
