import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { HIDDEN_TOKEN_MINTS } from "@hb/shared";
import { loadAllArticles } from "./articles";
import { GUIDE_PICKS, pickPublished } from "./guidePicks";
import { isHiddenToken } from "./hiddenTokens";
import { pageMeta } from "./seo";
import {
  descriptionFromMeta, ownMetaId, pickRelatedTokens, tokenFactSentences, tokenGuideSlugs, tokenLinkLabel, tokenSummary,
} from "./tokenSeo";
import type { ApiToken } from "./api";

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => fs.readFileSync(path.join(web, rel), "utf8");

const BANNED = /anti-bundle|bundle-proof|rug-proof|guaranteed safe/i;

function token(over: Partial<ApiToken> = {}): ApiToken {
  return {
    mint: "Mint111111111111111111111111111111111111111",
    pool: "Pool111111111111111111111111111111111111111",
    config: "Cfg1111111111111111111111111111111111111111",
    tier: "higher",
    antiSniper: false,
    creator: `Abcd${"1".repeat(40)}`,
    createdAt: Date.UTC(2026, 10, 1),
    quoteReserveSol: 10,
    thresholdSol: 150,
    progress: 0.125,
    isMigrated: false,
    priceSol: 0,
    mcapSol: 0,
    mcapUsd: 0,
    name: "Example",
    symbol: "EX",
    uri: "",
    volumeSol: 0,
    volume24hSol: 0,
    trades: 0,
    creatorFeesSol: 0,
    ...over,
  };
}

test("hidden test mints are the token pages that get noindex, follow", () => {
  assert.deepEqual([...HIDDEN_TOKEN_MINTS], [
    "6eREHTBRYzqBVm3BX4NJFom9z1n7TdKkcfEnzhw4high", // QUCKSOL
    "EXA3yCkvSUf7KHHdcb6P5LZ29k1JoXvA8sF1ob3whigh", // COINY
    "AVCQDHkXj4GA69xrySrmaoJqMW6oTs8SU3QCyRFFhigh", // MINECAT
    "H8b6hZJyqe1VKTfa8qg5KRhV5kTBQ1gDBkR1S79uhigh", // TESTLA
  ]);
  for (const mint of HIDDEN_TOKEN_MINTS) assert.equal(isHiddenToken({ mint }), true);
  assert.equal(isHiddenToken({ mint: "Keep11111111111111111111111111111111111111", hidden: true }), true);
  assert.equal(isHiddenToken({ mint: "Keep11111111111111111111111111111111111111" }), false);
  assert.deepEqual(pageMeta({ title: "T", description: "d", path: "/token/x", noindex: true }).robots, { index: false, follow: true });
  assert.match(read("app/token/[mint]/page.tsx"), /noindex: isHiddenToken\(t\)/);
});

test("nav and footer expose a plain /articles anchor", () => {
  assert.match(read("components/nav.ts"), /href: "\/articles", label: "Guides"/);
  assert.match(read("components/PageShell.tsx"), /<a href="\/articles"/);
  assert.match(read("components/Sidebar.tsx"), /<a key=\{href\} href=\{href\}/);
  assert.match(read("app/page.tsx"), /GuidesSection/);
  assert.match(read("app/launch/layout.tsx"), /GuidesSection/);
  assert.match(read("app/docs/page.tsx"), /pickPublished\(GUIDE_PICKS\.docs\)/);
});

test("guide picks are real slugs and stay hidden until publish_at", () => {
  const known = new Set(loadAllArticles().map((a) => a.slug));
  for (const list of Object.values(GUIDE_PICKS)) for (const slug of list) assert.ok(known.has(slug), slug);
  for (const slug of tokenGuideSlugs({ isMigrated: true, antiSniper: true, devLocked: true })) assert.ok(known.has(slug), slug);
  const before = Date.parse("2026-11-10T05:59:59.000Z");
  assert.deepEqual(pickPublished(GUIDE_PICKS.home, before), []);
  const atFirst = Date.parse("2026-11-10T06:00:00.000Z");
  assert.deepEqual(pickPublished(["how-to-launch-a-solana-memecoin", "not-a-real-slug"], atFirst).map((a) => a.slug), ["how-to-launch-a-solana-memecoin"]);
  assert.deepEqual(tokenGuideSlugs({ isMigrated: true, antiSniper: false, devLocked: false }).slice(0, 2), [
    "meteora-damm-v2-explained-token-graduation",
    "how-to-check-a-solana-token-before-buying",
  ]);
});

