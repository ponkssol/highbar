import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair } from "@solana/web3.js";
import { WindowLimiter, routeClass, clientIp, creatorLaunchGate, limitsFromEnv } from "./rateLimit.js";
import { address, int, text, label, link, imageMatches, isAddress, BadRequest } from "./validate.js";
import { publicError, clean } from "./errors.js";
import { checkEnv } from "./prodCheck.js";

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
    NETWORK: "mainnet", TREASURY_PUBKEY: pk(), REFERRAL_ACCOUNT: pk(), BAR_MINT: pk(), DATABASE_URL: "postgres://u:p@h/db",
    RPC_URL: "https://example-name.solana-mainnet.quiknode.pro/0123abcd/", AUTH_SECRET: "x".repeat(40), SITE_URL: "https://highbar.example",
    CORS_ORIGIN: "https://highbar.example", PROXY_SHARED_SECRET: "y".repeat(40),
  };
  for (const k of ["STANDARD_OFF", "STANDARD_ON", "HIGHER_OFF", "HIGHER_ON", "MAX_OFF", "MAX_ON"]) env[`CONFIG_${k}`] = pk();
  return env;
};

test("checkEnv: mainnet with complete env passes (single treasury wallet is fine)", () => {
  const r = checkEnv(goodMainnet(), { platformPubkey: pk(), configs: {} });
  assert.equal(r.network, "mainnet"); assert.deepEqual(r.errors, []); assert.deepEqual(r.warnings, []);
});

test("checkEnv: QuickNode and Helius mainnet URLs pass the paid-RPC check", () => {
  for (const url of ["https://example-name.solana-mainnet.quiknode.pro/0123abcd/", "https://mainnet.helius-rpc.com/?api-key=x"]) {
    const env = goodMainnet(); env.RPC_URL = url;
    assert.ok(!checkEnv(env).errors.some((e) => /RPC_URL/.test(e)), url);
  }
});

test("checkEnv: mainnet refuses missing env, public RPC, duplicate configs, mock buyback", () => {
  const r = checkEnv({ NETWORK: "mainnet" });
  for (const k of ["TREASURY_PUBKEY", "REFERRAL_WALLET", "BAR_MINT", "DATABASE_URL", "RPC_URL", "CONFIG_STANDARD_OFF", "CONFIG_MAX_ON", "AUTH_SECRET", "SITE_URL", "CORS_ORIGIN"])
    assert.ok(r.errors.some((e) => e.includes(k)), `missing ${k} must be an error`);
  const env = goodMainnet();
  env.RPC_URL = "https://api.mainnet-beta.solana.com"; env.CONFIG_MAX_ON = env.CONFIG_MAX_OFF; env.BUYBACK_MODE = "mock";
  const r2 = checkEnv(env);
  assert.ok(r2.errors.some((e) => /public Solana endpoint/.test(e)));
  assert.ok(r2.errors.some((e) => /same DBC config/.test(e)));
  assert.ok(r2.errors.some((e) => /BUYBACK_MODE=mock/.test(e)));
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
