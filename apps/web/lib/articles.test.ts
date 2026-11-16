import assert from "node:assert/strict";
import test from "node:test";
import { listPublishedArticles, loadAllArticles } from "./articles";

/** 2026-11-10 batch, in publish order. Times are WIB (+07:00). */
const SCHEDULE: [string, string][] = [
  ["how-to-launch-a-solana-memecoin", "2026-11-10T13:00:00+07:00"],
  ["pump-fun-alternatives-compare-solana-launchpads", "2026-11-10T13:45:00+07:00"],
  ["meteora-dynamic-bonding-curve-explained", "2026-11-10T14:30:00+07:00"],
  ["meteora-damm-v2-explained-token-graduation", "2026-11-10T15:15:00+07:00"],
  ["anti-sniper-fee-solana-token-launch", "2026-11-10T16:00:00+07:00"],
  ["sniper-bots-solana-memecoin-launches", "2026-11-10T16:45:00+07:00"],
  ["trade-solana-from-x-chrome-extension", "2026-11-10T17:30:00+07:00"],
  ["memecoin-creator-fees-solana-launchpad", "2026-11-10T18:15:00+07:00"],
  ["dev-lock-token-lock-solana-explained", "2026-11-10T19:00:00+07:00"],
  ["how-to-check-a-solana-token-before-buying", "2026-11-10T19:45:00+07:00"],
];

/** 2026-11-11 batch, in publish order. Times are WIB (+07:00). */
const SCHEDULE_1111: [string, string][] = [
  ["pump-fun-fees-explained", "2026-11-11T08:43:00+07:00"],
  ["best-solana-launchpad-2026", "2026-11-11T10:07:00+07:00"],
  ["bonk-fun-vs-pump-fun", "2026-11-11T11:21:00+07:00"],
  ["float-launchpad-explained", "2026-11-11T12:48:00+07:00"],
  ["raydium-launchlab-fees-explained", "2026-11-11T14:02:00+07:00"],
  ["how-to-launch-on-stonkfun", "2026-11-11T15:31:00+07:00"],
  ["bags-fm-fees-explained", "2026-11-11T16:44:00+07:00"],
  ["jupiter-studio-vs-highbar", "2026-11-11T18:09:00+07:00"],
  ["meteora-launchpad-platforms-compared", "2026-11-11T19:26:00+07:00"],
  ["heaven-launchpad-review", "2026-11-11T20:52:00+07:00"],
];

/** 2026-11-12 batch, in publish order. Times are WIB (+07:00). */
const SCHEDULE_1112: [string, string][] = [
  ["highbar-vs-pump-fun", "2026-11-12T08:34:00+07:00"],
  ["how-to-launch-on-pump-fun", "2026-11-12T09:58:00+07:00"],
  ["best-pump-fun-alternative-for-creators", "2026-11-12T11:13:00+07:00"],
  ["pump-fun-creator-rewards-explained", "2026-11-12T12:39:00+07:00"],
];

/** 2026-11-16 batch, in publish order. Times are WIB (+07:00). */
const SCHEDULE_1116: [string, string][] = [
  ["highbar-vs-bonk-fun", "2026-11-16T08:37:00+07:00"],
  ["meteora-dbc-vs-pump-fun-bonding-curve", "2026-11-16T09:52:00+07:00"],
  ["highbar-vs-raydium-launchlab", "2026-11-16T11:08:00+07:00"],
  ["moonshot-alternatives", "2026-11-16T12:26:00+07:00"],
  ["boop-fun-review", "2026-11-16T13:44:00+07:00"],
  ["best-anti-sniper-launchpad-solana", "2026-11-16T15:03:00+07:00"],
  ["heaven-vs-pump-fun", "2026-11-16T16:19:00+07:00"],
  ["highbar-vs-bags", "2026-11-16T17:36:00+07:00"],
  ["how-to-launch-on-raydium-launchlab", "2026-11-16T18:57:00+07:00"],
  ["stonkfun-alternatives", "2026-11-16T20:16:00+07:00"],
];

/** 2026-11-17 batch, in publish order. Times are WIB (+07:00). */
const SCHEDULE_1117: [string, string][] = [
  ["highbar-vs-float", "2026-11-17T08:41:00+07:00"],
  ["float-vs-pump-fun", "2026-11-17T09:56:00+07:00"],
  ["float-launchpad-fees", "2026-11-17T11:14:00+07:00"],
  ["float-launchpad-review", "2026-11-17T12:33:00+07:00"],
  ["pump-fun-review-2026", "2026-11-17T13:47:00+07:00"],
  ["pump-fun-app-fee-explained", "2026-11-17T15:08:00+07:00"],
  ["letsbonk-alternatives", "2026-11-17T16:22:00+07:00"],
  ["bonk-fun-fees-explained", "2026-11-17T17:49:00+07:00"],
  ["raydium-launchlab-review", "2026-11-17T19:05:00+07:00"],
  ["raydium-launchlab-vs-meteora-dbc", "2026-11-17T20:31:00+07:00"],
];

