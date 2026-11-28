import { test } from "node:test";
import assert from "node:assert/strict";
import { mcapUsdOf, quoteIdOf } from "./quote.js";

test("quote helpers: SOL needs the SOL price, USDC is already USD, unknown or missing means SOL", () => {
  assert.equal(quoteIdOf({}), "SOL");
  assert.equal(quoteIdOf({ quoteMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU" }), "USDC");
  assert.equal(quoteIdOf({ quoteMint: "SomethingElse" }), "SOL");
  assert.equal(mcapUsdOf({ mcapSol: 30 }, 150), 4500);
  assert.equal(mcapUsdOf({ mcapSol: 6000, quoteMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU" }, 150), 6000);
});
