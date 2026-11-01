import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { metadataImage, resolveImage, tokenThumb } from "../background/image";

const real = globalThis.fetch;
afterEach(() => { globalThis.fetch = real; });
const MINT = "3PZ2YpNehCf3WWqU7QAAkKxUNBbvGEWiakEbuHFZhigh";

test("token image: the api's site relative path resolves against the siteUrl, never against x.com", () => {
  assert.equal(resolveImage(`/hb-api/img/${MINT}`, "https://highbar.capital/"), `https://highbar.capital/hb-api/img/${MINT}`);
  assert.equal(resolveImage("https://highbar.capital/hb-api/media/a.jpg", "https://highbar.capital"), "https://highbar.capital/hb-api/media/a.jpg");
  assert.equal(resolveImage("//evil.test/a.jpg", "https://highbar.capital"), null);
  assert.equal(resolveImage("http://example.test/a.jpg", "https://highbar.capital"), null);
  assert.equal(resolveImage("javascript:alert(1)", "https://highbar.capital"), null);
  assert.equal(resolveImage(null, "https://highbar.capital"), null);
});

test("token image: metadata uri image field, then null (the panel draws the letter placeholder)", async () => {
  const asked: string[] = [];
  globalThis.fetch = (async (u: string | URL) => {
    asked.push(String(u));
    if (String(u).endsWith(".json")) return new Response(JSON.stringify({ image: "/hb-api/media/x.jpg" }), { status: 200 });
    return new Response("<html>", { status: 200, headers: { "content-type": "text/html" } });
  }) as typeof fetch;
  assert.equal(await metadataImage("https://highbar.capital/hb-api/meta/x.json", "https://highbar.capital"), "https://highbar.capital/hb-api/media/x.jpg");
  asked.length = 0;
  // every source answers HTML, not an image: nothing is handed to the page
  assert.equal(await tokenThumb("https://api.test", MINT, { siteUrl: "https://highbar.capital", image: `/hb-api/img/${MINT}`, uri: "https://highbar.capital/hb-api/meta/x.json" }), null);
  assert.deepEqual(asked, [`https://api.test/img/${MINT}`, `https://highbar.capital/hb-api/img/${MINT}`, "https://highbar.capital/hb-api/meta/x.json", "https://highbar.capital/hb-api/media/x.jpg"]);
});

test("token image: the panel only renders data URLs and swaps a broken one for the placeholder", () => {
  const src = readFileSync(new URL("../content/holding.ts", import.meta.url), "utf8");
  assert.ok(/startsWith\("data:image\/"\)/.test(src));
  assert.ok(/addEventListener\("error"/.test(src));
  const hold = readFileSync(new URL("./holding.ts", import.meta.url), "utf8");
  assert.ok(!/\(data:image\\\/\|https:\)/.test(hold), "buildRows no longer passes remote https images to x.com");
});

test("manifest: the worker may fetch token images from the api and highbar.capital", () => {
  const m = JSON.parse(readFileSync(new URL("../static/manifest.json", import.meta.url), "utf8"));
  assert.ok(m.host_permissions.includes("https://api-production-810c.up.railway.app/*"));
  assert.ok(m.host_permissions.includes("https://highbar.capital/*"));
});