/** 2026-11-18 batch, in publish order. Times are WIB (+07:00). */
const SCHEDULE_1118: [string, string][] = [
  ["how-to-launch-on-float", "2026-11-18T08:38:00+07:00"],
  ["float-vs-stonkfun", "2026-11-18T09:55:00+07:00"],
  ["pump-fun-vs-raydium-launchlab", "2026-11-18T11:18:00+07:00"],
  ["pump-fun-graduation-explained", "2026-11-18T12:41:00+07:00"],
  ["pump-fun-vs-meteora", "2026-11-18T13:59:00+07:00"],
  ["how-to-launch-on-bonk-fun", "2026-11-18T15:16:00+07:00"],
  ["bonk-fun-review", "2026-11-18T16:38:00+07:00"],
  ["letsbonk-vs-meteora", "2026-11-18T17:54:00+07:00"],
  ["raydium-launchlab-alternatives", "2026-11-18T19:11:00+07:00"],
  ["raydium-launchlab-creator-fees", "2026-11-18T20:44:00+07:00"],
];

/** 2026-11-19 batch, in publish order. Times are WIB (+07:00). */
const SCHEDULE_1119: [string, string][] = [
  ["best-launchpad-on-raydium-launchlab", "2026-11-19T08:46:00+07:00"],
  ["meteora-dbc-fees-explained", "2026-11-19T10:03:00+07:00"],
  ["how-to-launch-on-meteora", "2026-11-19T11:27:00+07:00"],
  ["best-meteora-dbc-launchpad", "2026-11-19T12:49:00+07:00"],
  ["meteora-damm-v2-vs-raydium-cpmm", "2026-11-19T14:06:00+07:00"],
  ["stonkfun-review", "2026-11-19T15:21:00+07:00"],
  ["stonkfun-fees-explained", "2026-11-19T16:45:00+07:00"],
  ["highbar-vs-stonkfun", "2026-11-19T18:02:00+07:00"],
  ["stonkfun-vs-pump-fun", "2026-11-19T19:28:00+07:00"],
  ["bags-fm-review", "2026-11-19T20:51:00+07:00"],
];

/** 2026-11-20 batch, in publish order. Times are WIB (+07:00). */
const SCHEDULE_1120: [string, string][] = [
  ["bags-fm-alternatives", "2026-11-20T08:33:00+07:00"],
  ["how-to-launch-on-bags", "2026-11-20T09:48:00+07:00"],
  ["jupiter-studio-review", "2026-11-20T11:09:00+07:00"],
  ["jupiter-studio-fees-explained", "2026-11-20T12:28:00+07:00"],
  ["how-to-launch-on-jupiter-studio", "2026-11-20T13:52:00+07:00"],
  ["moonshot-launchpad-review", "2026-11-20T15:14:00+07:00"],
  ["moonshot-fees-explained", "2026-11-20T16:31:00+07:00"],
  ["highbar-vs-moonshot", "2026-11-20T17:58:00+07:00"],
  ["moonshot-vs-pump-fun", "2026-11-20T19:19:00+07:00"],
  ["boop-fun-alternatives", "2026-11-20T20:36:00+07:00"],
];

/** 2026-11-21 batch, in publish order. Times are WIB (+07:00). */
const SCHEDULE_1121: [string, string][] = [
  ["boop-fun-fees-explained", "2026-11-21T08:52:00+07:00"],
  ["highbar-vs-boop-fun", "2026-11-21T10:11:00+07:00"],
  ["how-to-launch-on-boop-fun", "2026-11-21T11:33:00+07:00"],
  ["highbar-vs-heaven", "2026-11-21T12:55:00+07:00"],
  ["heaven-fees-explained", "2026-11-21T14:18:00+07:00"],
  ["heaven-alternatives", "2026-11-21T15:36:00+07:00"],
  ["pump-fun-alternative-for-traders", "2026-11-21T16:50:00+07:00"],
  ["how-to-choose-a-solana-launchpad", "2026-11-21T18:08:00+07:00"],
  ["solana-launchpad-fees-compared", "2026-11-21T19:24:00+07:00"],
  ["locked-liquidity-solana-token-graduation", "2026-11-21T20:47:00+07:00"],
];

const THROUGH_1111 = [...SCHEDULE, ...SCHEDULE_1111];
const THROUGH_1112 = [...THROUGH_1111, ...SCHEDULE_1112];
const THROUGH_1116 = [...THROUGH_1112, ...SCHEDULE_1116];
const THROUGH_1117 = [...THROUGH_1116, ...SCHEDULE_1117];
const THROUGH_1118 = [...THROUGH_1117, ...SCHEDULE_1118];
const THROUGH_1119 = [...THROUGH_1118, ...SCHEDULE_1119];
const THROUGH_1120 = [...THROUGH_1119, ...SCHEDULE_1120];
const ALL_SCHEDULED = [...THROUGH_1120, ...SCHEDULE_1121];

