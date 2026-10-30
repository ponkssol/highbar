"use client";
import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { TopBlock } from "@/components/TopBar";
import { Button, Card } from "@/components/ui";
import { Empty, Loading, OfflineNote, TD, TH } from "@/components/PageStates";
import { useApiData } from "@/lib/pagesData";
import { useHbWallet } from "@/lib/wallet";
import { fmtAge, fmtSol, shortAddr } from "@/lib/format";

type Ledger = { period: string; referees: number; trades: number; volumeSol: number; platformFeeSol: number; amountSol: number; paidSig: string | null; paidAt: number | null; pending: boolean; paidUrl: string | null };
type Referee = { wallet: string; joinedAt: number; trades: number; volumeSol: number };
type Referral = {
  wallet: string; network?: "devnet" | "mainnet"; param: string; rewardBps: number; minPayoutSol: number; live: boolean;
  referredBy: { referrer: string; createdAt: number } | null; referees: number; referredVolumeSol: number;
  earnedSol: number; paidSol: number; unpaidSol: number; pendingSol: number; ledger: Ledger[]; items: Referee[];
};
const EMPTY: Referral = { wallet: "", param: "ref", rewardBps: 2000, minPayoutSol: 0.001, live: false, referredBy: null, referees: 0, referredVolumeSol: 0, earnedSol: 0, paidSol: 0, unpaidSol: 0, pendingSol: 0, ledger: [], items: [] };
const ADDR = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const tiny = (v: number) => (v > 0 && v < 0.0001 ? v.toFixed(8) : fmtSol(v, 4));

export default function ReferralPage() {
  const wallet = useHbWallet();
  const [draft, setDraft] = useState("");
  const [lookup, setLookup] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);
  const addr = lookup ?? wallet.address;
  const ok = !!addr && ADDR.test(addr);
  const own = ok && addr === wallet.address;
  const { data, loading, error } = useApiData<Referral>(ok ? `/referrals/${addr}` : null, EMPTY);
  const d = data ?? EMPTY;
  const link = ok ? `${origin}/?${d.param || "ref"}=${addr}` : "";
  const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} };
  const find = () => { const v = draft.trim(); if (ADDR.test(v)) setLookup(v); };
  const tx = (sig: string, url: string | null) => url ?? `https://solscan.io/tx/${sig}${d.network === "mainnet" ? "" : "?cluster=devnet"}`;

  return (
    <div className="flex flex-col gap-4">
      <TopBlock title="Referral">
        <p className="mt-2 max-w-xl text-sm text-ink-2">
          Share your link. Wallets that sign in through it are tied to you for good, and you earn {d.rewardBps / 100}% of the platform&apos;s share of
          the trading fees on their Higher Bar trades. Rewards are tallied per UTC day and paid in SOL once they reach {d.minPayoutSol} SOL.
        </p>
        <form className="mt-4 flex max-w-xl gap-2" onSubmit={(e) => { e.preventDefault(); find(); }}>
          <input aria-label="Wallet address" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={wallet.address ?? "Wallet address"}
            className="num h-10 min-w-0 flex-1 rounded border border-border bg-surface px-3 text-sm outline-none focus:border-ink" />
          <Button type="submit" variant="secondary" disabled={!ADDR.test(draft.trim())}>Look up</Button>
        </form>
      </TopBlock>
      <OfflineNote error={error} />
      {!ok ? <Card><Empty title="Connect a wallet" hint="Your referral link and earnings show up here, or paste an address to look one up." /></Card> : (
        <>
          <Card>
            <div className="text-[13px] text-ink-3">{own ? "Your referral link" : `Referral link for ${shortAddr(addr!)}`}</div>
            <div className="mt-2 flex gap-2">
              <input readOnly value={link} aria-label="Referral link" onFocus={(e) => e.currentTarget.select()}
                className="num h-10 min-w-0 flex-1 rounded border border-border bg-muted px-3 text-sm outline-none" />
              <Button type="button" variant="secondary" onClick={copy} disabled={!link}>
                <span className="inline-flex items-center gap-1">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copied" : "Copy"}</span>
              </Button>
            </div>
            {d.referredBy && <p className="mt-2 text-xs text-ink-3">Referred by <span className="num">{shortAddr(d.referredBy.referrer, 6)}</span> {fmtAge(d.referredBy.createdAt)} ago.</p>}
          </Card>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {([["Referred wallets", String(d.referees)], ["Referred volume", `${tiny(d.referredVolumeSol)} SOL`], ["Awaiting payout", `${tiny(d.unpaidSol + d.pendingSol)} SOL`], ["Paid out", `${tiny(d.paidSol)} SOL`]] as const).map(([k, v]) => (
              <Card key={k}><div className="text-[13px] text-ink-3">{k}</div><div className="num mt-1 text-lg font-semibold">{v}</div></Card>
            ))}
          </div>
          {d.pendingSol > 0 && <p className="text-xs text-ink-3">{tiny(d.pendingSol)} SOL is an estimate for days that are not closed yet.</p>}
          {!!d.ledger.length && (
            <Card className="overflow-x-auto p-0">
              <h3 className="border-b border-border px-4 py-3 font-semibold">Rewards</h3>
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr className="border-b border-border text-xs text-ink-3"><th className={`${TH} text-left`}>Day (UTC)</th><th className={`${TH} text-right`}>Wallets</th><th className={`${TH} text-right`}>Volume</th><th className={`${TH} text-right`}>Reward</th><th className={`${TH} text-right`}>Payout</th></tr></thead>
                <tbody>{d.ledger.map((l) => (
                  <tr key={l.period} className="border-b border-border last:border-0 hover:bg-muted">
                    <td className={`${TD} num`}>{l.period}</td>
                    <td className={`${TD} num text-right`}>{l.referees}</td>
                    <td className={`${TD} num text-right`}>{tiny(l.volumeSol)} SOL</td>
                    <td className={`${TD} num text-right`}>{tiny(l.amountSol)} SOL</td>
                    <td className={`${TD} text-right`}>{l.paidSig ? (
                      <a href={tx(l.paidSig, l.paidUrl)} target="_blank" rel="noreferrer" className="num inline-flex items-center gap-1 hover:underline">{shortAddr(l.paidSig, 6)}<ExternalLink size={14} className="text-ink-3" /></a>
                    ) : <span className="text-xs text-ink-3">{l.pending ? "sending" : "awaiting payout"}</span>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </Card>
          )}
          <Card className="overflow-x-auto p-0">
            <h3 className="border-b border-border px-4 py-3 font-semibold">Referred wallets</h3>
            {loading && !data ? <Loading /> : d.items.length === 0 ? (
              <Empty title="No referrals yet" hint="Wallets that open your link and sign in show up here." />
            ) : (
              <table className="w-full min-w-[480px] text-sm">
                <thead><tr className="border-b border-border text-xs text-ink-3"><th className={`${TH} text-left`}>Wallet</th><th className={`${TH} text-right`}>Trades</th><th className={`${TH} text-right`}>Volume</th><th className={`${TH} text-right`}>Joined</th></tr></thead>
                <tbody>{d.items.map((r) => (
                  <tr key={r.wallet} className="border-b border-border last:border-0 hover:bg-muted">
                    <td className={`${TD} num`}>{shortAddr(r.wallet, 6)}</td>
                    <td className={`${TD} num text-right`}>{r.trades}</td>
                    <td className={`${TD} num text-right`}>{tiny(r.volumeSol)} SOL</td>
                    <td className={`${TD} num text-right text-ink-3`}>{fmtAge(r.joinedAt)} ago</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
