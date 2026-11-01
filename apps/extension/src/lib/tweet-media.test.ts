import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseHTML } from "linkedom";
import { collectMedia, normalizeXLink, readTweet } from "./tweet";

const html = readFileSync(new URL("../../test-fixtures/multi-image-tweet.html", import.meta.url), "utf8");
const article = () => parseHTML(`<!doctype html><html><body>${html}</body></html>`).document.querySelector('article[data-testid="tweet"]')!;

test("collectMedia: every photo of a multi photo post, video and GIF posters, quoted media and card images, deduped", () => {
  const { images, avatar } = collectMedia(article() as unknown as Element);
  assert.deepEqual(images, [
    "https://pbs.twimg.com/media/PhotoOne?format=jpg&name=medium",
    "https://pbs.twimg.com/media/PhotoTwo?format=png&name=medium",
    "https://pbs.twimg.com/media/PhotoThree?format=jpg&name=medium",
    "https://pbs.twimg.com/media/PhotoFour?format=webp&name=medium",
    "https://pbs.twimg.com/ext_tw_video_thumb/222/pu/img/VideoPoster.jpg",
    "https://pbs.twimg.com/tweet_video_thumb/GifPoster.jpg",
    "https://pbs.twimg.com/media/QuotedPhoto?format=jpg&name=medium",
    "https://pbs.twimg.com/card_img/444/CardImage?format=jpg&name=large",
  ]);
  assert.equal(avatar, "https://pbs.twimg.com/profile_images/111/author_400x400.jpg", "the author, not the quoted account");
});

test("readTweet: url, author, text with emoji and line break, all images", () => {
  const t = readTweet(article() as unknown as Element)!;
  assert.equal(t.url, "https://x.com/testaccount/status/1850000000000000002");
  assert.equal(t.author, "Test Account");
  assert.equal(t.text.split("\n")[0], "Test Coin $TEST");
  assert.ok(t.text.includes("🚀"));
  assert.equal(t.images.length, 8);
});

test("normalizeXLink: handles, x.com and twitter.com links, everything else refused", () => {
  assert.equal(normalizeXLink(""), "");
  assert.equal(normalizeXLink("@testaccount"), "https://x.com/testaccount");
  assert.equal(normalizeXLink("testaccount"), "https://x.com/testaccount");
  assert.equal(normalizeXLink("https://twitter.com/testaccount/status/1850000000000000002?s=20"), "https://x.com/testaccount/status/1850000000000000002");
  assert.equal(normalizeXLink("x.com/testaccount"), "https://x.com/testaccount");
  assert.equal(normalizeXLink("https://mobile.x.com/testaccount/"), "https://x.com/testaccount");
  assert.equal(normalizeXLink("https://example.com/testaccount"), null);
  assert.equal(normalizeXLink("https://x.com.example.com/a"), null);
  assert.equal(normalizeXLink("javascript:alert(1)"), null);
  assert.equal(normalizeXLink("not a link"), null);
});
