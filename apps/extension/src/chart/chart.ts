/** chart.html: the CA popup's chart, an extension page (x.com's CSP blocks third-party frames on its own pages).
 *  First choice is GMGN's official price chart embed (https://docs.gmgn.ai/index/cooperation-api-integrate-gmgn-price-chart:
 *  "Feel free to integrate GMGN instant price chart on your project website"): https://www.gmgn.cc/kline/sol/<mint>, served
 *  without X-Frame-Options or frame-ancestors, realtime, with GMGN's own branding inside the frame. If GMGN cannot be reached
 *  or the frame does not load in time, this page loads highbar's own chart (chart-native.js, bundled lightweight-charts) instead.
 *  Only a base58 mint gets through, so the frame cannot be pointed anywhere else; no remote code runs in this page. */
import { gmgnUrl, isPubkey } from "../lib/ca";

const q = new URLSearchParams(location.search);
const mint = q.get("mint") ?? "", pf = q.get("pf") === "1";
const box = document.getElementById("c")!, bar = document.getElementById("bar")!, msg = document.getElementById("msg")!;

let fellBack = false;
function native(reason: string) {
  if (fellBack) return;
  fellBack = true;
  document.body.dataset.fallback = reason;
  document.body.classList.remove("gm");
  box.replaceChildren();
  bar.hidden = false; msg.textContent = "Loading chart…"; msg.hidden = false;
  const s = document.createElement("script");
  s.src = "chart-native.js";
  document.body.append(s);
}

function gmgn() {
  document.body.classList.add("gm"); document.body.dataset.chart = "gmgn"; document.body.dataset.source = "gmgn";
  bar.hidden = true; msg.textContent = "Loading chart…"; msg.hidden = false;
  const url = gmgnUrl(mint, pf || mint.endsWith("pump"))!;
  const f = document.createElement("iframe");
  f.title = "Price chart (GMGN)"; f.referrerPolicy = "no-referrer";
  // the embed needs its own scripts and origin; it may open gmgn links in a new tab, never navigate this page
  f.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox");
  let loaded = false;
  f.addEventListener("load", () => { loaded = true; if (!fellBack) msg.hidden = true; document.body.dataset.loaded = "1"; });
  const t = setTimeout(() => { if (!loaded) native("gmgn: no answer in 10 s"); }, 10_000);
  // a blocked or offline gmgn.cc (network error, filter list) rejects this probe: no error page in the popup, our chart instead
  fetch(url, { mode: "no-cors", credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer" })
    .catch(() => { clearTimeout(t); native("gmgn: unreachable"); });
  f.src = url;
  box.replaceChildren(f);
}

if (!isPubkey(mint)) { msg.textContent = "No chart for this token"; bar.hidden = true; }
else if (q.get("native") === "1") native("native requested");
else gmgn();
