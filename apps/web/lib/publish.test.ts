import assert from "node:assert/strict";
import test from "node:test";
import { isPublished, publishedOnly, publishTimeMs } from "./publish";

const FUTURE = "2026-11-10T13:00:00+07:00"; // 06:00:00Z
const BEFORE = Date.parse("2026-11-10T05:59:59.000Z");
const AT = Date.parse("2026-11-10T06:00:00.000Z");

test("publish_at in the future is hidden, and the same instant is visible", () => {
  const article = { date: "2026-11-10", publish_at: FUTURE };
  assert.equal(isPublished(article, BEFORE), false);
  assert.equal(isPublished(article, AT), true);
  assert.equal(publishTimeMs(article), AT);
});

test("a missing publish_at falls back to date at 00:00:00Z", () => {
  const article = { date: "2026-11-10", publish_at: null };
  assert.equal(publishTimeMs(article), Date.parse("2026-11-10T00:00:00.000Z"));
  assert.equal(isPublished(article, Date.parse("2026-11-09T23:59:59.000Z")), false);
  assert.equal(isPublished(article, Date.parse("2026-11-10T00:00:00.000Z")), true);
});

test("publishedOnly drops future articles and keeps live ones", () => {
  const live = { date: "2026-11-10", publish_at: "2026-11-10T13:00:00+07:00" };
  const later = { date: "2026-11-10", publish_at: "2026-11-10T19:45:00+07:00" };
  const visible = publishedOnly([live, later], Date.parse("2026-11-10T06:30:00.000Z"));
  assert.deepEqual(visible, [live]);
});

test("publish_at without a timezone is rejected", () => {
  assert.throws(() => publishTimeMs({ date: "2026-11-10", publish_at: "2026-11-10T13:00:00" }), /timezone/);
});
