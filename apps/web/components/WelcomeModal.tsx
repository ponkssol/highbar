"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** First visit welcome. Mounted by SiteOverlays on the client only, after hydration, so it never appears in SSR HTML.
 *  Blocking on purpose: no close button, Esc and backdrop clicks do nothing, the rest of the page is inert and scroll is locked until Continue. */
export function WelcomeModal({ onContinue }: { onContinue: () => void }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const cta = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const body = document.body;
    const el = document.createElement("div");
    el.setAttribute("data-hb-welcome-root", "");
    body.appendChild(el);
    setHost(el);
    // Scroll lock. Pad by the scrollbar width so the page behind does not jump.
    const prev = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    const bar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (bar > 0) body.style.paddingRight = `${bar}px`;
    // Everything else becomes inert: no clicks, no focus, hidden from screen readers.
    const others = Array.from(body.children).filter((c): c is HTMLElement => c !== el && c instanceof HTMLElement && !c.hasAttribute("inert"));
    others.forEach((c) => c.setAttribute("inert", ""));
    return () => {
      others.forEach((c) => c.removeAttribute("inert"));
      body.style.overflow = prev.overflow;
      body.style.paddingRight = prev.paddingRight;
      el.remove();
    };
  }, []);

  useEffect(() => {
    if (!host) return;
    cta.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") return; // activation keys reach the focused control
      e.stopPropagation(); // no global shortcuts while the welcome is open
      if (e.key === "Escape") { e.preventDefault(); return; }
      if (e.key !== "Tab") return;
      const items = Array.from(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
      if (items.length === 0) { e.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const inside = !!active && !!panel.current?.contains(active);
      if (e.shiftKey && (active === first || !inside)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (active === last || !inside)) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [host]);

  if (!host) return null;
  const link = "font-medium text-ink-2 underline decoration-border-strong underline-offset-[3px] hover:text-ink hover:decoration-gold-line";
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-center md:p-6" data-testid="welcome-modal">
      <div className="hb-scrim absolute inset-0 backdrop-blur-[3px]" aria-hidden />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="hb-welcome-title" aria-describedby="hb-welcome-desc"
        className="hb-modal relative max-h-[94dvh] w-full overflow-y-auto overscroll-contain rounded-t-[20px] border border-border bg-surface p-2.5 pb-[calc(18px+env(safe-area-inset-bottom))] shadow-[0_24px_80px_-24px_rgba(0,0,0,.45)] md:max-w-[460px] md:rounded-lg md:p-3 md:pb-6">
        <div className="relative aspect-[3/2] w-full overflow-hidden rounded-[14px] bg-muted md:rounded-[12px]">
          <Image src="/brand/welcome-hero.webp" alt="A golden highbar column mark glowing in the clouds between marble arches, with classical statues playing music on the steps below" fill sizes="(min-width: 768px) 436px, 100vw" className="object-cover" loading="eager" />
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-black/5 dark:ring-white/[.06]" aria-hidden />
        </div>
        <div className="px-3 pt-5 text-center md:px-5 md:pt-6">
          <h2 id="hb-welcome-title" className="text-[22px] font-semibold leading-tight md:text-[26px]">Welcome to highbar</h2>
          <p id="hb-welcome-desc" className="mx-auto mt-3 max-w-[40ch] text-sm leading-relaxed text-ink-2">
            highbar lets anyone launch a Solana token on Meteora with fair, anti-sniper launches and locked liquidity. Prices can move quickly, so trade carefully.
          </p>
          <button ref={cta} type="button" onClick={onContinue} data-testid="welcome-continue"
            className="mt-6 h-12 w-full rounded bg-gold text-[15px] font-semibold text-gold-ink outline-none hover:brightness-105 focus-visible:ring-1 focus-visible:ring-gold-line focus-visible:ring-offset-[3px] focus-visible:ring-offset-surface">
            Continue
          </button>
          <p className="mx-auto mt-4 max-w-[46ch] text-xs leading-relaxed text-ink-3">
            By clicking this button, you agree to the <Link href="/terms" className={link}>Terms and Conditions</Link> and <Link href="/privacy" className={link}>Privacy Policy</Link>, and certify that you are over 18 years old.
          </p>
        </div>
      </div>
    </div>,
    host,
  );
}
