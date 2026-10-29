"use client";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { createAppKit, type AppKit } from "@reown/appkit/react";
import { SolanaAdapter } from "@reown/appkit-adapter-solana/react";
import { solana, solanaDevnet } from "@reown/appkit/networks";

// Node 25 exposes localStorage without a file path. Reading it during SSR warns.
if (typeof window === "undefined") {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    },
  });
}

const WalletReady = createContext(false);
export const useWalletReady = () => useContext(WalletReady);
export const getAppKitModal = () => modal;

let modal: AppKit | undefined;
const isDark = () => typeof document !== "undefined" && document.documentElement.classList.contains("dark");
const themeVars = () => ({
  "--w3m-accent": isDark() ? "#F2F2EC" : "#0E0E0E",
  "--w3m-border-radius-master": "3px",
  "--w3m-font-family": "var(--font-inter), Inter, system-ui, sans-serif",
});

function initAppKit(projectId: string) {
  if (modal || typeof window === "undefined") return;
  modal = createAppKit({
    adapters: [new SolanaAdapter()],
    networks: [solanaDevnet, solana],
    defaultNetwork: solanaDevnet,
    projectId,
    metadata: { name: "Higher Bar", description: "Launch tokens on Solana with Higher Bar", url: window.location.origin, icons: [] },
    themeMode: isDark() ? "dark" : "light",
    themeVariables: themeVars(),
    features: { analytics: false, email: false, socials: false },
  });
}

export function Providers({ children, reownProjectId }: { children: ReactNode; reownProjectId?: string }) {
  const ready = !!reownProjectId;
  if (ready) initAppKit(reownProjectId!);

  useEffect(() => {
    if (!ready) { console.warn("[Higher Bar] REOWN_PROJECT_ID is not set; wallet connect disabled. Get one at https://cloud.reown.com"); return; }
    const sync = () => { modal?.setThemeMode(isDark() ? "dark" : "light"); modal?.setThemeVariables(themeVars()); };
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, [ready]);

  return <WalletReady.Provider value={ready}>{children}</WalletReady.Provider>;
}