import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../static/sidepanel.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../ui/styles.css", import.meta.url), "utf8");

test("side panel hides scrollbars but keeps scrolling", () => {
  assert.match(html, /<html[^>]*class="[^"]*\bhb-panel\b/);
  assert.ok(css.includes("html.hb-panel,html.hb-panel *{scrollbar-width:none}"));
  assert.ok(css.includes("html.hb-panel::-webkit-scrollbar,html.hb-panel ::-webkit-scrollbar{display:none"));
  // Scrolling itself must stay on: never overflow hidden on the panel root.
  assert.ok(!/html\.hb-panel\{[^}]*overflow(-y)?:hidden/.test(css));
  assert.ok(/html\.hb-panel\{[^}]*overflow-y:auto/.test(css));
});
