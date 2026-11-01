import { test } from "node:test";
import assert from "node:assert/strict";
import { GMGN_CLIP, GMGN_SCALE, gmgnFrameStyle, gmgnUrl } from "./gmgn";

test("gmgnUrl: official kline path, only theme and interval, base58 mints only", () => {
  const m = "CEMEy7jkeytkxq3qYjaKyQnKiUdHAMJDM1B1tv2Upump";
  assert.equal(gmgnUrl(m, "1S"), `https://www.gmgn.cc/kline/sol/${m}?theme=dark&interval=1S`);
  assert.equal(gmgnUrl(m), `https://www.gmgn.cc/kline/sol/${m}?theme=dark&interval=1`);
  assert.equal(gmgnUrl("../evil"), null);
  assert.equal(gmgnUrl(`${m}?x=1`), null);
  assert.equal(gmgnUrl(m, "2" as never), null);
});

test("gmgnFrameStyle: offsets only the outer toolbars", () => {
  const s = gmgnFrameStyle();
  assert.match(s, new RegExp(`top:-${GMGN_CLIP.top}px`));
  assert.match(s, new RegExp(`left:-${GMGN_CLIP.left}px`));
  assert.match(s, /height:calc\(100% \+ 81px\)/);
  assert.match(s, /width:calc\(100% \+ 56px\)/);
});

test("gmgnFrameStyle: a uniform scale shrinks the whole embed, the clip offsets scale with it", () => {
  const s = gmgnFrameStyle(GMGN_CLIP, 0.8);
  assert.match(s, /top:-33\.6px/);
  assert.match(s, /left:-44\.8px/);
  assert.match(s, /width:calc\(\(100% \+ 44\.8px\) \/ 0\.8\)/);
  assert.match(s, /height:calc\(\(100% \+ 64\.8px\) \/ 0\.8\)/);
  assert.match(s, /transform:scale\(0\.8\);transform-origin:0 0/);
  assert.ok(GMGN_SCALE > 0.6 && GMGN_SCALE <= 1);
  assert.equal(gmgnFrameStyle(GMGN_CLIP, 0), gmgnFrameStyle());
});
