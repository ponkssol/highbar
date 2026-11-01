/** Trade and launch sounds, synthesized with Web Audio (no audio files, no requests). Success: a soft two-note chime; error:
 *  a short low tone. The AudioContext is made on the user's click (primeSfx) in the page where they acted, so autoplay rules
 *  never block it. Settings > Sound turns it off and sets the volume (hb.settings, read here and kept fresh on change). */
export type Sfx = "ok" | "err";
let ac: AudioContext | null = null;
let pref = { on: true, vol: 0.5 }, loaded = false;

export function soundPref(v: unknown): { on: boolean; vol: number } {
  const o = (v ?? {}) as { sound?: unknown; soundVol?: unknown };
  const vol = Number(o.soundVol);
  return { on: o.sound !== false, vol: Number.isFinite(vol) && vol >= 0 && vol <= 1 ? vol : 0.5 };
}
function load() {
  if (loaded || typeof chrome === "undefined" || !chrome.storage?.local) return;
  loaded = true;
  void chrome.storage.local.get("hb.settings").then((r) => { pref = soundPref(r["hb.settings"]); }).catch(() => {});
  chrome.storage.onChanged?.addListener((c, area) => { if (area === "local" && c["hb.settings"]) pref = soundPref(c["hb.settings"].newValue); });
}
load();

/** Call inside the click that starts a trade or launch: creates (or wakes) the AudioContext under the user gesture. */
export function primeSfx(): void {
  load();
  if (!pref.on) return;
  try {
    const C = (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return;
    ac ??= new C({ latencyHint: "interactive" });
    if (ac.state === "suspended") void ac.resume().catch(() => {});
  } catch { ac = null; }
}

const note = (c: AudioContext, out: AudioNode, type: OscillatorType, f0: number, f1: number, t: number, dur: number, peak: number) => {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.02);
};

/** Plays the sound if Sound is on and a context exists (made by primeSfx on the user's click). Never throws. */
export function playSfx(kind: Sfx, vol = pref.vol): void {
  if (!pref.on || !ac || vol <= 0) return;
  try {
    const c = ac, t = c.currentTime + 0.01, out = c.createGain(), lp = c.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = kind === "ok" ? 6000 : 900;
    out.gain.value = Math.min(1, vol) * 0.9;
    out.connect(lp).connect(c.destination);
    if (kind === "ok") { // E6 then A6, 240 ms in all, soft sine with a quiet octave shimmer
      note(c, out, "sine", 1318.5, 1318.5, t, 0.13, 0.16); note(c, out, "sine", 2637, 2637, t, 0.08, 0.025);
      note(c, out, "sine", 1760, 1760, t + 0.09, 0.15, 0.17); note(c, out, "sine", 3520, 3520, t + 0.09, 0.09, 0.02);
    } else { // a low, soft falling tone, 260 ms
      note(c, out, "triangle", 233, 174.6, t, 0.26, 0.22); note(c, out, "sine", 116.5, 98, t, 0.24, 0.12);
    }
  } catch { /* no audio */ }
}
