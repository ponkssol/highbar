import { test } from "node:test";
import assert from "node:assert/strict";
import { DAY_MS, survival, weekStartUtc, windowRange } from "./leaderboard.js";

test("UTC week starts on Monday", () => {
  const thu = Date.parse("2026-10-29T15:00:00Z");
  assert.equal(new Date(weekStartUtc(thu)).toISOString(), "2026-10-26T00:00:00.000Z");
  assert.equal(new Date(weekStartUtc(Date.parse("2026-11-01T23:59:00Z"))).toISOString(), "2026-10-26T00:00:00.000Z"); // Sunday
  assert.equal(new Date(weekStartUtc(Date.parse("2026-10-26T00:00:00Z"))).toISOString(), "2026-10-26T00:00:00.000Z");
});

test("window ranges", () => {
  const now = Date.parse("2026-10-30T09:00:00Z");
  assert.deepEqual(windowRange({ window: "week" }, now), { from: Date.parse("2026-10-26T00:00:00Z"), to: Date.parse("2026-11-02T00:00:00Z"), label: "week of 2026-10-26" });
  assert.equal(windowRange({ week: "2026-10-21" }, now).from, Date.parse("2026-10-19T00:00:00Z"));
  assert.equal(windowRange({ window: "24h" }, now).from, now - DAY_MS);
  assert.equal(windowRange({}, now).from, 0);
});

test("survival streak breaks on the first day below the floor or without data", () => {
  const m = Date.parse("2026-10-20T00:00:00Z"), now = m + 5 * DAY_MS + 1000;
  const snaps = [0, 1, 2, 3, 4].flatMap((d) => [{ ts: m + d * DAY_MS + 3600_000, mcapSol: d === 3 ? 40 : 120 }, { ts: m + d * DAY_MS + 7200_000, mcapSol: 110 }]);
  const s = survival(snaps, m, 100, now, 0.5);
  assert.equal(s.daysSinceMigration, 5); assert.equal(s.survivedDays, 3); assert.equal(s.nowMcapSol, 110); assert.equal(s.alive, true);
  assert.equal(survival(snaps.filter((x) => x.ts > m + DAY_MS * 2), m, 100, now).survivedDays, 0);
  assert.equal(survival([], m, 100, now).alive, null);
});
