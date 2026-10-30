"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { TokenLogo } from "@/components/TokenLogo";
import { shortAddr } from "@/lib/format";
import { explorerAddr, explorerTx } from "@/lib/settings";
import { clearPendingLaunch, loadPendingLaunch, type PendingLaunch } from "@/lib/pendingLaunch";

/** Fast checks while the indexer is most likely to pick the pool up, then slower ones. It never stops on its own: after
 *  SLOW_NOTICE_MS it says so and keeps checking every LATE_MS. */
const FAST_MS = 2000, FAST_FOR_MS = 60_000, SLOW_MS = 5000, SLOW_NOTICE_MS = 5 * 60_000, LATE_MS = 15_000;

type Pending = "indexed" | "pending" | "unknown" | "retry";
/** GET /tokens/:mint/pending through the same-origin proxy (db first, the API caches the on-chain check per mint). */
async function check(mint: string): Promise<Pending> {
  try {
    const r = await fetch(`/hb-api/tokens/${mint}/pending`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!r.ok) return "retry";
    const s = ((await r.json()) as { status?: unknown }).status;
    return s === "indexed" || s === "pending" || s === "unknown" ? s : "retry";
  } catch { return "retry"; }
}

/** Shown on /token/<mint> while the API has no row for a mint that is on-chain: right after a launch (?new=1), and on any other
 *  visit the pending check lets through (shared link, refresh, other visitors). No 404, no blocking. Uses what the launch page
 *  saved in this tab (name, ticker, logo, tx) when there is any, else the mint. Polls until the token is indexed, then loads the
 *  full page on the clean URL. "unknown" (no pool of ours on-chain) hands back to the server, which renders the 404, except right
 *  after a launch (`fresh`), where an RPC node may still lag a moment behind. */
export function TokenPending({ mint, fresh = false }: { mint: string; fresh?: boolean }) {
  const router = useRouter();
  const [p, setP] = useState<PendingLaunch | null>(null);
  const [slow, setSlow] = useState(false);
  useEffect(() => { setP(loadPendingLaunch(mint)); }, [mint]);
  useEffect(() => {
    const since = Date.now(), launched = fresh || !!loadPendingLaunch(mint);
    let alive = true, t: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      const s = await check(mint);
      if (!alive) return;
      if (s === "indexed") {
        clearPendingLaunch(mint);
        if (window.location.pathname === `/token/${mint}` && !window.location.search) router.refresh();
        else router.replace(`/token/${mint}`);
      } else if (s === "unknown" && !launched) router.refresh(); // the server decides (404), this keeps checking meanwhile
      const age = Date.now() - since;
      if (age > SLOW_NOTICE_MS) setSlow(true);
      t = setTimeout(run, age < FAST_FOR_MS ? FAST_MS : age < SLOW_NOTICE_MS ? SLOW_MS : LATE_MS);
    };
    t = setTimeout(run, FAST_MS);
    return () => { alive = false; if (t) clearTimeout(t); };
  }, [mint, fresh, router]);

  const name = p?.name || shortAddr(mint);
  return (
    <div className="rounded-lg border border-border bg-surface p-6 shadow-card" data-testid="token-pending">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ArrowLeft size={14} />All tokens</Link>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <TokenLogo src={p?.image || null} name={p?.symbol || name} size={48} radius={12} />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{name}{p?.symbol ? <span className="num ml-2 text-ink-3">${p.symbol}</span> : null}</h1>
          <a href={explorerAddr(mint)} target="_blank" rel="noreferrer" className="num text-xs text-ink-3 hover:text-ink">{shortAddr(mint, 6)}</a>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-3" role="status" aria-live="polite">
        <Loader2 size={18} className="animate-spin text-ink-3" aria-hidden />
        {slow ? (
          <div>
            <h2 className="text-lg font-semibold">Still indexing</h2>
            <p className="text-sm text-ink-3">{p ? "Your token" : "This token"} is on-chain, but highbar has not picked it up yet. This page keeps checking and updates by itself.</p>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold">{p ? "Indexing your token…" : "Indexing this token…"}</h2>
            <p className="text-sm text-ink-3">{p ? "The launch is confirmed on Solana." : "This token was just launched on Solana."} Price, chart and trades show here as soon as highbar indexes it, usually within a minute.</p>
          </div>
        )}
      </div>
      {p?.signature && <a href={explorerTx(p.signature)} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-10 items-center rounded border border-border px-4 text-sm hover:bg-muted">View transaction</a>}
    </div>
  );
}
