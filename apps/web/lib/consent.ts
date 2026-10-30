/** Welcome and cookie consent storage. Pure helpers with no React, so the server can import parseConsentCookie too.
 *  Server example: parseConsentCookie((await cookies()).get(CONSENT_COOKIE)?.value). */
export const WELCOME_KEY = "hb_welcome_v1";
export const CONSENT_KEY = "hb_consent_v1";
export const CONSENT_COOKIE = "hb_consent";
export const CONSENT_EVENT = "hb-consent-change";
export const CONSENT_OPEN_EVENT = "hb-consent-open";

export type ConsentCategory = "essential" | "analytics";
export type Consent = { v: 1; analytics: boolean; ts: number };

const MAX_AGE = 60 * 60 * 24 * 180; // 180 days

export function parseConsent(raw: string | null | undefined): Consent | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as Partial<Consent> | null;
    if (j && j.v === 1 && typeof j.analytics === "boolean" && typeof j.ts === "number") return { v: 1, analytics: j.analytics, ts: j.ts };
  } catch { /* bad value */ }
  return null;
}

/** Reads the hb_consent cookie value (URI encoded JSON). Works on the server and the client. */
export function parseConsentCookie(value: string | null | undefined): Consent | null {
  if (!value) return null;
  try { return parseConsent(decodeURIComponent(value)); } catch { return null; }
}

/** Essential is always allowed. Anything else needs a stored opt in. */
export const consentAllows = (c: Consent | null, category: ConsentCategory) => category === "essential" || (!!c && c[category] === true);

export function readConsentRaw(): string | null {
  try { return localStorage.getItem(CONSENT_KEY); } catch { return null; }
}

function writeCookie(c: Consent) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(c))}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax${secure}`;
}

export function saveConsent(analytics: boolean): Consent {
  const c: Consent = { v: 1, analytics, ts: Date.now() };
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify(c)); } catch { /* storage blocked */ }
  try { writeCookie(c); } catch { /* cookies blocked */ }
  window.dispatchEvent(new Event(CONSENT_EVENT));
  return c;
}

/** Re-mirrors a stored choice into the cookie when the cookie was cleared or expired. */
export function syncConsentCookie() {
  const c = parseConsent(readConsentRaw());
  if (!c) return;
  try { if (!document.cookie.split("; ").some((p) => p.startsWith(`${CONSENT_COOKIE}=`))) writeCookie(c); } catch { /* cookies blocked */ }
}

export const openCookieSettings = () => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));

export function readWelcome(): boolean {
  try { return !!localStorage.getItem(WELCOME_KEY); } catch { return false; }
}

export function saveWelcome() {
  try { localStorage.setItem(WELCOME_KEY, String(Date.now())); } catch { /* storage blocked */ }
}
