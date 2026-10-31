"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ExternalLink, Wallet } from "lucide-react";
import { PublicKey } from "@solana/web3.js";
import { TopBlock } from "@/components/TopBar";
import { Button, Card, LinkButton, Price, TierBadge } from "@/components/ui";
import { SolAmt } from "@/components/Sol";
import { TableCard } from "@/components/ui/TableCard";
import { TableScroll } from "@/components/ui/Scroll";
import { Stacked, StackedItem } from "@/components/ui/Stacked";
import type { ReactNode } from "react";
import { Empty, Loading, OfflineNote, TD, TH } from "@/components/PageStates";
import { useApiData } from "@/lib/pagesData";
import { useHbWallet, useSolBalance, useWalletModal } from "@/lib/wallet";
import type { ApiToken } from "@/lib/api";
import { explorerTx } from "@/lib/settings";
import { fmtAge, fmtSol, fmtUsd, shortAddr } from "@/lib/format";

type WTrade = { sig: string; mint: string; symbol: string; side: "buy" | "sell"; sol: number; tokens: number; ts: number };
const SPL = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const T22 = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
const SOL_USD = 150;

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
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
        <Card><Empty title="Connect a wallet" hint="Connect your Solana wallet to see your balance, highbar holdings, created tokens and trades."
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
          <Stat label="SOL balance" value={sol == null ? "…" : <SolAmt>{sol.toFixed(3)}</SolAmt>} sub={sol == null ? undefined : `≈ ${fmtUsd(sol * SOL_USD)}`} />
          <Stat label="Holdings value" value={<SolAmt>{holdSol.toFixed(3)}</SolAmt>} />
          <Stat label="Tokens created" value={String(created.data?.length ?? 0)} />
          <Stat label="Creator fees (est.)" value={<SolAmt>{creatorFees.toFixed(4)}</SolAmt>} />
        </div>
      </TopBlock>
      <OfflineNote error={tokens.error || created.error || trades.error} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <TableCard title="Holdings">
          {balErr ? <Empty title="Could not load balances" hint={balErr} /> : !bal || tokens.loading ? <Loading /> : holdings.length === 0 ? (
            <Empty title="No highbar tokens" hint="Tokens you buy on highbar show up here." action={<Link href="/" className="text-sm underline">Browse tokens</Link>} />
          ) : (
            <>
              <Stacked className="sm:hidden" label="Holdings">
                {holdings.sort((a, b) => b.valueSol - a.valueSol).map(({ t, amount, valueSol }) => (
                  <StackedItem key={t.mint} title={<><Link href={`/token/${t.mint}`} className="truncate hover:underline">{t.name || shortAddr(t.mint)}</Link><span className="num text-xs font-normal text-ink-3">${t.symbol}</span></>}
                    value={<SolAmt>{valueSol.toFixed(4)}</SolAmt>}
                    rows={[["Amount", amount.toLocaleString("en-US", { maximumFractionDigits: 0 })], ["Price", <Price key="p" v={t.priceSol} />]]} />
                ))}
              </Stacked>
              <TableScroll className="hidden sm:block" label="Holdings">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border text-xs text-ink-3"><th className={`${TH} text-left`}>Token</th><th className={`${TH} text-right`}>Amount</th><th className={`${TH} text-right`}>Price</th><th className={`${TH} text-right`}>Value</th></tr></thead>
                  <tbody>{holdings.sort((a, b) => b.valueSol - a.valueSol).map(({ t, amount, valueSol }) => (
                    <tr key={t.mint} className="border-b border-border last:border-0 hover:bg-muted">
                      <td className={TD}><Link href={`/token/${t.mint}`} className="font-medium hover:underline">{t.name || shortAddr(t.mint)}</Link> <span className="num text-ink-3">${t.symbol}</span></td>
                      <td className={`${TD} num text-right`}>{amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                      <td className={`${TD} num text-right text-ink-3`}><Price v={t.priceSol} /></td>
                      <td className={`${TD} num text-right`}><SolAmt>{valueSol.toFixed(4)}</SolAmt></td>
                    </tr>))}</tbody>
                </table>
              </TableScroll>
            </>
          )}
        </TableCard>

        <TableCard title="Created tokens" aside={<LinkButton href="/portfolio?tab=claim" variant="secondary" size="sm">Claim fees</LinkButton>}>
          {created.loading && !created.data ? <Loading /> : !created.data?.length ? (
            <Empty title="You haven't launched a token yet" action={<Link href="/launch" className="text-sm underline">Launch one</Link>} />
          ) : (
            <>
              <Stacked className="sm:hidden" label="Created tokens">
                {created.data.map((t) => (
                  <StackedItem key={t.mint} title={<><Link href={`/token/${t.mint}`} className="truncate hover:underline">{t.name || shortAddr(t.mint)}</Link><TierBadge tier={t.tier} /></>}
                    value={<span className="text-buy"><SolAmt>{t.creatorFeesSol.toFixed(4)}</SolAmt></span>}
                    rows={[["Progress", t.isMigrated ? "Migrated" : `${Math.round(t.progress * 100)}%`], ["Volume", <SolAmt key="v">{fmtSol(t.volumeSol, 3)}</SolAmt>]]} />
                ))}
              </Stacked>
              <TableScroll className="hidden sm:block" label="Created tokens">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border text-xs text-ink-3"><th className={`${TH} text-left`}>Token</th><th className={`${TH} text-left`}>Tier</th><th className={`${TH} text-right`}>Progress</th><th className={`${TH} text-right`}>Volume</th><th className={`${TH} text-right`}>Fees (est.)</th></tr></thead>
                  <tbody>{created.data.map((t) => (
                    <tr key={t.mint} className="border-b border-border last:border-0 hover:bg-muted">
                      <td className={TD}><Link href={`/token/${t.mint}`} className="font-medium hover:underline">{t.name || shortAddr(t.mint)}</Link></td>
                      <td className={TD}><TierBadge tier={t.tier} /></td>
                      <td className={`${TD} num text-right`}>{t.isMigrated ? "Migrated" : `${Math.round(t.progress * 100)}%`}</td>
                      <td className={`${TD} num text-right`}><SolAmt>{fmtSol(t.volumeSol, 3)}</SolAmt></td>
                      <td className={`${TD} num text-right text-buy`}><SolAmt>{t.creatorFeesSol.toFixed(4)}</SolAmt></td>
                    </tr>))}</tbody>
                </table>
              </TableScroll>
            </>
          )}
        </TableCard>
      </div>

      <TableCard title="Recent trades">
        {trades.loading && !trades.data ? <Loading /> : !trades.data?.length ? <Empty title="No trades yet" /> : (
          <>
            <Stacked className="sm:hidden" label="Recent trades">
              {trades.data.map((t) => (
                <StackedItem key={t.sig}
                  title={<><span className={`capitalize ${t.side === "buy" ? "text-buy" : "text-sell"}`}>{t.side}</span><Link href={`/token/${t.mint}`} className="num font-normal hover:underline">${t.symbol || shortAddr(t.mint)}</Link></>}
                  value={<SolAmt>{t.sol.toFixed(4)}</SolAmt>}
                  meta={[`${t.tokens.toLocaleString("en-US", { maximumFractionDigits: 0 })} tokens`, <a key="t" href={explorerTx(t.sig.split(":")[0])} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink">{fmtAge(t.ts)} ago<ExternalLink size={12} /></a>]} />
              ))}
            </Stacked>
            <TableScroll className="hidden sm:block" label="Recent trades">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-xs text-ink-3"><th className={`${TH} text-left`}>Side</th><th className={`${TH} text-left`}>Token</th><th className={`${TH} text-right`}>SOL</th><th className={`${TH} text-right`}>Tokens</th><th className={`${TH} text-right`}>Time</th><th className={TH}><span className="sr-only">Transaction</span></th></tr></thead>
                <tbody>{trades.data.map((t) => (
                  <tr key={t.sig} className="border-b border-border last:border-0 hover:bg-muted">
                    <td className={`${TD} font-medium capitalize ${t.side === "buy" ? "text-buy" : "text-sell"}`}>{t.side}</td>
                    <td className={TD}><Link href={`/token/${t.mint}`} className="num hover:underline">${t.symbol || shortAddr(t.mint)}</Link></td>
                    <td className={`${TD} num text-right`}><SolAmt>{t.sol.toFixed(4)}</SolAmt></td>
                    <td className={`${TD} num text-right`}>{t.tokens.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                    <td className={`${TD} num whitespace-nowrap text-right text-ink-3`}>{fmtAge(t.ts)} ago</td>
                    <td className={`${TD} text-right`}><a href={explorerTx(t.sig.split(":")[0])} target="_blank" rel="noreferrer" aria-label="View transaction" className="text-ink-3 hover:text-ink"><ExternalLink size={14} /></a></td>
                  </tr>))}</tbody>
              </table>
            </TableScroll>
          </>
        )}
      </TableCard>
    </div>
  );
}