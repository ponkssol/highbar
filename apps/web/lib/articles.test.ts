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
  ["pump-fun-vs-jupiter-studio", "2026-11-17T08:34:00+07:00"],
  ["bags-vs-pump-fun", "2026-11-17T09:48:00+07:00"],
  ["float-vs-bags", "2026-11-17T11:02:00+07:00"],
  ["jupiter-studio-alternatives", "2026-11-17T12:24:00+07:00"],
  ["boop-fun-vs-pump-fun", "2026-11-17T13:39:00+07:00"],
  ["how-to-launch-on-moonshot", "2026-11-17T14:58:00+07:00"],
  ["how-to-launch-on-heaven", "2026-11-17T16:13:00+07:00"],
  ["bags-vs-jupiter-studio", "2026-11-17T17:29:00+07:00"],
  ["float-vs-jupiter-studio", "2026-11-17T18:54:00+07:00"],
  ["believe-app-alternatives", "2026-11-17T20:12:00+07:00"],
];

const THROUGH_1111 = [...SCHEDULE, ...SCHEDULE_1111];
const THROUGH_1112 = [...THROUGH_1111, ...SCHEDULE_1112];
const THROUGH_1116 = [...THROUGH_1112, ...SCHEDULE_1116];
const ALL_SCHEDULED = [...THROUGH_1116, ...SCHEDULE_1117];

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
  const beforeNov17 = Date.parse("2026-11-17T01:33:59.000Z"); // 08:33:59 WIB
  assert.deepEqual(listPublishedArticles(beforeNov17).map((a) => a.slug), THROUGH_1116.map(([slug]) => slug));
  const afterNov17 = Date.parse("2026-11-17T13:12:00.000Z"); // 20:12 WIB
  assert.deepEqual(listPublishedArticles(afterNov17).map((a) => a.slug), ALL_SCHEDULED.map(([slug]) => slug));
});
