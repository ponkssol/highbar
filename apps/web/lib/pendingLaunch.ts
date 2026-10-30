"use client";
/** What the launch page already knows about a token it just created, handed to the token page's indexing state
 *  (app/token/[mint]/TokenPending.tsx) through sessionStorage, so the page has a name, ticker and logo before the API indexes the mint. */
export interface PendingLaunch { mint: string; name: string; symbol: string; image: string; signature: string; at: number }

const key = (mint: string) => `hb-launch:${mint}`;
const MAX_AGE_MS = 30 * 60_000;

export function savePendingLaunch(p: PendingLaunch) {
  try { sessionStorage.setItem(key(p.mint), JSON.stringify(p)); } catch { /* storage full or blocked: the page falls back to the mint */ }
}
export function loadPendingLaunch(mint: string): PendingLaunch | null {
  try {
    const raw = sessionStorage.getItem(key(mint));
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingLaunch;
    if (p?.mint !== mint || !(Date.now() - p.at < MAX_AGE_MS)) return null;
    return { ...p, image: /^https?:\/\//.test(p.image ?? "") ? p.image : "" }; // only a hosted http(s) logo
  } catch { return null; }
}
export function clearPendingLaunch(mint: string) {
  try { sessionStorage.removeItem(key(mint)); } catch { /* ignore */ }
}
