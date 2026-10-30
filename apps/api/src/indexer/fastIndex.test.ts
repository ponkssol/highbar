import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PublicKey } from "@solana/web3.js";
import { deriveDbcPoolAddress } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { decodeDbcEvents, type RawTx } from "./decode.js";
import { FastIndexer, fastIndexConfig, initForMint, optionalSignature, type FastDeps, type FastResult } from "./fastIndex.js";

const MINT = "Mint1111111111111111111111111111111111111hi";
const SIG = "5".repeat(88);
const cfg = (o: Partial<ReturnType<typeof fastIndexConfig>> = {}) => ({ ...fastIndexConfig({}), ...o });
const tick = () => new Promise((r) => setImmediate(r));

function deps(o: { exists?: boolean; run?: FastDeps["run"] } = {}) {
  const calls = { exists: 0, run: 0 };
  const d: FastDeps = {
    tokenExists: async () => { calls.exists++; return !!o.exists; },
    run: async (m, s) => { calls.run++; return o.run ? o.run(m, s) : { status: "indexed" }; },
  };
  return { d, calls };
}

test("fastIndexConfig: on by default, 30/min, 4 at once; FAST_INDEX=0 turns it off; bad values fall back", () => {
  assert.deepEqual(fastIndexConfig({}), { enabled: true, perMin: 30, maxConcurrent: 4, memory: 10_000 });
  assert.equal(fastIndexConfig({ FAST_INDEX: "0" }).enabled, false);
  assert.equal(fastIndexConfig({ FAST_INDEX: "off" }).enabled, false);
  assert.deepEqual(fastIndexConfig({ FAST_INDEX_PER_MIN: "5", FAST_INDEX_MAX_CONCURRENT: "2" }).perMin, 5);
  assert.equal(fastIndexConfig({ FAST_INDEX_PER_MIN: "0" }).perMin, 30);
  assert.equal(fastIndexConfig({ FAST_INDEX_MAX_CONCURRENT: "x" }).maxConcurrent, 4);
});

test("optionalSignature: base58 64-88 chars only, anything else ignored", () => {
  assert.equal(optionalSignature(SIG), SIG);
  for (const bad of [undefined, null, 5, "", "0".repeat(88), "5".repeat(40), "5".repeat(89), `${"5".repeat(87)}!`]) assert.equal(optionalSignature(bad), undefined);
});

test("initForMint: the real launch tx fixture holds the init event of our config, and its pool is the (config, mint, WSOL) PDA", () => {
  const raw = JSON.parse(fs.readFileSync(new URL("./fixtures/create-dev-buy.json", import.meta.url), "utf8")) as RawTx;
  const events = decodeDbcEvents(raw);
  const init = events.find((e) => e.kind === "init");
  assert.ok(init && init.kind === "init");
  const hit = initForMint(events, init.mint, [{ address: "11111111111111111111111111111111" }, { address: init.config }]);
  assert.deepEqual(hit, { pool: init.pool, config: init.config });
  assert.equal(deriveDbcPoolAddress(new PublicKey("So11111111111111111111111111111111111111112"), new PublicKey(init.mint), new PublicKey(init.config)).toBase58(), init.pool);
  assert.equal(initForMint(events, init.mint, [{ address: "11111111111111111111111111111111" }]), null, "foreign config");
  assert.equal(initForMint(events, MINT, [{ address: init.config }]), null, "other mint");
  assert.equal(initForMint(events.filter((e) => e.kind !== "init"), init.mint, [{ address: init.config }]), null, "swap only, no init");
});

test("concurrent requests for one mint share one run; later ones are duplicates (at most one RPC attempt per mint)", async () => {
  let release!: (r: FastResult) => void;
  const { d, calls } = deps({ run: () => new Promise((r) => { release = r; }) });
  const f = new FastIndexer(cfg(), d);
  const a = f.request(MINT, { signature: SIG }), b = f.request(MINT, { signature: SIG }), c = f.request(MINT, { reserved: true });
  assert.equal(a, b); assert.equal(a, c);
  await tick();
  release({ status: "indexed" });
  assert.deepEqual(await a, { status: "indexed" });
  assert.equal(calls.run, 1);
  assert.deepEqual(await f.request(MINT, { signature: SIG }), { status: "duplicate" });
  assert.equal(calls.run, 1);
});

test("no signature and no vanity reservation: ineligible, no db and no RPC; already in the db: no RPC", async () => {
  const { d, calls } = deps();
  const f = new FastIndexer(cfg(), d);
  assert.equal((await f.request(MINT)).status, "ineligible");
  assert.deepEqual(calls, { exists: 0, run: 0 });
  const e = deps({ exists: true });
  const g = new FastIndexer(cfg(), e.d);
  assert.equal((await g.request(MINT, { signature: SIG })).status, "exists");
  assert.equal(e.calls.run, 0);
  assert.equal((await g.request(MINT, { signature: SIG })).status, "duplicate");
});

test("global caps: FAST_INDEX_PER_MIN per rolling minute and FAST_INDEX_MAX_CONCURRENT at once; a rate-limited mint may retry later", async () => {
  let now = 0;
  const { d, calls } = deps();
  const f = new FastIndexer(cfg({ perMin: 3 }), d, () => now);
  const mints = ["A", "B", "C", "D"].map((x) => `${x}${MINT.slice(1)}`);
  const r = [];
  for (const m of mints) r.push((await f.request(m, { signature: SIG })).status);
  assert.deepEqual(r, ["indexed", "indexed", "indexed", "rate_limited"]);
  now = 60_001;
  assert.equal((await f.request(mints[3], { signature: SIG })).status, "indexed");
  assert.equal(calls.run, 4);

  const gates: (() => void)[] = [];
  const slow = deps({ run: () => new Promise((res) => gates.push(() => res({ status: "indexed" }))) });
  const g = new FastIndexer(cfg({ maxConcurrent: 2 }), slow.d);
  const p = mints.slice(0, 3).map((m) => g.request(m, { signature: SIG }));
  assert.equal((await p[2]).status, "rate_limited");
  await tick();
  gates.forEach((go) => go());
  assert.deepEqual((await Promise.all(p.slice(0, 2))).map((x) => x.status), ["indexed", "indexed"]);
});

test("failures never reject (the tick still indexes the token); disabled = no work", async () => {
  const { d } = deps({ run: async () => { throw new Error("rpc down"); } });
  assert.deepEqual(await new FastIndexer(cfg(), d).request(MINT, { signature: SIG }), { status: "failed" });
  const off = deps();
  assert.equal((await new FastIndexer(cfg({ enabled: false }), off.d).request(MINT, { signature: SIG })).status, "disabled");
  assert.deepEqual(off.calls, { exists: 0, run: 0 });
});

test("kick returns before any work starts (fire-and-forget) and logs the outcome", async () => {
  const { d, calls } = deps();
  const logs: string[] = [];
  const f = new FastIndexer(cfg(), d);
  f.kick(MINT, { signature: SIG }, (m) => logs.push(m));
  assert.deepEqual(calls, { exists: 0, run: 0 });
  await tick(); await tick(); await tick();
  assert.equal(calls.run, 1);
  assert.match(logs[0] ?? "", /\[fast-index\] .*: indexed in \d+ ms/);
});
