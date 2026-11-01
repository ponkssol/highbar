import { test } from "node:test";
import assert from "node:assert/strict";
import { caFromUrl, cashtags, casInText, chartEmbedUrl, fmtChange, fmtUsdCompact, fmtUsdPrice, isMintAccount, isPubkey, pickTicker, tweetCandidates } from "./ca";
import { cleanCaSlippage } from "./caprefs";

const MINT = "BkMjuu1cPLzTaLp8uTsR5xE9NttRsKVTqTKyrdKepump";
const POOL = "HbZ73YQ7UV3AQf2ZzhZrJYtzM937gJiCV2hFUmKxsKqz";

test("ca: base58 32 byte keys only", () => {
  assert.ok(isPubkey(MINT));
  assert.ok(!isPubkey("0OIl" + MINT.slice(4)));
  assert.ok(!isPubkey("abc"));
  assert.ok(!isPubkey("1".repeat(50)));
});

test("ca: CAs in text, in order, no repeats, no programs or wrapped SOL", () => {
  const t = `CA: ${MINT} and again ${MINT}. pool ${POOL} So11111111111111111111111111111111111111112 TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`;
  assert.deepEqual(casInText(t), [MINT, POOL]);
  assert.deepEqual(casInText("Introducing Test Coin $TEST, no address here"), []);
});

test("ca: token page links on the known hosts, including X display text", () => {
  assert.equal(caFromUrl(`https://pump.fun/coin/${MINT}`), MINT);
  assert.equal(caFromUrl(`https://dexscreener.com/solana/${POOL}`), POOL);
  assert.equal(caFromUrl(`https://gmgn.ai/sol/token/abc_${MINT}`), MINT);
  assert.equal(caFromUrl(`https://birdeye.so/token/${MINT}?chain=solana`), MINT);
  assert.equal(caFromUrl(`https://solscan.io/token/${MINT}`), MINT);
  assert.equal(caFromUrl(`https://jup.ag/swap/SOL-${MINT}`), MINT);
  assert.equal(caFromUrl(`pump.fun/coin/${MINT}`), MINT);
  assert.equal(caFromUrl(`dexscreener.com/solana/${POOL.slice(0, 12)}…`), null);
  assert.equal(caFromUrl(`https://evil.example/coin/${MINT}`), null);
  assert.equal(caFromUrl(`https://pump.fun.evil.example/coin/${MINT}`), null);
});

test("ca: cashtags, upper case, skipping SOL and fiat", () => {
  assert.deepEqual(cashtags("Introducing Test Coin $TEST and $test, $SOL $USD $1000 $Bonk"), ["TEST", "BONK"]);
});

test("ca: tweet candidates order: text, links (not repeated), tags", () => {
  const c = tweetCandidates(`$TEST ${MINT}`, [`https://pump.fun/coin/${MINT}`, `https://dexscreener.com/solana/${POOL}`]);
  assert.deepEqual(c, { text: [MINT], links: [POOL], tags: ["TEST"] });
});

test("ca: mint accounts of SPL Token and Token-2022 only", () => {
  assert.ok(isMintAccount({ owner: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", space: 82 }));
  assert.ok(!isMintAccount({ owner: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", space: 165 }));
  assert.ok(isMintAccount({ owner: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", space: 82 }));
  assert.ok(isMintAccount({ owner: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", space: 300, data: [btoa("\u0001"), "base64"] }));
  assert.ok(!isMintAccount({ owner: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb", space: 300, data: [btoa("\u0002"), "base64"] }));
  assert.ok(!isMintAccount({ owner: "11111111111111111111111111111111", space: 0 }));
  assert.ok(!isMintAccount(null));
});

test("ca: a ticker resolves only when it is clear", () => {
  const A = MINT, B = POOL;
  assert.equal(pickTicker("test", [{ id: A, symbol: "TEST", liquidity: 100 }, { id: B, symbol: "TEST", isVerified: true, liquidity: 5 }]), B);
  assert.equal(pickTicker("TEST", [{ id: A, symbol: "TEST", liquidity: 60_000 }, { id: B, symbol: "TEST", liquidity: 10_000 }]), A);
  assert.equal(pickTicker("TEST", [{ id: A, symbol: "TEST", liquidity: 60_000 }, { id: B, symbol: "TEST", liquidity: 20_000 }]), null);
  assert.equal(pickTicker("TEST", [{ id: A, symbol: "TEST", liquidity: 5_000 }]), null);
  assert.equal(pickTicker("TEST", [{ id: A, symbol: "TESTX", isVerified: true, liquidity: 1e6 }]), null);
  assert.equal(pickTicker("TEST", []), null);
});

test("ca: chart embed url (GeckoTerminal, chart only)", () => {
  const u = new URL(chartEmbedUrl(POOL, "dark"));
  assert.equal(u.origin, "https://www.geckoterminal.com");
  assert.equal(u.pathname, `/solana/pools/${POOL}`);
  assert.equal(u.searchParams.get("embed"), "1");
  assert.equal(u.searchParams.get("info"), "0");
  assert.equal(u.searchParams.get("swaps"), "0");
  assert.equal(u.searchParams.get("light_chart"), "0");
  assert.equal(new URL(chartEmbedUrl(POOL, "light")).searchParams.get("light_chart"), "1");
});

test("ca: formatters", () => {
  assert.equal(fmtUsdPrice(null), "–");
  assert.equal(fmtUsdPrice(1.234), "$1.23");
  assert.equal(fmtUsdPrice(0.01234), "$0.01234");
  assert.equal(fmtUsdPrice(0.0000123), "$0.0₄123");
  assert.equal(fmtUsdCompact(1_234_567), "$1.23M");
  assert.equal(fmtUsdCompact(45_600), "$45.6K");
  assert.equal(fmtUsdCompact(2_500_000_000), "$2.5B");
  assert.equal(fmtChange(12.345), "+12.35%");
  assert.equal(fmtChange(-3), "-3%");
  assert.equal(fmtChange(null), "–");
  assert.equal(fmtChange(-535_266_667.53), "-535.3M%"); assert.equal(fmtChange(1234.5), "+1,235%"); assert.equal(fmtChange(25_000), "+25K%");
});

test("ca: popup slippage is 0.1 to 50 with one decimal, else 1", () => {
  assert.equal(cleanCaSlippage(0.5), 0.5);
  assert.equal(cleanCaSlippage(5), 5);
  assert.equal(cleanCaSlippage(2.345), 2.3);
  assert.equal(cleanCaSlippage(0), 1);
  assert.equal(cleanCaSlippage(80), 1);
  assert.equal(cleanCaSlippage("x"), 1);
});

