import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { isShort, LAUNCH_OVERHEAD_SOL, launchNeedSol, readChecked, runMulti, toggleChecked, type MultiRow, type MultiTarget } from "./multi";
import type { LaunchDone } from "./messages";

// Generated keypairs only, in memory. Nothing is sent anywhere.
const wallets = () => [Keypair.generate(), Keypair.generate(), Keypair.generate()];
const targets = (kps: Keypair[]): MultiTarget[] => kps.map((k, i) => ({ id: `w${i + 1}`, label: ["Wallet 1", "Snipes", "Runner"][i], address: k.publicKey.toBase58() }));
const BH = "11111111111111111111111111111111";
/** A stand-in for one create: builds a transaction with that wallet as fee payer and creator, signs it with the keypair the
 *  orchestrator handed over, and only "succeeds" when that signature verifies for the target's own address. */
function fakeCreate(signedBy: Map<string, string>, failFor: Set<string> = new Set()) {
  return async (kp: Keypair, t: MultiTarget, step: (s: "mint" | "sign" | "send" | "done") => void): Promise<LaunchDone> => {
    step("mint");
    const tx = new Transaction({ feePayer: kp.publicKey, recentBlockhash: BH }).add(SystemProgram.transfer({ fromPubkey: kp.publicKey, toPubkey: kp.publicKey, lamports: 1 }));
    step("sign"); tx.partialSign(kp);
    assert.ok(tx.verifySignatures(), "signed by the fee payer");
    signedBy.set(t.id, tx.signatures[0].publicKey.toBase58());
    if (failFor.has(t.id)) throw new Error("The launch transaction was rejected: Test Coin simulated failure");
    step("send"); step("done");
    const mint = Keypair.generate().publicKey.toBase58();
    return { mint, signature: `sig-${t.id}`, tokenUrl: `https://example.test/token/${mint}`, solscanUrl: `https://solscan.io/tx/sig-${t.id}?cluster=devnet` };
  };
}

test("need: dev buy plus its fee plus the overhead, a short wallet only when the balance is known", () => {
  assert.equal(launchNeedSol(0), LAUNCH_OVERHEAD_SOL);
  assert.equal(launchNeedSol(0.5, 0.005), 0.53);
  assert.equal(launchNeedSol(-1, NaN), LAUNCH_OVERHEAD_SOL);
  assert.equal(isShort(0.2, 0.53), true);
  assert.equal(isShort(0.53, 0.53), false);
  assert.equal(isShort(null, 0.53), false);
});

test("checked set: the old single pick migrates, stale ids drop, never empty while a wallet exists", () => {
  const ids = ["a", "b", "c"];
  assert.deepEqual(readChecked(undefined, "b", ids, "a"), ["b"], "legacy hb.drawerWallet id becomes the set");
  assert.deepEqual(readChecked(["c", "a"], "b", ids, "a"), ["a", "c"], "the new array wins, in list order");
  assert.deepEqual(readChecked(["gone", "c"], null, ids, "a"), ["c"]);
  assert.deepEqual(readChecked(["gone"], "gone2", ids, "b"), ["b"], "falls back to the active wallet");
  assert.deepEqual(readChecked(null, null, ids, null), ["a"], "then the first wallet");
  assert.deepEqual(readChecked("c", null, ids, "a"), ["c"], "a bare string in the new key is read too");
  assert.deepEqual(readChecked(["a", 7, null], null, ids, "b"), ["a"], "junk is dropped");
  assert.deepEqual(readChecked(["a"], null, [], null), [], "no wallets, nothing checked");
});

test("checked set: toggling keeps at least one and follows the list order, round trip through storage", () => {
  const order = ["a", "b", "c"];
  let c = ["a"];
  assert.equal(toggleChecked(c, "a", order), c, "the last checked wallet stays");
  c = toggleChecked(c, "c", order); assert.deepEqual(c, ["a", "c"]);
  c = toggleChecked(c, "b", order); assert.deepEqual(c, ["a", "b", "c"]);
  c = toggleChecked(c, "a", order); assert.deepEqual(c, ["b", "c"]);
  const stored = JSON.parse(JSON.stringify({ "hb.drawerWallets": c }));
  assert.deepEqual(readChecked(stored["hb.drawerWallets"], undefined, order, "a"), ["b", "c"], "remembered as saved");
});

