"use client";
import { ExternalLink, Flame } from "lucide-react";
import { TopBlock } from "@/components/TopBar";
import { BurnBadge, Card } from "@/components/ui";
import { Empty, Loading, OfflineNote, TD, TH } from "@/components/PageStates";
import { useApiData } from "@/lib/pagesData";
import { fmtAge, shortAddr } from "@/lib/format";

type Run = { id: string; ts: number; period?: string; status?: string; amount?: number; sig?: string; sol?: number; buySig?: string | null; burnSig?: string | null; buyUrl?: string | null; burnUrl?: string | null };
type BurnData = {
  network?: "devnet" | "mainnet"; mode?: "jupiter" | "mock"; estimated?: boolean; burnOrders?: number;
  barLaunched: boolean; barMint: string | null; dryRun: boolean; barBurned: number; platformFeesSol: number;
  split: { buyback: number; ops: number; treasury: number }; pendingBuybackSol: number; maxOrderSol: number; maxSlippageBps: number; runs: Run[];
};
const MOCK: BurnData = { barLaunched: false, barMint: null, dryRun: true, barBurned: 0, platformFeesSol: 0, split: { buyback: 0, ops: 0, treasury: 0 }, pendingBuybackSol: 0, maxOrderSol: 1, maxSlippageBps: 100, runs: [] };
const solscan = (kind: "tx" | "account", id: string, network?: string) => `https://solscan.io/${kind}/${id}${network === "mainnet" ? "" : "?cluster=devnet"}`;

function TxLink({ sig, url, network, dot }: { sig?: string | null; url?: string | null; network?: string; dot?: string }) {
  if (!sig) return <span className="text-ink-3">-</span>;
  return (
    <a href={url ?? solscan("tx", sig, network)} target="_blank" rel="noreferrer" className="num inline-flex items-center gap-2 hover:underline">
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}{shortAddr(sig, 6)}<ExternalLink size={14} className="text-ink-3" />
    </a>
  );
}
const PARTS = [
  { key: "buyback", label: "Buyback + burn", pct: 40, cls: "bg-burn" },
  { key: "ops", label: "Operations", pct: 50, cls: "bg-ink" },
  { key: "treasury", label: "Treasury", pct: 10, cls: "bg-ink-3" },
] as const;

export default function BurnPage() {
  const { data, loading, error } = useApiData<BurnData>("/burn", MOCK, 30_000);
  const d = data ?? MOCK;
  return (
    <div className="flex flex-col gap-4">
      <TopBlock title="Burn">
        <div className="mt-3 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 text-[13px] text-ink-3">$HIGHER burned <BurnBadge /></div>
            <div className="num mt-1 text-kpi">{d.barBurned.toLocaleString("en-US")}</div>
            {!d.barLaunched && <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-ink-2"><Flame size={12} />$HIGHER not launched yet</div>}
            {d.barMint && (
              <a href={solscan("account", d.barMint, d.network)} target="_blank" rel="noreferrer" className="num mt-1 inline-flex items-center gap-1 text-xs text-ink-3 hover:underline">
                {d.mode === "mock" ? "mock $HIGHER " : "$HIGHER "}{shortAddr(d.barMint, 4)}<ExternalLink size={12} />
              </a>
            )}
          </div>
          <div>
            <div className="text-[13px] text-ink-3">Pending buyback</div>
            <div className="num mt-1 text-kpi">{d.pendingBuybackSol.toFixed(4)}<span className="ml-1 text-sm text-ink-3">SOL</span></div>
            <div className="text-xs text-ink-3">40% of platform fees, max {d.maxOrderSol} SOL per order, {d.maxSlippageBps / 100}% slippage</div>
          </div>
          <div>
            <div className="text-[13px] text-ink-3">Platform fees {d.estimated === false ? "(claimed)" : "(est.)"}</div>
            <div className="num mt-1 text-kpi">{d.platformFeesSol.toFixed(4)}<span className="ml-1 text-sm text-ink-3">SOL</span></div>
            <div className="text-xs text-ink-3">Buyback mode: {d.dryRun ? "dry run (no transactions)" : "live"}{d.mode === "mock" ? ", devnet mock mint" : ""}</div>
          </div>
        </div>
      </TopBlock>
      <OfflineNote error={error} />

      <Card>
        <h3 className="mb-1 font-semibold">Where platform fees go</h3>
        <p className="mb-4 text-sm text-ink-2">After the creator LP rebate and trader cashback, the platform's net income is split 40 / 50 / 10. The 40% share buys $HIGHER on the market and burns it on-chain.</p>
        <div className="flex h-3 overflow-hidden rounded-full border border-border">
          {PARTS.map((p) => <div key={p.key} className={p.cls} style={{ width: `${p.pct}%` }} />)}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PARTS.map((p) => (
            <div key={p.key} className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm">
              <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${p.cls}`} />{p.label} <span className="num text-ink-3">{p.pct}%</span></span>
              <span className="num">{d.split[p.key].toFixed(4)} SOL</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        <h3 className="border-b border-border px-4 py-3 font-semibold">Buyback &amp; burn history</h3>
        {loading && !data ? <Loading /> : d.runs.length === 0 ? (
          <Empty title="No buybacks yet" hint={d.barLaunched ? "Buybacks run once enough fees accrue." : "Buybacks start after $HIGHER launches. Until then the 40% share accrues."} />
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b border-border text-xs text-ink-3"><th className={`${TH} text-left`}>Buy</th><th className={`${TH} text-left`}>Burn</th><th className={`${TH} text-right`}>SOL spent</th><th className={`${TH} text-right`}>$HIGHER burned</th><th className={`${TH} text-right`}>Time</th></tr></thead>
            <tbody>{d.runs.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted">
                <td className={TD}><TxLink sig={r.buySig ?? (r.burnSig === undefined ? r.sig : null)} url={r.buyUrl} network={d.network} dot="bg-buy" /></td>
                <td className={TD}>{r.burnSig || r.status === "burned" ? <TxLink sig={r.burnSig} url={r.burnUrl} network={d.network} dot="bg-burn" /> : <span className="text-xs text-ink-3">{r.status === "failed" ? "failed" : "pending"}</span>}</td>
                <td className={`${TD} num text-right`}>{r.sol?.toFixed(3) ?? "-"}</td>
                <td className={`${TD} num text-right`}>{(r.amount ?? 0).toLocaleString("en-US")}</td>
                <td className={`${TD} num text-right text-ink-3`}>{fmtAge(r.ts)} ago</td>
              </tr>))}</tbody>
          </table>
        )}
      </Card>
    </div>
  );
}