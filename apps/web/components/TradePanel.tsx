"use client";
import { useEffect, useState } from "react";
import { useHbWallet } from "@/lib/wallet";
import { useAuth } from "@/lib/auth";
import { ShieldCheck } from "lucide-react";
import type { TierId } from "@hb/shared";
import { ANTI_SNIPER, antiSniperFeeBps, feeSplitPct } from "@/lib/fees";
import { buildSwapTx } from "@/lib/tx";

export function TradePanel({ mint, ticker, tier, antiSniper, priceSol, initialSide = "buy", bare = false }: { mint: string; ticker: string; tier: TierId; antiSniper: boolean; priceSol: number; initialSide?: "buy" | "sell"; bare?: boolean }) {
  const { publicKey, sendTransaction } = useHbWallet();
  const auth = useAuth();
  const [side, setSide] = useState<"buy" | "sell">(initialSide);
  const [amount, setAmount] = useState("0.5");
  const [slip, setSlip] = useState("1");
  const [slipAuto, setSlipAuto] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const balance = 12_500_000; // mock token balance
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!antiSniper) return;
    const id = setInterval(() => setElapsed((e) => Math.min(ANTI_SNIPER.decaySeconds, e + 1)), 1000);
    return () => clearInterval(id);
  }, [antiSniper]);
  useEffect(() => { setSide(initialSide); }, [initialSide]);
  const sniperActive = antiSniper && elapsed < ANTI_SNIPER.decaySeconds;
  const feeBps = sniperActive ? antiSniperFeeBps(elapsed) : feeSplitPct(tier).total * 100;
  const amt = Number(amount) || 0;
  const solIn = side === "buy" ? amt : amt * priceSol;
  const fee = (solIn * feeBps) / 10_000;
  const impact = Math.min(25, solIn * 0.9);
  const received = side === "buy" ? ((amt - fee) / priceSol) * (1 - impact / 100) : (solIn - fee) * (1 - impact / 100);
  const slipBps = Math.round((slipAuto ? 1 : Number(slip) || 1) * 100);

  const submit = async () => {
    if (!publicKey) return setMsg("Connect your wallet first.");
    if (!(await auth.ensureVerified())) return setMsg("Sign in with your wallet to trade.");
    setBusy(true);
    try {
      const r = await buildSwapTx({ mint, side, amount: amt, slippageBps: slipBps, owner: publicKey.toBase58() });
      if (!r.ok) return setMsg(r.reason);
      const sig = await sendTransaction(r.transaction);
      setMsg(`Transaction sent: ${sig.slice(0, 8)}`);
    } catch (e) {
      setMsg(`Failed: ${(e as Error).message}`);
    } finally { setBusy(false); }
  };

  return (
    <div className={`flex flex-col gap-4 ${bare ? "" : "rounded-lg border border-border bg-surface p-4"}`}>
      <div className="grid grid-cols-2 rounded-full border border-border bg-muted p-1">
        {(["buy", "sell"] as const).map((s) => (
          <button key={s} onClick={() => { setSide(s); setAmount(s === "buy" ? "0.5" : ""); }}
            className={`h-9 rounded-full text-sm font-medium capitalize ${side === s ? (s === "buy" ? "bg-buy text-white" : "bg-sell text-white") : "text-ink-2"}`}>{s}</button>
        ))}
      </div>
      {sniperActive && (
        <div className="rounded-md border border-border bg-muted p-3 text-sm">
          <div className="flex items-center justify-between font-medium"><span className="flex items-center gap-2"><ShieldCheck size={16} strokeWidth={1.5} />Current fee <span className="num">{(feeBps / 100).toFixed(2)}%</span></span><span className="num text-xs text-ink-3">{ANTI_SNIPER.decaySeconds - elapsed}s</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full border border-ink">
            <div className="h-full bg-hatch transition-[width] duration-1000 ease-linear" style={{ width: `${(1 - elapsed / ANTI_SNIPER.decaySeconds) * 100}%` }} />
          </div>
          <div className="num mt-1 flex justify-between text-[11px] text-ink-3"><span>{ANTI_SNIPER.startFeeBps / 100}%</span><span>{ANTI_SNIPER.endFeeBps / 100}%</span></div>
        </div>
      )}
      <label className="flex h-12 items-center rounded-md border border-border px-3 focus-within:border-ink">
        <input value={amount} placeholder="0.0" onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" className="num w-full bg-transparent text-lg outline-none" />
        <span className="num text-sm text-ink-3">{side === "buy" ? "SOL" : `$${ticker}`}</span>
      </label>
      <div className="flex gap-2">
        {side === "buy"
          ? ["0.1", "0.5", "1"].map((p) => (
              <button key={p} onClick={() => setAmount(p)} className={`num h-8 flex-1 rounded-full border text-sm ${amount === p ? "border-ink" : "border-border hover:bg-muted"}`}>{p} SOL</button>
            ))
          : [25, 50, 100].map((p) => (
              <button key={p} onClick={() => setAmount(String(Math.floor((balance * p) / 100)))} className="num h-8 flex-1 rounded-full border border-border text-sm hover:bg-muted">{p}%</button>
            ))}
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-3">Slippage</span>
        <span className="flex items-center gap-1">
          <button onClick={() => setSlipAuto(true)} className={`rounded-full px-2.5 py-1 text-xs ${slipAuto ? "bg-ink text-on-ink" : "border border-border text-ink-2"}`}>Auto 1%</button>
          <label className={`flex h-7 w-16 items-center rounded-full border px-2 text-xs ${slipAuto ? "border-border" : "border-ink"}`}>
            <input value={slip} onFocus={() => setSlipAuto(false)} onChange={(e) => { setSlipAuto(false); setSlip(e.target.value.replace(/[^0-9.]/g, "")); }} className="num w-full bg-transparent outline-none" />%
          </label>
        </span>
      </div>
      <dl className="space-y-1.5 rounded-md border border-border p-3 text-sm">
        <div className="flex justify-between"><dt className="text-ink-3">Est. received</dt><dd className="num">{amt ? (side === "buy" ? `${Math.max(0, received).toLocaleString("en-US", { maximumFractionDigits: 0 })} $${ticker}` : `${Math.max(0, received).toFixed(4)} SOL`) : "—"}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-3">Price impact</dt><dd className={`num ${impact > 5 ? "text-sell" : ""}`}>{amt ? impact.toFixed(2) : "0.00"}%</dd></div>
        <div className="flex justify-between"><dt className="text-ink-3">Fee ({(feeBps / 100).toFixed(2)}%)</dt><dd className="num">{fee.toFixed(4)} SOL</dd></div>
      </dl>
      <button disabled={!amt || busy} onClick={submit}
        className={`h-12 w-full rounded-md text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${side === "buy" ? "bg-buy" : "bg-sell"}`}>
        {busy ? "Preparing…" : side === "buy" ? `Buy $${ticker}` : `Sell $${ticker}`}
      </button>
      {msg && <div className="text-xs text-ink-3">{msg}</div>}
    </div>
  );
}