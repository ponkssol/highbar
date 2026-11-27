"use client";
import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import type { ApiToken } from "@/lib/api";
import { fmtAge, fmtSol, shortAddr } from "@/lib/format";
import { useApiData } from "@/lib/pagesData";
import { useHbWallet, useSolBalance, useWalletModal } from "@/lib/wallet";
import ClaimSection from "@/components/sections/claim";
import { Btn, EmptyPanel, SolNum, Tier, TokenCell, Tw } from "./ui";

const SPL = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const T22 = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
type WTrade = { sig: string; mint: string; symbol: string; side: "buy" | "sell"; sol: number; tokens: number; ts: number };

export function V2Portfolio({ tab }: { tab: "overview" | "claim" }) {
  const { address, publicKey, isConnected, connection } = useHbWallet();
  const open = useWalletModal();
  const sol = useSolBalance(publicKey, connection);
  const [view, setView] = useState(tab);
  const tokens = useApiData<{ items: ApiToken[] }>(isConnected ? "/tokens?limit=200" : null, { items: [] });
  const created = useApiData<ApiToken[]>(isConnected ? `/wallet/${address}/created` : null, []);
  const trades = useApiData<WTrade[]>(isConnected ? `/wallet/${address}/trades` : null, []);
  const [bal, setBal] = useState<Map<string, number> | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!publicKey) { setBal(null); return; }
    let alive = true;
    Promise.all([SPL, T22].map((programId) => connection.getParsedTokenAccountsByOwner(publicKey, { programId }).catch(() => ({ value: [] }))))
      .then((res) => {
        const m = new Map<string, number>();
        for (const r of res) for (const a of r.value) {
          const info = (a.account.data as { parsed?: { info?: { mint?: string; tokenAmount?: { uiAmount?: number } } } }).parsed?.info;
          if (info?.mint) m.set(info.mint, (m.get(info.mint) ?? 0) + (info.tokenAmount?.uiAmount ?? 0));
        }
        if (alive) setBal(m);
      }).catch(() => {});
    return () => { alive = false; };
  }, [publicKey, connection]);

  const known = tokens.data?.items ?? [];
  const holdings = bal ? known.filter((t) => (bal.get(t.mint) ?? 0) > 0).map((t) => ({ t, amount: bal.get(t.mint) ?? 0, value: (bal.get(t.mint) ?? 0) * t.priceSol })) : [];
  const holdSol = holdings.reduce((a, h) => a + h.value, 0);
  const fees = (created.data ?? []).reduce((a, t) => a + (t.creatorFeesSol || 0), 0);
  const cash = useApiData<{ accruedSol?: number } | null>(isConnected && address ? `/cashback/${address}` : null, null);
  const [masked, setMasked] = useState(false);
  useEffect(() => {
    try { setMasked(!!JSON.parse(localStorage.getItem("hb-v2-prefs") || "{}").mask); } catch { /* ignore */ }
  }, []);

  if (!isConnected || !address) {
    return (
      <div className="frame">
        <div className="phead"><div><div className="bul">Portfolio</div><h1 className="h1">Connect a wallet.</h1></div></div>
        <div className="sec"><EmptyPanel title="No wallet yet" body="Connect your Solana wallet to see holdings, tokens you created and trades." action={<button type="button" className="go" onClick={() => open("Connect")}>Connect wallet</button>} /></div>
      </div>
    );
  }

  return (
    <div className="frame">
      <div className="phead">
        <div>
          <div className="bul">Portfolio</div>
          <h1 className="h1 mono" style={{ fontSize: "clamp(26px, 3vw, 40px)" }}>
            {masked ? "anon" : shortAddr(address, 4)}{" "}
            <button type="button" className="dim" aria-label="Copy address" onClick={() => { void navigator.clipboard.writeText(address).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1000); }); }}>{copied ? "copied" : "⧉"}</button>
          </h1>
        </div>
        <div className="tabs seg">
          <button type="button" className={view === "overview" ? "on" : ""} onClick={() => setView("overview")}>Overview</button>
          <button type="button" className={view === "claim" ? "on" : ""} onClick={() => setView("claim")}>Claim fees</button>
        </div>
      </div>
      <div className="stats" style={{ borderInline: 0, borderTop: 0 }}>
        <div className="st"><div className="lbl">SOL balance</div><div className="v"><SolNum v={sol} digits={3} /></div></div>
        <div className="st"><div className="lbl">Holdings value</div><div className="v"><SolNum v={holdSol} digits={3} /></div><small>{holdings.length} tokens</small></div>
        <div className="st"><div className="lbl">Tokens created</div><div className="v">{created.data?.length ?? 0}</div><small>all tiers</small></div>
        <div className="st"><div className="lbl">Creator fees (est.)</div><div className="v yl"><SolNum v={fees} digits={4} /></div><small>from your tokens</small></div>
        <div className="st"><div className="lbl">Cashback</div><div className="v"><SolNum v={cash.data?.accruedSol} digits={4} /></div><small>accrued</small></div>
      </div>
      {view === "overview" ? (
        <>
          <div className="pgrid">
            <section className="pnl">
              <div className="lbl" style={{ marginBottom: 14 }}>Holdings</div>
              {holdings.length === 0 ? <EmptyPanel title="No highbar tokens" body="Tokens you buy on highbar show up here." action={<Btn href="/" sm>Browse tokens</Btn>} /> : (
                <Tw><table><thead><tr><th>Token</th><th className="r w4 h-sm">Amount</th><th className="r w3">Value</th></tr></thead><tbody>
                  {holdings.map((h) => <tr key={h.t.mint}><td><TokenCell name={h.t.name} symbol={h.t.symbol} image={h.t.image} href={`/token/${h.t.mint}`} /></td><td className="r num h-sm">{h.amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}</td><td className="r num"><SolNum v={h.value} digits={3} /></td></tr>)}
                </tbody></table></Tw>
              )}
            </section>
            <section className="pnl">
              <div className="lbl" style={{ marginBottom: 14 }}>Created tokens</div>
              {(created.data ?? []).length === 0 ? <EmptyPanel title="You haven't launched a token yet" body="Creator fees from your tokens are claimed here." action={<Btn href="/launch" y sm icon="+">Launch one</Btn>} /> : (
                <Tw><table><thead><tr><th>Token</th><th className="w3 h-sm">Tier</th><th className="r w3">Fees</th></tr></thead><tbody>
                  {(created.data ?? []).map((t) => <tr key={t.mint}><td><TokenCell name={t.name} symbol={t.symbol} image={t.image} href={`/token/${t.mint}`} /></td><td className="h-sm"><Tier tier={t.tier} /></td><td className="r num yl"><SolNum v={t.creatorFeesSol} digits={4} /></td></tr>)}
                </tbody></table></Tw>
              )}
            </section>
          </div>
          <div className="sec">
            <div className="bul">Recent <b>trades</b></div>
            <Tw><table><thead><tr><th className="w3">Time</th><th>Token</th><th className="w2">Type</th><th className="r w3">SOL</th><th className="r w4">Amount</th></tr></thead><tbody>
              {(trades.data ?? []).length === 0 && <tr><td colSpan={5} className="dim empty-row">No trades yet</td></tr>}
              {(trades.data ?? []).slice(0, 12).map((t) => <tr key={t.sig}><td className="num dim">{fmtAge(t.ts)}</td><td><b>${t.symbol}</b></td><td><span className={`badge ${t.side}`}>{t.side === "buy" ? "Buy" : "Sell"}</span></td><td className="r num">{fmtSol(t.sol, 3)}</td><td className="r num">{t.tokens.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td></tr>)}
            </tbody></table></Tw>
          </div>
        </>
      ) : (
        <div className="sec"><ClaimSection /></div>
      )}
    </div>
  );
}
