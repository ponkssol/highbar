import { test } from "node:test";
import assert from "node:assert/strict";
import { HIDDEN_TOKEN_MINTS, hiddenMintSet, parseMintList, withoutHidden } from "./hiddenTokens.js";

const EXTRA = "TestMint1111111111111111111111111111111111";

test("hidden tokens: built-in list holds 4 valid, distinct mints", () => {
  assert.equal(HIDDEN_TOKEN_MINTS.length, 4);
  assert.equal(new Set(HIDDEN_TOKEN_MINTS).size, 4);
  assert.deepEqual(parseMintList(HIDDEN_TOKEN_MINTS.join(",")), [...HIDDEN_TOKEN_MINTS]);
});

test("hidden tokens: env list parsing drops junk, dedupes, merges with the built-in list", () => {
  assert.deepEqual(parseMintList(undefined), []);
  assert.deepEqual(parseMintList(""), []);
  assert.deepEqual(parseMintList(` ${EXTRA} , not-a-mint,,${EXTRA}\n`), [EXTRA]);
  const s = hiddenMintSet(`${EXTRA},${HIDDEN_TOKEN_MINTS[0]}`);
  assert.equal(s.size, 5);
  assert.ok(s.has(EXTRA) && HIDDEN_TOKEN_MINTS.every((m) => s.has(m)));
  assert.equal(hiddenMintSet().size, 4);
});

test("hidden tokens: withoutHidden keeps everything else in order", () => {
  const rows = [{ mint: "Keep1111111111111111111111111111111111111111", name: "Test Coin" }, { mint: HIDDEN_TOKEN_MINTS[1]! }, { mint: EXTRA }];
  assert.deepEqual(withoutHidden(rows, hiddenMintSet()).map((r) => r.mint), [rows[0]!.mint, EXTRA]);
  assert.deepEqual(withoutHidden(rows, new Set()), rows);
});
