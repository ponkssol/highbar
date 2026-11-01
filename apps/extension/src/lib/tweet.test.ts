import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalTweetUrl, cashtagOf, clipBytes, draftFromTweet, mediaUrl, suggestName, suggestTicker, tweetIdOf } from "./tweet";

test("canonicalTweetUrl: any permalink form becomes https://x.com/<handle>/status/<id>", () => {
  const want = "https://x.com/test_user/status/1850000000000000001";
  for (const h of ["/test_user/status/1850000000000000001", "https://twitter.com/test_user/status/1850000000000000001?s=20",
    "https://mobile.x.com/test_user/status/1850000000000000001/photo/1", "https://x.com/test_user/statuses/1850000000000000001"]) assert.equal(canonicalTweetUrl(h), want, h);
  for (const h of ["https://evil.example/test_user/status/1850000000000000001", "/test_user", "/i/lists/123", "not a url :::"]) assert.equal(canonicalTweetUrl(h), null, h);
  assert.equal(tweetIdOf(want), "1850000000000000001");
});

test("mediaUrl: photos at name=medium, avatars at 400x400, other hosts refused", () => {
  assert.equal(mediaUrl("https://pbs.twimg.com/media/GabcDEF123?format=jpg&name=small"), "https://pbs.twimg.com/media/GabcDEF123?format=jpg&name=medium");
  assert.equal(mediaUrl("https://pbs.twimg.com/media/GabcDEF123.png"), "https://pbs.twimg.com/media/GabcDEF123?format=png&name=medium");
  assert.equal(mediaUrl("https://pbs.twimg.com/profile_images/1/abc_normal.jpg"), "https://pbs.twimg.com/profile_images/1/abc_400x400.jpg");
  assert.equal(mediaUrl("https://pbs.twimg.com/profile_images/1/abc_x96.png"), "https://pbs.twimg.com/profile_images/1/abc_400x400.png");
  assert.equal(mediaUrl("https://example.com/media/x.jpg"), null);
  assert.equal(mediaUrl("data:image/png;base64,AAAA"), null);
});

test("cashtag and ticker: cashtag wins, else initials or the first word, A-Z 0-9 only, at most 10", () => {
  assert.equal(cashtagOf("Test Coin is live $test now"), "TEST");
  assert.equal(cashtagOf("price is $5 today"), null, "a dollar amount is not a cashtag");
  assert.equal(suggestTicker("launching $TEST today", "Test Coin"), "TEST");
  assert.equal(suggestTicker("", "Test Coin"), "TEST");
  assert.equal(suggestTicker("", "the test coin club"), "TTCC");
  assert.equal(suggestTicker("", "Testcoinextralongword"), "TESTCOINEX");
  assert.equal(suggestTicker("", "🚀"), "TOKEN");
});

test("suggestName: first line without links, mentions, tags and emoji, at most 32 bytes on a word", () => {
  assert.equal(suggestName("Test Coin 🚀 https://t.co/abc\nsecond line", "Some Author"), "Test Coin");
  assert.equal(suggestName("@someone Test Coin is here. More text follows", ""), "Test Coin is here");
  assert.equal(suggestName("$TEST #tag https://t.co/x", "Test Coin"), "Test Coin", "falls back to the author");
  const long = suggestName("Test Coin with a very long name that keeps on going", "");
  assert.ok(new TextEncoder().encode(long).length <= 32);
  assert.equal(long, "Test Coin with a very long name");
  assert.equal(suggestName("", ""), "Untitled");
  assert.equal(suggestName("Introducing Test Coin $TEST, a sample post", "Someone"), "Test Coin", "words before the cashtag");
  assert.equal(suggestName("gm all, Test Coin $TEST is live", ""), "Test Coin");
  assert.equal(clipBytes("ééééé", 5), "éé", "never splits a character");
});

test("draftFromTweet: photo first, else avatar; tweet URL and text carried over", () => {
  const base = { url: "https://x.com/test_user/status/1850000000000000001", id: "1850000000000000001", handle: "test_user", author: "Test Author", text: "Test Coin $TEST\nthe test token", avatar: "https://pbs.twimg.com/profile_images/1/a_400x400.jpg" };
  const d = draftFromTweet({ ...base, images: ["https://pbs.twimg.com/media/X?format=jpg&name=medium"] });
  assert.deepEqual(d, { name: "Test Coin", ticker: "TEST", imageUrl: "https://pbs.twimg.com/media/X?format=jpg&name=medium", tweetUrl: base.url, description: "Test Coin $TEST\nthe test token" });
  assert.equal(draftFromTweet({ ...base, images: [] }).imageUrl, base.avatar);
  assert.equal(draftFromTweet({ ...base, images: [], avatar: null }).imageUrl, null);
});