test("multi create: one token per wallet, each signed by its own wallet, one failure and one short wallet do not stop the others", async () => {
  const kps = [...wallets(), Keypair.generate()];
  const ts = [...targets(kps.slice(0, 3)), { id: "w4", label: "Wallet 4", address: kps[3].publicKey.toBase58() }];
  const bal: Record<string, number | null> = { [ts[0].address]: 2.45, [ts[1].address]: 0.1, [ts[2].address]: 5.036, [ts[3].address]: null };
  const signedBy = new Map<string, string>(), asked: string[] = [], updates: MultiRow[][] = [];
  const rows = await runMulti(ts, launchNeedSol(0.5, 0.005), {
    keypair: async (id) => { asked.push(id); return kps[Number(id.slice(1)) - 1]; },
    balance: async (a) => bal[a] ?? null,
    createOne: fakeCreate(signedBy, new Set(["w3"])),
    update: (r) => updates.push(r),
  });
  assert.deepEqual(rows.map((r) => r.status), ["done", "skipped", "failed", "done"]);
  assert.match(rows[1].error!, /Not enough SOL, has 0\.1 and needs about 0\.53/);
  assert.match(rows[2].error!, /simulated failure/);
  assert.ok(rows[0].result?.mint && rows[3].result?.mint && rows[0].result.mint !== rows[3].result.mint, "separate mints");
  assert.deepEqual(asked, ["w1", "w3", "w4"], "a short wallet is never unlocked for signing");
  for (const t of ts) if (signedBy.has(t.id)) assert.equal(signedBy.get(t.id), t.address, `${t.label} signed only by itself`);
  assert.equal(signedBy.has("w2"), false);
  assert.ok(updates.length > 6, "progress updates while it runs");
  assert.deepEqual(updates[0].map((r) => r.status), ["queued", "queued", "queued", "queued"]);
  assert.ok(updates.some((u) => u[0].status === "running" && u[0].step === "sign"));
  assert.deepEqual(updates.at(-1)!.map((r) => r.status), ["done", "skipped", "failed", "done"]);
});

test("multi create: a keypair that does not match the row's address fails that row only", async () => {
  const kps = wallets(), ts = targets(kps);
  const signedBy = new Map<string, string>();
  const rows = await runMulti(ts, 0.03, {
    keypair: async (id) => (id === "w2" ? kps[0] : kps[Number(id.slice(1)) - 1]),
    balance: async () => 1,
    createOne: fakeCreate(signedBy),
    update: () => {},
  });
  assert.deepEqual(rows.map((r) => r.status), ["done", "failed", "done"]);
  assert.match(rows[1].error!, /does not match/);
  assert.equal(signedBy.has("w2"), false, "nothing signed with the wrong wallet");
});

test("multi create: one at a time by default, a balance read error still tries the launch", async () => {
  const kps = wallets(), ts = targets(kps);
  let inFlight = 0, peak = 0;
  const rows = await runMulti(ts, 0.03, {
    keypair: async (id) => kps[Number(id.slice(1)) - 1],
    balance: async (a) => { if (a === ts[1].address) throw new Error("rpc down"); return 1; },
    createOne: async (kp, t) => { inFlight++; peak = Math.max(peak, inFlight); await new Promise((r) => setTimeout(r, 15)); inFlight--; return { mint: t.id, signature: "s", tokenUrl: "u", solscanUrl: "v" }; },
    update: () => {},
  });
  assert.equal(peak, 1);
  assert.deepEqual(rows.map((r) => r.status), ["done", "done", "done"]);
  peak = 0;
  await runMulti(ts, 0.03, { keypair: async (id) => kps[Number(id.slice(1)) - 1], balance: async () => 1,
    createOne: async (_k, t) => { inFlight++; peak = Math.max(peak, inFlight); await new Promise((r) => setTimeout(r, 15)); inFlight--; return { mint: t.id, signature: "s", tokenUrl: "u", solscanUrl: "v" }; }, update: () => {} }, 2);
  assert.equal(peak, 2, "concurrency is capped");
});
