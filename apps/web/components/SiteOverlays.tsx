"use client";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { readWelcome, saveWelcome, syncConsentCookie } from "@/lib/consent";
import { ConsentGate } from "./consent";
import { WelcomeModal } from "./WelcomeModal";
import { CookieConsent } from "./CookieConsent";

/** Crawlers, link unfurlers, audit tools and headless browsers never see the welcome or the cookie card. Extra safety only:
 *  both render after hydration, so the SSR HTML never contains them anyway. Headless e2e runs that want them can set a normal UA. */
const BOT_UA = /bot\b|bot\/|crawl|spider|slurp|mediapartners|adsbot|google-inspectiontool|googleother|bingpreview|yandex|baidu|duckduck|petalbot|applebot|facebookexternalhit|facebot|twitterbot|linkedinbot|embedly|quora link preview|pinterest|redditbot|slackbot|discordbot|telegrambot|whatsapp|skypeuripreview|vkshare|w3c_validator|lighthouse|pagespeed|gtmetrix|chrome-lighthouse|headlesschrome|phantomjs|prerender|semrush|ahrefs|mj12bot|dotbot/i;
const NO_WELCOME = ["/terms", "/privacy"];

/** Placeholder for non-essential scripts. highbar ships no analytics today. Add next/script tags here and they load only after consent. */
function AnalyticsScripts() {
  return <span hidden data-testid="analytics-slot" />;
}

/** Client-only overlays mounted once from PageShell (every page): the first visit welcome, then the cookie card, plus the analytics gate. */
export function SiteOverlays() {
  const path = usePathname() ?? "/";
  const [ready, setReady] = useState(false);
  const [bot, setBot] = useState(false);
  const [welcomed, setWelcomed] = useState(false);

  useEffect(() => {
    setBot(BOT_UA.test(navigator.userAgent));
    setWelcomed(readWelcome());
    syncConsentCookie();
    setReady(true);
  }, []);

  const accept = useCallback(() => { saveWelcome(); setWelcomed(true); }, []);
  const legal = NO_WELCOME.some((p) => path === p || path.startsWith(`${p}/`));

  return (
    <>
      <ConsentGate category="analytics"><AnalyticsScripts /></ConsentGate>
      {ready && !bot && !welcomed && !legal && <WelcomeModal onContinue={accept} />}
      {ready && <CookieConsent autoPrompt={!bot && welcomed} />}
    </>
  );
}
