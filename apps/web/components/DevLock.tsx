"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PublicKey } from "@solana/web3.js";
import { AlertTriangle, Lock, Unlock, X } from "lucide-react";
import { useHbWallet } from "@/lib/wallet";
import { api } from "@/lib/api";
import { DevLockedBadge } from "./DevLockedBadge";
import { buildClaimLockTx, buildLockTx, toUi, type LocksResp } from "@/lib/lock";
import { NETWORK } from "@/lib/settings";
import { shortAddr } from "@/lib/format";

const input = "h-10 w-full rounded border border-border bg-surface px-3 text-sm outline-none focus:border-ink";
const fmtDate = (s: number) => new Date(s * 1000).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const fmtTok = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const fmtLeft = (s: number) => { const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m ${Math.max(0, s % 60)}s`; };
type LockRow = LocksResp["locks"][number];
const lockStatus = (l: LockRow, now: number) => Number(l.claimable) > 0 ? "Claimable" : now < l.cliffTime ? "Locked" : Number(l.locked) > 0 ? "Vesting" : "Fully claimed";
/** Lock duration quick picks (days). The lock is time based: no cliff or vesting options in the form. */
const DURATIONS = [7, 30, 90, 180, 365] as const;
const MAX_DAYS = 3650;
const fmtDay = (s: number) => new Date(s * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
/** Share of supply with a leading zero (0.5, 12.34). Tiny shares read "under 0.01". */
const fmtShare = (p: number) => (p > 0 && p < 0.01 ? "under 0.01" : p.toLocaleString("en-US", { minimumIntegerDigits: 1, maximumFractionDigits: 2 }));

/** Token header pill: live countdown to the latest cliff among active locks (same rule as the API's unlockAt). */
export function LockedBadge({ data }: { data: LocksResp | null }) {
  if (!data || !(data.lockedTokens > 0)) return null;
  const at = Math.max(...data.locks.filter((l) => Number(l.locked) > 0).map((l) => l.cliffTime));
  return <span data-testid="locked-badge" title={`${fmtTok(data.lockedTokens)} dev tokens locked via Jupiter Lock`}><DevLockedBadge devLocked unlockAt={Number.isFinite(at) ? at : null} size="md" /></span>;
}

type LockProps = { mint: string; ticker: string; creator: string; data: LocksResp | null; reload: () => void };

/** Same creator check everywhere: the connected wallet is the token's creator. */
export function useIsCreator(creator: string) {
  const { publicKey } = useHbWallet();
  return !!publicKey && publicKey.toBase58() === creator;
}

/** Lock schedule (everyone), lock form + claim (creator only).
 *  mode="view": read-only schedule for the token page tab. mode="form": creator actions with the form open (used in the Dev Lock modal). */
export function DevLock({ mint, ticker, creator, data, reload, mode = "full", onDone }: LockProps & { mode?: "full" | "view" | "form"; onDone?: () => void }) {
  const { publicKey, connection, sendTransaction } = useHbWallet();
  const isCreator = useIsCreator(creator) && mode !== "view";
  const [bal, setBal] = useState<number | null>(null);
  const [open, setOpen] = useState(mode === "form"); // the modal opens straight into the form, with the lock list and Claim above it
  const [amount, setAmount] = useState("");
  const [chipDays, setChipDays] = useState<number>(30);
  const [customDays, setCustomDays] = useState("");
  const [agree, setAgree] = useState(false);
  const [supply, setSupply] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!isCreator || !publicKey) { setBal(null); return; }
    let alive = true;
    connection.getParsedTokenAccountsByOwner(publicKey, { mint: new PublicKey(mint) })
      .then((r) => { if (!alive) return; const b = r.value.reduce((a, x) => a + (x.account.data.parsed.info.tokenAmount.uiAmount ?? 0), 0); setBal(b); setAmount((v) => v || String(b)); })
      .catch(() => alive && setBal(null));
    return () => { alive = false; };
  }, [isCreator, publicKey, connection, mint, data]);

  // Total supply for the percent-of-supply hint (read only). Unknown supply hides the hint.
  useEffect(() => {
    if (!isCreator) return;
    let alive = true;
    connection.getTokenSupply(new PublicKey(mint)).then((r) => { if (alive && r.value.uiAmount) setSupply(r.value.uiAmount); }).catch(() => {});
    return () => { alive = false; };
  }, [isCreator, connection, mint]);

  const locks = data?.locks ?? [];
  const [nowS, setNowS] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => { if (!isCreator || !locks.length) return; const id = setInterval(() => setNowS(Math.floor(Date.now() / 1000)), 1000); return () => clearInterval(id); }, [isCreator, locks.length]);
  // Next cliff still in the future among locks that still hold tokens (drives the disabled-claim countdown).
  const nextCliff = locks.filter((l) => Number(l.locked) > 0 && l.cliffTime > nowS).reduce<number | null>((m, l) => (m === null || l.cliffTime < m ? l.cliffTime : m), null);
  const claimable = data?.claimableTokens ?? 0;
  const amt = Number(amount) || 0;
  const days = customDays ? Number(customDays) : chipDays;
  const daysOk = Number.isInteger(days) && days >= 1 && days <= MAX_DAYS;
  // Days map to the same unlock timestamp the API already takes (unlockAt, unix seconds). No vesting: vestingDays stays 0.
  const unlockAtFor = (d: number) => Math.floor(Date.now() / 1000) + d * 86_400;
  const err = useMemo(() => {
    if (!(amt > 0)) return "Enter an amount to lock.";
    if (bal !== null && amt > bal) return "Amount exceeds your balance.";
    if (!(Number.isInteger(days) && days >= 1)) return "Pick a lock duration in whole days.";
    if (days > MAX_DAYS) return `A lock can last at most ${MAX_DAYS} days.`;
    if (!agree) return "Agree to the Terms and Conditions to lock.";
    return "";
  }, [amt, bal, days, agree]);

  const lock = async () => {
    if (!publicKey || err) return;
    setBusy(true); setMsg("");
    try {
      const r = await buildLockTx({ creator: publicKey.toBase58(), mint, amount: amt, unlockAt: unlockAtFor(days), vestingDays: 0 });
      const sig = await sendTransaction(r.transaction);
      await connection.confirmTransaction(sig, "confirmed");
      await api.confirmLock(r.escrow).catch(() => {});
      setMsg(`Locked. Tx ${sig.slice(0, 8)}`); setOpen(mode === "form"); setAgree(false); reload();
    } catch (e) { setMsg(`Lock failed: ${(e as Error).message}`); } finally { setBusy(false); }
  };
  const claim = async () => {
    if (!publicKey) return;
    setBusy(true); setMsg("");
    try {
      for (const l of locks.filter((x) => Number(x.claimable) > 0 && x.recipient === publicKey.toBase58())) {
        const sig = await sendTransaction(await buildClaimLockTx({ recipient: publicKey.toBase58(), escrow: l.escrow }));
        await connection.confirmTransaction(sig, "confirmed");
        setMsg(`Claimed. Tx ${sig.slice(0, 8)}`);
      }
      reload();
    } catch (e) { setMsg(`Claim failed: ${(e as Error).message}`); } finally { setBusy(false); }
  };

  if (mode === "view" && !locks.length) return <p className="py-6 text-sm text-ink-3" data-testid="dev-lock">No dev tokens locked for ${ticker} yet.</p>;
  if (mode === "full" && !locks.length && !(isCreator && (bal ?? 0) > 0)) return null;
  return (
    <div className={mode === "form" ? "" : "rounded-lg border border-border bg-surface p-4"} data-testid={mode === "form" ? "dev-lock-form" : "dev-lock"}>
      <div className="mb-2 flex items-center justify-between">
        {mode !== "form" && <h3 className="flex items-center gap-2 font-semibold"><Lock size={16} strokeWidth={1.5} />Dev token lock</h3>}
        {data && data.lockedTokens > 0 && <span className="num text-xs text-ink-3">{fmtTok(data.lockedTokens)} ${ticker} locked</span>}
      </div>
      {locks.length > 0 && (
        <ul className="text-sm">
          {locks.map((l) => (
            <li key={l.escrow} className="border-b border-border py-2 last:border-0">
              {isCreator && <div className="flex justify-between"><span className="text-ink-3">Status</span><span className="text-xs font-medium">{lockStatus(l, nowS)}</span></div>}
              <div className="flex justify-between"><span className="text-ink-3">Amount</span><span className="num">{fmtTok(toUi(l.total))} ${ticker}</span></div>
              <div className="flex justify-between"><span className="text-ink-3">Unlocks</span><span className="num">{fmtDate(l.cliffTime)}</span></div>
              {l.numberOfPeriod > 0 && <div className="flex justify-between"><span className="text-ink-3">Vesting</span><span className="num">{l.numberOfPeriod} x {Math.round(l.frequency / 3600) >= 24 ? `${Math.round(l.frequency / 86400)}d` : `${Math.round(l.frequency / 60)}m`}, ends {fmtDate(l.endTime).split(",")[0]}</span></div>}
              {isCreator && <div className="flex justify-between"><span className="text-ink-3">Claimable now</span><span className="num">{fmtTok(toUi(l.claimable))} ${ticker}</span></div>}
              <div className="flex justify-between"><span className="text-ink-3">Claimed / unlocked</span><span className="num">{fmtTok(toUi(l.claimed))} / {fmtTok(toUi(l.unlocked))}</span></div>
              <div className="flex justify-between"><span className="text-ink-3">Cancel or change recipient</span><span>None (permanent)</span></div>
              <div className="flex justify-between"><a href={`https://solscan.io/account/${l.escrow}${NETWORK === "mainnet" ? "" : "?cluster=devnet"}`} target="_blank" rel="noreferrer" className="num text-xs text-ink-3 hover:text-ink">Escrow {l.escrow.slice(0, 6)}...</a><Link href={`/locks/${l.escrow}`} className="text-xs font-medium hover:underline">Share lock</Link></div>
            </li>
          ))}
        </ul>
      )}
      {isCreator && (claimable > 0 || locks.length > 0) && (
        <button onClick={claim} disabled={busy || !(claimable > 0)} data-testid="claim-unlocked"
          title={claimable > 0 ? undefined : "Nothing unlocked yet"}
          className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded bg-ink text-sm font-medium text-on-ink hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
          <Unlock size={14} />{claimable > 0 ? `Claim unlocked (${fmtTok(claimable)} $${ticker})`
            : nextCliff ? `Claim unlocked (unlocks in ${fmtLeft(nextCliff - nowS)})` : "Claim unlocked (nothing to claim yet)"}
        </button>
      )}
      {isCreator && (bal ?? 0) > 0 && !open && (
        <button onClick={() => setOpen(true)} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded border border-border text-sm font-medium hover:bg-muted">
          <Lock size={14} />Lock dev tokens
        </button>
      )}
      {isCreator && open && (
        <div className="mt-4 space-y-4 border-t border-border pt-4" data-testid="lock-form">
          {publicKey && <div className="flex justify-between text-[13px]" data-testid="lock-recipient"><span className="text-ink-2">Recipient</span><span className="num text-ink">Your wallet {shortAddr(publicKey.toBase58())}</span></div>}
          <div>
            <span className="mb-1.5 block text-[13px] text-ink-2" id="lock-duration-label">Lock duration</span>
            <div className="grid grid-cols-5 gap-1.5" role="group" aria-labelledby="lock-duration-label">
              {DURATIONS.map((d) => {
                const on = !customDays && chipDays === d;
                return (
                  <button key={d} type="button" aria-pressed={on} data-testid={`lock-chip-${d}`} onClick={() => { setChipDays(d); setCustomDays(""); }}
                    className={`num h-9 rounded border text-[13px] transition-colors ${on ? "border-gold-line bg-gold-soft font-semibold text-gold-text" : "border-border text-ink-2 hover:bg-muted hover:text-ink"}`}>{d} days</button>
                );
              })}
            </div>
            <label className="mt-2 flex items-center gap-2">
              <span className="sr-only">Custom duration in days</span>
              <input className={`${input} num ${customDays ? "border-gold-line" : ""}`} inputMode="numeric" placeholder="Custom" value={customDays} data-testid="lock-custom-days"
                onChange={(e) => setCustomDays(e.target.value.replace(/[^0-9]/g, "").replace(/^0+/, ""))} />
              <span className="shrink-0 text-sm text-ink-3">days</span>
            </label>
          </div>
          <label className="block"><span className="mb-1.5 flex justify-between text-[13px] text-ink-2">Token amount<button type="button" onClick={() => setAmount(String(bal ?? 0))} className="num text-xs text-ink-3 hover:text-ink">Max {fmtTok(bal ?? 0)}</button></span>
            <input className={`${input} num`} inputMode="decimal" placeholder="0" value={amount} data-testid="lock-amount" onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, "").replace(/^\./, "0."))} />
            {supply != null && amt > 0 && <span className="num mt-1 block text-xs text-ink-3" data-testid="lock-supply-pct">{fmtShare((amt / supply) * 100)}% of supply</span>}
          </label>
          {amt > 0 && daysOk && <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-ink" data-testid="lock-summary">Locks <span className="num font-medium">{fmtTok(amt)} ${ticker}</span> until <span className="num font-medium">{fmtDay(unlockAtFor(days))}</span></p>}
          <p className="flex gap-2 text-xs text-ink-3"><AlertTriangle size={14} className="mt-px shrink-0" />Tokens stay locked until the unlock date. Nobody, including you, can withdraw them early or cancel the lock. Powered by Jupiter Lock.</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" required checked={agree} onChange={(e) => setAgree(e.target.checked)} data-testid="lock-agree" />
            <span>I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-gold-text underline-offset-4 hover:underline">Terms and Conditions</a></span>
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => (mode === "form" ? onDone?.() : setOpen(false))} className="h-10 flex-1 rounded border border-border text-sm hover:bg-muted">Cancel</button>
            <button type="button" onClick={lock} disabled={busy || !!err} title={err || undefined} data-testid="lock-submit" className="h-10 flex-1 rounded bg-ink text-sm font-medium text-on-ink hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">{busy ? "Locking..." : "Lock tokens"}</button>
          </div>
          <p className="text-xs text-ink-3" data-testid="lock-tip">Protocol tip: {data?.tipSol ?? 0.005} SOL</p>
          {err && <p className="text-xs text-ink-3">{err}</p>}
        </div>
      )}
      {mode === "form" && isCreator && bal !== null && bal <= 0 && claimable <= 0 && <p className="mt-3 text-sm text-ink-3">This wallet holds no ${ticker} to lock.</p>}
      {msg && <p className="mt-2 text-xs text-ink-2">{msg}</p>}
    </div>
  );
}
/** "Dev Lock" button for the token creator only (same check as DevLock); opens the lock form in a modal / mobile sheet. */
export function DevLockButton({ className = "", devLocked, unlockAt, ...p }: LockProps & { className?: string; devLocked?: boolean; unlockAt?: number | null }) {
  const isCreator = useIsCreator(p.creator);
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    window.addEventListener("keydown", key, true);
    const prevOverflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    panel.current?.focus();
    const btn = opener.current;
    return () => { window.removeEventListener("keydown", key, true); document.body.style.overflow = prevOverflow; btn?.focus(); };
  }, [open]);
  // Losing creator status (disconnect / account switch) closes the modal; it is never rendered for anyone else.
  useEffect(() => { if (!isCreator) setOpen(false); }, [isCreator]);
  if (!isCreator) {
    // Everyone else: a passive badge, and only when the token really has a dev lock.
    const fromLocks = p.data && p.data.lockedTokens > 0 ? Math.max(...p.data.locks.filter((l) => Number(l.locked) > 0).map((l) => l.cliffTime)) : NaN;
    const at = Number.isFinite(fromLocks) ? fromLocks : devLocked && unlockAt ? unlockAt : null;
    if (!at) return null;
    return (
      <div data-testid="dev-lock-label" className={`flex items-center justify-center ${className}`} title="The creator's dev tokens are locked">
        <DevLockedBadge devLocked unlockAt={at} size="md" />
      </div>
    );
  }
  return (
    <>
      <button ref={opener} type="button" onClick={() => setOpen(true)} data-testid="dev-lock-button" aria-haspopup="dialog"
        className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded border border-border bg-surface text-sm font-medium hover:bg-muted ${className}`}>
        <Lock size={15} strokeWidth={1.75} />Dev Lock
      </button>
      {/* Portal to <body>: inside the page the modal sat in the sticky trade column's stacking context, below the chart canvases (z-index 1 and 2). */}
      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true" aria-labelledby="dev-lock-title" data-testid="dev-lock-modal">
          <div className="hb-scrim absolute inset-0 backdrop-blur-[2px]" onClick={() => setOpen(false)} data-testid="dev-lock-backdrop" aria-hidden />
          <div ref={panel} tabIndex={-1} className="hb-modal relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[20px] border border-border bg-surface outline-none md:max-h-[88vh] md:max-w-md md:rounded-lg md:shadow-card">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
              <h2 id="dev-lock-title" className="flex items-center gap-2 text-base font-semibold"><Lock size={16} strokeWidth={1.5} />Dev token lock</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full text-ink-3 hover:bg-muted hover:text-ink"><X size={18} /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-4 md:pb-5">
              <DevLock {...p} mode="form" onDone={() => setOpen(false)} />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
