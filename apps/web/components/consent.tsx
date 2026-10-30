"use client";
import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { CONSENT_EVENT, CONSENT_KEY, consentAllows, openCookieSettings, parseConsent, readConsentRaw, saveConsent, type ConsentCategory } from "@/lib/consent";

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => { if (e.key === CONSENT_KEY || e.key === null) cb(); };
  window.addEventListener(CONSENT_EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => { window.removeEventListener(CONSENT_EVENT, cb); window.removeEventListener("storage", onStorage); };
}

/** Current cookie choice. On the server and during hydration it is always "undecided", so gated content never ships in SSR HTML. */
export function useConsent() {
  const raw = useSyncExternalStore(subscribe, readConsentRaw, () => null);
  const consent = useMemo(() => parseConsent(raw), [raw]);
  return {
    consent,
    decided: consent !== null,
    allows: (category: ConsentCategory) => consentAllows(consent, category),
    save: saveConsent,
    openSettings: openCookieSettings,
  };
}

/** Renders its children only when the visitor allowed this category. Put every non-essential script (analytics, pixels) inside one. */
export function ConsentGate({ category, children, fallback = null }: { category: ConsentCategory; children: ReactNode; fallback?: ReactNode }) {
  const { allows } = useConsent();
  return <>{allows(category) ? children : fallback}</>;
}

/** Footer and page link that reopens the cookie settings panel. */
export function CookieSettingsLink({ className = "", children = "Cookie settings" }: { className?: string; children?: ReactNode }) {
  return <button type="button" onClick={openCookieSettings} data-testid="cookie-settings-link" className={className}>{children}</button>;
}
