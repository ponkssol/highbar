"use client";
import type { ReactNode } from "react";
import { TopBlock } from "@/components/TopBar";
import { Button, Card } from "@/components/ui";
import { Tabs } from "@/components/PageStates";
import { PillGroup } from "@/components/TabBar";
import { DEFAULT_SETTINGS, NETWORK, useSettings, type Explorer, type PriorityFee, type Theme } from "@/lib/settings";

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
          <Tabs<Theme> label="Theme" fade="surface" value={s.theme} onChange={(theme) => update({ theme })} options={[{ id: "light", label: "Light" }, { id: "dark", label: "Dark" }, { id: "system", label: "System" }]} />
        </Row>
        <Row title="Default slippage" hint="Used as the default in the trade panel.">
          <PillGroup label="Default slippage" value={s.slippagePct} onPick={(v) => update({ slippagePct: v })} itemClassName="num"
            options={[0.5, 1, 2, 5].map((v) => ({ id: v, label: `${v}%` }))}>
            <label className="num ml-0.5 flex h-8 items-center rounded-full bg-control px-3 text-[13px] text-ink-2 transition-colors focus-within:bg-control-hover focus-within:text-ink">
              <input className="num w-12 bg-transparent text-[13px] text-ink outline-none" inputMode="decimal" value={s.slippagePct} aria-label="Custom slippage in percent"
                onChange={(e) => { const v = Number(e.target.value.replace(/[^0-9.]/g, "")); if (!Number.isNaN(v) && v <= 50) update({ slippagePct: v }); }} />%
            </label>
          </PillGroup>
        </Row>
        <Row title="Priority fee" hint="Extra fee so transactions land faster.">
          <Tabs<PriorityFee> label="Priority fee" fade="surface" value={s.priorityFee} onChange={(priorityFee) => update({ priorityFee })} options={[{ id: "none", label: "None" }, { id: "low", label: "Low" }, { id: "high", label: "High" }]} />
        </Row>
        <Row title="Explorer" hint="Transaction and address links open here.">
          <Tabs<Explorer> label="Explorer" fade="surface" value={s.explorer} onChange={(explorer) => update({ explorer })} options={[{ id: "solscan", label: "Solscan" }, { id: "solana", label: "Solana Explorer" }, { id: "solanafm", label: "SolanaFM" }]} />
        </Row>
        <Row title="Network" hint={`highbar currently runs on ${NETWORK}.`}>
          <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm"><span className="h-2 w-2 rounded-full bg-buy" />{NETWORK === "mainnet" ? "Solana Mainnet" : "Solana Devnet"}</span>
        </Row>
        <Row title="Reset">
          <Button variant="secondary" size="sm" onClick={() => update(DEFAULT_SETTINGS)}>Reset to defaults</Button>
        </Row>
      </Card>
    </div>
  );
}