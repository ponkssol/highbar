"use client";
import { SolAmt } from "@/components/Sol";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { TIERS, thresholdSolFor, type TierId } from "@hb/shared";
import { TopBlock } from "@/components/TopBar";
import { InfoTip } from "@/components/InfoTip";
import { feeSplitPct, migrationFeePct, migrationMcapSol, postMigrationPct } from "@/lib/fees";
import {
  DEV_BUY_MAX_SOL, IMAGE_ACCEPT, NAME_MAX_BYTES, TICKER_MAX_BYTES, checkImage, cleanLabel, friendlyLaunchError, friendlyQuoteError,
  launchToken, quoteDevBuy, utf8Bytes, type DevBuyQuote, type LaunchStep,
} from "@/lib/launch";
import { useHbWallet, useSolBalance } from "@/lib/wallet";
import { useAuth } from "@/lib/auth";
import { NETWORK } from "@/lib/settings";
import { savePendingLaunch } from "@/lib/pendingLaunch";
import { fmtBar, useBarInfo, useBarWallet } from "@/lib/bar";

const input = "";
/** Label row (label, optional info icon with the static helper text, optional aside such as the byte counter), the control, then the inline
 *  validation error or live note. Static help lives in the InfoTip (id `${id}-help`, kept in the DOM for aria-describedby). */
