import type { TierId } from "@hb/shared";

/** Production API. A dev build can point elsewhere with the build-time define __HB_API_BASE__ (HB_API_BASE when running the build), never from the UI. */
export const PROD_API = "https://api-production-810c.up.railway.app";
declare const __HB_API_BASE__: string | undefined;
export const API_BASE: string = typeof __HB_API_BASE__ === "string" && __HB_API_BASE__ ? __HB_API_BASE__ : PROD_API;
export const DEFAULT_SITE = "https://highbar.capital";
/** Tiers a launch may use from the extension: all three. The API still applies its Max gate ($HIGHER holders once $HIGHER exists). */
export type LaunchTier = TierId;
export const LAUNCH_TIERS: readonly LaunchTier[] = ["standard", "higher", "max"];
export const TIER_LABEL: Record<LaunchTier, string> = { standard: "Standard", higher: "Higher", max: "Max" };

export interface Presets {
  tier: LaunchTier;
  /** Off by default. On only once the user turned it on (antiSniperChosen), so an old stored default of on reads as off. */
  antiSniper: boolean;
  antiSniperChosen: boolean;
  /** Creator buy in the launch tx (Block 0). No extension cap: the API caps it at the tier threshold and 20 SOL. */
  devBuySol: number;
  slippageBps: number;
  /** Used when the tweet has no text, or always when useTweetText is off. */
  description: string;
  useTweetText: boolean;
  /** Referrer wallet bound once with POST /referrals (wallet sign-in). Empty = none. */
  referrer: string;
  /** One click launch from the tweet button with these presets, no review step. Opt in. */
  instant: boolean;
}

export interface Settings {
  /** Optional own RPC endpoint. Empty = the highbar server RPC (the API's /rpc proxy, whose upstream URL never leaves the server). */
  rpcUrl: string;
  presets: Presets;
  /** The user confirmed they use a dedicated launch wallet. */
  dedicatedAck: boolean;
  /** Token detection on x.com: a small button under the name row of tweets that mention a Solana token (CA, link or cashtag). On by default. */
  caDetect: boolean;
  /** Trade and launch sounds (Web Audio, in the page where the user acted). On by default. */
  sound: boolean;
  /** Their volume, 0 to 1. */
  soundVol: number;
}

export const DEFAULT_PRESETS: Presets = { tier: "standard", antiSniper: false, antiSniperChosen: false, devBuySol: 0, slippageBps: 100, description: "", useTweetText: true, referrer: "", instant: false };
export const DEFAULT_SETTINGS: Settings = { rpcUrl: "", presets: DEFAULT_PRESETS, dedicatedAck: false, caDetect: true, sound: true, soundVol: 0.5 };

const httpsUrl = (s: string) => { try { const u = new URL(s); return u.protocol === "https:" || (u.protocol === "http:" && /^(localhost|127\.0\.0\.1)$/.test(u.hostname)); } catch { return false; } };

/** Fills defaults and drops anything out of range, so a bad stored value can never reach a request. */
export function normalizeSettings(s: Partial<Settings> | undefined): Settings {
  const p: Partial<Presets> = s?.presets ?? {};
  const dev = Number(p.devBuySol);
  const slip = Number(p.slippageBps);
  return {
    rpcUrl: cleanRpcUrl(s?.rpcUrl) ?? "",
    dedicatedAck: !!s?.dedicatedAck,
    caDetect: s?.caDetect !== false,
    sound: s?.sound !== false,
    soundVol: Number.isFinite(Number(s?.soundVol)) && Number(s?.soundVol) >= 0 && Number(s?.soundVol) <= 1 ? Math.round(Number(s?.soundVol) * 100) / 100 : 0.5,
    presets: {
      tier: LAUNCH_TIERS.includes(p.tier as LaunchTier) ? (p.tier as LaunchTier) : "standard",
      antiSniper: p.antiSniperChosen === true ? p.antiSniper === true : false,
      antiSniperChosen: p.antiSniperChosen === true,
      devBuySol: Number.isFinite(dev) && dev >= 0 ? Math.round(dev * 1e9) / 1e9 : 0,
      slippageBps: Number.isInteger(slip) && slip >= 0 && slip <= 5000 ? slip : DEFAULT_PRESETS.slippageBps,
      description: typeof p.description === "string" ? p.description.slice(0, 1000) : "",
      useTweetText: p.useTweetText ?? true,
      referrer: typeof p.referrer === "string" ? p.referrer.trim() : "",
      instant: !!p.instant,
    },
  };
}
export const isHttpsUrl = httpsUrl;

/** A custom RPC URL as stored, or null when it is not usable: https only (http just for localhost), no credentials in the URL, at most 300 chars. */
export function cleanRpcUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t || t.length > 300 || !httpsUrl(t)) return null;
  const u = new URL(t);
  if (u.username || u.password) return null;
  return u.toString();
}
/** Where reads and sends go: the custom RPC when set, else the API's /rpc proxy. */
export const rpcEndpoint = (s: Pick<Settings, "rpcUrl">, apiBase = API_BASE) => s.rpcUrl || `${apiBase}/rpc`;
