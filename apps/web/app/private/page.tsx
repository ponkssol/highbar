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
            <div className="inp"><input inputMode="decimal" aria-label="Amount in SOL" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} /><span className="dim mono" style={{ fontSize: 13 }}>SOL</span></div>
            <div className="qk" style={{ marginTop: 10 }}>
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
              <div><span>Est. arrival</span><b>{delay === "0" ? "Instant" : delay === "15" ? "~15 min" : delay === "60" ? "~1 hour" : "Random"}</b></div>
            </div>
            <button className="go" type="submit" style={{ marginTop: 16 }}>Send privately</button>
            {done && <p className="dim" style={{ fontSize: 13 }}>Concept only. No funds moved.</p>}
          </div></div>
        </form>
        <aside className="prev">
          <div className="brk pv">
            <span className="c1" /><span className="c2" />
            <div className="lbl" style={{ marginBottom: 12 }}>Route</div>
            <svg viewBox="0 0 320 150" style={{ width: "100%", display: "block" }} aria-label="Private route: your wallet to shielded pool to recipient">
              <path d="M40 75C90 75 100 75 140 75" fill="none" stroke="var(--bd-x)" strokeDasharray="3 5" />
              <path d="M180 75C220 40 240 30 280 30" fill="none" stroke="var(--bd-x)" strokeDasharray="3 5" />
              <path d="M180 75L280 75" fill="none" stroke="var(--bd-x)" strokeDasharray="3 5" />
              <path d="M180 75C220 110 240 120 280 120" fill="none" stroke="var(--bd-x)" strokeDasharray="3 5" />
              <rect x="8" y="58" width="64" height="34" fill="var(--el)" stroke="var(--bd-s)" /><text x="40" y="79" textAnchor="middle" fill="var(--tx)" fontSize="11" fontFamily="Geist Mono,monospace">You</text>
              <rect x="128" y="50" width="64" height="50" fill="var(--el)" stroke="#ffc72c" /><text x="160" y="72" textAnchor="middle" fill="var(--yx)" fontSize="11" fontFamily="Geist Mono,monospace">Shielded</text><text x="160" y="87" textAnchor="middle" fill="var(--yx)" fontSize="11" fontFamily="Geist Mono,monospace">pool</text>
              <rect x="248" y="58" width="64" height="34" fill="var(--el)" stroke="var(--bd-s)" /><text x="280" y="79" textAnchor="middle" fill="var(--tx)" fontSize="11" fontFamily="Geist Mono,monospace">Recipient</text>
            </svg>
            <ol className="pss"><li>Deposit to the shielded pool</li><li>Mix with other deposits</li><li>Split into parts</li><li>Withdraw to the recipient</li></ol>
            <p className="muted" style={{ fontSize: 13, margin: "14px 0 0" }}>This preview does not broadcast a transaction.</p>
            <div style={{ marginTop: 12 }}><Link href="/launch">Fund a launch wallet →</Link></div>
          </div>
        </aside>
      </div>
      <div className="sec msec" style={{ borderBottom: 0 }}>
        <div className="bul">Use it <b>for</b></div>
        <div className="cards" style={{ marginTop: 20, gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
          <Link href="/launch"><div className="lbl">Launch</div><b style={{ display: "block", margin: "8px 0" }}>Fund a launch wallet</b><span className="muted" style={{ fontSize: 13 }}>Pair with a hidden creator wallet.</span></Link>
          <Link href="/portfolio"><div className="lbl">Earn</div><b style={{ display: "block", margin: "8px 0" }}>Claim fees privately</b><span className="muted" style={{ fontSize: 13 }}>Creator fees go to a fresh address.</span></Link>
          <Link href="/rewards"><div className="lbl">Rewards</div><b style={{ display: "block", margin: "8px 0" }}>Private cashback</b><span className="muted" style={{ fontSize: 13 }}>Receive payouts without a trail.</span></Link>
        </div>
      </div>
    </div>
  );
}