test("token facts use only fields that are present", () => {
  const full = tokenFactSentences(token(), "A community coin.");
  assert.deepEqual(full, [
    "Example ($EX) launched on highbar.",
    "A community coin.",
    "Creator Abcd…1111.",
    "Launched November 1, 2026 (UTC).",
    "Trading on a Meteora DBC bonding curve, 12.5% of the way to 150 SOL.",
    "Config tier: Higher.",
    "Anti-sniper fee: off.",
  ]);
  assert.equal(BANNED.test(full.join(" ")), false);
  const graduated = tokenSummary(token({ isMigrated: true, symbol: "", creator: "", createdAt: 0, mcapUsd: 2400, devLocked: true, unlockAt: null }), 2, null);
  assert.match(graduated, /Example launched on highbar\./);
  assert.match(graduated, /Graduated from the Meteora DBC bonding curve to Meteora DAMM v2\./);
  assert.doesNotMatch(graduated, /of the way/);
  assert.match(graduated, /Market cap about \$2\.4k\./);
  assert.match(graduated, /2 holders\./);
  assert.match(graduated, /Locked with Jupiter Lock\./);
  assert.doesNotMatch(graduated, /Creator /);
  const bare = token({
    name: " ", symbol: "", creator: " ", createdAt: 0, thresholdSol: 0, progress: Number.NaN, mcapUsd: 0, devLocked: false,
    tier: "" as ApiToken["tier"], antiSniper: undefined as unknown as boolean,
  });
  assert.deepEqual(tokenFactSentences(bare, "   "), [`${bare.mint} launched on highbar.`]);
  assert.equal(tokenFactSentences(token(), "This launch is guaranteed safe.").includes("This launch is guaranteed safe."), false);
  assert.equal(tokenFactSentences(token({ name: "Only", symbol: "ONE", creator: "", createdAt: 0, progress: Number.NaN, tier: "" as ApiToken["tier"], antiSniper: undefined as unknown as boolean }), "hello").includes("hello."), true);
  assert.equal(descriptionFromMeta({ description: "  hello   world " }), "hello world");
  assert.equal(descriptionFromMeta({ description: "rug-proof launch" }), null);
  assert.equal(descriptionFromMeta({}), null);
  assert.equal(ownMetaId("https://highbar.capital/hb-api/meta/0123456789abcdef01234567.json"), "0123456789abcdef01234567");
  assert.equal(ownMetaId("https://highbar.capital/hb-api/meta/0123456789abcdef01234567.json?v=1"), "0123456789abcdef01234567");
  assert.equal(ownMetaId("https://evil.example/secret"), null);
  assert.equal(ownMetaId("https://highbar.capital/hb-api/img/notmeta.json"), null);
});

test("related tokens prefer the same creator and tier and skip hidden mints", () => {
  const self = token({ mint: "Self11111111111111111111111111111111111111", creator: "CreatorAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" });
  const sameCreator = token({ mint: "SameC1111111111111111111111111111111111111", name: "Same", symbol: "SAME", creator: self.creator, tier: "standard" });
  const sameTier = token({ mint: "SameT1111111111111111111111111111111111111", name: "Tier", symbol: "TIER", creator: "Other1111111111111111111111111111111111111", tier: "higher" });
  const other = token({ mint: "Other111111111111111111111111111111111111", name: "", symbol: "", creator: "Zed111111111111111111111111111111111111111", tier: "max" });
  const hidden = token({ mint: HIDDEN_TOKEN_MINTS[0], name: "Hidden", symbol: "HIDE", creator: self.creator, tier: "higher" });
  const picked = pickRelatedTokens(self, [other, hidden, sameTier, self, sameCreator]);
  assert.deepEqual(picked.map((t) => t.mint), [sameCreator.mint, sameTier.mint, other.mint]);
  assert.equal(tokenLinkLabel(sameCreator), "Same ($SAME)");
  assert.equal(tokenLinkLabel(other), "Othe…1111");
});

test("image, manifest and logo routes send X-Robots-Tag noindex", () => {
  const src = read("next.config.mjs");
  for (const source of [
    "/token/:mint/opengraph-image",
    "/token/:mint/twitter-image",
    "/manifest.webmanifest",
    "/hb-api/img/:path*",
  ]) {
    assert.match(src, new RegExp(`source: "${source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  }
  assert.match(src, /key: "X-Robots-Tag", value: "noindex"/);
});
