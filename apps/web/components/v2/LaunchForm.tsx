"use client";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { feeSplitPct, postMigrationPct } from "@/lib/fees";
import { useBarInfo, useBarWallet, fmtBar } from "@/lib/bar";
import { useEffect } from "react";
import {
  DEV_BUY_MAX_SOL, IMAGE_ACCEPT, NAME_MAX_BYTES, TICKER_MAX_BYTES, checkImage, cleanLabel, friendlyLaunchError, friendlyQuoteError, launchToken, quoteDevBuy, utf8Bytes, type DevBuyQuote,
} from "@/lib/launch";
import { savePendingLaunch } from "@/lib/pendingLaunch";
import { useAuth } from "@/lib/auth";
import { NETWORK, useSettings } from "@/lib/settings";
import { useHbWallet, useWalletModal } from "@/lib/wallet";
import { migrationMcapSol, thresholdSolFor, type TierId } from "@hb/shared";
import { MeteoraMark } from "./mlogo";
import { Btn, Href, tierLabel } from "./ui";
import { uiHref } from "@/lib/uiVersion";

const IDS: TierId[] = ["standard", "higher", "max"];
const LEVELS = [
  ["Public", "Your wallet is shown as the creator, like every launch today."],
  ["Partial", "One privacy switch is on. This does not hide the launch on-chain."],
  ["Strong", "Two switches are on. Still a concept: nothing here is private yet."],
  ["Maximum", "All three switches are on. Private launch is not available."],
];

