"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { TokenLogo } from "@/components/TokenLogo";
import { shortAddr } from "@/lib/format";
import { explorerAddr, explorerTx } from "@/lib/settings";
import { clearPendingLaunch, loadPendingLaunch, type PendingLaunch } from "@/lib/pendingLaunch";

/** Fast checks while the indexer is most likely to pick the pool up, then slower ones, then a manual retry. */
const FAST_MS = 1500, FAST_FOR_MS = 60_000, SLOW_MS = 5000, GIVE_UP_MS = 5 * 60_000;

/** Shown on /token/<mint>?new=1 right after a launch confirms, until the API has indexed the mint (no 404, no blocking).
 *  Uses what the launch page saved (name, ticker, logo, tx) and polls GET /tokens/:mint from the browser, then swaps to the full page. */
export function TokenPending({ mint }: { mint: string }) {
  const router = useRouter();
  const [p, setP] = useState<PendingLaunch | null>(null);
  const [since, setSince] = useState(() => Date.now());
  const [done, setDone] = useState(false);
  useEffect(() => { setP(loadPendingLaunch(mint)); }, [mint]);
  useEffect(() => {
    if (done) return;
    let alive = true, t: ReturnType<typeof setTimeout> | undefined;
    const check = async () => {
      const ok = await api.token(mint).then(() => true).catch(() => false);
      if (!alive) return;
      if (ok) { clearPendingLaunch(mint); router.replace(`/token/${mint}`); return; }
      const age = Date.now() - since;
      if (age > GIVE_UP_MS) { setDone(true); return; }
      t = setTimeout(check, age < FAST_FOR_MS ? FAST_MS : SLOW_MS);
    };
    void check();
    return () => { alive = false; if (t) clearTimeout(t); };
  }, [mint, since, done, router]);

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
      {done ? (
        <div className="mt-6" role="status">
          <h2 className="text-lg font-semibold">Still indexing</h2>
          <p className="mt-1 text-sm text-ink-3">Your token is on-chain, but highbar has not picked it up yet. Check again in a moment.</p>
          <button type="button" onClick={() => { setDone(false); setSince(Date.now()); }} className="mt-4 inline-flex h-10 items-center rounded border border-border px-4 text-sm hover:bg-muted">Check again</button>
        </div>
      ) : (
        <div className="mt-6 flex items-center gap-3" role="status" aria-live="polite">
          <Loader2 size={18} className="animate-spin text-ink-3" aria-hidden />
          <div>
            <h2 className="text-lg font-semibold">Indexing your token…</h2>
            <p className="text-sm text-ink-3">The launch is confirmed on Solana. Price, chart and trades show here as soon as highbar indexes it, usually within a minute.</p>
          </div>
        </div>
      )}
      {p?.signature && <a href={explorerTx(p.signature)} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-10 items-center rounded border border-border px-4 text-sm hover:bg-muted">View transaction</a>}
    </div>
  );
}
