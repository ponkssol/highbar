"use client";
import { useEffect, useState, type ReactNode } from "react";
import { NETWORK, useSettings, type Explorer, type PriorityFee, type Theme } from "@/lib/settings";
import { Href } from "./ui";
import { MeteoraMark } from "./mlogo";

const THEMES: { id: Theme; label: string }[] = [{ id: "light", label: "Light" }, { id: "dark", label: "Dark" }, { id: "system", label: "System" }];
const SLIPS = [0.5, 1, 2, 5];
const FEES: { id: PriorityFee; label: string }[] = [{ id: "none", label: "None" }, { id: "low", label: "Low" }, { id: "high", label: "High" }];
const EXPLORERS: { id: Explorer; label: string }[] = [{ id: "solscan", label: "Solscan" }, { id: "solana", label: "Solana Explorer" }, { id: "solanafm", label: "SolanaFM" }];

export function V2Settings() {
  const [s, update] = useSettings();
  const [tab, setTab] = useState<"prefs" | "about">("prefs");
  const [hide, setHide] = useState(false);
  const [mask, setMask] = useState(false);
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("hb-v2-prefs") || "{}") as { hide?: boolean; mask?: boolean };
      setHide(!!raw.hide); setMask(!!raw.mask);
    } catch { /* ignore */ }
  }, []);
  const save = (patch: { hide?: boolean; mask?: boolean }) => {
    const next = { hide, mask, ...patch };
    setHide(next.hide); setMask(next.mask);
    try { localStorage.setItem("hb-v2-prefs", JSON.stringify(next)); } catch { /* ignore */ }
    document.querySelector(".jtx")?.classList.toggle("pv-hide", !!next.hide);
  };
  useEffect(() => { document.querySelector(".jtx")?.classList.toggle("pv-hide", hide); }, [hide]);

  return (
    <div className="frame">
      <div className="phead">
        <div><div className="bul">Settings</div><h1 className="h1">Make it <span>yours.</span></h1></div>
        <div className="tabs seg">
          <button type="button" className={tab === "prefs" ? "on" : ""} onClick={() => setTab("prefs")}>Preferences</button>
          <button type="button" className={tab === "about" ? "on" : ""} onClick={() => setTab("about")}>About</button>
        </div>
      </div>
      {tab === "prefs" ? (
        <div className="sec"><div className="setl">
          <Row title="Theme" text="Light, dark, or follow the system.">
            <div className="tabs seg">{THEMES.map((t) => <button type="button" key={t.id} className={s.theme === t.id ? "on" : ""} onClick={() => update({ theme: t.id })}>{t.label}</button>)}</div>
          </Row>
          <Row title="Default slippage" text="Used by the trade panel on the new UI.">
            <div className="tabs seg">
              {SLIPS.map((n) => <button type="button" key={n} className={s.slippagePct === n ? "on" : ""} onClick={() => update({ slippagePct: n })}>{n}%</button>)}
              <label className="mono" style={{ display: "inline-flex", alignItems: "center", padding: "0 8px" }}>
                <input aria-label="Custom slippage in percent" inputMode="decimal" value={s.slippagePct} style={{ width: 48, background: "transparent", border: 0, color: "inherit" }} onChange={(e) => { const v = Number(e.target.value.replace(/[^0-9.]/g, "")); if (!Number.isNaN(v) && v <= 50) update({ slippagePct: v }); }} />%
              </label>
            </div>
          </Row>
          <Row title="Priority fee" text="Stored for transactions. None, low or high.">
            <div className="tabs seg">{FEES.map((f) => <button type="button" key={f.id} className={s.priorityFee === f.id ? "on" : ""} onClick={() => update({ priorityFee: f.id })}>{f.label}</button>)}</div>
          </Row>
          <Row title="Explorer" text="Where transaction links open.">
            <div className="tabs seg">{EXPLORERS.map((e) => <button type="button" key={e.id} className={s.explorer === e.id ? "on" : ""} onClick={() => update({ explorer: e.id })}>{e.label}</button>)}</div>
          </Row>
          <Row title="Network" text="The cluster this app is configured to use.">
            <span className="mono"><i className="live" />{NETWORK === "mainnet" ? "Solana Mainnet" : "Solana Devnet"}</span>
          </Row>
          <Row title="Hide balances" text="Blurs balance figures in this UI.">
            <button type="button" className="sw" role="switch" aria-checked={hide} onClick={() => save({ hide: !hide })}><i /></button>
          </Row>
          <Row title="Mask wallet address" text="A display preference only. It does not change what is on-chain.">
            <button type="button" className="sw" role="switch" aria-checked={mask} onClick={() => save({ mask: !mask })}><i /></button>
          </Row>
          <Row title="Reset" text="Restores slippage, priority fee, explorer and theme to their defaults.">
            <button type="button" className="btn sm" onClick={() => update({ theme: "system", slippagePct: 1, priorityFee: "none", explorer: "solscan" })}><b>Reset</b></button>
          </Row>
        </div></div>
      ) : (
        <div className="sec"><div className="setl">
          <Row title="Version" text="New UI preview, same backend as the current site."><span className="mono">v2 preview</span></Row>
          <Row title="Built on" text="Dynamic Bonding Curve and DAMM v2."><span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>Meteora <MeteoraMark className="mlogo" /></span></Row>
          <Row title="Open Book" text="Every fee, reconciled against chain."><Href className="btn sm" canonical="/open-book"><b>Open</b><i>→</i></Href></Row>
          <Row title="Docs" text="How tiers, fees, locks and migration work."><Href className="btn sm" canonical="/docs"><b>Read</b><i>→</i></Href></Row>
          <Row title="Terms and risk" text="Memecoins are volatile. Nothing here is financial advice."><Href canonical="/terms">Terms</Href></Row>
        </div></div>
      )}
    </div>
  );
}

function Row({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return <div className="sr"><div><b>{title}</b><p>{text}</p></div>{children}</div>;
}
