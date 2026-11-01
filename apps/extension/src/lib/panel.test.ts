import { test } from "node:test";
import assert from "node:assert/strict";
import { PANEL_BUY_SOL, PANEL_SELL_PCT, parseCaInput, parseSolAmount, sortPositions, toastMs, tradeLabel, trend } from "./panel";

const PUMP = "CEMEy7jkeytkxq3qYjaKyQnKiUdHAMJDM1B1tv2Upump";

test("panel: a pasted CA or token link gives the mint, anything else null", () => {
  assert.equal(parseCaInput(`  ${PUMP} `), PUMP);
  assert.equal(parseCaInput(`https://pump.fun/coin/${PUMP}`), PUMP);
  assert.equal(parseCaInput(`dexscreener.com/solana/${PUMP}`), PUMP);
  assert.equal(parseCaInput("So11111111111111111111111111111111111111112"), null);
  assert.equal(parseCaInput("hello"), null);
  assert.equal(parseCaInput(""), null);
  assert.equal(parseCaInput(`https://example.com/${PUMP}`), null);
});

test("panel: typed SOL amounts", () => {
  assert.equal(parseSolAmount("0.25"), 0.25);
  assert.equal(parseSolAmount("1,5"), 1.5);
  assert.equal(parseSolAmount("0"), null);
  assert.equal(parseSolAmount("101"), null);
  assert.equal(parseSolAmount("0.12345"), null);
  assert.equal(parseSolAmount("abc"), null);
  assert.equal(parseSolAmount("."), null);
});

test("panel: four buy chips, four sell percents ending at 100, toast timing 1.5 s and 2 s", () => {
  assert.equal(PANEL_BUY_SOL.length, 4);
  assert.deepEqual([...PANEL_SELL_PCT], [10, 25, 50, 100]);
  assert.equal(toastMs("ok"), 1500); assert.equal(toastMs("info"), 1500); assert.equal(toastMs("err"), 2000);
});

test("panel: labels, trend and position order", () => {
  assert.equal(tradeLabel("buy", 0.5), "Buy 0.5 SOL");
  assert.equal(tradeLabel("sell", 25), "Sell 25%");
  assert.equal(tradeLabel("sell", 100), "Sell all");
  assert.equal(trend(2), "up"); assert.equal(trend(-1), "dn"); assert.equal(trend(null), "flat"); assert.equal(trend(0), "flat");
  const r = sortPositions([{ valueSol: null, amount: 9 }, { valueSol: 1, amount: 1 }, { valueSol: 3, amount: 1 }, { valueSol: null, amount: 50 }]);
  assert.deepEqual(r.map((x) => `${x.valueSol}:${x.amount}`), ["3:1", "1:1", "null:50", "null:9"]);
});
