import { test } from "node:test";
import assert from "node:assert/strict";
import { auditShields, notAllowed, parseMint, top10, top10Level, TOKEN_2022, TOKEN_SPL } from "./audit";

test("audit: mint account facts (SPL and Token-2022), anything else is not a mint", () => {
  const m = parseMint({ owner: TOKEN_SPL, data: { parsed: { type: "mint", info: { mintAuthority: null, freezeAuthority: null, supply: "1000000000000000", decimals: 6 } } } });
  assert.deepEqual(m, { mintAuthority: null, freezeAuthority: null, supply: 1000000000000000n, decimals: 6, t22: false });
  const t = parseMint({ owner: TOKEN_2022, data: { parsed: { type: "mint", info: { mintAuthority: "Auth111", freezeAuthority: "Frz111", supply: "5", decimals: 9 } } } });
  assert.equal(t?.mintAuthority, "Auth111"); assert.equal(t?.freezeAuthority, "Frz111"); assert.equal(t?.t22, true);
  assert.equal(parseMint({ owner: "11111111111111111111111111111111", data: {} }), null);
  assert.equal(parseMint({ owner: TOKEN_SPL, data: { parsed: { type: "account", info: {} } } }), null);
  assert.equal(parseMint(null), null);
});
test("audit: top 10 share and its level", () => {
  const l = Array.from({ length: 12 }, (_, i) => ({ amount: String(i < 10 ? 10 : 999) }));
  assert.equal(top10(l, 1000n), 10);
  assert.equal(top10([{ amount: "333" }], 1000n), 33.3);
  assert.equal(top10([], 1000n), 0);
  assert.equal(top10(l, 0n), null); assert.equal(top10("x", 10n), null); assert.equal(top10([{ amount: 1 }], 10n), null);
  assert.deepEqual([top10Level(15), top10Level(30), top10Level(50), top10Level(51), top10Level(null)], ["ok", "warn", "warn", "bad", null]);
  assert.ok(notAllowed(new Error("RPC error: Method not allowed")) && notAllowed("HTTP 403") && !notAllowed(new Error("timeout")));
});

test("audit: PumpSwap pool layout and LP burnt share", async () => {
  const { parsePumpSwapPool, lpBurntPct } = await import("./audit");
  const b = new Uint8Array(8 + 1 + 2 + 32 * 6 + 8 + 32);
  b.fill(7, 11 + 32, 11 + 64); b.fill(9, 11 + 96, 11 + 128);
  new DataView(b.buffer).setBigUint64(11 + 192, 21823985920547n, true);
  const p = parsePumpSwapPool(btoa(String.fromCharCode(...b)))!;
  assert.equal(p.lpSupply, 21823985920547n); assert.equal(p.lpMint[0], 9); assert.equal(p.baseMint[31], 7);
  assert.equal(parsePumpSwapPool(btoa("short")), null); assert.equal(parsePumpSwapPool("%%%"), null);
  assert.equal(lpBurntPct(0n, 1000n), 100); assert.equal(lpBurntPct(250n, 1000n), 75); assert.equal(lpBurntPct(null, 1000n), null); assert.equal(lpBurntPct(5n, 0n), null);
});

test("audit: shield tooltips name the check and this token's result, unknown when a value is missing", () => {
  const base = { mint: "M", source: "onchain" as const, t22: false, at: 0 };
  const tips = (a: Parameters<typeof auditShields>[0]) => auditShields(a).map((s) => [s.key, s.level, s.tip]);
  assert.deepEqual(tips({ ...base, noMint: true, noFreeze: true, lp: "burnt", lpBurntPct: 100, top10Pct: 18.4 }), [
    ["mint", "ok", "Mint authority revoked: no one can mint more supply"],
    ["freeze", "ok", "Freeze authority revoked: no holder's account can be frozen"],
    ["lp", "ok", "LP burnt: 100% of the pool's LP tokens are burnt, so that liquidity is locked"],
    ["top10", "ok", "Top 10 holders own 18.4% of supply: well spread (under 30%). Pools and the bonding curve count as holders"],
  ]);
  assert.deepEqual(tips({ ...base, noMint: false, noFreeze: false, lp: "partial", lpBurntPct: 42.5, top10Pct: 61 }), [
    ["mint", "bad", "Mint authority active: supply can be increased"],
    ["freeze", "bad", "Freeze authority active: holders' accounts can be frozen (blacklisted)"],
    ["lp", "warn", "LP partly burnt: only 42.5% of the pool's LP tokens are burnt, the rest can still be withdrawn"],
    ["top10", "bad", "Top 10 holders own 61% of supply: highly concentrated (over 50%). Pools and the bonding curve count as holders"],
  ]);
  const curve = auditShields({ ...base, noMint: true, noFreeze: null, lp: "curve", lpBurntPct: null, top10Pct: 40 });
  assert.equal(curve[1].tip, "Freeze authority (blacklist). Unknown: couldn't check");
  assert.deepEqual([curve[2].level, curve[2].label, curve[2].tip], ["neutral", "Curve", "LP burn: still on its bonding curve, there is no LP to burn yet"]);
  assert.deepEqual([curve[3].level, curve[3].label], ["warn", "Top10 40%"]);
  assert.match(curve[3].tip, /concentrated \(30 to 50%\)/);
  // nothing known (no audit yet or it failed): every shield says so, none claims a pass
  assert.deepEqual(auditShields(null).map((s) => [s.level, s.tip]), [
    ["na", "Mint authority. Unknown: couldn't check"], ["na", "Freeze authority (blacklist). Unknown: couldn't check"],
    ["na", "LP burn. Unknown: couldn't check"], ["na", "Top 10 holders. Unknown: couldn't check"],
  ]);
  // a partial burn without a share is not a number we have: unknown, not "0%"
  assert.equal(auditShields({ ...base, noMint: null, noFreeze: null, lp: "partial", lpBurntPct: null, top10Pct: null })[2].tip, "LP burn. Unknown: couldn't check");
});
