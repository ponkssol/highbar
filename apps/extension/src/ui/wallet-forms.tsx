import { useState } from "react";
import { send } from "../lib/messages";
import { Button, Copy, Eyebrow, Field, INPUT, Note, TabBar, errText } from "./components/ui";

export function DedicatedWarning() {
  return (
    <Note kind="warn">
      <strong className="text-ink">Use a dedicated launch wallet.</strong> This wallet signs launches with one click from x.com. Keep only the SOL you plan to launch with in it and never import your main wallet.
    </Note>
  );
}

/** One time step for a wallet made before the no-password update: the old password opens it once and it is re-encrypted with this browser's device key. */
export function MigrateForm({ id, onDone }: { id?: string; onDone?: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true); setErr(null);
    try { await send({ type: "wallet:migrate", password: pw, ...(id ? { id } : {}) }); setPw(""); onDone?.(); } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void go(); }}>
      <div className="text-[12.5px] leading-relaxed text-ink-2">The wallet no longer uses a password or locks. Enter your old password one last time to move the key to this browser's device key.</div>
      <Field label="Old wallet password">
        <input type="password" autoFocus autoComplete="current-password" className={INPUT} value={pw} onChange={(e) => setPw(e.target.value)} data-testid="migrate-password" />
      </Field>
      {err && <Note kind="error">{err}</Note>}
      <Button kind="gold" type="submit" className="w-full" disabled={!pw || busy}>{busy ? "Updating…" : "Finish the update"}</Button>
    </form>
  );
}

/** First wallet setup, and Add wallet (with `adding`: an optional label field and a Cancel button). */
export function Onboard({ onDone, onBackup, onCancel, adding }: { onDone: () => void; onBackup?: () => void; onCancel?: () => void; adding?: { nextLabel: string } }) {
  const [mode, setMode] = useState<"create" | "import">("create");
  const [input, setInput] = useState("");
  const [label, setLabel] = useState("");
  const [words, setWords] = useState<12 | 24>(12);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [backup, setBackup] = useState<{ address: string; mnemonic: string } | null>(null);
  const [saved, setSaved] = useState(false);

  const go = async () => {
    setBusy(true); setErr(null);
    try {
      const lab = label.trim() ? { label: label.trim() } : {};
      if (mode === "create") { onBackup?.(); setBackup(await send({ type: "wallet:create", words, ...lab })); }
      else { await send({ type: "wallet:import", input, ...lab }); setInput(""); onDone(); }
    } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };

  if (backup) return (
    <div className="space-y-3">
      <Eyebrow>Back up your recovery phrase</Eyebrow>
      <Note kind="warn">Write these words down in order and keep them offline. This is the only time they are shown. Anyone with them controls the wallet.</Note>
      <ol className="grid grid-cols-3 gap-1.5 rounded-lg border border-border bg-muted p-3 font-mono text-[12px]" data-testid="seed-words">
        {backup.mnemonic.split(" ").map((w, i) => <li key={i} className="flex gap-1.5"><span className="w-4 text-right text-ink-3">{i + 1}</span><span className="text-ink">{w}</span></li>)}
      </ol>
      <div className="flex justify-between text-[12px]"><span className="font-mono text-ink-3">{backup.address}</span></div>
      <label className="flex items-center gap-2 text-[12.5px] text-ink-2"><input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="accent-[#FFC72C]" />I saved the recovery phrase</label>
      <Button kind="gold" className="w-full" disabled={!saved} onClick={() => { setBackup(null); onDone(); }}>Done</Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {!adding && <DedicatedWarning />}
      <TabBar full label="Wallet setup" value={mode} onChange={(m) => { setMode(m); setErr(null); }} tabs={[{ id: "create", label: "Create new" }, { id: "import", label: "Import existing" }]} />
      {mode === "create" ? (
        <Field label="Recovery phrase length">
          <TabBar label="Words" value={String(words) as "12" | "24"} onChange={(v) => setWords(Number(v) as 12 | 24)} tabs={[{ id: "12", label: "12 words" }, { id: "24", label: "24 words" }]} />
        </Field>
      ) : (
        <Field label="Private key or recovery phrase" tip="A base58 private key (as exported by Phantom or Solflare), a JSON key array, or a 12 or 24 word phrase. Phrases use the Phantom path m/44'/501'/0'/0'.">
          <textarea className={`${INPUT} h-20 resize-none font-mono text-[12px]`} spellCheck={false} autoComplete="off" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste here" />
        </Field>
      )}
      {adding && (
        <Field label="Label" hint="Optional. You can rename it later">
          <input className={INPUT} maxLength={24} placeholder={adding.nextLabel} value={label} onChange={(e) => setLabel(e.target.value)} data-testid="add-label" />
        </Field>
      )}
      {err && <Note kind="error">{err}</Note>}
      <div className="flex gap-2">
        {onCancel && <Button className="flex-1" disabled={busy} onClick={onCancel}>Cancel</Button>}
        <Button kind="gold" className="flex-1" disabled={busy || (mode === "import" && !input.trim())} onClick={() => void go()}>
          {busy ? "Saving…" : mode === "create" ? "Create wallet" : "Import wallet"}
        </Button>
      </div>
      <div className="text-center text-[11.5px] leading-relaxed text-ink-3">No password and no lock. The key is encrypted on this device with a browser key that cannot be exported.</div>
    </div>
  );
}

