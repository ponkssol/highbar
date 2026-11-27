/** Which shell is served at the canonical app routes (`/`, `/launch`, `/token/…`).
 *  "classic" is the default: the current UI stays at those URLs and the new UI is at `/v2`.
 *  Set this to "v2" to promote the new UI. Canonical app URLs are rewritten to the new pages,
 *  so public links do not change. SEO pages (articles, docs, landing pages) stay on the classic shell.
 *  Roll back by setting it back to "classic". This is a code flag, not an environment variable. */
export const DEFAULT_UI = "classic" as "classic" | "v2";

const APP_EXACT = new Set(["/", "/launch", "/leaderboard", "/locks", "/portfolio", "/rewards", "/open-book", "/settings"]);

/** App routes that can switch shells. SEO and legal pages are not in this set. */
export function isAppRoute(path: string): boolean {
  if (APP_EXACT.has(path)) return true;
  if (/^\/token\/[^/]+$/.test(path)) return true;
  if (/^\/locks\/[^/]+$/.test(path)) return true;
  return false;
}

export function isV2Path(path: string): boolean {
  return path === "/v2" || path.startsWith("/v2/");
}

/** `/v2/launch` → `/launch`, `/v2` → `/`. Other paths are unchanged. */
export function canonicalPath(path: string): string {
  if (path === "/v2") return "/";
  if (path.startsWith("/v2/")) return path.slice(3) || "/";
  return path || "/";
}

/** True when this URL should render the new shell. Explicit `/v2` always does.
 *  After promotion, canonical app routes do too. */
export function isV2Shell(path: string): boolean {
  if (isV2Path(path)) return true;
  return DEFAULT_UI === "v2" && isAppRoute(path);
}

/** Href that stays on the new UI while it is a preview, and on the canonical path once it is the default. */
export function uiHref(canonical: string): string {
  const path = canonical.startsWith("/") ? canonical : `/${canonical}`;
  const base = path.split("?")[0] || "/";
  const query = path.includes("?") ? path.slice(path.indexOf("?")) : "";
  if (DEFAULT_UI === "v2") return path;
  const prefixed = base === "/" ? "/v2" : `/v2${base}`;
  return `${prefixed}${query}`;
}

/** Keep a programmatic navigation inside the UI the visitor is already using. */
export function hrefInCurrentUi(canonical: string): string {
  if (typeof window !== "undefined" && isV2Path(window.location.pathname)) return uiHref(canonical);
  return canonical;
}

/** Leave the preview and remember the classic UI for this browser. */
export function classicHref(canonical = "/"): string {
  const path = canonical.split("?")[0] || "/";
  return `${path === "/" ? "/" : path}?ui=classic`;
}

export function sectionOf(path: string): string {
  const c = canonicalPath(path);
  if (c === "/" || c === "") return "home";
  if (c.startsWith("/token/")) return "token";
  if (c.startsWith("/launch")) return "launch";
  if (c.startsWith("/leaderboard")) return "leaderboard";
  if (c.startsWith("/locks")) return "locks";
  if (c.startsWith("/portfolio")) return "portfolio";
  if (c.startsWith("/rewards")) return "rewards";
  if (c.startsWith("/private")) return "private";
  if (c.startsWith("/open-book")) return "open-book";
  if (c.startsWith("/guides") || c.startsWith("/articles") || c.startsWith("/solana-launchpad") || c.startsWith("/pump-fun-alternative") || c.startsWith("/launch-a-memecoin") || c.startsWith("/anti-sniper-launch") || c.startsWith("/trade-solana-from-x") || c === "/privacy" || c === "/terms") return "guides";
  if (c.startsWith("/docs")) return "docs";
  if (c.startsWith("/settings")) return "settings";
  return "home";
}

export const SECTION_TITLE: Record<string, string> = {
  home: "Dashboard",
  token: "Token",
  launch: "Launch a token",
  leaderboard: "Leaderboard",
  locks: "Dev token locks",
  portfolio: "Portfolio",
  rewards: "Rewards",
  private: "Private send",
  "open-book": "Open Book",
  guides: "Guides",
  docs: "Documentation",
  settings: "Settings",
};
