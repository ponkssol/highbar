"use client";
import { useState } from "react";
import Link from "next/link";
import { JtxSeg } from "@/components/JtxSeg";

/** UI-only private send. Nothing is signed or sent. */
export default function PrivatePage() {
  const [amount, setAmount] = useState("1.0");
  const [to, setTo] = useState("");
  const [delay, setDelay] = useState("15");
  const [split, setSplit] = useState(true);
  const [done, setDone] = useState(false);
  const n = Number(amount) || 0;
  const fee = n * 0.003;
  return (
    <div className="jtx">
      <div className="phead">
        <div>
          <div className="bul">Private <b>send</b></div>
          <h1 className="h1">Send SOL. <span>Leave no trail.</span></h1>
          <p className="muted" style={{ margin: "10px 0 0", maxWidth: "42em" }}>Move funds through a shielded pool so the sender and the recipient cannot be linked on-chain. Use it to fund a launch wallet, receive creator fees, or pay out cashback.</p>
        </div>
        <span className="chip">Concept</span>
      </div>
      <div className="strip" style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))" }}>
        <div><div className="lbl">Anonymity set</div><div className="v">—</div></div>
        <div><div className="lbl">Shielded now</div><div className="v">—</div></div>
        <div><div className="lbl">Avg. delay</div><div className="v">—</div></div>
        <div><div className="lbl">Privacy fee</div><div className="v">0.30%</div></div>
      </div>
      <div className="lg">
        <form className="lf" style={{ padding: "clamp(20px,3vw,40px)" }} onSubmit={(e) => { e.preventDefault(); setDone(true); }}>
          <div className="fs"><div className="idx">{"{01}"}</div><div className="fb">
            <h3>Amount</h3>
            <div className="fld"><input inputMode="decimal" aria-label="Amount in SOL" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} /></div>
            <div className="tabs seg" style={{ marginTop: 10 }}>
              {["0.5", "1", "5", "10"].map((v) => <button type="button" key={v} className={amount === v ? "on" : ""} onClick={() => setAmount(v)}>{v}</button>)}
            </div>
          </div></div>
          <div className="fs"><div className="idx">{"{02}"}</div><div className="fb">
            <h3>Recipient</h3>
            <label className="fld"><span>Wallet address <em>Any Solana address, including a fresh one.</em></span>
              <input placeholder="Paste address" aria-label="Recipient" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          </div></div>
          <div className="fs"><div className="idx">{"{03}"}</div><div className="fb">
            <h3>Delay</h3>
            <JtxSeg label="Delay" value={delay} onChange={setDelay} options={[{ id: "0", label: "Instant" }, { id: "15", label: "~15 min" }, { id: "60", label: "~1 hour" }, { id: "rand", label: "Random" }]} />
            <p className="dim" style={{ fontSize: 13, margin: "10px 0 0" }}>A longer delay mixes your transfer with more deposits, so it is harder to match.</p>
            <div className="trow" style={{ marginTop: 14 }}><div><b>Split into parts</b><p>Send in several smaller amounts at different times.</p></div>
              <button type="button" className="sw" role="switch" aria-checked={split} onClick={() => setSplit(!split)}><i /></button></div>
          </div></div>
          <div className="fs"><div className="idx">{"{04}"}</div><div className="fb">
            <h3>Summary</h3>
            <div className="kv">
              <div><span>You send</span><b>{n.toFixed(4)} SOL</b></div>
              <div><span>Privacy fee (0.30%)</span><b>{fee.toFixed(4)} SOL</b></div>
              <div><span>Network fee</span><b>0.00012 SOL</b></div>
              <div><span>Recipient gets</span><b className="yl">{Math.max(0, n - fee).toFixed(4)} SOL</b></div>
            </div>
            <button className="go" type="submit" style={{ marginTop: 16 }}>Send privately</button>
            {done && <p className="dim" style={{ fontSize: 13 }}>Concept only. No funds moved.</p>}
          </div></div>
        </form>
        <aside className="prev">
          <div className="pv">
            <div className="lbl" style={{ marginBottom: 12 }}>Route</div>
            <p className="muted" style={{ fontSize: 14 }}>Your wallet, then a shielded pool, then {to || "the recipient"}. This preview does not broadcast a transaction.</p>
            <div style={{ marginTop: 16 }}><Link href="/launch">Fund a launch wallet →</Link></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
