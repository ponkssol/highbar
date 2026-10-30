"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Check, ImagePlus, Lock, ShieldCheck } from "lucide-react";
import { TIERS, thresholdSolFor, type TierId } from "@hb/shared";
import { TopBlock } from "@/components/TopBar";
import { Avatar, Button, Card, ProgressBar, TierBadge } from "@/components/ui";
import { feeSplitPct, migrationFeePct, migrationMcapSol, postMigrationPct } from "@/lib/fees";
import {
  DEV_BUY_MAX_SOL, IMAGE_ACCEPT, NAME_MAX_BYTES, TICKER_MAX_BYTES, checkImage, cleanLabel, friendlyLaunchError, friendlyQuoteError,
  launchToken, quoteDevBuy, utf8Bytes, type DevBuyQuote, type LaunchStep,
} from "@/lib/launch";
import { useHbWallet, useSolBalance } from "@/lib/wallet";
import { useAuth } from "@/lib/auth";
import { NETWORK } from "@/lib/settings";
import { fmtBar, useBarInfo, useBarWallet } from "@/lib/bar";

const input = "h-10 w-full rounded border border-border bg-surface px-3 text-sm outline-none focus:border-ink";
const Field = ({ label, children, aside, note, error, id }: { label: string; children: React.ReactNode; aside?: React.ReactNode; note?: string; error?: string; id?: string }) => (
  <label className="block">
    <span className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px] text-ink-2"><span>{label}</span>{aside}</span>
    {children}
    {error ? <span id={id ? `${id}-msg` : undefined} role="alert" className="mt-1 block text-xs text-sell">{error}</span>
      : note ? <span id={id ? `${id}-msg` : undefined} className="mt-1 block text-xs text-ink-3">{note}</span> : null}
  </label>
);
/** Same rounding as the lock page (whole tokens, en-US grouping). */
const fmtTok = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const Counter = ({ used, max }: { used: number; max: number }) => (
  <span aria-live="polite" className={`num text-xs ${used > max ? "text-sell" : "text-ink-3"}`}>{used} of {max} bytes</span>
);

