"use client";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ShieldCheck } from "lucide-react";
import type { TierId } from "@hb/shared";
import { ANTI_SNIPER, antiSniperFeeBps, feeSplitPct } from "@/lib/fees";
import { Button, Card } from "./ui";

export function TradePanel({ ticker, tier, antiSniper }: { ticker: string; tier: TierId; antiSniper: boolean }) {
  const { publicKey } = useWallet();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("0.5");
  // demo: anti-sniper window starts when page opens
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!antiSniper) return;
    const id = setInterval(() => setElapsed((e) => Math.min(ANTI_SNIPER.decaySeconds, e + 1)), 1000);
    return () => clearInterval(id);
  }, [antiSniper]);
  const sniperActive = antiSniper && elapsed < ANTI_SNIPER.decaySeconds;
  const feeBps = sniperActive ? antiSniperFeeBps(elapsed) : feeSplitPct(tier).total * 100;
  const amt = Number(amount) || 0;
  const fee = (amt * feeBps) / 10_000;

  return (
    <Card className="flex flex-col gap-4">
      <div className="grid grid-cols-2 rounded border border-border bg-muted p-1">
        {(["buy", "sell"] as const).map((s) => (
          <button key={s} onClick={() => setSide(s)}
            className={`h-9 rounded-sm text-sm font-medium capitalize ${side === s ? "bg-ink text-on-ink" : "text-ink-2"}`}>{s}</button>
        ))}
      </div>
      {sniperActive && (
        <div className="rounded border border-border p-3 text-sm">
          <div className="flex items-center gap-2 font-medium"><ShieldCheck size={16} strokeWidth={1.5} />Anti-sniper on</div>
          <div className="mt-1 text-ink-2">Fee now <span className="num text-ink">{(feeBps / 100).toFixed(2)}%</span> (25% to 1% in 60s)</div>
          <div className="mt-2 h-2 overflow-hidden rounded-full border border-ink">
            <div className="h-full bg-hatch" style={{ width: `${(1 - elapsed / ANTI_SNIPER.decaySeconds) * 100}%` }} />
          </div>
          <div className="num mt-1 text-right text-xs text-ink-3">{ANTI_SNIPER.decaySeconds - elapsed}s left</div>
        </div>
      )}
      <label className="flex h-12 items-center rounded border border-border px-3 focus-within:border-ink">
        <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal"
          className="num w-full bg-transparent text-lg outline-none" />
        <span className="num text-sm text-ink-3">{side === "buy" ? "SOL" : `$${ticker}`}</span>
      </label>
      <div className="flex gap-2">
        {["0.1", "0.5", "1"].map((p) => (
          <button key={p} onClick={() => setAmount(p)}
            className={`num h-8 flex-1 rounded-full border text-sm ${amount === p ? "border-ink" : "border-border hover:bg-muted"}`}>{p} SOL</button>
        ))}
      </div>
      <dl className="space-y-1.5 text-sm">
        <div className="flex justify-between"><dt className="text-ink-3">Fee</dt><dd className="num">{(feeBps / 100).toFixed(2)}%</dd></div>
        <div className="flex justify-between"><dt className="text-ink-3">Fee amount</dt><dd className="num">{fee.toFixed(4)} SOL</dd></div>
        <div className="flex justify-between"><dt className="text-ink-3">You {side === "buy" ? "spend" : "sell"}</dt><dd className="num">{amt} {side === "buy" ? "SOL" : ticker}</dd></div>
      </dl>
      <Button className="w-full" disabled={!amt} onClick={() => alert(publicKey ? "Trading coming soon (API not wired yet)" : "Connect a wallet first")}>
        {side === "buy" ? `Buy $${ticker}` : `Sell $${ticker}`}
      </Button>
    </Card>
  );
}