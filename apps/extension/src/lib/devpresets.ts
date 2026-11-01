/** Dev buy chips in the drawer: up to 4 SOL amounts, 2 decimals, 0 allowed (no dev buy), otherwise above 0 and at most the
 *  API cap. Stored in chrome.storage.local "hb.devBuyPresets". Pure, unit tested. */
export const DEV_PRESETS_DEFAULT: readonly number[] = [0, 0.5, 1, 2];
export const DEV_PRESETS_MAX = 4;
/** The API caps a dev buy at 20 SOL (and the tier threshold). */
export const DEV_BUY_MAX = 20;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** One typed amount: a number with at most 2 decimals, 0 or above 0 up to the max. */
export function parseDevAmount(v: unknown): { ok: true; value: number } | { ok: false; error: string } {
  const t = typeof v === "number" ? String(v) : typeof v === "string" ? v.trim().replace(",", ".") : "";
  if (!/^\d+(\.\d{1,2})?$|^\.\d{1,2}$/.test(t)) return { ok: false, error: "Use a SOL amount with up to 2 decimals" };
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return { ok: false, error: "Use a SOL amount with up to 2 decimals" };
  if (n > DEV_BUY_MAX) return { ok: false, error: `At most ${DEV_BUY_MAX} SOL` };
  return { ok: true, value: round2(n) };
}

/** A full set from the editor: 1 to 4 amounts, no duplicates, kept in the order typed. */
export function checkDevPresets(list: unknown): { ok: true; values: number[] } | { ok: false; error: string } {
  if (!Array.isArray(list)) return { ok: false, error: "Add at least one amount" };
  const raw = list.filter((x) => !(typeof x === "string" && x.trim() === ""));
  if (!raw.length) return { ok: false, error: "Add at least one amount" };
  if (raw.length > DEV_PRESETS_MAX) return { ok: false, error: `Up to ${DEV_PRESETS_MAX} amounts` };
  const out: number[] = [];
  for (const x of raw) {
    const p = parseDevAmount(x);
    if (!p.ok) return p;
    if (out.includes(p.value)) return { ok: false, error: `${p.value} SOL is there twice` };
    out.push(p.value);
  }
  return { ok: true, values: out };
}

/** What the drawer shows from storage: a valid stored set, else the defaults. */
export function readDevPresets(stored: unknown): number[] {
  const c = checkDevPresets(stored);
  return c.ok ? c.values : [...DEV_PRESETS_DEFAULT];
}
