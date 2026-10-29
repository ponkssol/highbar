"use client";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { createAppKit, type AppKit } from "@reown/appkit/react";
import { SolanaAdapter } from "@reown/appkit-adapter-solana/react";
import { solana, solanaDevnet } from "@reown/appkit/networks";
import { AuthProvider } from "@/lib/auth";

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
const RpcUrl = createContext<string | undefined>(undefined);
export const useRpcUrl = () => useContext(RpcUrl);

let modal: AppKit | undefined;
const isDark = () => typeof document !== "undefined" && document.documentElement.classList.contains("dark");
const themeVars = () => ({
  "--w3m-accent": isDark() ? "#F2F2EC" : "#0E0E0E",
  "--w3m-border-radius-master": "2px",
  "--w3m-font-size-master": "9px",
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

export function Providers({ children, reownProjectId, rpcUrl }: { children: ReactNode; reownProjectId?: string; rpcUrl?: string }) {
  const ready = !!reownProjectId;
  if (ready) initAppKit(reownProjectId!);

  // Re-apply the saved theme after hydration (e.g. the 404 boundary re-renders <html> and drops the class set by the head script).
  useEffect(() => {
    try { const t = localStorage.getItem("hb-theme"); const dark = t === "dark" || (!t && matchMedia("(prefers-color-scheme: dark)").matches); document.documentElement.classList.toggle("dark", dark); } catch {}
  }, []);
  useEffect(() => {
    if (!ready) { console.warn("[Higher Bar] REOWN_PROJECT_ID is not set; wallet connect disabled. Get one at https://cloud.reown.com"); return; }
    const sync = () => { modal?.setThemeMode(isDark() ? "dark" : "light"); modal?.setThemeVariables(themeVars()); };
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, [ready]);

  return <RpcUrl.Provider value={rpcUrl}><WalletReady.Provider value={ready}><AuthProvider>{children}</AuthProvider></WalletReady.Provider></RpcUrl.Provider>;
}