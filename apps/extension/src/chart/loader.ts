/** chart.html: the CA popup's chart, an extension page (x.com's CSP blocks third-party frames on its own pages).
 *  Primary: GMGN's official realtime chart embed (lib/gmgn.ts), dark theme and interval by URL param, the toolbars around the
 *  plot clipped by an offset frame; GMGN's watermark, legend and the TradingView logo inside the plot stay visible.
 *  Fallback: highbar's own chart (chart-native.js, bundled lightweight-charts, 1 s candles with gap fill) when gmgn.cc is
 *  unreachable (blocked, offline, filter list) or the frame does not load within 8 s, or with ?native=1.
 *  Only a base58 mint gets through, so the frame cannot be pointed anywhere else; no remote code runs in this page. */
import { GMGN_CLIP, GMGN_SCALE, gmgnFrameStyle, gmgnUrl } from "../lib/gmgn";

const q = new URLSearchParams(location.search);
const mint = q.get("mint") ?? "", pf = q.get("pf") === "1", hb = q.get("hb") === "1";
const box = document.getElementById("c")!, bar = document.getElementById("bar")!, msg = document.getElementById("msg")!;
const LOAD_MS = 8000;

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

function gmgn(url: string) {
  document.body.classList.add("gm"); document.body.dataset.chart = "gmgn"; document.body.dataset.source = "gmgn";
  bar.hidden = true; msg.textContent = "Loading chart…"; msg.hidden = false;
  const f = document.createElement("iframe");
  f.title = "Price chart (GMGN)"; f.referrerPolicy = "no-referrer";
  f.setAttribute("style", gmgnFrameStyle(GMGN_CLIP, GMGN_SCALE));
  // the embed needs its own scripts and origin; it may open gmgn links in a new tab, never navigate this page
  f.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox");
  let loaded = false;
  f.addEventListener("load", () => { loaded = true; if (!fellBack) msg.hidden = true; document.body.dataset.loaded = "1"; });
  const t = setTimeout(() => { if (!loaded) native("gmgn: no answer in 8 s"); }, LOAD_MS);
  // a blocked or offline gmgn.cc (network error, filter list) rejects this probe: no error page in the popup, our chart instead
  fetch(url, { mode: "no-cors", credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer" })
    .catch(() => { clearTimeout(t); native("gmgn: unreachable"); });
  f.src = url;
  box.replaceChildren(f);
}

const url = gmgnUrl(mint, (pf || mint.endsWith("pump")) && !hb ? "1S" : "1");
if (!url) { msg.textContent = "No chart for this token"; bar.hidden = true; }
else if (q.get("native") === "1") native("native requested");
else gmgn(url);