export default function LaunchPage() {
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [desc, setDesc] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [socials, setSocials] = useState({ website: "", twitter: "", telegram: "" });
  const [tier, setTier] = useState<TierId>("standard");
  const [anti, setAnti] = useState(false); // anti-sniper is opt-in (off by default)
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [devBuy, setDevBuy] = useState("0");
  const [q, setQ] = useState<DevBuyQuote | null>(null);
  const [qErr, setQErr] = useState("");
  const [launched, setLaunched] = useState<{ mint: string; signature: string } | null>(null);
  const [touched, setTouched] = useState<{ name?: boolean; ticker?: boolean }>({});
  const [tried, setTried] = useState(false);
  const [imgErr, setImgErr] = useState("");
  const [tickerNote, setTickerNote] = useState("");
  const wallet = useHbWallet();
  const router = useRouter();
  const auth = useAuth();
  const f = feeSplitPct(tier);
  // $HIGHER utility: Max tier launches need MAX_TIER_MIN_BAR (the API enforces it too on /tx/launch).
  const barInfo = useBarInfo().data;
  const barWallet = useBarWallet(wallet.address).data;
  // GET /bar mirrors launchGate. gateMaxTier is the raw flag, maxTierBlocked means the gate is on but $HIGHER has no mint yet, so every Max launch is rejected.
  const maxGated = !!barInfo?.gateMaxTier;
  const maxBlocked = !!barInfo?.maxTierBlocked;
  const maxLocked = maxBlocked || (maxGated && !barWallet?.maxTierAccess);
  const minBar = fmtBar(barInfo?.maxTierMinBar ?? 0);
  const maxNeed = maxBlocked ? "Max opens after $HIGHER launches" : wallet.address ? `Hold ${minBar} $HIGHER to launch on Max` : `Connect a wallet holding ${minBar} $HIGHER to launch on Max`;
  const maxOpen = `Open to every creator until $HIGHER launches, then it needs ${minBar} $HIGHER`;
  useEffect(() => { if (maxLocked && tier === "max") setTier("standard"); }, [maxLocked, tier]);
  const nameBytes = utf8Bytes(cleanLabel(name)), tickerBytes = utf8Bytes(cleanLabel(ticker));
  const errs = {
    name: !cleanLabel(name) ? "Enter a token name." : nameBytes > NAME_MAX_BYTES ? `Name is ${nameBytes} bytes, the limit is ${NAME_MAX_BYTES}. Emoji and accented letters use more than one byte.` : "",
    ticker: !cleanLabel(ticker) ? "Enter a ticker." : tickerBytes > TICKER_MAX_BYTES ? `Ticker is ${tickerBytes} characters, the limit is ${TICKER_MAX_BYTES}.` : "",
  };
  const shown = (k: "name" | "ticker") => (touched[k] || tried ? errs[k] : "");
  const invalid = !!(errs.name || errs.ticker || imgErr);
  const balance = useSolBalance(wallet.publicKey, wallet.connection);
  const devSol = Number(devBuy) || 0;
  const LAUNCH_COST_SOL = 0.03; // rent for mint, pool, vaults, metadata + network fees (simulated ~0.021)
  const needSol = devSol + LAUNCH_COST_SOL;
  const lowBalance = balance !== null && balance < needSol;
  const capSol = Math.min(DEV_BUY_MAX_SOL, thresholdSolFor(tier, NETWORK), q?.maxDevBuySol ?? Infinity);
  const overMax = devSol > capSol;
  useEffect(() => {
    let alive = true;
    setQErr("");
    if (!(devSol > 0) || devSol > capSol) { setQ(null); return; }
    const id = setTimeout(() => {
      quoteDevBuy(tier, anti, devSol).then((r) => alive && setQ(r)).catch((e) => alive && (setQ(null), setQErr((e as Error).message)));
    }, 300);
    return () => { alive = false; clearTimeout(id); };
  }, [tier, anti, devSol, capSol]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const dropImage = (err: string) => { setImgErr(err); setImage(null); setPreview(null); };
  const onFile = async (file?: File) => {
    if (!file) return;
    const err = await checkImage(file);
    if (err) return dropImage(err);
    setImgErr("");
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };
  const onTicker = (raw: string) => {
    const up = raw.toUpperCase();
    const dropped = [...new Set(up.replace(/[A-Z0-9]/g, ""))].map((c) => (c.trim() ? c : "spaces"));
    const list = dropped.length > 1 ? `${dropped.slice(0, -1).join(", ")} and ${dropped[dropped.length - 1]}` : dropped[0];
    setTickerNote(list ? `Left out ${list}. Tickers use letters A to Z and digits 0 to 9.` : "");
    setTicker(up.replace(/[^A-Z0-9]/g, ""));
  };
  const submit = async () => {
    setTried(true); setLaunched(null);
    setMsg("");
    if (invalid) return;
    setBusy(true);
    try {
      if (!wallet.publicKey) { setMsg("Connect your wallet first."); return; }
      if (!(await auth.ensureVerified())) { setMsg("Sign in with your wallet before launching."); return; }
      if (overMax) { setMsg(`Dev buy is capped at ${capSol} SOL.`); return; }
      if (lowBalance) { setMsg(`Not enough SOL: you need about ${needSol.toFixed(3)} SOL for the dev buy plus launch rent and fees.`); return; }
      if (tier === "max" && maxLocked) { setMsg(`${maxNeed}.`); return; }
      const steps: Record<LaunchStep, string> = { metadata: "Uploading metadata…", mint: "Preparing your token address…", sign: "Approve the launch in your wallet…", cosign: "Finalizing your …high address…", send: "Sending…" };
      const r = await launchToken({ name: cleanLabel(name), ticker: cleanLabel(ticker), description: desc, image, ...socials, tier, antiSniper: anti, devBuySol: devSol }, wallet.publicKey.toBase58(),
        { sign: (tx) => wallet.signTransaction(tx), sendRaw: (b) => wallet.sendRaw(b) }, (s) => setMsg(steps[s]));
      setLaunched({ mint: r.mint, signature: r.signature });
      setMsg(`Launched ${devSol > 0 ? `with a ${devSol} SOL dev buy ` : ""}(tx ${r.signature.slice(0, 8)})${r.vanity ? "" : " with a standard (non-…high) address"}. Opening the token page...`);
      // Wait (max ~20s) until the indexer has the new pool so the token page shows live data, then redirect.
      for (let i = 0; i < 10; i++) { if (await api.token(r.mint).then(() => true).catch(() => false)) break; await new Promise((res) => setTimeout(res, 2000)); }
      router.push(`/token/${r.mint}`);
    } catch (e) {
      setMsg(`Launch failed. ${friendlyLaunchError((e as Error).message)}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col gap-4">
      <TopBlock title="Launch a token" />
      <div className="flex flex-col items-start gap-6 lg:flex-row">
        <Card className="w-full min-w-0 flex-1 space-y-5 p-6">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" id="launch-name" aside={<Counter used={nameBytes} max={NAME_MAX_BYTES} />} error={shown("name")}>
              <input id="launch-name" className={`${input} ${shown("name") ? "border-sell" : ""}`} value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                placeholder="Bar Raiser" required aria-required aria-invalid={!!shown("name")} aria-describedby={shown("name") ? "launch-name-msg" : undefined} />
            </Field>
            <Field label="Ticker" id="launch-ticker" aside={<Counter used={tickerBytes} max={TICKER_MAX_BYTES} />} error={shown("ticker")}
              note={tickerNote || "Letters A to Z and digits 0 to 9, uppercased for you."}>
              <input id="launch-ticker" className={`${input} num uppercase ${shown("ticker") ? "border-sell" : ""}`} value={ticker} onChange={(e) => onTicker(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, ticker: true }))}
                placeholder="RAISE" autoCapitalize="characters" spellCheck={false} required aria-required aria-invalid={!!shown("ticker")} aria-describedby="launch-ticker-msg" />
            </Field>
          </div>
          <Field label="Image" id="launch-image" error={imgErr} aside={imgErr ? <button type="button" onClick={() => setImgErr("")} className="text-xs text-ink-3 hover:underline">Launch without an image</button> : undefined} note="PNG, JPG, WEBP or GIF, up to 2 MB.">
            <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void onFile(e.dataTransfer.files[0]); }}
              className={`flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded border border-dashed bg-muted text-sm text-ink-3 hover:border-ink ${imgErr ? "border-sell" : "border-border-strong"}`}>
              {preview ? <img src={preview} alt={`${cleanLabel(name) || "Token"} image preview`} className="h-20 w-20 rounded-full object-cover" onError={() => dropImage("This image could not be read. Try another file.")} /> : <ImagePlus size={22} strokeWidth={1.5} aria-hidden />}
              <span>{image ? image.name : "Drop image or click to upload"}</span>
              <input type="file" accept={IMAGE_ACCEPT} aria-label="Token image" aria-invalid={!!imgErr} aria-describedby="launch-image-msg" className="hidden"
                onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
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
            <div role="radiogroup" aria-label="Tier" className="grid grid-cols-3 gap-3">
              {(Object.keys(TIERS) as TierId[]).map((id) => {
                const s = feeSplitPct(id); const sel = tier === id; const locked = id === "max" && maxLocked;
                return (
                  <button key={id} type="button" role="radio" aria-checked={sel} aria-disabled={locked} title={locked ? maxNeed : undefined} onClick={() => !locked && setTier(id)}
                    className={`relative rounded p-3 text-left ${sel ? "border-[1.5px] border-ink" : "border border-border hover:bg-muted"} ${locked ? "cursor-not-allowed opacity-60" : ""}`}>
                    {sel && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-on-ink"><Check size={12} /></span>}
                    <TierBadge tier={id} />
                    <div className="num mt-2 text-xl font-semibold">{thresholdSolFor(id, NETWORK)} SOL</div>
                    {locked && maxBlocked && <span data-testid="soon-chip" className="num absolute right-2 top-2 inline-flex h-6 items-center rounded-full border border-gold-line bg-gold-soft px-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-gold-text">Soon</span>}
                    {locked && <div className="mt-1 flex items-center gap-1 text-xs text-ink-3"><Lock size={12} aria-hidden />{maxNeed}</div>}
                    {id === "max" && !maxGated && <div className="mt-1 text-xs text-ink-3">{maxOpen}</div>}
                    <div className="num mt-1 text-xs text-ink-3">~{migrationMcapSol(id, NETWORK).toLocaleString("en-US", { maximumFractionDigits: 2 })} SOL mcap at migration</div>
                    <div className="num mt-1 text-xs text-ink-3">creator {s.creator}%, then {postMigrationPct(id).creator}% after migration</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-start justify-between gap-4 rounded border border-border p-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium"><ShieldCheck size={16} strokeWidth={1.5} />Anti-sniper</div>
              <div className="mt-0.5 text-[13px] text-ink-3" role="status" aria-live="polite" data-testid="anti-sniper-info">
                {anti ? "Anti-sniper on: first-minute buys pay up to 25%, falling to 1% over 60 seconds." : "Anti-sniper off: early bots pay the normal 1% fee. Turn on to tax first-minute buys up to 25%."}
              </div>
            </div>
            <button type="button" role="switch" aria-checked={anti} aria-label="Anti-sniper" onClick={() => setAnti(!anti)}
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${anti ? "bg-ink" : "bg-border-strong"}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-surface transition-all ${anti ? "left-[18px]" : "left-0.5"}`} />
            </button>
          </div>
          <div className="rounded border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Dev buy (optional)</span>
              {balance !== null && <span className="num text-xs text-ink-3">Balance {balance.toFixed(3)} SOL</span>}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex h-10 flex-1 items-center rounded border border-border bg-surface px-3 focus-within:border-ink">
                <input aria-label="Dev buy amount in SOL" className="num w-full bg-transparent text-sm outline-none" inputMode="decimal" value={devBuy}
                  onChange={(e) => setDevBuy(e.target.value.replace(/[^0-9.]/g, "").replace(/^\./, "0."))} placeholder="0.0" />
                <span className="text-sm text-ink-3">SOL</span>
              </div>
              {["0", "0.1", "0.5", "1"].map((p) => (
                <button key={p} type="button" onClick={() => setDevBuy(p)}
                  className={`num h-10 rounded-full border px-3 text-sm ${devBuy === p ? "border-ink" : "border-border hover:bg-muted"}`}>{p}</button>
              ))}
            </div>
            {devSol > 0 && (
              <div className="mt-2 space-y-0.5 text-[13px]" aria-live="polite">
                {overMax ? <div role="alert" className="text-sell">Dev buy is capped at {capSol} SOL. Lower it to see how much of the supply you get.</div> : q ? (
                  <>
                    <div>You receive <span className="num font-medium">~{fmtTok(q.estTokens)} ${ticker || "TOKEN"}</span> <span className="num text-ink-3">({q.supplyPct.toFixed(2)}% of supply)</span></div>
                    <div className="num text-ink-3">Fee {q.feePct.toFixed(2)}% (~{q.feeSol.toFixed(4)} SOL){anti && !q.minFeeApplied ? " (anti-sniper starting fee applies to the dev buy)" : ""}</div>
                  </>
                ) : <div className={qErr ? "text-sell" : "text-ink-3"}>{qErr ? friendlyQuoteError(qErr, capSol) : "Quoting…"}</div>}
                {lowBalance && <div className="text-sell">Not enough SOL: about {needSol.toFixed(3)} SOL needed including launch rent and fees.</div>}
              </div>
            )}
            <div className="mt-2 text-xs text-ink-3">Bought in the same transaction as launch (Block 0), so nobody can buy before you.</div>
          </div>          <dl className="space-y-1.5 rounded border border-border bg-muted p-3 text-sm">
            <div className="flex justify-between"><dt className="text-ink-3">Curve fee</dt><dd className="num">{f.total}%</dd></div>
            <div className="flex justify-between"><dt className="text-ink-3">Creator, platform and Meteora</dt><dd className="num">{f.creator}%, {f.platform}%, {f.meteora}%</dd></div>
            <div className="flex justify-between"><dt className="text-ink-3">After migration (1% pool fee)</dt><dd className="num">{postMigrationPct(tier).creator}%, {postMigrationPct(tier).platform}%, {postMigrationPct(tier).protocol}%</dd></div>
            <div className="flex justify-between"><dt className="text-ink-3">Migration fee (creator share)</dt><dd className="num">{migrationFeePct(tier).fee}% ({migrationFeePct(tier).creatorShare}%)</dd></div>
            <div className="flex justify-between"><dt className="text-ink-3">Migrates at</dt><dd className="num">{thresholdSolFor(tier, NETWORK)} SOL (~{migrationMcapSol(tier, NETWORK).toLocaleString("en-US", { maximumFractionDigits: 2 })} SOL mcap)</dd></div>
          </dl>
          <Button className="w-full" disabled={busy} onClick={submit}>{busy ? "Launching…" : "Launch"}</Button>
          {tried && invalid && <p role="alert" className="text-sm text-sell">Fix the fields marked in red first.</p>}
          {msg && <p role="status" className="text-sm text-ink-2">{msg}</p>}
          {launched && <Link href={`/token/${launched.mint}`} className="inline-flex h-10 items-center rounded bg-ink px-4 text-sm font-medium text-on-ink hover:opacity-90">View token page</Link>}
        </Card>
        <div className="w-full lg:sticky lg:top-4 lg:w-[360px] lg:shrink-0">
          <h2 className="mb-2 text-[13px] font-normal text-ink-3">Preview</h2>
          <Card highlight className="p-5">
            <div className="flex items-center gap-3">
              {preview ? <img src={preview} alt={`${cleanLabel(name) || "Token"} image preview`} className="h-10 w-10 rounded-full object-cover" /> : <Avatar name={name || "??"} size={40} />}
              <div><div className="font-medium">{name || "Token name"}</div><div className="num text-xs text-hl-sub">${ticker || "TICKER"}</div></div>
              {anti && <ShieldCheck size={16} strokeWidth={1.5} className="ml-auto text-hl-sub" aria-label="Anti-sniper on" />}
            </div>
            <p className="mt-3 line-clamp-3 text-sm text-hl-sub">{desc || "Description shows here."}</p>
            <div className="mt-4"><div className="h-1.5 rounded-full bg-ink-2"><div className="h-1.5 w-0 rounded-full bg-on-ink" /></div>
              <div className="num mt-1 flex justify-between text-xs text-hl-sub"><span>0%</span><span>0 of {thresholdSolFor(tier, NETWORK)} SOL</span></div></div>
          </Card>
          <Card className="mt-3"><div className="flex items-center justify-between text-sm"><TierBadge tier={tier} /><span className="num text-ink-3">$0 mcap</span></div><div className="mt-3"><ProgressBar value={0} tier={tier} /></div></Card>
        </div>
      </div>
    </div>
  );
}