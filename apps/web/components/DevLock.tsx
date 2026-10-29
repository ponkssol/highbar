"use client";
import { useEffect, useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { AlertTriangle, Lock, Unlock } from "lucide-react";
import { useHbWallet } from "@/lib/wallet";
import { buildClaimLockTx, buildLockTx, toUi, type LocksResp } from "@/lib/lock";

const input = "h-10 w-full rounded border border-border bg-surface px-3 text-sm outline-none focus:border-ink";
const fmtDate = (s: number) => new Date(s * 1000).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const fmtTok = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const isoLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

/** "Locked" pill for the token header: earliest unlock among active locks. */
export function LockedBadge({ data }: { data: LocksResp | null }) {
  if (!data || !(data.lockedTokens > 0)) return null;
  const next = data.locks.filter((l) => Number(l.locked) > 0).map((l) => l.cliffTime).sort((a, b) => a - b)[0];
  return (
    <span title={`${fmtTok(data.lockedTokens)} dev tokens locked via Jupiter Lock`} data-testid="locked-badge"
      className="inline-flex items-center gap-1 rounded-full border border-ink px-2 py-0.5 text-xs font-medium">
      <Lock size={12} strokeWidth={2} />Dev locked{next ? ` until ${fmtDate(next).split(",")[0]}` : ""}
    </span>
  );
}

/** Lock schedule (everyone), lock form + claim (creator only). */
export function DevLock({ mint, ticker, creator, data, reload }: { mint: string; ticker: string; creator: string; data: LocksResp | null; reload: () => void }) {
  const { publicKey, connection, sendTransaction } = useHbWallet();
  const isCreator = !!publicKey && publicKey.toBase58() === creator;
  const [bal, setBal] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [unlock, setUnlock] = useState(() => isoLocal(new Date(Date.now() + 30 * 86_400_000)));
  const [vestDays, setVestDays] = useState("0");
  const [ack, setAck] = useState(false);
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

  const locks = data?.locks ?? [];
  const claimable = data?.claimableTokens ?? 0;
  const amt = Number(amount) || 0;
  const unlockAt = Math.floor(new Date(unlock).getTime() / 1000);
  const vd = Math.max(0, Math.floor(Number(vestDays) || 0));
  const err = useMemo(() => {
    if (!(amt > 0)) return "Enter an amount to lock.";
    if (bal !== null && amt > bal) return "Amount exceeds your balance.";
    if (!(unlockAt > Date.now() / 1000 + 60)) return "Unlock date must be in the future.";
    if (vd > 3650) return "Vesting can be at most 3650 days.";
    if (!ack) return "Confirm that the lock is permanent.";
    return "";
  }, [amt, bal, unlockAt, vd, ack]);

  const lock = async () => {
    if (!publicKey || err) return;
    setBusy(true); setMsg("");
    try {
      const r = await buildLockTx({ creator: publicKey.toBase58(), mint, amount: amt, unlockAt, vestingDays: vd });
      const sig = await sendTransaction(r.transaction);
      await connection.confirmTransaction(sig, "confirmed");
      setMsg(`Locked. Tx ${sig.slice(0, 8)}`); setOpen(false); setAck(false); reload();
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

  if (!locks.length && !(isCreator && (bal ?? 0) > 0)) return null;
  return (
    <div className="rounded-lg border border-border bg-surface p-4" data-testid="dev-lock">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold"><Lock size={16} strokeWidth={1.5} />Dev token lock</h3>
        {data && data.lockedTokens > 0 && <span className="num text-xs text-ink-3">{fmtTok(data.lockedTokens)} ${ticker} locked</span>}
      </div>
      {locks.length > 0 && (
        <ul className="text-sm">
          {locks.map((l) => (
            <li key={l.escrow} className="border-b border-border py-2 last:border-0">
              <div className="flex justify-between"><span className="text-ink-3">Amount</span><span className="num">{fmtTok(toUi(l.total))} ${ticker}</span></div>
              <div className="flex justify-between"><span className="text-ink-3">Unlocks</span><span className="num">{fmtDate(l.cliffTime)}</span></div>
              {l.numberOfPeriod > 0 && <div className="flex justify-between"><span className="text-ink-3">Vesting</span><span className="num">{l.numberOfPeriod} x {Math.round(l.frequency / 3600) >= 24 ? `${Math.round(l.frequency / 86400)}d` : `${Math.round(l.frequency / 60)}m`}, ends {fmtDate(l.endTime).split(",")[0]}</span></div>}
              <div className="flex justify-between"><span className="text-ink-3">Claimed / unlocked</span><span className="num">{fmtTok(toUi(l.claimed))} / {fmtTok(toUi(l.unlocked))}</span></div>
              <div className="flex justify-between"><span className="text-ink-3">Cancel / change recipient</span><span>None (permanent)</span></div>
              <a href={`https://solscan.io/account/${l.escrow}?cluster=devnet`} target="_blank" rel="noreferrer" className="num text-xs text-ink-3 hover:text-ink">Escrow {l.escrow.slice(0, 6)}...</a>
            </li>
          ))}
        </ul>
      )}
      {isCreator && claimable > 0 && (
        <button onClick={claim} disabled={busy} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded bg-ink text-sm font-medium text-on-ink hover:opacity-90 disabled:opacity-50">
          <Unlock size={14} />Claim unlocked ({fmtTok(claimable)} ${ticker})
        </button>
      )}
      {isCreator && (bal ?? 0) > 0 && !open && (
        <button onClick={() => setOpen(true)} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded border border-border text-sm font-medium hover:bg-muted">
          <Lock size={14} />Lock dev tokens
        </button>
      )}
      {isCreator && open && (
        <div className="mt-3 space-y-3">
          <label className="block"><span className="mb-1.5 flex justify-between text-[13px] text-ink-2">Amount<button type="button" onClick={() => setAmount(String(bal ?? 0))} className="num text-xs text-ink-3 hover:text-ink">Max {fmtTok(bal ?? 0)}</button></span>
            <input className={`${input} num`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} /></label>
          <label className="block"><span className="mb-1.5 block text-[13px] text-ink-2">Unlock date (cliff)</span>
            <input type="datetime-local" className={input} value={unlock} onChange={(e) => setUnlock(e.target.value)} /></label>
          <label className="block"><span className="mb-1.5 block text-[13px] text-ink-2">Linear vesting after unlock (days, optional)</span>
            <input className={`${input} num`} inputMode="numeric" value={vestDays} onChange={(e) => setVestDays(e.target.value.replace(/[^0-9]/g, ""))} /></label>
          <div className="flex gap-2 rounded-md border border-border bg-muted p-3 text-xs text-ink-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span>This lock is permanent. Nobody, including you, can cancel it or change the recipient. Tokens stay locked until the unlock date{vd > 0 ? `, then release daily over ${vd} days` : ""}. Powered by Jupiter Lock.</span>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />I understand this cannot be undone</label>
          <div className="flex gap-2">
            <button onClick={() => setOpen(false)} className="h-10 flex-1 rounded border border-border text-sm hover:bg-muted">Cancel</button>
            <button onClick={lock} disabled={busy || !!err} title={err || undefined} className="h-10 flex-1 rounded bg-ink text-sm font-medium text-on-ink hover:opacity-90 disabled:opacity-40">{busy ? "Locking..." : "Lock tokens"}</button>
          </div>
          {err && <p className="text-xs text-ink-3">{err}</p>}
        </div>
      )}
      {msg && <p className="mt-2 text-xs text-ink-2">{msg}</p>}
    </div>
  );
}