test("the 2026-11-10 batch is hidden until each publish_at, then appears in order", () => {
  const all = loadAllArticles();
  assert.deepEqual(all.map((a) => a.slug).sort(), ALL_SCHEDULED.map(([slug]) => slug).sort());
  for (const [slug, at] of ALL_SCHEDULED) {
    const article = all.find((a) => a.slug === slug);
    assert.ok(article, slug);
    assert.equal(article.publish_at, at);
  }
  const beforeFirst = Date.parse("2026-11-10T05:59:59.000Z");
  assert.deepEqual(listPublishedArticles(beforeFirst).map((a) => a.slug), []);
  const atFirst = Date.parse("2026-11-10T06:00:00.000Z"); // 13:00 WIB
  assert.deepEqual(listPublishedArticles(atFirst).map((a) => a.slug), ["how-to-launch-a-solana-memecoin"]);
  const afterLast = Date.parse("2026-11-10T12:45:00.000Z"); // 19:45 WIB
  assert.deepEqual(listPublishedArticles(afterLast).map((a) => a.slug), SCHEDULE.map(([slug]) => slug));
  const beforeNov11 = Date.parse("2026-11-11T01:42:59.000Z"); // 08:42:59 WIB
  assert.deepEqual(listPublishedArticles(beforeNov11).map((a) => a.slug), SCHEDULE.map(([slug]) => slug));
  const afterNov11 = Date.parse("2026-11-11T13:52:00.000Z"); // 20:52 WIB
  assert.deepEqual(listPublishedArticles(afterNov11).map((a) => a.slug), THROUGH_1111.map(([slug]) => slug));
  const beforeNov12 = Date.parse("2026-11-12T01:33:59.000Z"); // 08:33:59 WIB
  assert.deepEqual(listPublishedArticles(beforeNov12).map((a) => a.slug), THROUGH_1111.map(([slug]) => slug));
  const afterNov12 = Date.parse("2026-11-12T05:39:00.000Z"); // 12:39 WIB
  assert.deepEqual(listPublishedArticles(afterNov12).map((a) => a.slug), THROUGH_1112.map(([slug]) => slug));
  const beforeNov16 = Date.parse("2026-11-16T01:36:59.000Z"); // 08:36:59 WIB
  assert.deepEqual(listPublishedArticles(beforeNov16).map((a) => a.slug), THROUGH_1112.map(([slug]) => slug));
  const afterNov16 = Date.parse("2026-11-16T13:16:00.000Z"); // 20:16 WIB
  assert.deepEqual(listPublishedArticles(afterNov16).map((a) => a.slug), THROUGH_1116.map(([slug]) => slug));
  const beforeNov17 = Date.parse("2026-11-17T01:40:59.000Z"); // 08:40:59 WIB
  assert.deepEqual(listPublishedArticles(beforeNov17).map((a) => a.slug), THROUGH_1116.map(([slug]) => slug));
  const afterNov17 = Date.parse("2026-11-17T13:31:00.000Z"); // 20:31 WIB
  assert.deepEqual(listPublishedArticles(afterNov17).map((a) => a.slug), THROUGH_1117.map(([slug]) => slug));
  const beforeNov18 = Date.parse("2026-11-18T01:37:59.000Z"); // 08:37:59 WIB
  assert.deepEqual(listPublishedArticles(beforeNov18).map((a) => a.slug), THROUGH_1117.map(([slug]) => slug));
  const afterNov18 = Date.parse("2026-11-18T13:44:00.000Z"); // 20:44 WIB
  assert.deepEqual(listPublishedArticles(afterNov18).map((a) => a.slug), THROUGH_1118.map(([slug]) => slug));
  const beforeNov19 = Date.parse("2026-11-19T01:45:59.000Z"); // 08:45:59 WIB
  assert.deepEqual(listPublishedArticles(beforeNov19).map((a) => a.slug), THROUGH_1118.map(([slug]) => slug));
  const afterNov19 = Date.parse("2026-11-19T13:51:00.000Z"); // 20:51 WIB
  assert.deepEqual(listPublishedArticles(afterNov19).map((a) => a.slug), THROUGH_1119.map(([slug]) => slug));
  const beforeNov20 = Date.parse("2026-11-20T01:32:59.000Z"); // 08:32:59 WIB
  assert.deepEqual(listPublishedArticles(beforeNov20).map((a) => a.slug), THROUGH_1119.map(([slug]) => slug));
  const afterNov20 = Date.parse("2026-11-20T13:36:00.000Z"); // 20:36 WIB
  assert.deepEqual(listPublishedArticles(afterNov20).map((a) => a.slug), THROUGH_1120.map(([slug]) => slug));
  const beforeNov21 = Date.parse("2026-11-21T01:51:59.000Z"); // 08:51:59 WIB
  assert.deepEqual(listPublishedArticles(beforeNov21).map((a) => a.slug), THROUGH_1120.map(([slug]) => slug));
  const afterNov21 = Date.parse("2026-11-21T13:47:00.000Z"); // 20:47 WIB
  assert.deepEqual(listPublishedArticles(afterNov21).map((a) => a.slug), ALL_SCHEDULED.map(([slug]) => slug));
  assert.equal(ALL_SCHEDULED.length, 84);
});
