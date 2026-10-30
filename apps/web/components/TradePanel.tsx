"use client";
import { useEffect, useState } from "react";
import { useHbWallet, useSolBalance } from "@/lib/wallet";
import { useAuth } from "@/lib/auth";
import { ShieldCheck } from "lucide-react";
import type { TierId } from "@hb/shared";
import { feeSplitPct } from "@/lib/fees";
import { useAntiSniper } from "@/lib/antiSniper";
import { buildSwapTx } from "@/lib/tx";
import { currentPoint, quote as curveQuote, readCurve, type CurveState } from "@/lib/curve";
import { PublicKey } from "@solana/web3.js";
import { Segmented } from "./TabBar";

/** SOL kept back for network fees and the token account rent when checking a buy against the wallet balance. */
const SOL_RESERVE = 0.01;
const DEFAULT_BUY = "0.5";
const fmtTok = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: v >= 1000 ? 0 : 2 });
const fmtSolAmt = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: v >= 1 ? 3 : 4 });
/** Round down so a "max" amount never ends above the limit. */
const floorTo = (v: number, d: number) => Math.floor(v * 10 ** d) / 10 ** d;

export function TradePanel({ mint, ticker, tier, antiSniper, priceSol, initialSide = "buy", bare = false, pool, createdAt, isMigrated = false, thresholdSol, quoteReserveSol }: {
  mint: string; ticker: string; tier: TierId; antiSniper: boolean; priceSol: number; initialSide?: "buy" | "sell"; bare?: boolean; pool?: string | null;
  /** API launch time (ms), fallback when the pool's on-chain activation point can't be read */ createdAt?: number | null; isMigrated?: boolean;
  /** API curve numbers, used for the graduation cap only when the pool account can't be read */ thresholdSol?: number; quoteReserveSol?: number;
}) {
  const { publicKey, sendTransaction, connection } = useHbWallet();
  const auth = useAuth();
  const solBalance = useSolBalance(publicKey, connection);
  const [side, setSide] = useState<"buy" | "sell">(initialSide);
  const [amount, setAmount] = useState(initialSide === "buy" ? DEFAULT_BUY : "");
  const [slip, setSlip] = useState("1");
  const [slipAuto, setSlipAuto] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pick = (s: "buy" | "sell") => { setSide(s); setAmount(s === "buy" ? DEFAULT_BUY : ""); setMsg(null); };
  useEffect(() => { pick(initialSide); }, [initialSide]); // eslint-disable-line react-hooks/exhaustive-deps
  // Real token balance of the connected wallet (null when not connected / not loaded).
  const [balance, setBalance] = useState<number | null>(null);
  useEffect(() => {
    if (!publicKey) { setBalance(null); return; }
    let alive = true;
    const load = () => connection.getParsedTokenAccountsByOwner(publicKey, { mint: new PublicKey(mint) })
      .then((r) => alive && setBalance(r.value.reduce((a, x) => a + Number(x.account.data.parsed?.info?.tokenAmount?.uiAmount ?? 0), 0))).catch(() => {});
    load();
    const id = setInterval(load, 20_000);
    return () => { alive = false; clearInterval(id); };
  }, [publicKey, connection, mint]);
  // Live curve state (pool + config accounts) for exact DBC quotes; refreshed every 15 s. Null = not readable, API estimate below.
  const [curve, setCurve] = useState<CurveState | null>(null);
  useEffect(() => {
    if (!pool || isMigrated) { setCurve(null); return; }
    let alive = true;
    const load = () => readCurve(connection, pool).then((s) => alive && setCurve(s)).catch(() => {});
    load();
    const id = setInterval(load, 15_000);
    return () => { alive = false; clearInterval(id); };
  }, [pool, isMigrated, connection]);
  // Anti-sniper decay timed from the pool's real activation point (on-chain; API createdAt fallback), not from page load.
  const sniper = useAntiSniper({ enabled: antiSniper && !isMigrated, pool, createdAtMs: createdAt, connection });
  const sniperActive = sniper.active;
  const amt = Number(amount) || 0;
  const q = curve && amt > 0 ? curveQuote(curve, side, amt, currentPoint(curve)) : null;
  const feeBps = q ? q.feeBps : sniperActive ? sniper.feeBps : feeSplitPct(tier).total * 100;
  const feeFrac = feeBps / 10_000;

  // Limits: graduation cap (curve, else API threshold), wallet SOL, wallet tokens / sold supply.
  const estMaxBuy = !isMigrated && thresholdSol && thresholdSol > 0 && quoteReserveSol != null ? Math.max(0, thresholdSol - quoteReserveSol) / (1 - feeFrac) : null;
  const maxBuy = isMigrated ? null : q && side === "buy" ? q.max : curve ? curveQuote(curve, "buy", 1e-9, currentPoint(curve)).max : estMaxBuy;
  const sold = curve ? curveQuote(curve, "sell", 0, currentPoint(curve)).max : null;
  const sellMax = side === "sell" ? (publicKey ? (balance == null ? null : sold != null ? Math.min(balance, sold) : balance) : sold) : null;
  const solSpendable = solBalance == null ? null : Math.max(0, solBalance - SOL_RESERVE);

  const overCap = side === "buy" && maxBuy != null && amt > maxBuy;
  const overSol = side === "buy" && !!publicKey && solSpendable != null && Math.min(amt, maxBuy ?? amt) > solSpendable;
  const overSell = side === "sell" && sellMax != null && amt > sellMax;
  const noTokens = side === "sell" && !!publicKey && balance === 0;
  // Quote: exact curve math when the pool was read, otherwise a spot-price estimate (marked ≈, no impact figure).
  const quoted = side === "buy" ? (overCap && maxBuy != null ? maxBuy : amt) : overSell && sellMax != null ? sellMax : amt;
  const estFee = (side === "buy" ? quoted : quoted * priceSol) * feeFrac;
  const received = q ? q.out : side === "buy" ? (priceSol > 0 ? (quoted * (1 - feeFrac)) / priceSol : 0) : quoted * priceSol * (1 - feeFrac);
  const feeSol = q ? q.feeSol : estFee;
  const impact = q ? Math.max(0, q.impactPct) : null;
  const slipBps = Math.round((slipAuto ? 1 : Number(slip) || 1) * 100);
  const blocked = overCap || overSol || overSell || noTokens;

  const submit = async () => {
    if (!publicKey) return setMsg("Connect your wallet first.");
    if (blocked) return;
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
  const unit = side === "buy" ? "SOL" : `$${ticker}`;
  const setMaxSell = () => sellMax != null && setAmount(String(floorTo(sellMax, 6)));

  return (
    <div data-testid="trade-panel" className={`flex flex-col gap-4 ${bare ? "" : "rounded-lg border border-border bg-surface p-4"}`}>
      <Segmented label="Trade side" tone="trade" value={side} onChange={pick} options={[{ id: "buy", label: "Buy" }, { id: "sell", label: "Sell" }]}
        className="grid grid-cols-2 rounded-full border border-border bg-muted p-1" itemClassName="h-9 rounded-full text-sm font-medium" />
      {sniperActive && (
        <div className="rounded-md border border-border bg-muted p-3 text-sm">
          <div className="flex items-center justify-between font-medium"><span className="flex items-center gap-2"><ShieldCheck size={16} strokeWidth={1.5} />Current fee <span className="num">{(feeBps / 100).toFixed(2)}%</span></span><span className="num text-xs text-ink-3">{sniper.remaining}s</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full border border-ink">
            <div className="h-full bg-hatch transition-[width] duration-1000 ease-linear" style={{ width: `${(1 - sniper.elapsed / sniper.duration) * 100}%` }} />
          </div>
          <div className="num mt-1 flex justify-between text-[11px] text-ink-3"><span>{(sniper.startFeeBps / 100).toFixed(0)}%</span><span>{(sniper.endFeeBps / 100).toFixed(0)}%</span></div>
        </div>
      )}
      <div>
        <label className={`flex h-12 items-center rounded-md border px-3 focus-within:border-ink ${overSell || overSol ? "border-sell" : "border-border"}`}>
          <input data-testid="trade-amount" aria-label={side === "buy" ? "Amount to spend in SOL" : `Amount of $${ticker} to sell`} aria-invalid={overSell || overSol || undefined}
            value={amount} placeholder="0.0" onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, "").replace(/^\./, "0."))} inputMode="decimal" className="num w-full bg-transparent text-lg outline-none" />
          <span className="num text-sm text-ink-3">{unit}</span>
        </label>
        {publicKey && (
          <div className="num mt-1.5 text-right text-xs text-ink-3" data-testid="trade-balance">
            Balance {side === "buy" ? (solBalance == null ? "–" : `${fmtSolAmt(solBalance)} SOL`) : balance == null ? "–" : `${fmtTok(balance)} $${ticker}`}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {side === "buy"
          ? ["0.1", "0.5", "1"].map((p) => (
              <button key={p} type="button" onClick={() => setAmount(p)} className={`num h-8 flex-1 rounded-full border text-sm ${amount === p ? "border-ink" : "border-border hover:bg-muted"}`}>{p} SOL</button>
            ))
          : <>
              {publicKey && !!balance && [25, 50].map((p) => (
                <button key={p} type="button" onClick={() => setAmount(String(Math.floor((balance * p) / 100)))} className="num h-8 flex-1 rounded-full border border-border text-sm hover:bg-muted">{p}%</button>
              ))}
              <button type="button" onClick={setMaxSell} disabled={!sellMax} data-testid="trade-max" className="num h-8 flex-1 rounded-full border border-border text-sm hover:bg-muted disabled:opacity-40">Max</button>
            </>}
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-3">Slippage</span>
        <span className="flex items-center gap-1">
          <button type="button" onClick={() => setSlipAuto(true)} aria-pressed={slipAuto} className={`rounded-full px-2.5 py-1 text-xs ${slipAuto ? "bg-ink text-on-ink" : "border border-border text-ink-2"}`}>Auto 1%</button>
          <label className={`flex h-7 w-16 items-center rounded-full border px-2 text-xs ${slipAuto ? "border-border" : "border-ink"}`}>
            <input aria-label="Custom slippage in percent" value={slip} onFocus={() => setSlipAuto(false)} onChange={(e) => { setSlipAuto(false); setSlip(e.target.value.replace(/[^0-9.]/g, "").replace(/^\./, "0.")); }} className="num w-full bg-transparent outline-none" />%
          </label>
        </span>
      </div>
      <dl className="space-y-1.5 rounded-md border border-border p-3 text-sm" data-testid="trade-quote">
        <div className="flex justify-between"><dt className="text-ink-3">{overCap || overSell ? "Received at max" : "Est. received"}</dt><dd className="num">{amt ? `${q ? "" : "≈ "}${side === "buy" ? `${fmtTok(Math.max(0, received))} $${ticker}` : `${Math.max(0, received).toFixed(6)} SOL`}` : "–"}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-3">Price impact</dt><dd data-testid="trade-impact" className={`num ${impact != null && impact > 5 ? "text-sell" : ""}`}>{!amt ? "0.00%" : impact == null ? "–" : `${impact.toFixed(2)}%`}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-3">Fee ({(feeBps / 100).toFixed(2)}%)</dt><dd className="num">{feeSol.toFixed(6)} SOL</dd></div>
      </dl>
      {overCap && maxBuy != null && (
        <p role="status" data-testid="trade-cap" className="-mt-1 text-xs text-ink-2">
          Max buy before graduation is <span className="num font-medium">{fmtSolAmt(floorTo(maxBuy, 4))} SOL</span>{q?.tokensToGraduation ? <> ({fmtTok(q.tokensToGraduation)} ${ticker} left on the curve)</> : null}. Quote shown at the max.{" "}
          <button type="button" onClick={() => setAmount(String(floorTo(maxBuy, 4)))} className="font-medium text-ink underline underline-offset-2">Use max</button>
        </p>
      )}
      {overSol && solSpendable != null && <p role="alert" data-testid="trade-sol-limit" className="-mt-1 text-xs text-sell">Not enough SOL: you can spend up to {fmtSolAmt(floorTo(solSpendable, 4))} SOL (about {SOL_RESERVE} SOL stays for network fees).</p>}
      {overSell && sellMax != null && <p role="alert" data-testid="trade-sell-limit" className="-mt-1 text-xs text-sell">{publicKey ? `You can sell up to ${fmtTok(sellMax)} $${ticker}.` : `Only ${fmtTok(sellMax)} $${ticker} have been bought on the curve, so that is the most anyone can sell.`}</p>}
      {noTokens && <p role="status" className="-mt-1 text-xs text-ink-3">This wallet holds no ${ticker}.</p>}
      <button type="button" disabled={!amt || busy || blocked} onClick={submit}
        className={`h-12 w-full rounded-md text-sm font-semibold text-on-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${side === "buy" ? "bg-buy" : "bg-sell"}`}>
        {busy ? "Preparing…" : side === "buy" ? `Buy $${ticker}` : `Sell $${ticker}`}
      </button>
      {msg && <div className="text-xs text-ink-3" role="status">{msg}</div>}
    </div>
  );
}