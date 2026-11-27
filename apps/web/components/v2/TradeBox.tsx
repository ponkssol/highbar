"use client";
import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import type { TierId } from "@hb/shared";
import { useAuth } from "@/lib/auth";
import { useAntiSniper } from "@/lib/antiSniper";
import { currentPoint, quote as curveQuote, readCurve, type CurveState } from "@/lib/curve";
import { feeSplitPct } from "@/lib/fees";
import { useSettings } from "@/lib/settings";
import { buildSwapTx } from "@/lib/tx";
import { useHbWallet, useSolBalance } from "@/lib/wallet";
import { SolNum } from "./ui";

const SOL_RESERVE = 0.01;
const fmtTok = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: v >= 1000 ? 0 : 2 });
const floorTo = (v: number, d: number) => Math.floor(v * 10 ** d) / 10 ** d;

export function TradeBox({ mint, ticker, tier, antiSniper, priceSol, pool, createdAt, isMigrated, thresholdSol, quoteReserveSol }: {
  mint: string; ticker: string; tier: TierId; antiSniper: boolean; priceSol: number; pool?: string | null;
  createdAt?: number | null; isMigrated?: boolean; thresholdSol?: number; quoteReserveSol?: number;
}) {
  const { publicKey, sendTransaction, connection } = useHbWallet();
  const [settings] = useSettings();
  const auth = useAuth();
  const solBalance = useSolBalance(publicKey, connection);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("0.5");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [curve, setCurve] = useState<CurveState | null>(null);
  useEffect(() => {
    if (!publicKey) { setBalance(null); return; }
    let alive = true;
    const load = () => connection.getParsedTokenAccountsByOwner(publicKey, { mint: new PublicKey(mint) })
      .then((r) => alive && setBalance(r.value.reduce((a, x) => a + Number(x.account.data.parsed?.info?.tokenAmount?.uiAmount ?? 0), 0))).catch(() => {});
    load();
    const id = setInterval(load, 20_000);
    return () => { alive = false; clearInterval(id); };
  }, [publicKey, connection, mint]);
  useEffect(() => {
    if (!pool || isMigrated) { setCurve(null); return; }
    let alive = true;
    const load = () => readCurve(connection, pool).then((s) => alive && setCurve(s)).catch(() => {});
    load();
    const id = setInterval(load, 15_000);
    return () => { alive = false; clearInterval(id); };
  }, [pool, isMigrated, connection]);
  const sniper = useAntiSniper({ enabled: antiSniper && !isMigrated, pool, createdAtMs: createdAt, connection });
  const amt = Number(amount) || 0;
  const q = curve && amt > 0 ? curveQuote(curve, side, amt, currentPoint(curve)) : null;
  const feeBps = q ? q.feeBps : sniper.active ? sniper.feeBps : feeSplitPct(tier).total * 100;
  const feeFrac = feeBps / 10_000;
  const estMaxBuy = !isMigrated && thresholdSol && thresholdSol > 0 && quoteReserveSol != null ? Math.max(0, thresholdSol - quoteReserveSol) / (1 - feeFrac) : null;
  const maxBuy = isMigrated ? null : q && side === "buy" ? q.max : curve ? curveQuote(curve, "buy", 1e-9, currentPoint(curve)).max : estMaxBuy;
  const sold = curve ? curveQuote(curve, "sell", 0, currentPoint(curve)).max : null;
  const sellMax = side === "sell" ? (publicKey ? (balance == null ? null : sold != null ? Math.min(balance, sold) : balance) : sold) : null;
  const solSpendable = solBalance == null ? null : Math.max(0, solBalance - SOL_RESERVE);
  const overCap = side === "buy" && maxBuy != null && amt > maxBuy;
  const overSol = side === "buy" && !!publicKey && solSpendable != null && Math.min(amt, maxBuy ?? amt) > solSpendable;
  const overSell = side === "sell" && sellMax != null && amt > sellMax;
  const quoted = side === "buy" ? (overCap && maxBuy != null ? maxBuy : amt) : overSell && sellMax != null ? sellMax : amt;
  const received = q ? q.out : side === "buy" ? (priceSol > 0 ? (quoted * (1 - feeFrac)) / priceSol : 0) : quoted * priceSol * (1 - feeFrac);
  const feeSol = q ? q.feeSol : (side === "buy" ? quoted : quoted * priceSol) * feeFrac;
  const impact = q ? Math.max(0, q.impactPct) : null;
  const slipBps = Math.round((settings.slippagePct || 1) * 100);
  const blocked = overCap || overSol || overSell;
  const raised = quoteReserveSol ?? 0;
  const target = thresholdSol || 0;
  const progress = isMigrated ? 1 : target > 0 ? Math.min(1, raised / target) : 0;

  const submit = async () => {
    if (!publicKey) return setMsg("Connect your wallet first.");
    if (blocked || !amt) return;
    if (!(await auth.ensureVerified())) return setMsg("Sign in with your wallet to trade.");
    setBusy(true);
    try {
      const r = await buildSwapTx({ mint, side, amount: amt, slippageBps: slipBps, owner: publicKey.toBase58() });
      if (!r.ok) return setMsg(r.reason);
      const sig = await sendTransaction(r.transaction);
      setMsg(`Transaction sent: ${sig.slice(0, 8)}…`);
    } catch (e) {
      setMsg(`Failed: ${(e as Error).message}`);
    } finally { setBusy(false); }
  };

  return (
    <aside className="side">
      <div className="bs">
        <button type="button" className={`b${side === "buy" ? " on" : ""}`} onClick={() => { setSide("buy"); setAmount("0.5"); setMsg(null); }}>Buy</button>
        <button type="button" className={`s${side === "sell" ? " on" : ""}`} onClick={() => { setSide("sell"); setAmount(""); setMsg(null); }}>Sell</button>
      </div>
      <div className="inp">
        <input inputMode="decimal" value={amount} aria-label={side === "buy" ? "Amount in SOL" : `Amount of $${ticker}`} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
        <span className="dim mono" style={{ fontSize: 13 }}>{side === "buy" ? <><i className="sol" />SOL</> : `$${ticker}`}</span>
      </div>
      <div className="qk">
        {side === "buy" ? ["0.1", "0.5", "1"].map((n) => (
          <button type="button" key={n} className={amount === n ? "on" : ""} onClick={() => setAmount(n)}>{n}</button>
        )) : null}
        <button type="button" onClick={() => {
          if (side === "buy" && maxBuy != null) setAmount(String(floorTo(Math.min(maxBuy, solSpendable ?? maxBuy), 4)));
          else if (sellMax != null) setAmount(String(floorTo(sellMax, 6)));
        }}>Max</button>
      </div>
      <div className="kv">
        <div><span>Slippage</span><b>{settings.slippagePct || 1}%</b></div>
        <div><span>Est. received</span><b>{side === "buy" ? `${fmtTok(Math.max(0, received))} $${ticker}` : <SolNum v={Math.max(0, received)} digits={6} />}</b></div>
        <div><span>Price impact</span><b>{impact == null ? "—" : `${impact.toFixed(2)}%`}</b></div>
        <div><span>Fee ({(feeBps / 100).toFixed(2)}%)</span><b><SolNum v={feeSol} digits={6} /></b></div>
      </div>
      <button type="button" className={`go${side === "sell" ? " sell" : ""}`} disabled={busy || !amt || blocked} onClick={submit}>
        {busy ? "Preparing…" : `${side === "buy" ? "Buy" : "Sell"} $${ticker}`}
      </button>
      {msg && <p className="dim mono" style={{ fontSize: 12, margin: 0 }} role="status">{msg}</p>}
      <div className="bond">
        <div style={{ display: "flex", justifyContent: "space-between" }}><span>Bonding progress</span><span className="mono dim" style={{ fontSize: 13 }}>{isMigrated ? "Migrated" : <>{raised.toFixed(1)} of <i className="sol" />{target || "—"}</>}</span></div>
        <div className="bar"><i style={{ width: `${Math.max(progress * 100, progress > 0 ? 1 : 0)}%` }} /></div>
        <div className="dim mono" style={{ fontSize: 12 }}>{isMigrated ? "Trading on DAMM v2" : `Graduates to DAMM v2 at ${target || "—"} SOL`}</div>
      </div>
    </aside>
  );
}
