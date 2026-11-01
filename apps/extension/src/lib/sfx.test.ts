import { test } from "node:test";
import assert from "node:assert/strict";
import { soundPref } from "./sfx";
import { normalizeSettings } from "./settings";

test("sound setting: on at 50 % by default, bad volumes dropped", () => {
  assert.deepEqual(soundPref(undefined), { on: true, vol: 0.5 });
  assert.deepEqual(soundPref({ sound: false, soundVol: 0.2 }), { on: false, vol: 0.2 });
  assert.deepEqual(soundPref({ soundVol: 7 }), { on: true, vol: 0.5 });
  const s = normalizeSettings({});
  assert.equal(s.sound, true); assert.equal(s.soundVol, 0.5);
  assert.equal(normalizeSettings({ sound: false, soundVol: 0.25 }).soundVol, 0.25);
  assert.equal(normalizeSettings({ soundVol: -1 }).soundVol, 0.5);
});
