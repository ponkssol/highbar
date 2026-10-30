import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair } from "@solana/web3.js";
import { WindowLimiter, routeClass, clientIp, creatorLaunchGate, limitsFromEnv } from "./rateLimit.js";
import { address, int, text, label, link, imageMatches, isAddress, BadRequest } from "./validate.js";
import { publicError, clean } from "./errors.js";
import { checkEnv } from "./prodCheck.js";
import { vanityMode } from "../services/mintPool/mode.js";

const pk = () => Keypair.generate().publicKey.toBase58();

test("WindowLimiter: allows max per window, then reports the wait, then resets", () => {
  let t = 1_000;
  const l = new WindowLimiter(3, 60_000, () => t);
  assert.equal(l.take("a"), 0); assert.equal(l.take("a"), 0); assert.equal(l.take("a"), 0);
  assert.equal(l.take("a"), 60_000);
  assert.equal(l.take("b"), 0, "keys are independent");
  t += 30_000; assert.equal(l.take("a"), 30_000);
  t += 30_000; assert.equal(l.take("a"), 0, "new window");
  t += 120_000; l.sweep(); assert.equal(l.size, 0);
});

test("routeClass: strict classes for metadata, referrals, launch and tx builders", () => {
  assert.equal(routeClass("POST", "/metadata"), "metadata");
  assert.equal(routeClass("POST", "/referrals"), "referral");
  assert.equal(routeClass("POST", "/tx/launch"), "launch");
  assert.equal(routeClass("POST", "/tx/swap?x=1"), "txBuild");
  assert.equal(routeClass("GET", "/tx/launch/quote"), "txBuild");
  assert.equal(routeClass("POST", "/auth/verify"), "auth");
  assert.equal(routeClass("GET", "/tokens"), null);
});

test("clientIp: forwarded IP trusted only with the proxy secret; secret without IP = trusted server call", () => {
  const ip = "9.9.9.9";
  assert.equal(clientIp({ ip, headers: { "x-hb-client-ip": "1.2.3.4" } }, "s3cret"), ip, "no secret header: spoofed IP ignored");
  assert.equal(clientIp({ ip, headers: { "x-hb-client-ip": "1.2.3.4", "x-hb-proxy-secret": "wrong!" } }, "s3cret"), ip);
  assert.equal(clientIp({ ip, headers: { "x-hb-client-ip": "1.2.3.4, 5.6.7.8", "x-hb-proxy-secret": "s3cret" } }, "s3cret"), "1.2.3.4");
  assert.equal(clientIp({ ip, headers: { "x-hb-proxy-secret": "s3cret" } }, "s3cret"), null);
  assert.equal(clientIp({ ip, headers: { "x-hb-client-ip": "1.2.3.4", "x-hb-proxy-secret": "" } }, ""), ip, "no secret configured: never trusted");
});

test("creatorLaunchGate: anti-spam per creator wallet", () => {
  const limits = limitsFromEnv();
  const c = pk();
  for (let i = 0; i < 5; i++) assert.equal(creatorLaunchGate(limits, c), null);
  assert.ok(creatorLaunchGate(limits, c));
  assert.equal(creatorLaunchGate(limits, pk()), null);
});

