"use client";
import type { ReactNode } from "react";
import { TopBlock } from "@/components/TopBar";
import { Card } from "@/components/ui";
import { Tabs } from "@/components/PageStates";
import { DEFAULT_SETTINGS, useSettings, type Explorer, type PriorityFee, type Theme } from "@/lib/settings";

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-border py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div><div className="text-sm font-medium">{title}</div>{hint && <div className="text-xs text-ink-3">{hint}</div>}</div>
      <div>{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const [s, update] = useSettings();
  return (
    <div className="flex flex-col gap-4">
      <TopBlock title="Settings" />
      <Card className="px-5 py-1">
        <Row title="Theme" hint="Light, dark, or follow the system.">
          <Tabs<Theme> value={s.theme} onChange={(theme) => update({ theme })} options={[{ id: "light", label: "Light" }, { id: "dark", label: "Dark" }, { id: "system", label: "System" }]} />
        </Row>
        <Row title="Default slippage" hint="Used as the default in the trade panel.">
          <div className="flex items-center gap-2">
            {[0.5, 1, 2, 5].map((v) => (
              <button key={v} onClick={() => update({ slippagePct: v })}
                className={`num h-8 rounded-full border px-3 text-sm ${s.slippagePct === v ? "border-ink" : "border-border hover:bg-muted"}`}>{v}%</button>
            ))}
            <label className="flex h-8 items-center rounded-full border border-border px-3 focus-within:border-ink">
              <input className="num w-12 bg-transparent text-sm outline-none" inputMode="decimal" value={s.slippagePct}
                onChange={(e) => { const v = Number(e.target.value.replace(/[^0-9.]/g, "")); if (!Number.isNaN(v) && v <= 50) update({ slippagePct: v }); }} />%
            </label>
          </div>
        </Row>
        <Row title="Priority fee" hint="Extra fee so transactions land faster.">
          <Tabs<PriorityFee> value={s.priorityFee} onChange={(priorityFee) => update({ priorityFee })} options={[{ id: "none", label: "None" }, { id: "low", label: "Low" }, { id: "high", label: "High" }]} />
        </Row>
        <Row title="Explorer" hint="Transaction and address links open here.">
          <Tabs<Explorer> value={s.explorer} onChange={(explorer) => update({ explorer })} options={[{ id: "solscan", label: "Solscan" }, { id: "solana", label: "Solana Explorer" }, { id: "solanafm", label: "SolanaFM" }]} />
        </Row>
        <Row title="Network" hint="Higher Bar currently runs on devnet.">
          <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm"><span className="h-2 w-2 rounded-full bg-buy" />Solana Devnet</span>
        </Row>
        <Row title="Reset">
          <button onClick={() => update(DEFAULT_SETTINGS)} className="h-8 rounded-full border border-border px-3 text-sm hover:bg-muted">Reset to defaults</button>
        </Row>
      </Card>
    </div>
  );
}