import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { CUSTOM_RPC_DOWN, rpc, SERVER_RPC_DOWN } from "./rpc";
import { API_BASE, cleanRpcUrl, normalizeSettings, PROD_API, rpcEndpoint } from "./settings";

const real = globalThis.fetch;
afterEach(() => { globalThis.fetch = real; });
const calls: string[] = [];
function fake(handler: (url: string, body: { method: string }) => Response) {
  calls.length = 0;
  globalThis.fetch = (async (u: string | URL, init?: RequestInit) => { calls.push(String(u)); return handler(String(u), JSON.parse(String(init?.body))); }) as typeof fetch;
}
const ok = (result: unknown) => new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), { status: 200, headers: { "content-type": "application/json" } });

test("rpc default: no custom URL uses the server proxy on the build-time API", () => {
  assert.equal(API_BASE, PROD_API, "tests run without the dev define");
  assert.equal(rpcEndpoint({ rpcUrl: "" }), `${PROD_API}/rpc`);
  assert.equal(normalizeSettings(undefined).rpcUrl, "");
});

test("rpc override: a valid custom URL is used for balance reads", async () => {
  const s = normalizeSettings({ rpcUrl: "https://rpc.example.test/key-free" });
  assert.equal(rpcEndpoint(s), "https://rpc.example.test/key-free");
  fake(() => ok({ context: { slot: 1 }, value: 2_500_000_000 }));
  assert.equal(await rpc(rpcEndpoint(s), CUSTOM_RPC_DOWN).balance("11111111111111111111111111111111"), 2_500_000_000);
  assert.deepEqual(calls, ["https://rpc.example.test/key-free"]);
});

test("rpc override: only https (http for localhost), no credentials, and stored settings are checked again", () => {
  assert.equal(cleanRpcUrl("http://rpc.example.test"), null);
  assert.equal(cleanRpcUrl("https://user:pw@rpc.example.test"), null);
  assert.equal(cleanRpcUrl("javascript:alert(1)"), null);
  assert.equal(cleanRpcUrl("  https://rpc.example.test  "), "https://rpc.example.test/");
  assert.equal(cleanRpcUrl("http://127.0.0.1:8899"), "http://127.0.0.1:8899/");
  assert.equal(normalizeSettings({ rpcUrl: "ftp://x" }).rpcUrl, "");
});

test("rpc errors: a missing server route reads as server RPC unavailable, JSON-RPC errors keep their text", async () => {
  fake(() => new Response("Not Found", { status: 404 }));
  await assert.rejects(rpc(`${PROD_API}/rpc`, SERVER_RPC_DOWN).balance("11111111111111111111111111111111"), { message: SERVER_RPC_DOWN });
  fake(() => new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers: { "content-type": "application/json" } }));
  await assert.rejects(rpc(`${PROD_API}/rpc`, SERVER_RPC_DOWN).balance("11111111111111111111111111111111"), { message: SERVER_RPC_DOWN });
  fake(() => { throw new TypeError("network"); });
  await assert.rejects(rpc("https://rpc.example.test", CUSTOM_RPC_DOWN).latestBlockhash(), { message: CUSTOM_RPC_DOWN });
  fake(() => new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, error: { code: -32002, message: "Transaction simulation failed" } }), { status: 200 }));
  await assert.rejects(rpc("https://rpc.example.test", CUSTOM_RPC_DOWN).latestBlockhash(), /simulation failed/);
  fake(() => new Response("{}", { status: 429 }));
  await assert.rejects(rpc("https://rpc.example.test", CUSTOM_RPC_DOWN).latestBlockhash(), /Too many requests/);
});

test("rpc status detail: the real reason rides along in small text (HTTP status, rate limit, network, timeout)", async () => {
  const R = (ms?: number) => rpc("https://rpc.example.test", SERVER_RPC_DOWN, ms);
  fake(() => new Response("bad gateway", { status: 502, statusText: "Bad Gateway" }));
  await assert.rejects(R().latestBlockhash(), (e: Error & { detail?: string }) => e.message === SERVER_RPC_DOWN && e.detail === "HTTP 502 Bad Gateway");
  fake(() => new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, error: { code: -32005, message: "rate limited, try again shortly" } }), { status: 429 }));
  await assert.rejects(R().latestBlockhash(), (e: Error & { detail?: string }) => /rate limited/.test(e.message) && e.detail === "HTTP 429");
  globalThis.fetch = (async () => { throw new TypeError("Failed to fetch"); }) as typeof fetch;
  await assert.rejects(R().latestBlockhash(), (e: Error & { detail?: string }) => e.message === SERVER_RPC_DOWN && e.detail === "Network error (Failed to fetch)");
  globalThis.fetch = ((_u: string, init?: RequestInit) => new Promise((_r, rej) => init?.signal?.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" }))))) as typeof fetch;
  await assert.rejects(R(30).latestBlockhash(), (e: Error & { detail?: string }) => e.detail === "No answer within 1 second");
});

