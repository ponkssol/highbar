import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { HOME_TITLE, ICON_V, SHORT_NAME, SITE_NAME, siteUrl } from "@/lib/seo";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/Sidebar";
import { PageShell } from "@/components/PageShell";
import { BottomNav } from "@/components/BottomNav";
import { MobileHeader } from "@/components/MobileHeader";
import { ReferralCapture } from "@/components/ReferralCapture";
import { SearchLauncher } from "@/components/search/SearchLauncher";

// Geist for body and headings, Geist Mono for labels, numbers, table headers and tickers (SIL OFL 1.1), self-hosted by next/font at build time.
// --font-display and --font-serif (older arena faces) alias the sans in globals.css, so every font-display / font-serif use stays valid.
const sans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

/** Favicon set, all served from public/ on the root domain (app/ icon files would override them, so there are none). */
const icons: Metadata["icons"] = {
  icon: [
    { url: `/favicon.ico?v=${ICON_V}`, sizes: "16x16 32x32 48x48" },
    { url: "/icons/hb-v5-48.png", sizes: "48x48", type: "image/png" },
    { url: "/icons/hb-v5-96.png", sizes: "96x96", type: "image/png" },
    { url: "/icons/hb-v5-192.png", sizes: "192x192", type: "image/png" },
    { url: "/icons/hb-v5-512.png", sizes: "512x512", type: "image/png" },
  ],
  shortcut: `/favicon.ico?v=${ICON_V}`,
  apple: [{ url: `/apple-touch-icon.png?v=${ICON_V}`, sizes: "180x180", type: "image/png" }],
};

export const metadata: Metadata = { icons, appleWebApp: { title: SHORT_NAME }, metadataBase: new URL(siteUrl()), title: { default: HOME_TITLE, template: `%s | ${SITE_NAME}` }, applicationName: SITE_NAME, description: "Launch tokens on Solana with highbar", alternates: { canonical: "/" }, verification: { google: "syHbY_gFWryCWUxLTg0P8H3L3X5ZUeM4Jpj8sEGIDpA" }, openGraph: { siteName: SITE_NAME, title: HOME_TITLE, description: "Launch tokens on Solana with highbar", url: "/", type: "website", images: [{ url: "/og/og-main.png?v=3", width: 1200, height: 630, alt: "highbar: Rise above the bar" }] }, twitter: { card: "summary_large_image", site: "@highbar_capital", title: HOME_TITLE, description: "Launch tokens on Solana with highbar", images: [{ url: "/og/og-main-twitter.png?v=3", width: 1200, height: 675, alt: "highbar: Rise above the bar" }] } };

// NETWORK / RPC_URL / REOWN_PROJECT_ID are read per request (runtime env), never inlined at build.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("hb-theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}` }} />
      </head>
      <body>
        <Providers reownProjectId={process.env.REOWN_PROJECT_ID} rpcUrl={process.env.RPC_URL} network={process.env.NETWORK}>
          <Sidebar />
          <main className="min-h-screen p-[14px] pb-[calc(80px+env(safe-area-inset-bottom))] md:ml-sidebar md:p-4 md:pb-4"><PageShell><MobileHeader />{children}</PageShell></main>
          <BottomNav />
          <ReferralCapture />
          <SearchLauncher />
        </Providers>
      </body>
    </html>
  );
}
