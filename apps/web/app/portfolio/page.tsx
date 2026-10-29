"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ExternalLink, Wallet } from "lucide-react";
import { PublicKey } from "@solana/web3.js";
import { TopBlock } from "@/components/TopBar";
import { Button, Card, TierBadge } from "@/components/ui";
import { Empty, Loading, OfflineNote, TD, TH } from "@/components/PageStates";
import { useApiData } from "@/lib/pagesData";
import { useHbWallet, useSolBalance, useWalletModal } from "@/lib/wallet";
import type { ApiToken } from "@/lib/api";
import { explorerTx } from "@/lib/settings";
import { fmtAge, fmtSol, fmtUsd, shortAddr } from "@/lib/format";

type WTrade = { sig: string; mint: string; symbol: string; side: "buy" | "sell"; sol: number; tokens: number; ts: number };
const SPL = new PublicKey("TokenkegQfeZyiNwAJbNbGkPFXZQdTxzWzKs3qrQjqp");
const T22 = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
const SOL_USD = 150;

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <div><div className="text-[13px] text-ink-3">{label}</div><div className="num mt-1 text-kpi">{value}</div>{sub && <div className="num text-xs text-ink-3">{sub}</div>}</div>;
}

export default function PortfolioPage() {
  const { address, publicKey, isConnected, connection } = useHbWallet();
  const openModal = useWalletModal();
  const sol = useSolBalance(publicKey, connection);
  const tokens = useApiData<{ items: ApiToken[] }>(isConnected ? "/tokens?limit=200" : null, { items: [] }, 30_000);
  const created = useApiData<ApiToken[]>(isConnected ? `/wallet/${address}/created` : null, [], 30_000);
  const trades = useApiData<WTrade[]>(isConnected ? `/wallet/${address}/trades` : null, [], 15_000);
  const [bal, setBal] = useState<Map<string, number> | null>(null);
  const [balErr, setBalErr] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) { setBal(null); return; }
    let alive = true;
    const load = () => Promise.all([SPL, T22].map((programId) => connection.getParsedTokenAccountsByOwner(publicKey, { programId }).catch(() => ({ value: [] }))))
      .then((res) => {
        const m = new Map<string, number>();
        for (const r of res) for (const a of r.value) {
          const info = (a.account.data as any).parsed?.info;
          if (info) m.set(info.mint, (m.get(info.mint) ?? 0) + (info.tokenAmount?.uiAmount ?? 0));
        }
        if (alive) { setBal(m); setBalErr(null); }
      }).catch((e) => alive && setBalErr(String(e?.message ?? e)));
    load();
    const id = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(id); };
  }, [publicKey, connection]);

  if (!isConnected) {
    return (
      <div className="flex flex-col gap-4">
        <TopBlock title="Portfolio" />
        <Card><Empty title="Connect a wallet" hint="Connect your Solana wallet to see your balance, Higher Bar holdings, created tokens and trades."
          action={<Button className="mt-2" onClick={() => openModal("Connect")}><Wallet size={16} />Connect wallet</Button>} /></Card>
      </div>
    );
  }

  const known = tokens.data?.items ?? [];
  const holdings = bal ? known.filter((t) => (bal.get(t.mint) ?? 0) > 0).map((t) => ({ t, amount: bal.get(t.mint)!, valueSol: bal.get(t.mint)! * t.priceSol })) : [];
  const holdSol = holdings.reduce((a, h) => a + h.valueSol, 0);
  const creatorFees = (created.data ?? []).reduce((a, t) => a + (t.creatorFeesSol || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <TopBlock title="Portfolio">
        <div className="num mt-1 text-sm text-ink-3">{shortAddr(address ?? "", 6)}</div>
        <div className="mt-4 grid grid-cols-2 gap-6 md:grid-cols-4">
          <Stat label="SOL balance" value={sol == null ? "…" : sol.toFixed(3)} sub={sol == null ? undefined : `≈ ${fmtUsd(sol * SOL_USD)}`} />
          <Stat label="Holdings value" value={`${holdSol.toFixed(3)}`} sub="SOL" />
          <Stat label="Tokens created" value={String(created.data?.length ?? 0)} />
          <Stat label="Creator fees (est.)" value={creatorFees.toFixed(4)} sub="SOL" />
        </div>
      </TopBlock>
      <OfflineNote error={tokens.error || created.error || trades.error} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="overflow-x-auto p-0">
          <h3 className="border-b border-border px-4 py-3 font-semibold">Holdings</h3>
          {balErr ? <Empty title="Could not load balances" hint={balErr} /> : !bal || tokens.loading ? <Loading /> : holdings.length === 0 ? (
            <Empty title="No Higher Bar tokens" hint="Tokens you buy on Higher Bar show up here." action={<Link href="/" className="text-sm underline">Browse tokens</Link>} />
          ) : (
            <table className="w-full min-w-[480px] text-sm">
              <thead><tr className="border-b border-border text-xs text-ink-3"><th className={`${TH} text-left`}>Token</th><th className={`${TH} text-right`}>Amount</th><th className={`${TH} text-right`}>Price</th><th className={`${TH} text-right`}>Value</th></tr></thead>
              <tbody>{holdings.sort((a, b) => b.valueSol - a.valueSol).map(({ t, amount, valueSol }) => (
                <tr key={t.mint} className="border-b border-border last:border-0 hover:bg-muted">
                  <td className={TD}><Link href={`/token/${t.mint}`} className="font-medium hover:underline">{t.name || shortAddr(t.mint)}</Link> <span className="num text-ink-3">${t.symbol}</span></td>
                  <td className={`${TD} num text-right`}>{amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                  <td className={`${TD} num text-right text-ink-3`}>{t.priceSol.toExponential(2)}</td>
                  <td className={`${TD} num text-right`}>{valueSol.toFixed(4)} SOL</td>
                </tr>))}</tbody>
            </table>
          )}
        </Card>

        <Card className="overflow-x-auto p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="font-semibold">Created tokens</h3>
            {/* TODO: wire claimCreatorTradingFee via SDK once creator claim flow is built */}
            <Button variant="secondary" className="h-8" disabled title="Coming soon">Claim fees</Button>
          </div>
          {created.loading && !created.data ? <Loading /> : !created.data?.length ? (
            <Empty title="You haven't launched a token yet" action={<Link href="/launch" className="text-sm underline">Launch one</Link>} />
          ) : (
            <table className="w-full min-w-[480px] text-sm">
              <thead><tr className="border-b border-border text-xs text-ink-3"><th className={`${TH} text-left`}>Token</th><th className={`${TH} text-left`}>Tier</th><th className={`${TH} text-right`}>Progress</th><th className={`${TH} text-right`}>Volume</th><th className={`${TH} text-right`}>Fees (est.)</th></tr></thead>
              <tbody>{created.data.map((t) => (
                <tr key={t.mint} className="border-b border-border last:border-0 hover:bg-muted">
                  <td className={TD}><Link href={`/token/${t.mint}`} className="font-medium hover:underline">{t.name || shortAddr(t.mint)}</Link></td>
                  <td className={TD}><TierBadge tier={t.tier} /></td>
                  <td className={`${TD} num text-right`}>{t.isMigrated ? "Graduated" : `${Math.round(t.progress * 100)}%`}</td>
                  <td className={`${TD} num text-right`}>{fmtSol(t.volumeSol, 3)} SOL</td>
                  <td className={`${TD} num text-right text-buy`}>{t.creatorFeesSol.toFixed(4)} SOL</td>
                </tr>))}</tbody>
            </table>
          )}
        </Card>
      </div>

      <Card className="overflow-x-auto p-0">
        <h3 className="border-b border-border px-4 py-3 font-semibold">Recent trades</h3>
        {trades.loading && !trades.data ? <Loading /> : !trades.data?.length ? <Empty title="No trades yet" /> : (
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="border-b border-border text-xs text-ink-3"><th className={`${TH} text-left`}>Side</th><th className={`${TH} text-left`}>Token</th><th className={`${TH} text-right`}>SOL</th><th className={`${TH} text-right`}>Tokens</th><th className={`${TH} text-right`}>Time</th><th className={TH} /></tr></thead>
            <tbody>{trades.data.map((t) => (
              <tr key={t.sig} className="border-b border-border last:border-0 hover:bg-muted">
                <td className={`${TD} font-medium capitalize ${t.side === "buy" ? "text-buy" : "text-sell"}`}>{t.side}</td>
                <td className={TD}><Link href={`/token/${t.mint}`} className="num hover:underline">${t.symbol || shortAddr(t.mint)}</Link></td>
                <td className={`${TD} num text-right`}>{t.sol.toFixed(4)}</td>
                <td className={`${TD} num text-right`}>{t.tokens.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                <td className={`${TD} num text-right text-ink-3`}>{fmtAge(t.ts)} ago</td>
                <td className={`${TD} text-right`}><a href={explorerTx(t.sig.split(":")[0])} target="_blank" rel="noreferrer" className="text-ink-3 hover:text-ink"><ExternalLink size={14} /></a></td>
              </tr>))}</tbody>
          </table>
        )}
      </Card>
    </div>
  );
}