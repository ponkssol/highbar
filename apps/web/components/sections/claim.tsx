"use client";
import { useCallback, useEffect, useState } from "react";
import { Coins, ExternalLink, Rocket, Wallet } from "lucide-react";
import { Transaction } from "@solana/web3.js";
import { TopBlock } from "@/components/TopBar";
import { Button, Card, LinkButton, TierBadge } from "@/components/ui";
import { Empty, Loading, TD, TH } from "@/components/PageStates";
import { useHbWallet, useWalletModal } from "@/lib/wallet";
import { useAuth } from "@/lib/auth";
import { apiBase } from "@/lib/api";
import { explorerTx } from "@/lib/settings";
import { fmtSol } from "@/lib/format";
import type { TierId } from "@hb/shared";

type Row = {
  mint: string; pool: string; name: string; symbol: string; tier: TierId; migrated: boolean;
  tradingFeeSol: number; tradingFeeToken: number; migrationFeeSharePct: number; migrationFeeSol: number;
  migrationFeeWithdrawn: boolean; lp: LpInfo | null; lpFeeSol: number; lpFeeToken: number; error: string | null;
};
/** Post-migration DAMM v2 LP fees on positions whose NFT this wallet holds (from GET /claim). */
type LpPosition = { dammPool: string; position: string; positionNftAccount: string; unclaimedSol: number; unclaimedToken: number; lockedSharePct: number };
type LpInfo = { dammPool: string | null; positions: LpPosition[]; sol: number; token: number; error: string | null };
type ClaimData = { tokens: Row[]; totalSol: number; totalTradingSol: number; totalMigrationSol: number; totalLpSol: number };
type Kind = "trading" | "migration" | "lp";
/** pool = DBC pool for trading/migration, DAMM v2 pool for lp. */
type Job = { pool: string; kind: Kind; position?: string };
const KIND_LABEL: Record<Kind, string> = { trading: "trading fees", migration: "migration fee", lp: "LP fees" };
const EPS = 1e-9;
const fmtTok = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const fmtPct = (n: number) => `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;

function jobsFor(r: Row): Job[] {
  const j: Job[] = [];
  if (r.tradingFeeSol > EPS || r.tradingFeeToken > EPS) j.push({ pool: r.pool, kind: "trading" });
  if (r.migrationFeeSol > EPS) j.push({ pool: r.pool, kind: "migration" });
  for (const p of r.lp?.positions ?? []) if (p.unclaimedSol > EPS || p.unclaimedToken > EPS) j.push({ pool: p.dammPool, kind: "lp", position: p.position });
  return j;
}

export default function ClaimPage() {
  const wallet = useHbWallet();
  const auth = useAuth();
  const openModal = useWalletModal();
  const [data, setData] = useState<ClaimData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sigs, setSigs] = useState<{ sig: string; label: string }[]>([]);

  const load = useCallback(async () => {
    if (!wallet.address) return;
    setLoading(true);
    try {
      const r = await fetch(`${apiBase()}/claim/${wallet.address}`, { cache: "no-store" });
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? `HTTP ${r.status}`);
      setData(await r.json()); setError(null);
    } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, [wallet.address]);

  useEffect(() => { setData(null); if (wallet.isConnected) load(); }, [wallet.isConnected, load]);

  async function run(jobs: Job[], label: string) {
    if (!wallet.publicKey || !jobs.length) return;
    if (!(await auth.ensureVerified())) { setMsg({ ok: false, text: "Sign in with your wallet before claiming." }); return; }
    setBusy(label); setMsg(null);
    const done: { sig: string; label: string }[] = [];
    try {
      for (const job of jobs) {
        const r = await fetch(`${apiBase()}/claim/build`, { method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ creator: wallet.address, pool: job.pool, kind: job.kind, position: job.position }) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
        const tx = Transaction.from(Uint8Array.from(atob(j.tx), (c) => c.charCodeAt(0)));
        const sig = await wallet.sendTransaction(tx);
        await wallet.connection.confirmTransaction(sig, "confirmed");
        const row = data?.tokens.find((t) => t.pool === job.pool || t.lp?.dammPool === job.pool);
        done.push({ sig, label: `${row?.symbol ?? "Token"} ${KIND_LABEL[job.kind]}` });
        setSigs((s) => [...done.slice(-1), ...s]);
      }
      setMsg({ ok: true, text: `Claimed ${done.length} ${done.length === 1 ? "fee" : "fees"} successfully.` });
    } catch (e) {
      const m = (e as Error).message ?? String(e);
      setMsg({ ok: false, text: /reject|cancel|denied/i.test(m) ? "Transaction cancelled in wallet." : `Claim failed: ${m}` });
    } finally { setBusy(null); load(); }
  }

  if (!wallet.isConnected) {
    return (
      <div className="flex flex-col gap-4">
        <TopBlock title="Claim fees" />
        <Card><Empty title="Connect a wallet" hint="Connect the wallet you launched tokens with to see and claim your creator fees."
          action={<Button className="mt-2" onClick={() => openModal("Connect")}><Wallet size={16} />Connect wallet</Button>} /></Card>
      </div>
    );
  }
  if (auth.status !== "verified") {
    return (
      <div className="flex flex-col gap-4">
        <TopBlock title="Claim fees" />
        <Card><Empty title="Sign in to continue" hint="Sign a message with your wallet to prove you own it. This is free and sends no transaction."
          action={<Button className="mt-2" disabled={auth.status === "signing"} onClick={() => auth.signIn()}>{auth.status === "signing" ? "Waiting for signature." : "Sign in"}</Button>} /></Card>
      </div>
    );
  }

  const rows = data?.tokens ?? [];
  const allJobs = rows.flatMap(jobsFor);
  const totalToken = rows.reduce((s, r) => s + r.tradingFeeToken + r.lpFeeToken, 0);

  return (
    <div className="flex flex-col gap-4">
      <TopBlock title="Claim fees" />
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <div><div className="text-[13px] text-ink-3">Total claimable</div><div className="num mt-1 text-kpi">{data ? fmtSol(data.totalSol) : "-"} SOL</div>
              {totalToken > EPS && <div className="num text-xs text-ink-3">+ {fmtTok(totalToken)} tokens</div>}</div>
            <div><div className="text-[13px] text-ink-3">Trading fees</div><div className="num mt-1 text-lg font-semibold">{data ? fmtSol(data.totalTradingSol) : "-"} SOL</div></div>
            <div><div className="text-[13px] text-ink-3">Migration fees</div><div className="num mt-1 text-lg font-semibold">{data ? fmtSol(data.totalMigrationSol) : "-"} SOL</div></div>
            <div><div className="text-[13px] text-ink-3">LP fees</div><div className="num mt-1 text-lg font-semibold">{data ? fmtSol(data.totalLpSol ?? 0) : "-"} SOL</div></div>
          </div>
          <Button disabled={!allJobs.length || !!busy} onClick={() => run(allJobs, "all")}>
            <Coins size={16} strokeWidth={1.5} />{busy === "all" ? "Claiming." : `Claim all${allJobs.length > 1 ? ` (${allJobs.length} txs)` : ""}`}
          </Button>
        </div>
        {msg && <div className={`mt-4 rounded px-3 py-2 text-sm ring-1 ${msg.ok ? "text-buy ring-buy/30" : "text-sell ring-sell/30"}`}>{msg.text}</div>}
        {sigs.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1 text-sm">
            {sigs.map((s) => <li key={s.sig}><a className="inline-flex items-center gap-1 text-ink-2 hover:text-ink" href={explorerTx(s.sig)} target="_blank" rel="noreferrer">{s.label}<ExternalLink size={13} /></a></li>)}
          </ul>
        )}
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-semibold">Your tokens</h3>
          <Button variant="secondary" className="h-8" disabled={loading} onClick={load}>{loading ? "Refreshing." : "Refresh"}</Button>
        </div>
        {loading && !data ? <Loading label="Reading fees on-chain." /> : error && !data ? (
          <Empty title="Could not load your fees" hint={error} action={<Button variant="secondary" className="mt-2" onClick={load}>Try again</Button>} />
        ) : !rows.length ? (
          <Empty title="You haven't launched any tokens yet" hint="Launch a token to start earning creator trading fees."
            action={<LinkButton href="/launch" className="mt-2"><Rocket size={16} />Launch a token</LinkButton>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="text-left text-xs text-ink-3"><tr>
                <th className={TH}>Token</th><th className={TH}>Tier</th><th className={TH}>Status</th>
                <th className={`${TH} text-right`}>Trading fees</th><th className={`${TH} text-right`}>Migration fee</th><th className={`${TH} text-right`}>LP fees</th><th className={`${TH} text-right`}></th>
              </tr></thead>
              <tbody>
                {rows.map((r) => {
                  const jobs = jobsFor(r);
                  return (
                    <tr key={r.pool} className="border-t border-border">
                      <td className={TD}><div className="font-medium">{r.symbol}</div><div className="text-xs text-ink-3">{r.name}</div></td>
                      <td className={TD}><TierBadge tier={r.tier} /></td>
                      <td className={TD}>{r.migrated ? "Migrated" : "Bonding"}{r.error && <div className="text-xs text-sell">Could not read on-chain</div>}</td>
                      <td className={`${TD} num text-right`}>{fmtSol(r.tradingFeeSol)} SOL{r.tradingFeeToken > EPS && <div className="text-xs text-ink-3">+ {fmtTok(r.tradingFeeToken)} {r.symbol}</div>}</td>
                      <td className={`${TD} num text-right`}>
                        {!r.migrationFeeSharePct ? <span className="text-ink-3">None</span>
                          : !r.migrated ? <span className="text-ink-3">At graduation ({r.migrationFeeSharePct}%)</span>
                          : r.migrationFeeWithdrawn ? <span className="text-ink-3">Claimed</span> : `${fmtSol(r.migrationFeeSol)} SOL`}
                      </td>
                      <td className={`${TD} num text-right`}>
                        {!r.migrated ? <span className="text-ink-3">After migration</span>
                          : r.lp?.error ? <span className="text-xs text-sell">Could not read LP</span>
                          : !r.lp?.positions.length ? <span className="text-ink-3">No position</span>
                          : <>{fmtSol(r.lpFeeSol)} SOL{r.lpFeeToken > EPS && <div className="text-xs text-ink-3">+ {fmtTok(r.lpFeeToken)} {r.symbol}</div>}
                            <div className="text-xs text-ink-3">{r.lp.positions.length > 1 ? `${r.lp.positions.length} positions, ` : ""}{fmtPct(r.lp.positions.reduce((s, p) => s + p.lockedSharePct, 0))} of pool locked</div></>}
                      </td>
                      <td className={`${TD} text-right`}>
                        <Button variant="secondary" className="h-8" disabled={!jobs.length || !!busy} onClick={() => run(jobs, r.pool)}>{busy === r.pool ? "Claiming." : "Claim"}</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}