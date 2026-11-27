"use client";
import type { ReactNode } from "react";
import { JtxSeg } from "@/components/JtxSeg";
import { DEFAULT_SETTINGS, NETWORK, useSettings, type Explorer, type PriorityFee, type Theme } from "@/lib/settings";

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="sr">
      <div><b>{title}</b>{hint && <p>{hint}</p>}</div>
      <div>{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const [s, update] = useSettings();
  const presets = [0.5, 1, 2, 5];
  const slipId = presets.includes(s.slippagePct) ? String(s.slippagePct) : "custom";
  return (
    <div className="sec"><div className="setl">
        <Row title="Theme" hint="Light, dark, or follow the system.">
          <JtxSeg<Theme> label="Theme" value={s.theme} onChange={(theme) => update({ theme })} options={[{ id: "light", label: "Light" }, { id: "dark", label: "Dark" }, { id: "system", label: "System" }]} />
        </Row>
        <Row title="Default slippage" hint="Used as the default in the trade panel.">
          <JtxSeg label="Default slippage" value={slipId} onChange={(id) => { if (id !== "custom") update({ slippagePct: Number(id) }); }}
            options={[{ id: "0.5", label: "0.5%" }, { id: "1", label: "1%" }, { id: "2", label: "2%" }, { id: "5", label: "5%" }, { id: "custom", label: "Custom" }]} />
        </Row>
        <Row title="Priority fee" hint="Extra fee so transactions land faster.">
          <JtxSeg<PriorityFee> label="Priority fee" value={s.priorityFee} onChange={(priorityFee) => update({ priorityFee })} options={[{ id: "none", label: "None" }, { id: "low", label: "Low" }, { id: "high", label: "High" }]} />
        </Row>
        <Row title="Explorer" hint="Transaction and address links open here.">
          <JtxSeg<Explorer> label="Explorer" value={s.explorer} onChange={(explorer) => update({ explorer })} options={[{ id: "solscan", label: "Solscan" }, { id: "solana", label: "Solana Explorer" }, { id: "solanafm", label: "SolanaFM" }]} />
        </Row>
        <Row title="Network" hint="highbar currently runs on mainnet.">
          <span className="mono" style={{ fontSize: 14 }}><i className="live" />{NETWORK === "mainnet" ? "Solana Mainnet" : "Solana Devnet"}</span>
        </Row>
        <Row title="Reset" hint="Restore every preference above.">
          <button type="button" className="ghost" onClick={() => update(DEFAULT_SETTINGS)}>Reset to defaults</button>
        </Row>
    </div></div>
  );
}