export function LaunchForm() {
  const params = useSearchParams();
  const router = useRouter();
  const wallet = useHbWallet();
  const auth = useAuth();
  const open = useWalletModal();
  const barInfo = useBarInfo().data;
  const barWallet = useBarWallet(wallet.address).data;
  const maxLocked = !!barInfo?.maxTierBlocked || (!!barInfo?.gateMaxTier && !barWallet?.maxTierAccess);
  const [mode, setMode] = useState<"public" | "private">(params.get("mode") === "private" ? "private" : "public");
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [desc, setDesc] = useState("");
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [telegram, setTelegram] = useState("");
  const [tier, setTier] = useState<TierId>("standard");
  const [anti, setAnti] = useState(false);
  const [devBuy, setDevBuy] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imgErr, setImgErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [settings] = useSettings();
  const [quote, setQuote] = useState<DevBuyQuote | null>(null);
  const [quoteErr, setQuoteErr] = useState("");
  const [hide, setHide] = useState(false);
  const [pay, setPay] = useState(false);
  const [stealth, setStealth] = useState(false);

  const selectMode = (next: "public" | "private") => {
    setMode(next);
    const on = next === "private";
    setHide(on); setPay(on); setStealth(on);
  };
  const privacy = [hide, pay, stealth].filter(Boolean).length;
  const fees = feeSplitPct(tier);
  const post = postMigrationPct(tier);
  const target = thresholdSolFor(tier, NETWORK);
  const mcap = migrationMcapSol(tier, NETWORK);
  const nameBytes = utf8Bytes(cleanLabel(name));
  const tickBytes = utf8Bytes(cleanLabel(ticker));
  const letters = (cleanLabel(ticker) || "??").slice(0, 2).toUpperCase();

  const onFile = async (file: File | null) => {
    setImgErr("");
    if (!file) { setImage(null); setPreview(null); return; }
    const msg = await checkImage(file);
    if (msg) { setImgErr(msg); setImage(null); setPreview(null); return; }
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const submit = async () => {
    setErr("");
    if (mode === "private") return;
    if (!wallet.publicKey) { open("Connect"); return; }
    if (!cleanLabel(name) || nameBytes > NAME_MAX_BYTES || !cleanLabel(ticker) || tickBytes > TICKER_MAX_BYTES) {
      setErr("Check the name (32 bytes) and ticker (10 bytes).");
      return;
    }
    if (tier === "max" && maxLocked) { setErr(barInfo?.maxTierBlocked ? "Max opens after $HIGHER launches." : `Hold ${fmtBar(barInfo?.maxTierMinBar ?? 0)} $HIGHER to launch on Max.`); return; }
    if (!(await auth.ensureVerified())) { setErr("Sign in with your wallet to launch."); return; }
    setBusy(true);
    try {
      const r = await launchToken({
        name: cleanLabel(name), ticker: cleanLabel(ticker), description: desc, image, website, twitter, telegram,
        tier, antiSniper: anti, devBuySol: Number(devBuy) || 0, slippageBps: Math.round((settings.slippagePct || 1) * 100),
      }, wallet.publicKey.toBase58(), { sign: (tx) => wallet.signTransaction(tx), connection: wallet.connection });
      savePendingLaunch({ mint: r.mint, name: cleanLabel(name), symbol: cleanLabel(ticker), image: r.image, signature: r.signature, at: Date.now() });
      router.push(uiHref(`/token/${r.mint}?new=1`));
    } catch (e) {
      setErr(friendlyLaunchError((e as Error).message));
    } finally { setBusy(false); }
  };

  const devSol = Number(devBuy) || 0;
  useEffect(() => {
    if (!(devSol > 0)) { setQuote(null); setQuoteErr(""); return; }
    let alive = true;
    const id = setTimeout(() => {
      quoteDevBuy(tier, anti, devSol, Math.round((settings.slippagePct || 1) * 100))
        .then((q) => { if (alive) { setQuote(q); setQuoteErr(""); } })
        .catch((e) => { if (alive) { setQuote(null); setQuoteErr(friendlyQuoteError((e as Error).message, DEV_BUY_MAX_SOL)); } });
    }, 300);
    return () => { alive = false; clearTimeout(id); };
  }, [devSol, tier, anti, settings.slippagePct]);

  const note = useMemo(() => {
    if (!barInfo?.gateMaxTier && !barInfo?.maxTierBlocked) return "Max is open to every creator until $HIGHER launches.";
    if (barInfo.maxTierBlocked) return "Max opens after $HIGHER launches.";
    return `Max needs ${fmtBar(barInfo.maxTierMinBar)} $HIGHER.`;
  }, [barInfo]);

  return (
    <div className="frame">
      <div className="phead">
        <div><div className="bul">Launch a <b>token</b></div><h1 className="h1">Set your bar, <span>then launch.</span></h1></div>
        <div className="lbl">Block 0 dev buy</div>
        <span className="bom">Built on <MeteoraMark /></span>
      </div>
      <div className="modes">
        <button type="button" className={mode === "public" ? "on" : ""} onClick={() => selectMode("public")}><b>Public launch</b><span>Your wallet is the creator, like every launch today.</span></button>
        <button type="button" className={mode === "private" ? "on" : ""} onClick={() => selectMode("private")}><b>Private launch <i className="chip">New</i></b><span>Concept only. Hidden creator, private payment and stealth claims are not live.</span></button>
      </div>
      {mode === "private" && (
        <div className="pflow">
          <div className="lbl">How a private launch would work</div>
          <ol className="pfs">
            <li><b>Fund privately</b><span>SOL would move to a fresh one-time wallet. This is not built.</span></li>
            <li><b>Launch from it</b><span>The token would be created by that wallet. Nothing is submitted from this screen.</span></li>
            <li><b>Claim to stealth</b><span>Creator fees would go to a new address. Not available.</span></li>
          </ol>
          <Btn href="/private" sm>Open Private send</Btn>
        </div>
      )}
      <div className="lg">
        <form className="lf" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <div className="fs"><div className="idx">{"{01}"}</div><div className="fb">
            <h3>Identity</h3>
            <div className="f2">
              <label className="fld"><span>Name <em>{nameBytes} of {NAME_MAX_BYTES} bytes</em></span><input maxLength={64} value={name} placeholder="Arena Bull" onChange={(e) => setName(e.target.value)} /></label>
              <label className="fld"><span>Ticker <em>{tickBytes} of {TICKER_MAX_BYTES} bytes</em></span><input maxLength={10} value={ticker} placeholder="ABULL" onChange={(e) => setTicker(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} /></label>
            </div>
            <label className="drop">
              <input type="file" accept={IMAGE_ACCEPT} hidden onChange={(e) => void onFile(e.target.files?.[0] ?? null)} />
              <b>+</b><span>{image ? image.name : "Drop image or click to upload"}</span><em>PNG, JPG, WEBP or GIF, up to 2 MB.</em>
            </label>
            {imgErr && <p className="neg" style={{ margin: 0, fontSize: 13 }}>{imgErr}</p>}
            <label className="fld"><span>Description</span><textarea rows={3} value={desc} placeholder="What is this token about?" onChange={(e) => setDesc(e.target.value)} /></label>
            <div className="f3">
              <label className="fld"><span>Website</span><input value={website} placeholder="https://" onChange={(e) => setWebsite(e.target.value)} /></label>
              <label className="fld"><span>Twitter</span><input value={twitter} placeholder="x.com/…" onChange={(e) => setTwitter(e.target.value)} /></label>
              <label className="fld"><span>Telegram</span><input value={telegram} placeholder="t.me/…" onChange={(e) => setTelegram(e.target.value)} /></label>
            </div>
          </div></div>
          <div className="fs"><div className="idx">{"{02}"}</div><div className="fb">
            <h3>Tier</h3>
            <div className="tsel">
              {IDS.map((id) => {
                const f = feeSplitPct(id);
                const after = postMigrationPct(id);
                const locked = id === "max" && maxLocked;
                return (
                  <button type="button" key={id} className={tier === id ? "on" : ""} disabled={locked} onClick={() => setTier(id)}>
                    <span className={`lbl${id === "standard" ? "" : " yl"}`}>{tierLabel(id)}</span>
                    <b>{thresholdSolFor(id, NETWORK)} <small>SOL</small></b>
                    <dl><dt>Mcap at migration</dt><dd>~{migrationMcapSol(id, NETWORK)} SOL</dd><dt>Creator fee</dt><dd>{f.creator}%</dd><dt>After migration</dt><dd>{after.creator}%</dd></dl>
                  </button>
                );
              })}
            </div>
            <p className="dim" style={{ fontSize: 13, margin: "10px 0 0" }}>{note}</p>
          </div></div>
          <div className="fs"><div className="idx">{"{03}"}</div><div className="fb">
            <h3>Protection</h3>
            <div className="trow">
              <div><b>Anti-sniper</b><p>{anti ? "On: first-minute buys pay up to 25%, decaying to about 1% within 60 seconds." : "Off: early bots pay the normal 1% fee. Turn on to tax first-minute buys up to 25%."}</p></div>
              <button type="button" className="sw" role="switch" aria-checked={anti} onClick={() => setAnti((v) => !v)}><i /></button>
            </div>
            <label className="fld"><span>Dev buy (optional) <em>Bought in Block 0, up to {DEV_BUY_MAX_SOL} SOL.</em></span>
              <div className="inp sm"><input inputMode="decimal" placeholder="0.0" value={devBuy} onChange={(e) => setDevBuy(e.target.value.replace(/[^0-9.]/g, ""))} /><span className="dim mono" style={{ fontSize: 13 }}><i className="sol" />SOL</span></div>
              {quote && <em>About {quote.estTokens.toLocaleString("en-US", { maximumFractionDigits: 0 })} tokens · {quote.supplyPct.toFixed(2)}% of supply · fee {quote.feeSol.toFixed(4)} SOL</em>}
              {quoteErr && <em className="neg">{quoteErr}</em>}
            </label>
          </div></div>
          <div className="fs"><div className="idx">{"{04}"}</div><div className="fb">
            <h3>Privacy <span className="chip pvc">Concept</span></h3>
            <div className="trow"><div><b>Hide creator wallet</b><p>Would launch from a fresh wallet. Not available, so this switch does not change the transaction.</p></div><button type="button" className="sw" role="switch" aria-checked={hide} onClick={() => setHide((v) => !v)}><i /></button></div>
            <div className="trow"><div><b>Pay launch costs privately</b><p>Would fund the launch through a shielded transfer. <Href canonical="/private" className="yl">Open Private send →</Href></p></div><button type="button" className="sw" role="switch" aria-checked={pay} onClick={() => setPay((v) => !v)}><i /></button></div>
            <div className="trow"><div><b>Stealth fee claims</b><p>Would claim creator fees to a new address. Not available.</p></div><button type="button" className="sw" role="switch" aria-checked={stealth} onClick={() => setStealth((v) => !v)}><i /></button></div>
            <div className={`pvbox${privacy ? " on" : ""}`}><span className="lbl">Privacy level</span><b>{LEVELS[privacy][0]}</b><div className="bar"><i style={{ width: `${privacy * 33.4}%` }} /></div><p>{LEVELS[privacy][1]}</p></div>
          </div></div>
          <div className="fs"><div className="idx">{"{05}"}</div><div className="fb">
            <h3>Fees</h3>
            <div className="kv">
              <div><span>Curve fee</span><b>{fees.total}%</b></div>
              <div><span>Creator, platform and Meteora</span><b>{fees.creator}%, {fees.platform}%, {fees.meteora}%</b></div>
              <div><span>After migration, creator</span><b>{post.creator}%</b></div>
              <div><span>Anti-sniper</span><b>{anti ? "25% → 1% in 60s" : "Off"}</b></div>
              <div><span>Migrates at</span><b>{target} SOL (~{mcap} SOL mcap)</b></div>
            </div>
            {err && <p className="neg" role="alert" style={{ margin: "12px 0 0" }}>{err}</p>}
            {mode === "private" ? (
              <button className="go" type="button" disabled style={{ marginTop: 16 }}>Coming soon</button>
            ) : (
              <button className="go" type="submit" disabled={busy} style={{ marginTop: 16 }}>{busy ? "Launching…" : "Launch"}</button>
            )}
          </div></div>
        </form>
        <aside className="prev">
          <div className="brk pv">
            <span className="c1" /><span className="c2" />
            <div className="ph art">{preview ? <img className="sc" src={preview} alt="" /> : <img className="sc" src="/v2/arena-bg-c.webp" alt="" />}</div>
            <div className="lbl" style={{ marginBottom: 16 }}>Preview</div>
            <div className="tk"><div className="av" style={{ width: 56, height: 56 }}>{letters}</div><div><b style={{ fontSize: 20 }}>{cleanLabel(name) || "Token name"}</b><small>${cleanLabel(ticker) || "TICKER"}</small></div></div>
            <p className="muted" style={{ fontSize: 14, margin: "16px 0" }}>{desc || "Description shows here."}</p>
            <div className="prog" style={{ justifyContent: "space-between" }}><span>Bonding</span><span>0 of {target} SOL</span></div>
            <div className="bar" style={{ height: 6, margin: "8px 0 16px" }}><i style={{ width: "1%" }} /></div>
            <div className="kv" style={{ margin: "0 0 14px" }}><div><span>Creator</span><b>{mode === "private" && hide ? "Hidden" : wallet.address ? `${wallet.address.slice(0, 4)}…${wallet.address.slice(-4)}` : "Connect wallet"}</b></div></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span className={`tier ${tierLabel(tier)}`}>{tierLabel(tier)}</span><span className="mono dim" style={{ fontSize: 13 }}>~{mcap} SOL mcap</span></div>
          </div>
          <div className="gl"><div className="lbl" style={{ margin: "24px 0 8px" }}>Before you launch</div>
            <Href canonical="/guides">How to launch a Solana memecoin →</Href>
            <Href canonical="/docs">How creator fees work →</Href>
            <Href canonical="/docs">Anti-sniper fees explained →</Href>
          </div>
        </aside>
      </div>
    </div>
  );
}
