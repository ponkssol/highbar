"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { CONSENT_OPEN_EVENT } from "@/lib/consent";
import { useConsent } from "./consent";

function Switch({ on, disabled, onChange, labelledBy, describedBy, testId }: { on: boolean; disabled?: boolean; onChange?: (v: boolean) => void; labelledBy: string; describedBy: string; testId: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-labelledby={labelledBy} aria-describedby={describedBy} disabled={disabled} data-testid={testId}
      onClick={() => onChange?.(!on)}
      className={`relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full border outline-none focus-visible:ring-1 focus-visible:ring-gold-line disabled:cursor-not-allowed disabled:opacity-70 ${on ? "border-transparent bg-gold" : "border-border bg-control"}`}>
      <span aria-hidden className={`h-4 w-4 rounded-full bg-[#FFFDF8] shadow-[0_1px_2px_rgba(0,0,0,.2)] transition-transform duration-150 ${on ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
    </button>
  );
}

const btnGold = "inline-flex h-9 items-center justify-center rounded-sm bg-gold px-3.5 text-[13px] font-semibold text-gold-ink outline-none hover:brightness-105 focus-visible:ring-2 focus-visible:ring-gold-line";
const btnSoft = "hb-ctrl inline-flex h-9 items-center justify-center rounded-sm px-3.5 text-[13px] font-medium text-ink-2 outline-none hover:text-ink focus-visible:ring-1 focus-visible:ring-gold-line";
const btnText = "text-xs font-medium text-ink-3 underline-offset-4 outline-none hover:text-ink hover:underline focus-visible:text-ink focus-visible:underline";

/** Small cookie card in the bottom corner (above the bottom nav on mobile). autoPrompt shows it once the welcome was accepted and no choice exists yet.
 *  The Cookie settings link anywhere in the app opens the settings panel through CONSENT_OPEN_EVENT. */
export function CookieConsent({ autoPrompt }: { autoPrompt: boolean }) {
  const { consent, decided, save } = useConsent();
  const [mode, setMode] = useState<"closed" | "banner" | "settings">("closed");
  const [analytics, setAnalytics] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => { if (autoPrompt && !decided) setMode((m) => (m === "closed" ? "banner" : m)); }, [autoPrompt, decided]);

  useEffect(() => {
    const open = () => { setAnalytics(consent?.analytics ?? false); setMode("settings"); };
    window.addEventListener(CONSENT_OPEN_EVENT, open);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, open);
  }, [consent]);

  useEffect(() => {
    if (mode !== "settings") return;
    card.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMode(decided ? "closed" : "banner"); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, decided]);

  if (mode === "closed") return null;
  const choose = (a: boolean) => { save(a); setMode("closed"); };
  const titleId = `${id}-title`;

  return (
    <div ref={card} tabIndex={-1} role={mode === "settings" ? "dialog" : "region"} aria-labelledby={titleId} data-testid={mode === "settings" ? "cookie-settings" : "cookie-banner"}
      className="hb-sheet fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[60] rounded-lg border border-border bg-surface p-4 shadow-[0_18px_50px_-18px_rgba(0,0,0,.4)] outline-none md:inset-x-auto md:bottom-5 md:right-5 md:w-[372px] md:p-5">
      <div className="flex items-center justify-between gap-3">
        <div id={titleId} className="hb-eyebrow">{mode === "settings" ? "Cookie settings" : "Cookies"}</div>
        {mode === "banner"
          ? <button type="button" className={btnText} onClick={() => { setAnalytics(false); setMode("settings"); }} data-testid="cookie-open-settings">Settings</button>
          : decided && <button type="button" className={btnText} onClick={() => setMode("closed")}>Close</button>}
      </div>

      {mode === "banner" ? (
        <>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
            highbar uses essential storage to run. Analytics stay off unless you allow them. Read the <Link href="/privacy" className="font-medium text-ink underline decoration-border-strong underline-offset-[3px] hover:decoration-gold-line">Privacy Policy</Link> for details.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" className={btnSoft} onClick={() => choose(false)} data-testid="cookie-reject">Reject non-essential</button>
            <button type="button" className={btnGold} onClick={() => choose(true)} data-testid="cookie-accept">Accept all</button>
          </div>
        </>
      ) : (
        <>
          <div className="mt-2 divide-y divide-border">
            <div className="flex items-start justify-between gap-4 py-3">
              <div>
                <div id={`${id}-ess`} className="text-sm font-medium text-ink">Essential</div>
                <p id={`${id}-ess-d`} className="mt-0.5 text-xs leading-relaxed text-ink-3">Needed for highbar to work, like your theme, wallet session and these choices. Always on.</p>
              </div>
              <Switch on disabled labelledBy={`${id}-ess`} describedBy={`${id}-ess-d`} testId="cookie-essential" />
            </div>
            <div className="flex items-start justify-between gap-4 py-3">
              <div>
                <div id={`${id}-an`} className="text-sm font-medium text-ink">Analytics</div>
                <p id={`${id}-an-d`} className="mt-0.5 text-xs leading-relaxed text-ink-3">Helps us see which pages are used so we can improve them. Off unless you turn it on.</p>
              </div>
              <Switch on={analytics} onChange={setAnalytics} labelledBy={`${id}-an`} describedBy={`${id}-an-d`} testId="cookie-analytics" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className={btnSoft} onClick={() => choose(analytics)} data-testid="cookie-save">Save choices</button>
            <button type="button" className={btnGold} onClick={() => choose(true)} data-testid="cookie-accept-all">Accept all</button>
          </div>
        </>
      )}
    </div>
  );
}
