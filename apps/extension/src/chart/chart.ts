/** chart.html: the CA popup's chart frame. x.com's CSP (frame-src) blocks third party frames, an extension page is allowed, so
 *  the popup frames this page and this page frames the GeckoTerminal embed for one Solana pool. Only a base58 pool address
 *  gets through, so the page cannot be pointed anywhere else. */
import { chartEmbedUrl, isPubkey } from "../lib/ca";

const q = new URLSearchParams(location.search);
const pool = q.get("pool") ?? "";
const theme = q.get("theme") === "light" ? "light" : "dark";
const res = ["1m", "5m", "15m", "1h", "4h", "1d"].includes(q.get("res") ?? "") ? q.get("res")! : "15m";
document.documentElement.style.background = theme === "light" ? "#fff" : "#111";
const box = document.getElementById("c")!;
if (!isPubkey(pool)) box.textContent = "No chart for this token";
else {
  const f = document.createElement("iframe");
  f.src = chartEmbedUrl(pool, theme, res);
  f.title = "Price chart";
  f.referrerPolicy = "no-referrer";
  f.allow = "clipboard-write";
  box.replaceChildren(f);
}
