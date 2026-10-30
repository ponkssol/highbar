import type { Metadata } from "next";
import { Cinzel, EB_Garamond, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/Sidebar";
import { PageShell } from "@/components/PageShell";
import { BottomNav } from "@/components/BottomNav";
import { MobileHeader } from "@/components/MobileHeader";
import { ReferralCapture } from "@/components/ReferralCapture";
import { SearchLauncher } from "@/components/search/SearchLauncher";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
// Arena display face (SIL OFL 1.1), self-hosted by next/font at build time: Cinzel for headings and rank numerals only.
const display = Cinzel({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });
// Lead text face (SIL OFL 1.1): EB Garamond for banner intros only. Numbers, prices and addresses stay in Inter or JetBrains Mono.
const serif = EB_Garamond({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-serif" });

export const metadata: Metadata = { metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"), title: "highbar", applicationName: "highbar", description: "Launch tokens on Solana with highbar", openGraph: { siteName: "highbar", title: "highbar", description: "Launch tokens on Solana with highbar", type: "website", images: [{ url: "https://highbar.capital/og/og-main.png", width: 1200, height: 630, alt: "highbar: Rise above the bar" }] }, twitter: { card: "summary_large_image", title: "highbar", images: [{ url: "https://highbar.capital/og/og-main-twitter.png", width: 1200, height: 675, alt: "highbar: Rise above the bar" }] } };

// NETWORK / RPC_URL / REOWN_PROJECT_ID are read per request (runtime env), never inlined at build.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} ${display.variable} ${serif.variable}`} suppressHydrationWarning>
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
