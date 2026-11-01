import { test } from "node:test";
import assert from "node:assert/strict";
import { notAllowed, parseMint, top10, top10Level, TOKEN_2022, TOKEN_SPL } from "./audit";

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
