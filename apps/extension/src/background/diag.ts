/** Settings > Diagnostics: one request to each market data source from the worker (exactly how the popup fetches), with the
 *  HTTP status, time and what went wrong, so a screenshot tells which source is blocked on that machine. Read-only GETs. */
import type { DiagResult } from "../lib/messages";
import { pumpCandlesUrl } from "../lib/candles";
import { JUP_PRICE } from "./candles";
import { DEXS_TOKENS, GT_POOLS } from "./ca";

/** A long lived pump.fun coin, so every check has data. */
const PROBE_MINT = "CEMEy7jkeytkxq3qYjaKyQnKiUdHAMJDM1B1tv2Upump";

async function probe(name: string, url: string, check: (j: unknown) => string | null): Promise<DiagResult> {
  const t = performance.now();
  try {
    const r = await fetch(url, { credentials: "omit", headers: { accept: "application/json" }, cache: "no-store" });
    const ms = Math.round(performance.now() - t), cf = r.headers.get("cf-mitigated"), ct = r.headers.get("content-type") ?? "";
    if (!r.ok) return { name, url, ok: false, status: r.status, ms, note: cf ? `Cloudflare ${cf}` : ct.includes("html") ? "HTML page (Cloudflare?)" : `HTTP ${r.status}` };
    const bad = check(await r.json());
    return { name, url, ok: !bad, status: r.status, ms, note: bad ?? "OK" };
  } catch (e) {
    return { name, url, ok: false, status: null, ms: Math.round(performance.now() - t), note: e instanceof TypeError ? "Failed to fetch (blocked: network, CORS or no host permission)" : String((e as Error).message) };
  }
}

export async function diagSources(): Promise<DiagResult[]> {
  const granted = await chrome.permissions.contains({ origins: ["https://frontend-api-v3.pump.fun/*"] }).catch(() => false);
  const list = await Promise.all([
    probe("pump.fun candles (1s)", pumpCandlesUrl(PROBE_MINT, "1s", 2), (j) => (Array.isArray((j as { candles?: unknown })?.candles) ? null : "unexpected answer")),
    probe("Jupiter price", `${JUP_PRICE}?ids=${PROBE_MINT}`, (j) => ((j as Record<string, { usdPrice?: number }>)?.[PROBE_MINT]?.usdPrice ? null : "no price")),
    probe("DexScreener", `${DEXS_TOKENS}/${PROBE_MINT}`, (j) => (Array.isArray(j) && j.length ? null : "no pairs")),
    probe("GeckoTerminal", `${GT_POOLS}/${PROBE_MINT}/pools?page=1`, (j) => ((j as { data?: unknown })?.data ? null : "unexpected answer")),
  ]);
  list[0].note += granted ? "" : " · host permission NOT granted (reload the extension)";
  // the last CA popup trade with its route and the full error: the toasts never show either
  const t = (await chrome.storage.session.get("hb.lastTrade").catch(() => ({})) as Record<string, { at: number; side: string; route: string | null; ok: boolean; note: string } | undefined>)["hb.lastTrade"];
  if (t) list.push({ name: `Last trade (${t.side}${t.route ? `, ${t.route}` : ""})`, url: "", ok: t.ok, status: null, ms: 0, note: `${new Date(t.at).toLocaleTimeString()} · ${t.note}`.slice(0, 240) });
  return list;
}
