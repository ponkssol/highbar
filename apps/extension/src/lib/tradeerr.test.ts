import { test } from "node:test";
import assert from "node:assert/strict";
import { publicTradeError as p } from "./tradeerr";

test("trade errors never name the route or venue", () => {
  for (const m of ["Jupiter: Route not found", "Jupiter did not answer (HTTP 502)", "The pool for this token is not known yet", "pump.fun AMM sell failed", "DBC buy failed: custom error", "DAMM v2 quote failed", "swap build failed", ""])
    assert.doesNotMatch(p(m), /jupiter|jup|pump|amm|dbc|damm|pool|route|swap/i, m);
  assert.equal(p("Jupiter swaps run on mainnet only"), "This token trades on mainnet only");
  assert.equal(p("Transaction simulation failed: custom program error: 0x1771"), "Price moved past your slippage. Try again or raise it");
  assert.equal(p("Attempt to debit an account but found no record of a prior credit. insufficient lamports"), "Not enough SOL for this trade");
  assert.equal(p("This wallet holds none of this token"), "This wallet holds none of this token");
  assert.equal(p("Finish the wallet update in the side panel first"), "Finish the wallet update in the side panel first");
  assert.equal(p("Jupiter: Could not find any route"), "This token can't be traded right now");
});