export function ExportBox({ id }: { id: string }) {
  const [sure, setSure] = useState(false);
  const [out, setOut] = useState<{ privateKey: string; mnemonic: string | null } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (out) return (
    <div className="space-y-2">
      <Note kind="warn">Anyone with this can spend from the wallet. Close it when you are done.</Note>
      {out.mnemonic && <div className="rounded-[10px] border border-border bg-muted p-2.5 font-mono text-[12px] text-ink">{out.mnemonic}<div className="mt-1 text-right"><Copy text={out.mnemonic} /></div></div>}
      <div className="break-all rounded-[10px] border border-border bg-muted p-2.5 font-mono text-[11.5px] text-ink">{out.privateKey}<div className="mt-1 text-right"><Copy text={out.privateKey} /></div></div>
      <Button className="w-full" onClick={() => { setOut(null); setSure(false); }}>Hide</Button>
    </div>
  );
  return (
    <div className="space-y-2">
      <label className="flex items-start gap-2 text-[12.5px] text-ink-2"><input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} className="mt-0.5 accent-[#FFC72C]" data-testid="export-confirm" />
        <span>Show the key on screen. Nobody is watching and I will not paste it into any site</span></label>
      <Button className="w-full" disabled={!sure} onClick={async () => { setErr(null); try { setOut(await send({ type: "wallet:export", confirm: true, id })); } catch (x) { setErr(errText(x)); } }}>Reveal key</Button>
      {err && <Note kind="error">{err}</Note>}
    </div>
  );
}

export function RemoveWallet({ id, label, last }: { id: string; label: string; last: boolean }) {
  const [sure, setSure] = useState(false); const [err, setErr] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <div className="text-[12.5px] text-ink-3">{last ? "Deletes the encrypted key and this browser's device key." : `Deletes the encrypted key of ${label} from this browser. Your other wallets stay.`} Export or back it up first.</div>
      <label className="flex items-center gap-2 text-[12.5px] text-ink-2"><input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} className="accent-[#E06A5C]" data-testid="remove-confirm" />I have a backup</label>
      <Button kind="danger" className="w-full" disabled={!sure} onClick={async () => { try { await send({ type: "wallet:remove", confirm: true, id }); } catch (x) { setErr(errText(x)); } }}>Remove {label}</Button>
      {err && <Note kind="error">{err}</Note>}
    </div>
  );
}