/** The api /rpc allowlist (apps/api/src/routes/rpc.ts on main). getGenesisHash is only sent to a user's own RPC. */
const ALLOWED = new Set(["getBalance", "getLatestBlockhash", "getTokenAccountsByOwner", "getParsedTokenAccountsByOwner", "getSignatureStatuses", "sendTransaction", "simulateTransaction", "getAccountInfo", "getMultipleAccounts", "getSlot", "getBlockTime"]);
test("rpc methods: every helper sends a real Solana method on the api allowlist (token accounts as getTokenAccountsByOwner jsonParsed)", async () => {
  const seen: { method: string; params: unknown[] }[] = [];
  globalThis.fetch = (async (_u: string | URL, init?: RequestInit) => { const b = JSON.parse(String(init?.body)); seen.push(b); return ok(b.method === "getSignatureStatuses" ? { value: [null] } : b.method === "sendTransaction" ? "sig" : { value: [] }); }) as typeof fetch;
  const R = rpc(`${PROD_API}/rpc`, SERVER_RPC_DOWN);
  await R.balance("11111111111111111111111111111111"); await R.latestBlockhash(); await R.tokenAccounts("11111111111111111111111111111111", "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  await R.statuses(["x"]); await R.send(new Uint8Array([1]), true);
  for (const c of seen) assert.ok(ALLOWED.has(c.method), c.method);
  const ta = seen.find((c) => c.method === "getTokenAccountsByOwner");
  assert.ok(ta, "token accounts use getTokenAccountsByOwner");
  assert.deepEqual(ta!.params[2], { commitment: "confirmed", encoding: "jsonParsed" });
  assert.ok(!seen.some((c) => c.method === "getParsedTokenAccountsByOwner"), "not a node method, a node answers Method not found");
});

test("sendAndConfirm reports Sent only after a node accepted the bytes (or the signature shows up)", async () => {
  const { sendAndConfirm, RpcError } = await import("./rpc");
  const raw = new Uint8Array(1 + 64 + 8); raw[0] = 1; raw[1] = 7; // one signature, not all zero
  type R = Parameters<typeof sendAndConfirm>[0];
  // accepted at once: Sent before the first status poll
  const ev1: string[] = [];
  const ok = { send: async () => { ev1.push("send"); return "x"; }, statuses: async () => { ev1.push("status"); return [{ err: null, confirmationStatus: "confirmed" as const }]; } } as unknown as R;
  await sendAndConfirm(ok, raw, { onSent: () => ev1.push("sent"), pollMs: 1 });
  assert.deepEqual(ev1, ["send", "sent", "status"]);
  // three transient failures: not "Sent" until the status shows the tx
  const ev2: string[] = []; let polls = 0;
  const flaky = { send: async () => { ev2.push("send"); throw new Error("fetch failed"); }, statuses: async () => { ev2.push("status"); return [++polls < 2 ? null : { err: null, confirmationStatus: "confirmed" as const }]; } } as unknown as R;
  await sendAndConfirm(flaky, raw, { onSent: () => ev2.push("sent"), pollMs: 1 });
  assert.equal(ev2.indexOf("sent"), ev2.lastIndexOf("status") + 1); // right after the status that showed the tx, not after the sends
  assert.equal(ev2.filter((x) => x === "sent").length, 1);
  // a deterministic rejection: an error, never "Sent"
  let sent3 = false;
  const bad = { send: async () => { throw new RpcError("Transaction simulation failed: insufficient funds", -32002); }, statuses: async () => [null] } as unknown as R;
  await assert.rejects(sendAndConfirm(bad, raw, { onSent: () => { sent3 = true; }, pollMs: 1 }), /rejected/);
  assert.equal(sent3, false);
});
