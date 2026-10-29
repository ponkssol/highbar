"use client";
import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";
export type PriorityFee = "none" | "low" | "high";
export type Explorer = "solscan" | "solana" | "solanafm";
export interface Settings { theme: Theme; slippagePct: number; priorityFee: PriorityFee; explorer: Explorer }

export const DEFAULT_SETTINGS: Settings = { theme: "system", slippagePct: 1, priorityFee: "none", explorer: "solscan" };
const KEY = "hb-settings";
/** micro-lamports per CU for each preset (for later use in tx builders) */
export const PRIORITY_MICROLAMPORTS: Record<PriorityFee, number> = { none: 0, low: 10_000, high: 200_000 };

export function getSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return DEFAULT_SETTINGS; }
}

export function applyTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  try { localStorage.setItem("hb-theme", theme === "system" ? (dark ? "dark" : "light") : theme); } catch {}
}

export function useSettings() {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  useEffect(() => setS(getSettings()), []);
  const update = useCallback((patch: Partial<Settings>) => {
    setS((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      if (patch.theme) applyTheme(patch.theme);
      return next;
    });
  }, []);
  return [s, update] as const;
}

export function explorerTx(sig: string, ex: Explorer = getSettings().explorer) {
  if (ex === "solana") return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
  if (ex === "solanafm") return `https://solana.fm/tx/${sig}?cluster=devnet-solana`;
  return `https://solscan.io/tx/${sig}?cluster=devnet`;
}
export function explorerAddr(a: string, ex: Explorer = getSettings().explorer) {
  if (ex === "solana") return `https://explorer.solana.com/address/${a}?cluster=devnet`;
  if (ex === "solanafm") return `https://solana.fm/address/${a}?cluster=devnet-solana`;
  return `https://solscan.io/account/${a}?cluster=devnet`;
}