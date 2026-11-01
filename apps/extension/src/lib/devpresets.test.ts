import { test } from "node:test";
import assert from "node:assert/strict";
import { checkDevPresets, DEV_PRESETS_DEFAULT, parseDevAmount, readDevPresets } from "./devpresets";

const val = (v: unknown) => { const p = parseDevAmount(v); return p.ok ? p.value : null; };

test("dev buy amounts: SOL with up to 2 decimals, 0 allowed, at most the max", () => {
  assert.equal(val("0"), 0); assert.equal(val("0.25"), 0.25); assert.equal(val("1,5"), 1.5); assert.equal(val("20"), 20); assert.equal(val(0.5), 0.5);
  for (const bad of ["-1", "0.123", "21", "abc", "1e2", ""]) assert.equal(val(bad), null, bad);
});

test("presets: 1 to 4 values, no duplicates, blanks skipped, defaults when stored is bad", () => {
  const ok = checkDevPresets(["0", "0.5", "", "2"]);
  assert.ok(ok.ok && ok.values.join() === "0,0.5,2");
  assert.equal(checkDevPresets(["1", "1"]).ok, false);
  assert.equal(checkDevPresets(["", "", "", ""]).ok, false);
  assert.equal(checkDevPresets(["0", "30"]).ok, false);
  assert.equal(checkDevPresets(["0", "1", "2", "3", "4"]).ok, false);
  assert.deepEqual(readDevPresets(undefined), [...DEV_PRESETS_DEFAULT]);
  assert.deepEqual(readDevPresets([0, 0.25, 1, 2]), [0, 0.25, 1, 2]);
  assert.deepEqual(readDevPresets(["x"]), [...DEV_PRESETS_DEFAULT]);
  assert.deepEqual([...DEV_PRESETS_DEFAULT], [0, 0.5, 1, 2]);
});
