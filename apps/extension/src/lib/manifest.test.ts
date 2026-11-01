import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dir = new URL("../static/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("manifest.json", dir), "utf8"));
const pngSize = (rel: string) => { const b = readFileSync(new URL(rel, dir)); assert.equal(b.subarray(1, 4).toString("latin1"), "PNG"); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

test("manifest: toolbar and store icons are the logo PNGs at their declared sizes", () => {
  for (const icons of [manifest.icons, manifest.action.default_icon]) {
    for (const [size, rel] of Object.entries(icons as Record<string, string>)) assert.deepEqual(pngSize(rel), [Number(size), Number(size)], rel);
  }
  assert.deepEqual(Object.keys(manifest.icons).sort(), ["128", "16", "32", "48"]);
});

test("manifest: the toolbar icon opens the side panel, not a popup", () => {
  assert.equal(manifest.action.default_popup, undefined);
  assert.equal(manifest.side_panel.default_path, "sidepanel.html");
  assert.ok(manifest.permissions.includes("sidePanel"));
});

test("manifest: no lock leftovers (no popup page, no idle or alarms permission)", () => {
  assert.throws(() => readFileSync(new URL("popup.html", dir)));
  assert.ok(!manifest.permissions.includes("idle"));
  assert.ok(!manifest.permissions.includes("alarms"));
  assert.deepEqual(manifest.permissions.sort(), ["sidePanel", "storage"]);
});

test("manifest: the CA chart page is web accessible on x.com and frames only GeckoTerminal", () => {
  const war = manifest.web_accessible_resources[0];
  assert.ok(war.resources.includes("chart.html") && war.resources.includes("chart.js"));
  assert.deepEqual(war.matches, ["https://x.com/*", "https://twitter.com/*"]);
  assert.match(manifest.content_security_policy.extension_pages, /frame-src https:\/\/www\.geckoterminal\.com(;|$)/);
  assert.match(manifest.content_security_policy.extension_pages, /script-src 'self'/);
  readFileSync(new URL("chart.html", dir));
});
