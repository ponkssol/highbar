import { test } from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { Keypair } from "@solana/web3.js";
import { registerConfigAndRpc, sanitizeRpc, RpcReject, type RpcDeps } from "./rpc.js";
import { WindowLimiter } from "../security/rateLimit.js";

const pk = () => Keypair.generate().publicKey.toBase58();
const UPSTREAM = "https://upstream.invalid/secret-key-abc123";
const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const SIG = "5".repeat(87);
const TX = "A".repeat(200);

type Call = { url: string; body: any };
function app(o: Partial<RpcDeps> & { reply?: (body: any) => unknown; fail?: boolean } = {}) {
  const calls: Call[] = [];
  const fakeFetch = (async (url: string, init: { body: string }) => {
    const body = JSON.parse(init.body);
    calls.push({ url, body });
    if (o.fail) throw new Error(`connect ECONNREFUSED ${UPSTREAM}`);
    const out = o.reply ? o.reply(body) : { jsonrpc: "2.0", id: body.id, result: { ok: body.method } };
    return new Response(JSON.stringify(out), { status: 200, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
  const f = Fastify();
  registerConfigAndRpc(f, { upstream: () => UPSTREAM, fetch: fakeFetch, network: () => "devnet", siteUrl: () => "https://site.example/", extFeeReceiver: () => null, sendLimiter: new WindowLimiter(100, 60_000), ...o });
  return { f, calls };
}
const rpc = (f: ReturnType<typeof Fastify>, payload: unknown) => f.inject({ method: "POST", url: "/rpc", payload: payload as any });

test("GET /config: network, siteUrl and extFee only (no RPC URL, no trailing slash)", async () => {
  const { f } = app();
  const r = await f.inject({ method: "GET", url: "/config" });
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.json(), { network: "devnet", siteUrl: "https://site.example", extFee: { bps: 2, receiver: null, enabled: false } });
  assert.ok(!r.body.includes("upstream.invalid"));
  const m = app({ network: () => "mainnet-beta" });
  assert.equal((await m.f.inject({ method: "GET", url: "/config" })).json().network, "mainnet");
});

test("GET /config extFee: the extension fee receiver for every trade comes from EXT_FEE_RECEIVER only", async () => {
  const receiver = pk();
  const on = app({ extFeeReceiver: () => receiver });
  assert.deepEqual((await on.f.inject({ method: "GET", url: "/config" })).json().extFee, { bps: 2, receiver, enabled: true });
  // default resolver reads the env: EXT_FEE_RECEIVER enables it, TREASURY_PUBKEY alone does not, an invalid key is off
  const saved = { r: process.env.EXT_FEE_RECEIVER, t: process.env.TREASURY_PUBKEY };
  try {
    const viaEnv = async () => { const f = Fastify(); registerConfigAndRpc(f, { network: () => "devnet", siteUrl: () => "https://site.example", sendLimiter: new WindowLimiter(100, 60_000), simulateLimiter: new WindowLimiter(100, 60_000) }); return (await f.inject({ method: "GET", url: "/config" })).json().extFee; };
    delete process.env.EXT_FEE_RECEIVER; process.env.TREASURY_PUBKEY = pk();
    assert.deepEqual(await viaEnv(), { bps: 2, receiver: null, enabled: false });
    process.env.EXT_FEE_RECEIVER = "not-a-key";
    assert.deepEqual(await viaEnv(), { bps: 2, receiver: null, enabled: false });
    process.env.EXT_FEE_RECEIVER = ` ${receiver} `;
    assert.deepEqual(await viaEnv(), { bps: 2, receiver, enabled: true });
  } finally {
    for (const [k, v] of [["EXT_FEE_RECEIVER", saved.r], ["TREASURY_PUBKEY", saved.t]] as const) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
});

test("POST /rpc: allowlisted read calls are forwarded with rebuilt params, result passed back with the client id", async () => {
  const { f, calls } = app();
  const owner = pk();
  const r = await rpc(f, { jsonrpc: "2.0", id: 7, method: "getBalance", params: [owner, { commitment: "confirmed", evil: "x" }] });
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.json(), { jsonrpc: "2.0", id: 7, result: { ok: "getBalance" } });
  assert.equal(calls[0].url, UPSTREAM);
  assert.deepEqual(calls[0].body.params, [owner, { commitment: "confirmed" }], "unknown config keys are dropped");
  for (const [method, params] of [
    ["getLatestBlockhash", [{ commitment: "finalized" }]],
    ["getParsedTokenAccountsByOwner", [owner, { programId: TOKEN }, { commitment: "confirmed" }]],
    ["getTokenAccountsByOwner", [owner, { mint: pk() }]],
    ["getSignatureStatuses", [[SIG], { searchTransactionHistory: true }]],
  ] as const) {
    const x = await rpc(f, { jsonrpc: "2.0", id: "a", method, params });
    assert.equal(x.statusCode, 200, method);
    assert.equal(x.json().result.ok, method);
  }
  assert.equal(calls.length, 5);
});

test("POST /rpc: other methods, batches and bad params are refused before any upstream call", async () => {
  const { f, calls } = app();
  for (const method of ["requestAirdrop", "getProgramAccounts", "getSignaturesForAddress", "getTransaction", ""]) {
    const r = await rpc(f, { jsonrpc: "2.0", id: 1, method, params: [] });
    assert.equal(r.statusCode, 403, method);
    assert.equal(r.json().error.code, -32601);
  }
  assert.equal((await rpc(f, [{ jsonrpc: "2.0", id: 1, method: "getBalance", params: [pk()] }])).statusCode, 400, "batch");
  const bad: [string, unknown][] = [
    ["getBalance", ["not-an-address"]],
    ["getBalance", [pk(), { commitment: "max" }]],
    ["getParsedTokenAccountsByOwner", [pk(), { programId: pk() }]],
    ["getParsedTokenAccountsByOwner", [pk(), { programId: TOKEN, mint: pk() }]],
    ["getTokenAccountsByOwner", [pk(), { mint: pk() }, { encoding: "base58" }]],
    ["getSignatureStatuses", [Array(51).fill(SIG)]],
    ["getSignatureStatuses", [["abc"]]],
    ["sendTransaction", ["A".repeat(1700)]],
    ["sendTransaction", [TX, { encoding: "base58" }]],
    ["sendTransaction", ["not base64 !!".repeat(10)]],
    ["getLatestBlockhash", "x"],
  ];
  for (const [method, params] of bad) {
    const r = await rpc(f, { jsonrpc: "2.0", id: 1, method, params });
    assert.equal(r.statusCode, 400, `${method} ${JSON.stringify(params).slice(0, 60)}`);
    assert.equal(r.json().error.code, -32602);
  }
  assert.equal(calls.length, 0);
  assert.throws(() => sanitizeRpc("getBalance", [pk(), [1]]), RpcReject);
});

test("POST /rpc: sendTransaction forwards base64 bytes only and is rate limited per IP", async () => {
  const { f, calls } = app({ sendLimiter: new WindowLimiter(2, 60_000) });
  const send = () => rpc(f, { jsonrpc: "2.0", id: 3, method: "sendTransaction", params: [TX, { skipPreflight: false, preflightCommitment: "confirmed", maxRetries: 0 }] });
  assert.equal((await send()).statusCode, 200);
  assert.deepEqual(calls[0].body.params, [TX, { encoding: "base64", skipPreflight: false, preflightCommitment: "confirmed", maxRetries: 0 }]);
  assert.equal((await send()).statusCode, 200);
  const r = await send();
  assert.equal(r.statusCode, 429);
  assert.ok(Number(r.headers["retry-after"]) >= 1);
  assert.equal(calls.length, 2);
  const read = await rpc(f, { jsonrpc: "2.0", id: 4, method: "getLatestBlockhash", params: [] });
  assert.equal(read.statusCode, 200, "read calls are not counted against the send limit");
});

test("POST /rpc: upstream failures never leak the RPC URL", async () => {
  const down = app({ fail: true });
  const r = await rpc(down.f, { jsonrpc: "2.0", id: 1, method: "getBalance", params: [pk()] });
  assert.equal(r.statusCode, 502);
  assert.ok(!r.body.includes("upstream.invalid") && !r.body.includes("secret-key"));
  const err = app({ reply: (b) => ({ jsonrpc: "2.0", id: b.id, error: { code: -32002, message: "Transaction simulation failed: Blockhash not found", data: { logs: [] } } }) });
  const e = await rpc(err.f, { jsonrpc: "2.0", id: 9, method: "sendTransaction", params: [TX] });
  assert.equal(e.statusCode, 200);
  assert.deepEqual(e.json(), { jsonrpc: "2.0", id: 9, error: { code: -32002, message: "Transaction simulation failed: Blockhash not found", data: { logs: [] } } });
  const junk = app({ reply: () => ({ nope: true }) });
  assert.equal((await rpc(junk.f, { jsonrpc: "2.0", id: 1, method: "getLatestBlockhash" })).statusCode, 502);
});

test("sanitizeRpc: simulateTransaction keeps base64, sigVerify and commitment, drops accounts", () => {
  assert.deepEqual(sanitizeRpc("simulateTransaction", [TX, { encoding: "base64", sigVerify: true, commitment: "confirmed", accounts: { addresses: [pk()], encoding: "base64" }, innerInstructions: true }]),
    [TX, { encoding: "base64", sigVerify: true, commitment: "confirmed" }]);
  assert.throws(() => sanitizeRpc("simulateTransaction", ["short"]), RpcReject);
  assert.throws(() => sanitizeRpc("simulateTransaction", ["A".repeat(1700)]), RpcReject);
  assert.throws(() => sanitizeRpc("simulateTransaction", [TX, { sigVerify: true, replaceRecentBlockhash: true }]), RpcReject);
  assert.throws(() => sanitizeRpc("simulateTransaction", [TX, { sigVerify: "yes" }]), RpcReject);
});

test("sanitizeRpc: account reads, slot and block time", () => {
  const a = pk(), b = pk();
  assert.deepEqual(sanitizeRpc("getAccountInfo", [a, { encoding: "base64", commitment: "confirmed", extra: 1 }]), [a, { encoding: "base64", commitment: "confirmed" }]);
  assert.deepEqual(sanitizeRpc("getAccountInfo", [a, { dataSlice: { offset: 0, length: 8 } }]), [a, { encoding: "base64", dataSlice: { offset: 0, length: 8 } }]);
  assert.throws(() => sanitizeRpc("getAccountInfo", [a, { encoding: "base58" }]), RpcReject);
  assert.throws(() => sanitizeRpc("getAccountInfo", ["nope"]), RpcReject);
  assert.deepEqual(sanitizeRpc("getMultipleAccounts", [[a, b], { commitment: "confirmed" }]), [[a, b], { encoding: "base64", commitment: "confirmed" }]);
  assert.throws(() => sanitizeRpc("getMultipleAccounts", [Array.from({ length: 21 }, pk)]), RpcReject);
  assert.throws(() => sanitizeRpc("getMultipleAccounts", [[]]), RpcReject);
  assert.deepEqual(sanitizeRpc("getSlot", [{ commitment: "confirmed" }]), [{ commitment: "confirmed" }]);
  assert.deepEqual(sanitizeRpc("getBlockTime", [1234]), [1234]);
  assert.throws(() => sanitizeRpc("getBlockTime", ["1234"]), RpcReject);
  assert.throws(() => sanitizeRpc("getBlockTime", [-1]), RpcReject);
});

test("POST /rpc: simulateTransaction has its own per-IP limit", async () => {
  const { f, calls } = app({ simulateLimiter: new WindowLimiter(1, 60_000) });
  const one = await rpc(f, { jsonrpc: "2.0", id: 1, method: "simulateTransaction", params: [TX, { encoding: "base64", sigVerify: true }] });
  assert.equal(one.statusCode, 200);
  const two = await rpc(f, { jsonrpc: "2.0", id: 2, method: "simulateTransaction", params: [TX, { encoding: "base64", sigVerify: true }] });
  assert.equal(two.statusCode, 429);
  assert.equal(calls.length, 1);
});

test("sanitizeRpc: getTokenLargestAccounts / getTokenSupply take one base58 mint and a commitment-only config", () => {
  const mint = pk();
  for (const m of ["getTokenLargestAccounts", "getTokenSupply"]) {
    assert.deepEqual(sanitizeRpc(m, [mint]), [mint, { commitment: "confirmed" }], `${m}: bare [mint] gets the default commitment`);
    assert.deepEqual(sanitizeRpc(m, [mint, {}]), [mint, { commitment: "confirmed" }], `${m}: empty config gets the default commitment`);
    assert.deepEqual(sanitizeRpc(m, [mint, null]), [mint, { commitment: "confirmed" }], `${m}: null config gets the default commitment`);
    assert.deepEqual(sanitizeRpc(m, [mint, { evil: "x" }]), [mint, { commitment: "confirmed" }], `${m}: config without commitment gets the default`);
    for (const keep of ["processed", "finalized"]) assert.deepEqual(sanitizeRpc(m, [mint, { commitment: keep }]), [mint, { commitment: keep }], `${m}: explicit ${keep} kept`);
    assert.deepEqual(sanitizeRpc(m, [mint, { commitment: "confirmed" }]), [mint, { commitment: "confirmed" }], m);
    assert.deepEqual(sanitizeRpc(m, [mint, { commitment: "finalized", minContextSlot: 5, encoding: "jsonParsed", evil: "x" }]), [mint, { commitment: "finalized" }], `${m}: other config keys dropped`);
    for (const bad of [[], ["not-a-mint"], [123], [[mint]], [mint, mint], [mint, { commitment: "max" }], [mint, [1]], [mint, {}, {}], "x"])
      assert.throws(() => sanitizeRpc(m, bad), RpcReject, `${m} ${JSON.stringify(bad)}`);
  }
});

test("POST /rpc: getTokenLargestAccounts / getTokenSupply are forwarded under the per-IP rpc class, bad params refused before upstream", async () => {
  const { f, calls } = app();
  const mint = pk();
  for (const method of ["getTokenLargestAccounts", "getTokenSupply"]) {
    const r = await rpc(f, { jsonrpc: "2.0", id: 5, method, params: [mint, { commitment: "confirmed", extra: true }] });
    assert.equal(r.statusCode, 200, method);
    assert.deepEqual(r.json(), { jsonrpc: "2.0", id: 5, result: { ok: method } });
    assert.deepEqual(calls.at(-1)!.body, { jsonrpc: "2.0", id: 1, method, params: [mint, { commitment: "confirmed" }] });
    const bad = await rpc(f, { jsonrpc: "2.0", id: 6, method, params: ["nope"] });
    assert.equal(bad.statusCode, 400); assert.equal(bad.json().error.code, -32602);
  }
  assert.equal(calls.length, 2);
});

test("POST /rpc: getTokenLargestAccounts / getTokenSupply with bare [mint] are forwarded with commitment confirmed; explicit kept, invalid refused", async () => {
  const { f, calls } = app();
  const mint = pk();
  for (const method of ["getTokenLargestAccounts", "getTokenSupply"]) {
    const r = await rpc(f, { jsonrpc: "2.0", id: 9, method, params: [mint] });
    assert.equal(r.statusCode, 200, method);
    assert.deepEqual(calls.at(-1)!.body.params, [mint, { commitment: "confirmed" }], `${method}: default injected`);
    const kept = await rpc(f, { jsonrpc: "2.0", id: 10, method, params: [mint, { commitment: "finalized" }] });
    assert.equal(kept.statusCode, 200, method);
    assert.deepEqual(calls.at(-1)!.body.params, [mint, { commitment: "finalized" }], `${method}: explicit commitment kept`);
    const before = calls.length;
    for (const c of ["max", 1, "", null]) {
      const bad = await rpc(f, { jsonrpc: "2.0", id: 11, method, params: [mint, { commitment: c }] });
      assert.equal(bad.statusCode, 400, `${method} ${JSON.stringify(c)}`); assert.equal(bad.json().error.code, -32602);
    }
    assert.equal(calls.length, before, `${method}: invalid commitments never reach the upstream`);
  }
});
