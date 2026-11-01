import { test } from "node:test";
import assert from "node:assert/strict";
import { LAUNCH_TIERS, normalizeSettings } from "./settings";

test("Max is a launch tier and every tier survives normalizing the presets", () => {
  assert.equal(LAUNCH_TIERS.length, 3);
  assert.ok(LAUNCH_TIERS.includes("max"));
  for (const tier of LAUNCH_TIERS) assert.equal(normalizeSettings({ presets: { tier } } as never).presets.tier, tier);
  assert.equal(normalizeSettings({ presets: { tier: "ultra" } } as never).presets.tier, "standard");
});

test("anti-sniper starts off, a stored on without a user choice reads off, the user's choice stays", () => {
  assert.equal(normalizeSettings(undefined).presets.antiSniper, false);
  assert.equal(normalizeSettings({ presets: { antiSniper: true } } as never).presets.antiSniper, false);
  assert.equal(normalizeSettings({ presets: { antiSniper: true, antiSniperChosen: true } } as never).presets.antiSniper, true);
  assert.equal(normalizeSettings({ presets: { antiSniper: false, antiSniperChosen: true } } as never).presets.antiSniper, false);
});

test("settings: token detection on x.com is on unless turned off", () => {
  assert.equal(normalizeSettings(undefined).caDetect, true);
  assert.equal(normalizeSettings({}).caDetect, true);
  assert.equal(normalizeSettings({ caDetect: false }).caDetect, false);
});
