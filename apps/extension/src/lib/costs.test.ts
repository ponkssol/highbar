import { test } from "node:test";
import assert from "node:assert/strict";
import { shortOnSol } from "./costs";

test("shortOnSol: amount + priority + highbar fee against each wallet's SOL", () => {
  const ws = [{ id: "a", sol: 1 }, { id: "b", sol: 0.1 }, { id: "c", sol: null }];
  const fee = { enabled: true, bps: 2 };
  assert.deepEqual(shortOnSol(ws, 0.5, 0.0001, fee).map((w) => w.id), ["b"]);
  // exactly enough is fine; one lamport-ish short is not
  assert.deepEqual(shortOnSol([{ sol: 0.1 + 0.0001 + 0.1 * 2 / 10_000 }], 0.1, 0.0001, fee), []);
  assert.equal(shortOnSol([{ sol: 0.1 }], 0.1, 0.0001, null).length, 1);
  assert.deepEqual(shortOnSol(ws, null, 0.0001, fee), []);
  assert.deepEqual(shortOnSol(ws, 0, 0.0001, fee), []);
});
