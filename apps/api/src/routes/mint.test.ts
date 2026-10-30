import { test } from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { registerMint, type FastIndexFn } from "./mint.js";

const MINT = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
const SIG = "5".repeat(88);

function app(o: { confirm?: (q: unknown, m: string) => Promise<boolean>; fastIndex?: FastIndexFn }) {
  const a = Fastify();
  registerMint(a, { q: {} as never, confirm: (o.confirm ?? (async () => false)) as never, fastIndex: o.fastIndex });
  return a;
}

test("POST /mint/confirm kicks the fast index with the launch signature (vanity or not) and answers as before", async () => {
  const kicks: { mint: string; o: { signature?: string; reserved?: boolean } }[] = [];
  const fastIndex: FastIndexFn = (mint, o) => { kicks.push({ mint, o }); };
  const vanity = app({ confirm: async () => true, fastIndex });
  const r1 = await vanity.inject({ method: "POST", url: "/mint/confirm", payload: { mint: MINT } });
  assert.equal(r1.statusCode, 200); assert.deepEqual(r1.json(), { used: true });
  const plain = app({ confirm: async () => false, fastIndex });
  const r2 = await plain.inject({ method: "POST", url: "/mint/confirm", payload: { mint: MINT, signature: SIG } });
  assert.deepEqual(r2.json(), { used: false });
  const r3 = await plain.inject({ method: "POST", url: "/mint/confirm", payload: { mint: MINT, signature: "not a sig" } });
  assert.equal(r3.statusCode, 200, "a malformed signature is ignored, never a 400");
  assert.deepEqual(kicks, [
    { mint: MINT, o: { signature: undefined, reserved: true } },
    { mint: MINT, o: { signature: SIG, reserved: false } },
    { mint: MINT, o: { signature: undefined, reserved: false } },
  ]);
});

test("the fast index can never slow down or fail the confirm response", async () => {
  const throwing = app({ fastIndex: () => { throw new Error("boom"); } });
  const r = await throwing.inject({ method: "POST", url: "/mint/confirm", payload: { mint: MINT, signature: SIG } });
  assert.equal(r.statusCode, 200); assert.deepEqual(r.json(), { used: false });
  let kicked = 0;
  const failingConfirm = app({ confirm: async () => { throw new Error("db down"); }, fastIndex: () => { kicked++; } });
  const r2 = await failingConfirm.inject({ method: "POST", url: "/mint/confirm", payload: { mint: MINT, signature: SIG } });
  assert.equal(r2.statusCode, 500, "confirm's own error is unchanged");
  assert.equal(kicked, 1, "a non-vanity launch is still indexed fast");
  const bad = await failingConfirm.inject({ method: "POST", url: "/mint/confirm", payload: { mint: "nope", signature: SIG } });
  assert.equal(bad.statusCode, 400);
  assert.equal(kicked, 1, "an invalid mint never reaches the fast path");
});
