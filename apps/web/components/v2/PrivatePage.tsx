"use client";
import { useState } from "react";

/** Concept screen. The button does not build, sign or send a transaction. */
export function V2Private() {
  const [amount, setAmount] = useState("1");
  const [note, setNote] = useState("");
  const fee = (Number(amount) || 0) * 0.003;
  return (
    <div className="frame">
      <div className="phead">
        <div>
          <div className="bul">Private send <span className="chip">Concept</span></div>
          <h1 className="h1">Send SOL. <span>Leave no trail.</span></h1>
          <p className="muted" style={{ marginTop: 10, maxWidth: "40em" }}>This screen is a design concept. It does not move funds, and it will not report a transaction that did not happen.</p>
        </div>
      </div>
      <div className="strip" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <div><div className="lbl">Anonymity set</div><div className="v dim">—</div></div>
        <div><div className="lbl">Shielded now</div><div className="v dim">—</div></div>
        <div><div className="lbl">Avg. delay</div><div className="v dim">—</div></div>
        <div><div className="lbl">Privacy fee</div><div className="v">0.30%</div></div>
      </div>
      <div className="lg">
        <form className="lf" onSubmit={(e) => { e.preventDefault(); setNote("Private send is not available. No transaction was created."); }}>
          <div className="fs"><div className="fb">
            <h3>Amount</h3>
            <div className="inp"><input inputMode="decimal" aria-label="Amount in SOL" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} /><span className="dim mono"><i className="sol" />SOL</span></div>
            <div className="qk">{["0.1", "0.5", "1", "5"].map((n) => <button type="button" key={n} className={amount === n ? "on" : ""} onClick={() => setAmount(n)}>{n}</button>)}</div>
            <label className="fld"><span>Recipient</span><input placeholder="Wallet address" disabled /></label>
            <div className="lbl">Delay</div>
            <div className="tabs seg"><button type="button" className="on" disabled>Instant</button><button type="button" disabled>~15 min</button><button type="button" disabled>~1 hour</button><button type="button" disabled>Random</button></div>
            <div className="kv">
              <div><span>Amount</span><b><i className="sol" />{(Number(amount) || 0).toFixed(4)}</b></div>
              <div><span>Privacy fee 0.30%</span><b><i className="sol" />{fee.toFixed(4)}</b></div>
              <div><span>Network fee</span><b className="dim">not quoted</b></div>
            </div>
            <button className="go" type="submit">Coming soon</button>
            {note && <p className="dim" role="status">{note}</p>}
          </div></div>
        </form>
        <aside className="prev">
          <div className="brk pv"><span className="c1" /><span className="c2" />
            <div className="lbl">Route</div>
            <p className="muted">You → shielded pool → recipient. Drawn as a concept. No pool is connected.</p>
            <ol className="pss"><li>Deposit</li><li>Mix</li><li>Split</li><li>Withdraw</li></ol>
          </div>
          <div className="cards" style={{ marginTop: 16 }}>
            <div><b>Fund a launch wallet</b><p className="muted">Would pay a one-time launch wallet without linking it.</p></div>
            <div><b>Claim fees privately</b><p className="muted">Would send creator fees to a fresh address.</p></div>
            <div><b>Private cashback</b><p className="muted">Would pay cashback without a public link.</p></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
