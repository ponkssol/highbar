import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/Sidebar";
import { PageShell } from "@/components/PageShell";
import { BottomNav } from "@/components/BottomNav";
import { MobileHeader } from "@/components/MobileHeader";
import { ReferralCapture } from "@/components/ReferralCapture";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = { metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"), title: "highbar", applicationName: "highbar", description: "Launch tokens on Solana with highbar", openGraph: { siteName: "highbar", title: "highbar", description: "Launch tokens on Solana with highbar", type: "website" }, twitter: { card: "summary_large_image", title: "highbar" } };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("hb-theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}` }} />
      </head>
      <body>
        <Providers reownProjectId={process.env.REOWN_PROJECT_ID} rpcUrl={process.env.RPC_URL}>
          <Sidebar />
          <main className="min-h-screen p-[14px] pb-[calc(80px+env(safe-area-inset-bottom))] md:ml-sidebar md:p-4 md:pb-4"><PageShell><MobileHeader />{children}</PageShell></main>
          <BottomNav />
          <ReferralCapture />
        </Providers>
      </body>
    </html>
  );
}
