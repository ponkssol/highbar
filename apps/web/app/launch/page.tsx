"use client";
import { useState } from "react";
import { Check, ImagePlus, ShieldCheck } from "lucide-react";
import { TIERS, type TierId } from "@hb/shared";
import { TopBlock } from "@/components/TopBar";
import { Avatar, Button, Card, ProgressBar, TierBadge } from "@/components/ui";
import { feeSplitPct } from "@/lib/fees";
import { launchToken } from "@/lib/launch";

const input = "h-10 w-full rounded border border-border bg-surface px-3 text-sm outline-none focus:border-ink";
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block"><span className="mb-1.5 block text-[13px] text-ink-2">{label}</span>{children}</label>
);

export default function LaunchPage() {
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [desc, setDesc] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [socials, setSocials] = useState({ website: "", twitter: "", telegram: "" });
  const [tier, setTier] = useState<TierId>("standard");
  const [anti, setAnti] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const f = feeSplitPct(tier);

  const onFile = (file?: File) => {
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };
  const submit = async () => {
    setBusy(true); setMsg("");
    try {
      const r = await launchToken({ name, ticker, description: desc, image, ...socials, tier, antiSniper: anti });
      setMsg(`Stub launch ok (mint ${r.mint.slice(0, 8)}…). API not wired yet.`);
    } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col gap-4">
      <TopBlock title="Launch a token" />
      <div className="flex flex-col items-start justify-center gap-6 lg:flex-row">
        <Card className="w-full max-w-[640px] space-y-5 p-6">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name"><input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Bar Raiser" maxLength={32} /></Field>
            <Field label="Ticker"><input className={`${input} num uppercase`} value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="RAISE" maxLength={10} /></Field>
          </div>
          <Field label="Image">
            <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}
              className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded border border-dashed border-border-strong bg-muted text-sm text-ink-3 hover:border-ink">
              {preview ? <img src={preview} alt="" className="h-20 w-20 rounded-full object-cover" /> : <ImagePlus size={22} strokeWidth={1.5} />}
              <span>{image ? image.name : "Drop image or click to upload"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            </div>
          </Field>
          <Field label="Description"><textarea className={`${input} h-24 py-2`} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What is this token about?" /></Field>
          <div className="grid grid-cols-3 gap-3">
            {(["website", "twitter", "telegram"] as const).map((k) => (
              <Field key={k} label={k[0].toUpperCase() + k.slice(1)}>
                <input className={input} value={socials[k]} onChange={(e) => setSocials({ ...socials, [k]: e.target.value })} placeholder={k === "website" ? "https://" : "@handle"} />
              </Field>
            ))}
          </div>
          <div>
            <span className="mb-1.5 block text-[13px] text-ink-2">Tier</span>
            <div role="radiogroup" className="grid grid-cols-3 gap-3">
              {(Object.keys(TIERS) as TierId[]).map((id) => {
                const s = feeSplitPct(id); const sel = tier === id;
                return (
                  <button key={id} role="radio" aria-checked={sel} onClick={() => setTier(id)}
                    className={`relative rounded p-3 text-left ${sel ? "border-[1.5px] border-ink" : "border border-border hover:bg-muted"}`}>
                    {sel && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-on-ink"><Check size={12} /></span>}
                    <TierBadge tier={id} />
                    <div className="num mt-2 text-xl font-semibold">{TIERS[id].migrationQuoteThresholdSol} SOL</div>
                    <div className="num mt-1 text-xs text-ink-3">creator {s.creator}% · platform {s.platform}%</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-start justify-between gap-4 rounded border border-border p-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium"><ShieldCheck size={16} strokeWidth={1.5} />Anti-sniper</div>
              <div className="mt-0.5 text-[13px] text-ink-3">Fee 25% turun ke 1% dalam 60 detik pertama</div>
            </div>
            <button role="switch" aria-checked={anti} onClick={() => setAnti(!anti)}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${anti ? "bg-ink" : "bg-border-strong"}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-surface transition-all ${anti ? "left-[18px]" : "left-0.5"}`} />
            </button>
          </div>
          <dl className="space-y-1.5 rounded border border-border bg-muted p-3 text-sm">
            <div className="flex justify-between"><dt className="text-ink-3">Curve fee</dt><dd className="num">{f.total}%</dd></div>
            <div className="flex justify-between"><dt className="text-ink-3">Meteora / creator / platform</dt><dd className="num">{f.meteora}% / {f.creator}% / {f.platform}%</dd></div>
            <div className="flex justify-between"><dt className="text-ink-3">Graduates at</dt><dd className="num">{TIERS[tier].migrationQuoteThresholdSol} SOL</dd></div>
          </dl>
          <Button className="w-full" disabled={!name || !ticker || busy} onClick={submit}>{busy ? "Launching…" : "Launch"}</Button>
          {msg && <p className="text-sm text-ink-2">{msg}</p>}
        </Card>
        <div className="w-full max-w-[360px] lg:sticky lg:top-4">
          <div className="mb-2 text-[13px] text-ink-3">Preview</div>
          <Card highlight className="p-5">
            <div className="flex items-center gap-3">
              {preview ? <img src={preview} alt="" className="h-10 w-10 rounded-full object-cover" /> : <Avatar name={name || "??"} size={40} />}
              <div><div className="font-medium">{name || "Token name"}</div><div className="num text-xs text-hl-sub">${ticker || "TICKER"}</div></div>
              {anti && <ShieldCheck size={16} strokeWidth={1.5} className="ml-auto text-hl-sub" />}
            </div>
            <p className="mt-3 line-clamp-3 text-sm text-hl-sub">{desc || "Description shows here."}</p>
            <div className="mt-4"><div className="h-1.5 rounded-full bg-ink-2"><div className="h-1.5 w-0 rounded-full bg-on-ink" /></div>
              <div className="num mt-1 flex justify-between text-xs text-hl-sub"><span>0%</span><span>0 / {TIERS[tier].migrationQuoteThresholdSol} SOL</span></div></div>
          </Card>
          <Card className="mt-3"><div className="flex items-center justify-between text-sm"><TierBadge tier={tier} /><span className="num text-ink-3">$0 mcap</span></div><div className="mt-3"><ProgressBar value={0} tier={tier} /></div></Card>
        </div>
      </div>
    </div>
  );
}