import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRows, cleanSlippage, costBasis, parsePct, pnl, pollMs, rawToUi, sellRaw, slippageBps, SLIPPAGE_DEFAULT, uiAmount } from "./holding";
import type { CreatedToken } from "./api";
import type { HistoryItem } from "./messages";

const close = (a: number | null, b: number) => assert.ok(a !== null && Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test("pnl: value plus sold minus bought, percent against the SOL spent", () => {
  const p = pnl(0.5, 0, 0.92); close(p.pnlSol, 0.42); close(p.pnlPct, 84);
  const l = pnl(1, 0.2, 0.3); close(l.pnlSol, -0.5); close(l.pnlPct, -50);
  const z = pnl(0, 0, 0.1); close(z.pnlSol, 0.1); assert.equal(z.pnlPct, null);
  assert.deepEqual(pnl(1, 0, null), { pnlSol: null, pnlPct: null });
  const flat = pnl(2, 0, 2); close(flat.pnlSol, 0); close(flat.pnlPct, 0);
});

test("sell amount: a percent of the raw balance, floored, 100 sells everything", () => {
  const raw = 18_250_000_123_457n; // 18,250,000.123457 at 6 decimals
  assert.equal(sellRaw(raw, 100), raw);
  assert.equal(sellRaw(raw, 50), 9_125_000_061_728n);
  assert.equal(sellRaw(raw, 25), 4_562_500_030_864n);
  assert.equal(sellRaw(raw, 33.33), (raw * 3333n) / 10_000n);
  assert.equal(sellRaw(7n, 50), 3n);
  assert.equal(sellRaw(1n, 100), 1n);
  assert.ok(sellRaw(raw, 99.99) < raw);
  for (const bad of [0, -1, 100.01, NaN, Infinity]) assert.throws(() => sellRaw(raw, bad), RangeError);
  assert.throws(() => sellRaw(0n, 50), /Nothing to sell/);
  assert.throws(() => sellRaw(1n, 25), /less than one token unit/);
});

test("decimals: exact strings, no float rounding", () => {
  assert.equal(rawToUi(18_250_000_123_457n, 6), "18250000.123457");
  assert.equal(rawToUi(18_250_000_000_000n, 6), "18250000");
  assert.equal(rawToUi(5n, 6), "0.000005");
  assert.equal(rawToUi(1_500_000_000n, 9), "1.5");
  assert.equal(rawToUi(42n, 0), "42");
  assert.equal(uiAmount(2_500_000n, 6), 2.5);
  assert.throws(() => rawToUi(-1n, 6));
});

test("custom percent and slippage inputs", () => {
  assert.equal(parsePct("33"), 33); assert.equal(parsePct("40%"), 40); assert.equal(parsePct(" 12.5 "), 12.5);
  for (const bad of ["", "0", "101", "abc", "1.234", "-5"]) assert.equal(parsePct(bad), null);
  assert.equal(cleanSlippage(undefined), SLIPPAGE_DEFAULT); assert.equal(SLIPPAGE_DEFAULT, 10);
  assert.equal(cleanSlippage("15%"), 15); assert.equal(cleanSlippage(0.05), 10); assert.equal(cleanSlippage(51), 10); assert.equal(cleanSlippage(2.25), 2.3);
  assert.equal(slippageBps(10), 1000); assert.equal(slippageBps(50), 5000);
  assert.equal(pollMs(1), 15_000); assert.equal(pollMs(10), 40_000); assert.equal(pollMs(20), 60_000);
});

const tok = (mint: string, o: Partial<CreatedToken> = {}): CreatedToken => ({ mint, pool: `P${mint}`, tier: "standard", name: "Test Coin", symbol: "TEST", createdAt: 1, mcapSol: 200, mcapUsd: 30_000, isMigrated: false, progress: 0.4, uri: "", priceSol: 0.0000002, ...o });
const hist = (mint: string, devBuySol: number): HistoryItem => ({ id: mint, at: 1, name: "Test Coin", ticker: "TEST", tier: "standard", devBuySol, tweetUrl: null, image: "data:image/jpeg;base64,AA==", status: "confirmed", mint, signature: null, error: null, source: "local" });

test("rows: one per wallet and token, trades as the cost, the local dev buy as fallback, tokens from other launchpads left out", () => {
  const rows = buildRows({
    wallets: [{ id: "w1", label: "Wallet 1", address: "A1" }, { id: "w2", label: "Snipes", address: "A2" }],
    created: { A1: [tok("M1"), tok("M3", { isMigrated: true })], A2: [] },
    balances: { A1: [{ mint: "M1", raw: "5000000000000", decimals: 6 }, { mint: "M3", raw: "0", decimals: 6 }, { mint: "JUNK", raw: "9", decimals: 0 }], A2: [{ mint: "M1", raw: "1000000000000", decimals: 6 }] },
    trades: { A1: [{ mint: "M1", side: "buy", sol: 0.5, ts: 1, devBuy: true }, { mint: "M1", side: "sell", sol: 0.1, ts: 2 }], A2: null },
    history: { A1: [hist("M1", 9), hist("M3", 0.3)], A2: [] },
    info: { JUNK: null, M1: { mint: "M1", name: "Test Coin", symbol: "TEST", mcapSol: 200, mcapUsd: 30_000, priceSol: 0.0000002, tier: "standard" } },
    siteUrl: "https://example.test/",
  });
  assert.deepEqual(rows.map((r) => r.key), ["w1:M1", "w2:M1", "w1:M3"]);
  const [a, b, c] = rows;
  close(a.valueSol, 1); assert.equal(a.boughtSol, 0.5); assert.equal(a.soldSol, 0.1); close(a.pnlSol, 0.6); close(a.pnlPct, 120);
  assert.equal(a.tokenUrl, "https://example.test/token/M1"); assert.equal(a.created, true); assert.equal(a.image, "data:image/jpeg;base64,AA==");
  assert.equal(b.walletLabel, "Snipes"); assert.equal(b.created, false); assert.equal(b.boughtSol, 0); assert.equal(b.pnlPct, null);
  assert.equal(c.migrated, true); assert.equal(c.raw, "0"); assert.equal(c.boughtSol, 0.3); close(c.pnlSol, -0.3);
  assert.deepEqual(costBasis("M9", null, []), { boughtSol: 0, soldSol: 0 });
});

test("panel number formats are en-US and signed", async () => {
  const { fmtCompact, fmtMcap, fmtSigned, fmtPct } = await import("./holding");
  assert.equal(fmtCompact(1_234_567), "1.23M");
  assert.equal(fmtCompact(null), "–");
  assert.equal(fmtMcap({ mcapUsd: 42_100, mcapSol: 300 }), "$42.1K");
  assert.equal(fmtMcap({ mcapUsd: null, mcapSol: 300 }), "300 SOL");
  assert.equal(fmtSigned(0.12345), "+0.1235");
  assert.equal(fmtSigned(-0.5), "−0.5");
  assert.equal(fmtPct(-12.34), "−12.3%");
  assert.equal(fmtPct(250), "+250%");
  assert.equal(fmtPct(12345), "+12.35K%");
});

test("big SOL numbers get shorter so they fit the Holding columns", async () => {
  const { fmtSolFit } = await import("./holding");
  assert.equal(fmtSolFit(0.8096), "0.8096");
  assert.equal(fmtSolFit(3.37844), "3.3784");
  assert.equal(fmtSolFit(12.3456), "12.35");
  assert.equal(fmtSolFit(123.456), "123.5");
  assert.equal(fmtSolFit(1496.2971, true), "+1,496");
  assert.equal(fmtSolFit(-0.3893, true), "−0.3893");
  assert.equal(fmtSolFit(98765.4), "98.77K");
  assert.equal(fmtSolFit(null), "–");
});

test("the panel attaches right of the drawer when both fit, else left at the room that is left", async () => {
  const { attachLayout, clampPos } = await import("./place");
  assert.deepEqual(attachLayout(340, 1400), { side: "right", w: 300, extL: 0, extR: 300 });
  // Near the right edge it stays on the right: the combined window is clamped, so the drawer shifts left
  const l = attachLayout(340, 1024), c = clampPos({ left: 900 - l.extL, top: 100 }, { w: 340 + l.extL + l.extR, h: 360 }, { w: 1024, h: 800 });
  assert.equal(l.side, "right"); assert.equal(c.left + 340 + 300, 1024 - 12);
  assert.deepEqual(attachLayout(340, 640), { side: "left", w: 276, extL: 276, extR: 0 });
  assert.deepEqual(attachLayout(340, 500), { side: "left", w: 260, extL: 260, extR: 0 });
});

test("scroll areas keep scrolling with the scrollbar hidden", async () => {
  const { DRAWER_CSS, SCROLLERS } = await import("../content/styles");
  const css = DRAWER_CSS.replace(/\s+/g, " ");
  const rules = (sel: string) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => m[1].split(",").map((x) => x.trim()).includes(sel)).map((m) => m[2]).join(";");
  for (const sel of [".body", ".hlist", ".wdrop", ".mrows", ".strip", ".hdrop"]) {
    assert.ok((SCROLLERS as readonly string[]).includes(sel), `${sel} is listed`);
    assert.match(rules(sel), /overflow(-[xy])?:auto/, `${sel} still scrolls`);
    assert.match(rules(sel), /scrollbar-width:none/, `${sel} hides the scrollbar (Firefox, new Chrome)`);
    assert.match(rules(`${sel}::-webkit-scrollbar`), /display:none/, `${sel} hides the WebKit scrollbar`);
  }
  assert.doesNotMatch(css, /scrollbar-width:thin/);
});