const Field = ({ label, children, aside, note, error, id, htmlFor, help }: { label: string; children: React.ReactNode; aside?: React.ReactNode; note?: string; error?: string; id?: string; htmlFor?: string; help?: React.ReactNode }) => (
  <div className="fld min-w-0">
    <span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : <span>{label}</span>}
        {help && <InfoTip id={id ? `${id}-help` : undefined} label={`${label} help`}>{help}</InfoTip>}
      </span>
      {aside}
    </span>
    {children}
    {error ? <span id={id ? `${id}-msg` : undefined} role="alert" className="text-sell" style={{ display: "block", fontSize: 12 }}>{error}</span>
      : note ? <span id={id ? `${id}-msg` : undefined} className="dim" style={{ display: "block", fontSize: 12 }}>{note}</span> : null}
  </div>
);
/** Same rounding as the lock page (whole tokens, en-US grouping). */
const fmtTok = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const Counter = ({ used, max }: { used: number; max: number }) => (
  <em aria-live="polite" className={used > max ? "neg" : ""}>{used} of {max} bytes</em>
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
  const [mode, setMode] = useState<0 | 1>(0); // concept only: the private flow is shown as information, it changes nothing about the launch
  const [pv, setPv] = useState({ wallet: false, pay: false, claim: false });
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
      const steps: Record<LaunchStep, string> = { metadata: "Uploading metadata…", mint: "Preparing your token address…", sign: "Approve the launch in your wallet…", cosign: "Finalizing your …high address…", send: "Sending…", confirm: "Confirming on Solana…" };
      const r = await launchToken({ name: cleanLabel(name), ticker: cleanLabel(ticker), description: desc, image, ...socials, tier, antiSniper: anti, devBuySol: devSol }, wallet.publicKey.toBase58(),
        { sign: (tx) => wallet.signTransaction(tx), connection: wallet.connection }, (s) => setMsg(steps[s]));
      setLaunched({ mint: r.mint, signature: r.signature });
      setMsg(`Launched ${devSol > 0 ? `with a ${devSol} SOL dev buy ` : ""}(tx ${r.signature.slice(0, 8)})${r.vanity ? "" : " with a standard (non-…high) address"}. Opening the token page…`);
      // The tx is confirmed: open the token page now. Until the indexer picks the pool up, the page shows an indexing state
      // built from what we already know (?new=1 lets it skip the not-found check, see middleware.ts and TokenPending.tsx).
      savePendingLaunch({ mint: r.mint, name: cleanLabel(name), symbol: cleanLabel(ticker), image: r.image, signature: r.signature, at: Date.now() });
      router.push(`/token/${r.mint}?new=1`);
    } catch (e) {
      setMsg(`Launch failed. ${friendlyLaunchError((e as Error).message)}`);
    } finally { setBusy(false); }
  };

  const Sw = ({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) => <button type="button" className="sw" role="switch" aria-checked={on} aria-label={label} onClick={onClick}><i /></button>;
  const pvCount = Number(pv.wallet) + Number(pv.pay) + Number(pv.claim);
  const pvLevel = ["Public", "Low", "Medium", "High"][pvCount];
  const pvDesc = ["Your wallet is shown as the creator, like every launch today.", "One privacy option is on.", "Two privacy options are on.", "Creator wallet, payment and fee claims are all private."][pvCount];
  const idxTitle = (n: string, t: React.ReactNode, body: React.ReactNode) => <div className="fs"><div className="idx">{`{${n}}`}</div><div className="fb"><h3>{t}</h3>{body}</div></div>;

  return (
    <div className="jtx">
      <div className="phead"><div><div className="bul">Launch a <b>token</b></div><h1 className="h1">Set your bar, <span>then launch.</span></h1></div><div className="lbl">Block 0 dev buy</div><a className="bom" href="https://www.meteora.ag" target="_blank" rel="noreferrer" aria-label="Built on Meteora">Built on {/* eslint-disable-next-line @next/next/no-img-element */}<img src="/brand/partners/meteora-logo-light.svg" alt="Meteora" width={74} height={17} className="hidden h-[15px] w-auto dark:block" />{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/brand/partners/meteora-logo-dark.svg" alt="Meteora" width={74} height={17} className="h-[15px] w-auto dark:hidden" /></a></div>
      <div className="modes">
        <button type="button" className={mode === 0 ? "on" : ""} onClick={() => setMode(0)}><b>Public launch</b><span>Your wallet is the creator, like every launch today.</span></button>
        <button type="button" className={mode === 1 ? "on" : ""} onClick={() => setMode(1)}><b>Private launch <i className="chip">New</i></b><span>Hidden creator wallet, private payment, stealth fee claims.</span></button>
      </div>
      {mode === 1 && (
        <div className="pflow"><div className="lbl">How a private launch works</div>
          <ol className="pfs"><li><b>Fund privately</b><span>SOL moves through the shielded pool to a fresh one-time wallet.</span></li><li><b>Launch from it</b><span>The token is created by that wallet. Your main wallet is not on the token.</span></li><li><b>Claim to stealth</b><span>Creator fees go to a new address each time.</span></li></ol>
          <Link className="sm" href="/private">Open Private send <i>→</i></Link></div>
      )}
      <div className="lg">
        <form className="lf" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          {idxTitle("01", "Identity", <>
            <div className="f2">
              <Field label="Name" id="launch-name" htmlFor="launch-name" aside={<Counter used={nameBytes} max={NAME_MAX_BYTES} />} error={shown("name")}>
                <input id="launch-name" className={shown("name") ? "border-sell" : ""} value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                  placeholder="Arena Bull" required aria-required aria-invalid={!!shown("name")} aria-describedby={shown("name") ? "launch-name-msg" : undefined} />
              </Field>
              <Field label="Ticker" id="launch-ticker" htmlFor="launch-ticker" aside={<Counter used={tickerBytes} max={TICKER_MAX_BYTES} />} error={shown("ticker")}
                note={tickerNote} help="Letters A to Z and digits 0 to 9, uppercased for you.">
                <input id="launch-ticker" className={`num uppercase ${shown("ticker") ? "border-sell" : ""}`} value={ticker} onChange={(e) => onTicker(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, ticker: true }))}
                  placeholder="ABULL" autoCapitalize="characters" spellCheck={false} required aria-required aria-invalid={!!shown("ticker")} aria-describedby="launch-ticker-msg launch-ticker-help" />
              </Field>
            </div>
            <div className="min-w-0">
              <label htmlFor="launch-image-input" className="drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void onFile(e.dataTransfer.files[0]); }} style={imgErr ? { borderColor: "var(--neg)" } : undefined}>
                {preview ? <img src={preview} alt={`${cleanLabel(name) || "Token"} image preview`} className="h-20 w-20 object-cover" onError={() => dropImage("This image could not be read. Try another file.")} /> : <b>+</b>}
                <span>{image ? image.name : "Drop image or click to upload"}</span>
                <em id="launch-image-help">PNG, JPG, WEBP or GIF, up to 2 MB.</em>
                <input id="launch-image-input" type="file" accept={IMAGE_ACCEPT} aria-label="Token image" aria-invalid={!!imgErr} aria-describedby="launch-image-msg launch-image-help" className="hidden"
                  onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
              {imgErr && <span id="launch-image-msg" role="alert" className="text-sell" style={{ display: "block", fontSize: 12, marginTop: 6 }}>{imgErr} <button type="button" onClick={() => setImgErr("")} className="underline">Launch without an image</button></span>}
            </div>
            <Field label="Description" htmlFor="launch-desc"><textarea id="launch-desc" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What is this token about?" /></Field>
            <div className="f3">
              {(["website", "twitter", "telegram"] as const).map((k) => (
                <Field key={k} label={k[0].toUpperCase() + k.slice(1)} htmlFor={`launch-${k}`}>
                  <input id={`launch-${k}`} value={socials[k]} onChange={(e) => setSocials({ ...socials, [k]: e.target.value })} placeholder={k === "website" ? "https://" : k === "twitter" ? "x.com/…" : "t.me/…"} />
                </Field>
              ))}
            </div>
          </>)}
          {idxTitle("02", "Tier", <>
            <div role="radiogroup" aria-label="Tier" className="tsel">
              {(Object.keys(TIERS) as TierId[]).map((id) => {
                const s = feeSplitPct(id); const sel = tier === id; const locked = id === "max" && maxLocked; const tipId = `launch-tier-${id}-help`;
                return (
                  <button key={id} type="button" role="radio" aria-checked={sel} aria-disabled={locked} aria-describedby={tipId} title={locked ? maxNeed : undefined} onClick={() => !locked && setTier(id)} className={sel ? "on" : undefined}>
                    <span className={`lbl ${id !== "standard" ? "yl" : ""}`}>{TIERS[id].label}{locked && <Lock size={11} className="ml-1 inline" aria-hidden />}{locked && maxBlocked && <span data-testid="soon-chip" className="chip" style={{ marginLeft: 8 }}>Soon</span>}</span>
                    <b>{thresholdSolFor(id, NETWORK)} <small>SOL</small></b>
                    <dl><dt>Mcap at migration</dt><dd>~{migrationMcapSol(id, NETWORK).toLocaleString("en-US", { maximumFractionDigits: 2 })} SOL</dd><dt>Creator fee</dt><dd>{s.creator}%</dd><dt>After migration</dt><dd>{postMigrationPct(id).creator}%</dd></dl>
                    <span id={tipId} className="sr-only">{TIERS[id].label} tier. {locked ? maxNeed : id === "max" && !maxGated ? maxOpen : ""}</span>
                  </button>
                );
              })}
            </div>
            <p className="dim" style={{ fontSize: 13, margin: "10px 0 0" }}>{maxGated ? maxNeed : "Max is open to every creator until $HIGHER launches."}</p>
          </>)}
          {idxTitle("03", "Protection", <>
            <div className="trow"><div><b>Anti-sniper</b><p id="launch-anti-help" data-testid="anti-sniper-info">{anti ? "Anti-sniper on: first-minute buys pay up to 25%, falling to 1% over 60 seconds." : "Off: early bots pay the normal 1% fee. Turn on to tax first-minute buys up to 25%."}</p></div>
              <button type="button" role="switch" aria-checked={anti} aria-label="Anti-sniper" aria-describedby="launch-anti-help" onClick={() => setAnti(!anti)} className="sw"><i /></button></div>
            <div className="fld"><span><label htmlFor="launch-devbuy">Dev buy (optional)</label><em>Bought in Block 0, so nobody can buy before you.</em></span>
              <div className="inp sm"><input id="launch-devbuy" aria-label="Dev buy amount in SOL" aria-describedby="launch-devbuy-help" inputMode="decimal" value={devBuy} onChange={(e) => setDevBuy(e.target.value.replace(/[^0-9.]/g, "").replace(/^\./, "0."))} placeholder="0.0" /><span className="dim mono" style={{ fontSize: 13 }}>SOL</span></div>
              <span id="launch-devbuy-help" className="sr-only">Bought in the same transaction as launch (Block 0), so nobody can buy before you.</span>
              {balance !== null && <span className="dim num" style={{ display: "block", fontSize: 12 }}>Balance <SolAmt>{balance.toFixed(3)}</SolAmt></span>}
              {devSol > 0 && (
                <span className="block" style={{ display: "block", fontSize: 13 }} aria-live="polite">
                  {overMax ? <span role="alert" className="text-sell">Dev buy is capped at {capSol} SOL. Lower it to see how much of the supply you get.</span> : q ? (
                    <>
                      <span style={{ display: "block" }}>You receive <span className="num">~{fmtTok(q.estTokens)} ${ticker || "TOKEN"}</span> <span className="num dim">({q.supplyPct.toFixed(2)}% of supply)</span></span>
                      <span className="num dim" style={{ display: "block" }}>Fee {q.feePct.toFixed(2)}% (~<SolAmt>{q.feeSol.toFixed(4)}</SolAmt>){anti && !q.minFeeApplied ? " (anti-sniper starting fee applies to the dev buy)" : ""}</span>
                    </>
                  ) : <span className={qErr ? "text-sell" : "dim"}>{qErr ? friendlyQuoteError(qErr, capSol) : "Quoting…"}</span>}
                  {lowBalance && <span className="text-sell" style={{ display: "block" }}>Not enough SOL: about {needSol.toFixed(3)} SOL needed including launch rent and fees.</span>}
                </span>
              )}
            </div>
          </>)}
          {idxTitle("04", <>Privacy <span className="chip pvc">Concept</span></>, <>
            <div className="trow"><div><b>Hide creator wallet</b><p>The token launches from a fresh one-time wallet. Your main wallet never appears on the token page or on-chain as the creator.</p></div><Sw on={pv.wallet} label="Hide creator wallet" onClick={() => setPv({ ...pv, wallet: !pv.wallet })} /></div>
            <div className="trow"><div><b>Pay launch costs privately</b><p>Fund the launch wallet through a shielded transfer, so the payment is not linked to your wallet. <Link href="/private" className="yl">Open Private send →</Link></p></div><Sw on={pv.pay} label="Pay launch costs privately" onClick={() => setPv({ ...pv, pay: !pv.pay })} /></div>
            <div className="trow"><div><b>Stealth fee claims</b><p>Creator fees are claimed to a new address each time, so claims cannot be tied back to you.</p></div><Sw on={pv.claim} label="Stealth fee claims" onClick={() => setPv({ ...pv, claim: !pv.claim })} /></div>
            <div className="pvbox"><span className="lbl">Privacy level</span><b>{pvLevel}</b><div className="bar"><i style={{ width: `${pvCount * 33.4}%` }} /></div><p>{pvDesc}</p></div>
          </>)}
          {idxTitle("05", "Fees", <>
            <dl className="kv">
              <div><span>Curve fee</span><b>{f.total}%</b></div>
              <div><span>Creator, platform and Meteora</span><b>{f.creator}%, {f.platform}%, {f.meteora}%</b></div>
              <div><span>After migration (1% pool fee)</span><b>{postMigrationPct(tier).creator}%, {postMigrationPct(tier).platform}%, {postMigrationPct(tier).protocol}%</b></div>
              <div><span>Migration fee (creator share)</span><b>{migrationFeePct(tier).fee}% ({migrationFeePct(tier).creatorShare}%)</b></div>
              <div><span>Migrates at</span><b>{thresholdSolFor(tier, NETWORK)} SOL (~{migrationMcapSol(tier, NETWORK).toLocaleString("en-US", { maximumFractionDigits: 2 })} mcap)</b></div>
            </dl>
            <button className="go" type="submit" disabled={busy} style={{ marginTop: 16 }}>{busy ? "Launching…" : "Launch"}</button>
            {tried && invalid && <p role="alert" className="text-sell" style={{ fontSize: 14, margin: "8px 0 0" }}>Fix the fields marked in red first.</p>}
            {msg && <p role="status" className="muted" style={{ fontSize: 14, margin: "8px 0 0" }}>{msg}</p>}
            {launched && <Link href={`/token/${launched.mint}`} className="ghost" style={{ marginTop: 12 }}>View token page</Link>}
          </>)}
        </form>
        <aside className="prev">
          <div className="brk pv"><span className="c1" /><span className="c2" />
            <div className="ph" style={{ backgroundImage: "url(/brand/arena-bg-c.webp)" }} />
            <div className="lbl" style={{ marginBottom: 16 }}>Preview{anti && <span className="yl"> · anti-sniper on</span>}</div>
            <div className="tk">
              {preview ? <img src={preview} alt={`${cleanLabel(name) || "Token"} image preview`} style={{ width: 56, height: 56, objectFit: "cover" }} /> : <div className="av" style={{ width: 56, height: 56, fontSize: 14, background: "var(--inv)", color: "var(--bg)" }}>{(name || "??").slice(0, 2).toUpperCase()}</div>}
              <div><b style={{ fontSize: 20 }}>{name || "Token name"}</b><small>${ticker || "TICKER"}</small></div>
            </div>
            <p className="muted" style={{ fontSize: 14, margin: "16px 0" }}>{desc || "Description shows here."}</p>
            <div className="prog" style={{ justifyContent: "space-between" }}><span>Bonding</span><span>0 of {thresholdSolFor(tier, NETWORK)} SOL</span></div>
            <div className="bar" style={{ height: 6, margin: "8px 0 16px", background: "var(--sf)", position: "relative" }}><i style={{ position: "absolute", inset: "0 auto 0 0", width: "1%", background: "var(--y)" }} /></div>
            <div className="kv" style={{ margin: "0 0 14px" }}><div><span>Creator</span><b>{wallet.address ? `${wallet.address.slice(0, 4)}…${wallet.address.slice(-4)}` : "7Hb2…Qx91"}</b></div></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span className="tier" style={{ textTransform: "capitalize" }}>{tier}</span><span className="mono dim" style={{ fontSize: 13 }}>$0 mcap</span></div>
          </div>
          <div className="gl"><div className="lbl" style={{ margin: "24px 0 8px" }}>Before you launch</div><Link href="/articles/how-to-launch-a-solana-memecoin">How to launch a Solana memecoin →</Link><Link href="/articles">How creator fees work →</Link><Link href="/anti-sniper-launch">Anti-sniper fees explained →</Link></div>
        </aside>
      </div>
    </div>
  );
}
