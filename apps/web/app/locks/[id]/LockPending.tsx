"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

const TRIES = 10;
const EVERY_MS = 2000;

/** Shown when a lock escrow is not readable yet (a just-created lock can lag a few seconds behind the RPC).
 *  Re-renders the server page every 2s, then gives up with a not found message. */
export function LockPending() {
  const router = useRouter();
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (tries >= TRIES) return;
    const t = setTimeout(() => { router.refresh(); setTries((n) => n + 1); }, EVERY_MS);
    return () => clearTimeout(t);
  }, [tries, router]);
  const done = tries >= TRIES;
  return (
    <div className="rounded-lg border border-border bg-surface p-6 shadow-card" data-testid="lock-pending">
      <Link href="/locks" className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ArrowLeft size={14} />All locks</Link>
      {done ? (
        <div className="mt-4">
          <h2 className="text-lg font-semibold">Lock not found</h2>
          <p className="mt-1 text-sm text-ink-3">This lock could not be loaded. If you just created it, try again in a moment.</p>
          <button type="button" onClick={() => setTries(0)} className="mt-4 inline-flex h-10 items-center rounded border border-border px-4 text-sm hover:bg-muted">Try again</button>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-3">
          <Loader2 size={18} className="animate-spin text-ink-3" />
          <div>
            <h2 className="text-lg font-semibold">Confirming your lock</h2>
            <p className="text-sm text-ink-3">The lock is on-chain and will show here in a few seconds.</p>
          </div>
        </div>
      )}
    </div>
  );
}