test("validate: addresses, ints, text, labels, links, image magic bytes", () => {
  const a = pk();
  assert.ok(isAddress(a)); assert.equal(address(a), a);
  for (const bad of ["", "0OIl", "x".repeat(44), 42, null, "So1111111111111111111111111111111111111111O"]) assert.throws(() => address(bad), BadRequest);
  assert.equal(int("50", "n", 0, 100), 50); assert.equal(int(undefined, "n", 0, 100, 7), 7);
  assert.throws(() => int("1.5", "n", 0, 100)); assert.throws(() => int("101", "n", 0, 100)); assert.throws(() => int("abc", "n", 0, 100));
  assert.equal(text("  he\u202Ello\u200b\u0000 ", 10), "hello");
  assert.equal(text("abcdef", 3), "abc");
  assert.throws(() => label(" \u200b ", "name", 32), BadRequest);
  assert.equal(link("example.com/x", "website"), "https://example.com/x");
  assert.equal(link("", "website"), "");
  for (const bad of ["javascript:alert(1)", "data:text/html,hi", "ftp://x.com"]) assert.throws(() => link(bad, "website"), BadRequest);
  assert.ok(imageMatches("image/png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])));
  assert.ok(!imageMatches("image/png", Buffer.from("<svg onload=alert(1)>")));
  assert.ok(imageMatches("image/jpeg", Buffer.from([0xff, 0xd8, 0xff, 0xe0])));
  assert.ok(imageMatches("image/gif", Buffer.from("GIF89a....")));
});

test("errors: no stack traces or paths; 5xx generic in production", () => {
  const e = { message: "boom at C:\\Users\\x\\repo\\src\\a.ts:10:5\n    at foo (/app/src/b.js:1:2)", statusCode: 500 };
  assert.deepEqual(publicError(e, true), { status: 500, body: { error: "internal error" } });
  const dev = publicError({ message: "bad input (/app/src/x.ts:3)", statusCode: 400 }, true);
  assert.equal(dev.status, 400); assert.ok(!/\.ts|\//.test(dev.body.error), dev.body.error);
  assert.equal(publicError({ statusCode: 413, code: "FST_ERR_CTP_BODY_TOO_LARGE", message: "x" }, true).body.error, "request body too large");
  assert.equal(clean("a\nb"), "a");
});

const goodMainnet = () => {
  const env: Record<string, string> = {
    NETWORK: "mainnet", TREASURY_PUBKEY: pk(), REFERRAL_ACCOUNT: pk(), OFFICIAL_TOKEN_CREATOR: pk(), DATABASE_URL: "postgres://u:p@h/db",
    RPC_URL: "https://example-name.solana-mainnet.quiknode.pro/0123abcd/", AUTH_SECRET: "x".repeat(40), SITE_URL: "https://highbar.example",
    CORS_ORIGIN: "https://highbar.example", PROXY_SHARED_SECRET: "y".repeat(40), LOCK_TIP_WALLET: pk(), LOCK_TIP_SOL: "0.005",
    MINT_POOL_ENC_KEY: "ab".repeat(32), // test-only key
  };
  for (const k of ["STANDARD_OFF", "STANDARD_ON", "HIGHER_OFF", "HIGHER_ON", "MAX_OFF", "MAX_ON"]) env[`CONFIG_${k}`] = pk();
  return env;
};

test("checkEnv: mainnet with complete env passes (single treasury wallet is fine)", () => {
  const r = checkEnv(goodMainnet(), { platformPubkey: pk(), configs: {} });
  assert.equal(r.network, "mainnet"); assert.deepEqual(r.errors, []); assert.deepEqual(r.warnings, []);
});

test("checkEnv: VANITY_MINTS=on refuses to start without a valid MINT_POOL_ENC_KEY (vanity mint pool)", () => {
  for (const bad of [undefined, "", "abcd", "ab".repeat(31), Buffer.alloc(16).toString("base64"), Buffer.alloc(33).toString("base64")]) {
    const env: Record<string, string | undefined> = { ...goodMainnet(), VANITY_MINTS: "on" }; if (bad === undefined) delete env.MINT_POOL_ENC_KEY; else env.MINT_POOL_ENC_KEY = bad;
    assert.ok(checkEnv(env).errors.some((e) => /MINT_POOL_ENC_KEY/.test(e)), `key ${JSON.stringify(bad?.length)} must be refused`);
  }
  const fill = goodMainnet(); fill.MINT_POOL_ENC_KEY = "<FILL_ME>";
  assert.ok(checkEnv(fill).errors.some((e) => /MINT_POOL_ENC_KEY/.test(e)));
  const b64 = goodMainnet(); b64.MINT_POOL_ENC_KEY = Buffer.alloc(32, 7).toString("base64");
  assert.deepEqual(checkEnv(b64, { platformPubkey: pk(), configs: {} }).errors, []);
  const err = checkEnv({ ...goodMainnet(), MINT_POOL_ENC_KEY: "cd".repeat(31) }).errors.join(" ");
  assert.ok(!err.includes("cd".repeat(31)), "the key value is never echoed");
  const n = goodMainnet(); n.MINT_POOL_MIN_AVAILABLE = "zero";
  assert.ok(checkEnv(n).errors.some((e) => /MINT_POOL_MIN_AVAILABLE/.test(e)));
  assert.ok(checkEnv({ NETWORK: "devnet" }).warnings.some((w) => /vanity mint pool disabled/.test(w)), "devnet only warns");
});

test("checkEnv: VANITY_MINTS modes (default fallback; invalid refused; key optional for fallback/off)", () => {
  const ok = { platformPubkey: pk(), configs: {} };
  const noKey = (v?: string) => { const e: Record<string, string | undefined> = { ...goodMainnet() }; delete e.MINT_POOL_ENC_KEY; if (v !== undefined) e.VANITY_MINTS = v; return e; };
  // fallback (default and explicit): a missing key only warns, a malformed key is an error
  for (const v of [undefined, "fallback", "FALLBACK"]) {
    const r = checkEnv(noKey(v), ok);
    assert.deepEqual(r.errors, [], `VANITY_MINTS=${v}`);
    assert.ok(r.warnings.some((w) => /MINT_POOL_ENC_KEY unset/.test(w)));
  }
  assert.ok(checkEnv({ ...noKey("fallback"), MINT_POOL_ENC_KEY: "abcd" }, ok).errors.some((e) => /MINT_POOL_ENC_KEY/.test(e)));
  // off: the key is not needed at all
  const off = checkEnv(noKey("off"), ok);
  assert.deepEqual(off.errors, []);
  assert.ok(!off.warnings.some((w) => /MINT_POOL_ENC_KEY/.test(w)));
  // invalid mode: error on mainnet, warning on devnet; the runtime parser throws
  assert.ok(checkEnv({ ...goodMainnet(), VANITY_MINTS: "yes" }, ok).errors.some((e) => /VANITY_MINTS/.test(e)));
  assert.deepEqual(checkEnv({ NETWORK: "devnet", VANITY_MINTS: "yes" }).errors, []);
  assert.throws(() => vanityMode({ VANITY_MINTS: "maybe" }), /VANITY_MINTS/);
  assert.equal(vanityMode({}), "fallback");
  assert.equal(vanityMode({ VANITY_MINTS: " On " }), "on");
});

test("checkEnv: QuickNode and Helius mainnet URLs pass the paid-RPC check", () => {
  for (const url of ["https://example-name.solana-mainnet.quiknode.pro/0123abcd/", "https://mainnet.helius-rpc.com/?api-key=x"]) {
    const env = goodMainnet(); env.RPC_URL = url;
    assert.ok(!checkEnv(env).errors.some((e) => /RPC_URL/.test(e)), url);
  }
});

test("checkEnv: mainnet refuses missing env, public RPC, duplicate configs, mock buyback", () => {
  const r = checkEnv({ NETWORK: "mainnet" });
  for (const k of ["TREASURY_PUBKEY", "REFERRAL_WALLET", "DATABASE_URL", "RPC_URL", "CONFIG_STANDARD_OFF", "CONFIG_MAX_ON", "AUTH_SECRET", "SITE_URL", "CORS_ORIGIN"])
    assert.ok(r.errors.some((e) => e.includes(k)), `missing ${k} must be an error`);
  const env = goodMainnet();
  env.RPC_URL = "https://api.mainnet-beta.solana.com"; env.CONFIG_MAX_ON = env.CONFIG_MAX_OFF; env.BUYBACK_MODE = "mock";
  const r2 = checkEnv(env);
  assert.ok(r2.errors.some((e) => /public Solana endpoint/.test(e)));
  assert.ok(r2.errors.some((e) => /same DBC config/.test(e)));
  assert.ok(r2.errors.some((e) => /BUYBACK_MODE=mock/.test(e)));
});

test("checkEnv: OFFICIAL_TOKEN_CREATOR unset only warns; BAR_MINT is optional but must be valid", () => {
  const env = goodMainnet(); delete env.OFFICIAL_TOKEN_CREATOR;
  const r = checkEnv(env);
  assert.deepEqual(r.errors, []);
  assert.ok(r.warnings.some((w) => /OFFICIAL_TOKEN_CREATOR unset/.test(w)));
  assert.ok(!checkEnv({ NETWORK: "mainnet" }).errors.some((e) => /BAR_MINT/.test(e)), "BAR_MINT is no longer required");
  const bad = goodMainnet(); bad.BAR_MINT = "nope"; bad.OFFICIAL_TOKEN_CREATOR = "nope";
  const r2 = checkEnv(bad);
  assert.ok(r2.errors.some((e) => /BAR_MINT is not a valid/.test(e)));
  assert.ok(r2.errors.some((e) => /OFFICIAL_TOKEN_CREATOR is not a valid/.test(e)));
});

test("checkEnv: warns when the platform key is the referral wallet; devnet keypair refused on mainnet", () => {
  const env = goodMainnet(); const devKey = pk();
  const r = checkEnv(env, { platformPubkey: env.REFERRAL_ACCOUNT });
  assert.ok(r.warnings.some((w) => /platform keypair = referral wallet/.test(w)));
  assert.ok(checkEnv(env, { platformPubkey: devKey, devnetPubkey: devKey }).errors.some((e) => /devnet keypair/.test(e)));
});

test("checkEnv: devnet never errors (warnings only)", () => {
  const r = checkEnv({ NETWORK: "devnet" });
  assert.equal(r.network, "devnet"); assert.deepEqual(r.errors, []);
});

test("checkEnv: <FILL_ME> placeholders from deploy/mainnet templates are refused on mainnet", () => {
  const env = goodMainnet(); env.ADMIN_TOKEN = "<FILL_ME>";
  assert.ok(checkEnv(env).errors.some((e) => /ADMIN_TOKEN/.test(e) && /FILL_ME/.test(e)));
});

// LOCK_TIP_* (confirmed mainnet public keys)
const MAINNET_KEYS = {
  lockTip: "DN6H7ksaFRQp9oyj2guFoHf7UzYXAni9jTNAmHjnhigh",
  platform: "48UKpEwL4MzMxS7s8sZVZbCo4sEFP59CvermMniPhigh",
  referral: "4khgetjJDVMBn3zX5nA2aTjTBF8fUJMKHtT19Hk6high",
  treasury: "HWnLNqqFJPMFkAVijU1G6w9yxxniGxRCGSDv4fN2high",
  dev: "33BrbvgrJPwPEoAkEfzztYDdAhqKfyJ8cTSMsZhEhigh",
};
const realMainnet = () => {
  const env = goodMainnet();
  Object.assign(env, { LOCK_TIP_WALLET: MAINNET_KEYS.lockTip, LOCK_TIP_SOL: "0.005", PLATFORM_PUBKEY: MAINNET_KEYS.platform,
    REFERRAL_ACCOUNT: MAINNET_KEYS.referral, TREASURY_PUBKEY: MAINNET_KEYS.treasury, OFFICIAL_TOKEN_CREATOR: MAINNET_KEYS.dev });
  return env;
};
const tipErrors = (r: { errors: string[] }) => r.errors.filter((e) => /LOCK_TIP/.test(e));

test("checkEnv LOCK_TIP: the dedicated tip wallet passes with the real mainnet key set", () => {
  const r = checkEnv(realMainnet(), { platformPubkey: MAINNET_KEYS.platform, configs: {} });
  assert.deepEqual(r.errors, []);
});

test("checkEnv LOCK_TIP: equal to platform, referral, treasury, dev, 9TAV or the devnet fallback is refused", () => {
  const ctx = { platformPubkey: MAINNET_KEYS.platform, configs: {} };
  for (const [role, key] of Object.entries({ ...MAINNET_KEYS, nineTav: "9TAVGiMrCG5VoyoDGTpexjuMgCsiiwEdW8RZq5ScCop6", devnetFallback: "87xbpDawHmNdmnWfZfXvLQyKbXhF2kck41NoPxTWB9sJ" })) {
    if (role === "lockTip") continue;
    const env = realMainnet(); env.LOCK_TIP_WALLET = key;
    assert.ok(tipErrors(checkEnv(env, ctx)).some((e) => /dedicated wallet/.test(e)), `LOCK_TIP_WALLET = ${role} must fail`);
  }
  // also when the platform key is only known from the keypair (no PLATFORM_PUBKEY env), and REFERRAL_WALLET spelling
  const env = realMainnet(); delete env.PLATFORM_PUBKEY; env.LOCK_TIP_WALLET = MAINNET_KEYS.platform;
  assert.ok(tipErrors(checkEnv(env, ctx)).some((e) => /the platform key/.test(e)));
  const env2 = realMainnet(); delete env2.REFERRAL_ACCOUNT; env2.REFERRAL_WALLET = MAINNET_KEYS.referral; env2.LOCK_TIP_WALLET = MAINNET_KEYS.referral;
  assert.ok(tipErrors(checkEnv(env2, ctx)).some((e) => /REFERRAL_WALLET/.test(e)));
});

test("checkEnv LOCK_TIP: missing, <FILL_ME>, invalid pubkey or insane LOCK_TIP_SOL is refused on mainnet", () => {
  const missing = realMainnet(); delete missing.LOCK_TIP_WALLET; delete missing.LOCK_TIP_SOL;
  const r = checkEnv(missing);
  assert.ok(r.errors.some((e) => /LOCK_TIP_WALLET is required/.test(e)));
  assert.ok(r.errors.some((e) => /LOCK_TIP_SOL is required/.test(e)));
  const fill = realMainnet(); fill.LOCK_TIP_WALLET = "<FILL_ME>"; fill.LOCK_TIP_SOL = "<FILL_ME>";
  const rf = checkEnv(fill);
  assert.ok(rf.errors.some((e) => /LOCK_TIP_WALLET is invalid/.test(e)));
  assert.ok(rf.errors.some((e) => /LOCK_TIP_SOL is invalid/.test(e)));
  assert.ok(rf.errors.some((e) => /FILL_ME/.test(e) && /LOCK_TIP_WALLET/.test(e)));
  const badPk = realMainnet(); badPk.LOCK_TIP_WALLET = "not-a-pubkey";
  assert.ok(checkEnv(badPk).errors.some((e) => /LOCK_TIP_WALLET is invalid/.test(e)));
  for (const sol of ["0", "-0.005", "abc", "1", "0.5"]) {
    const env = realMainnet(); env.LOCK_TIP_SOL = sol;
    assert.ok(checkEnv(env).errors.some((e) => /LOCK_TIP_SOL is invalid/.test(e)), `LOCK_TIP_SOL=${sol}`);
  }
});

test("checkEnv LOCK_TIP: devnet keeps the fallback (no LOCK_TIP errors)", () => {
  assert.deepEqual(tipErrors(checkEnv({ NETWORK: "devnet" })), []);
});
