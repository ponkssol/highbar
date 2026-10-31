"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { TopBlock } from "@/components/TopBar";
import { Button, Card, inputClass } from "@/components/ui";
import { SolAmt } from "@/components/Sol";
import { TableCard } from "@/components/ui/TableCard";
import { TableScroll } from "@/components/ui/Scroll";
import { Stacked, StackedItem } from "@/components/ui/Stacked";
import { Intro, WalletLookup } from "./Lookup";
import { Empty, Loading, OfflineNote, TD, TH } from "@/components/PageStates";
import { useApiData } from "@/lib/pagesData";
import { useHbWallet } from "@/lib/wallet";
import { fmtAge, fmtSol, shortAddr } from "@/lib/format";
import { REFERRAL_OF_PROTOCOL_PCT, REFERRAL_VOLUME_PCT } from "@/lib/fees";
import { SoonChip } from "@/components/SoonChip";

type Ledger = { period: string; referees: number; trades: number; volumeSol: number; referralFeeSol: number; amountSol: number; paidSig: string | null; paidAt: number | null; pending: boolean; paidUrl: string | null };
type Referee = { wallet: string; joinedAt: number; trades: number; volumeSol: number };
type Referral = {
  wallet: string; network?: "devnet" | "mainnet"; param: string; rewardBps: number; minPayoutSol: number; live: boolean;
  referredBy: { referrer: string; createdAt: number } | null; referees: number; referredVolumeSol: number;
  earnedSol: number; paidSol: number; unpaidSol: number; pendingSol: number; ledger: Ledger[]; items: Referee[];
};
const EMPTY: Referral = { wallet: "", param: "ref", rewardBps: 10000, minPayoutSol: 0.001, live: false, referredBy: null, referees: 0, referredVolumeSol: 0, earnedSol: 0, paidSol: 0, unpaidSol: 0, pendingSol: 0, ledger: [], items: [] };
const ADDR = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const tiny = (v: number) => (v > 0 && v < 0.0001 ? v.toFixed(8) : fmtSol(v, 4));

export default function ReferralPage() {
  const wallet = useHbWallet();
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
  const tx = (sig: string, url: string | null) => url ?? `https://solscan.io/tx/${sig}${d.network === "mainnet" ? "" : "?cluster=devnet"}`;

  return (
    <div className="flex flex-col gap-4">
      <TopBlock title="Referral">
        <Intro label="How referral rewards work" more={<>
          Rewards come only from the swap referral fee Meteora pays highbar on curve trades ({REFERRAL_OF_PROTOCOL_PCT}% of Meteora&apos;s protocol fee, about {REFERRAL_VOLUME_PCT}% of volume), not from
          creators, traders or the platform&apos;s share. Each UTC day, {d.rewardBps >= 10000 ? "the" : `${d.rewardBps / 100}% of the`} referral income your
          referred wallets&apos; trades generated is shared out by their trading volume, never more than was actually received. Paid in SOL once you reach {d.minPayoutSol} SOL.
        </>}>
          Share your link. Wallets that sign in through it are tied to you for good.
        </Intro>
        <WalletLookup onLookup={setLookup} placeholder={wallet.address ? shortAddr(wallet.address, 6) : undefined} />
      </TopBlock>
      <OfflineNote error={error} />
      {!ok ? <Card><Empty title="Connect a wallet" hint="Your referral link and earnings show up here, or paste an address to look one up." /></Card> : (
        <>
          <Card>
            <div className="text-[13px] text-ink-3">{own ? "Your referral link" : `Referral link for ${shortAddr(addr!)}`}</div>
            <div className="mt-2 flex gap-2">
              <input readOnly value={link} aria-label="Referral link" onFocus={(e) => e.currentTarget.select()}
                className={`num flex-1 ${inputClass()} bg-muted`} />
              <Button type="button" variant="secondary" onClick={copy} disabled={!link}>
                <span className="inline-flex items-center gap-1">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copied" : "Copy"}</span>
              </Button>
            </div>
            {d.referredBy && <p className="mt-2 text-xs text-ink-3">Referred by <span className="num">{shortAddr(d.referredBy.referrer, 6)}</span> {fmtAge(d.referredBy.createdAt)} ago.</p>}
          </Card>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {([["Referred wallets", String(d.referees)], ["Referred volume", <SolAmt key="v">{tiny(d.referredVolumeSol)}</SolAmt>], ["Awaiting payout", <SoonChip key="soon" />], ["Paid out", <SolAmt key="p">{tiny(d.paidSol)}</SolAmt>]] as [string, ReactNode][]).map(([k, v]) => (
              <Card key={k}><div className="text-[13px] text-ink-3">{k}</div><div className="num mt-1 flex min-h-7 items-center text-lg font-semibold">{v}</div></Card>
            ))}
          </div>
          {!!d.ledger.length && (
            <TableCard title="Rewards">
              <Stacked className="sm:hidden" label="Referral rewards">
                {d.ledger.map((l) => (
                  <StackedItem key={l.period} title={<span className="num">{l.period}</span>} value={<SolAmt>{tiny(l.amountSol)}</SolAmt>}
                    rows={[["Wallets", l.referees], ["Volume", <SolAmt key="v">{tiny(l.volumeSol)}</SolAmt>], ["Payout", <Payout key="p" l={l} href={l.paidSig ? tx(l.paidSig, l.paidUrl) : ""} />]]} />
                ))}
              </Stacked>
              <TableScroll className="hidden sm:block" label="Referral rewards">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border text-xs text-ink-3"><th className={`${TH} text-left`}>Day (UTC)</th><th className={`${TH} text-right`}>Wallets</th><th className={`${TH} text-right`}>Volume</th><th className={`${TH} text-right`}>Reward</th><th className={`${TH} text-right`}>Payout</th></tr></thead>
                  <tbody>{d.ledger.map((l) => (
                    <tr key={l.period} className="border-b border-border last:border-0 hover:bg-muted">
                      <td className={`${TD} num`}>{l.period}</td>
                      <td className={`${TD} num text-right`}>{l.referees}</td>
                      <td className={`${TD} num text-right`}><SolAmt>{tiny(l.volumeSol)}</SolAmt></td>
                      <td className={`${TD} num text-right`}><SolAmt>{tiny(l.amountSol)}</SolAmt></td>
                      <td className={`${TD} text-right`}><Payout l={l} href={l.paidSig ? tx(l.paidSig, l.paidUrl) : ""} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </TableScroll>
            </TableCard>
          )}
          <TableCard title="Referred wallets">
            {loading && !data ? <Loading /> : d.items.length === 0 ? (
              <Empty title="No referrals yet" hint="Wallets that open your link and sign in show up here." />
            ) : (
              <>
                <Stacked className="sm:hidden" label="Referred wallets">
                  {d.items.map((r) => (
                    <StackedItem key={r.wallet} title={<span className="num">{shortAddr(r.wallet, 6)}</span>} value={<SolAmt>{tiny(r.volumeSol)}</SolAmt>}
                      rows={[["Trades", r.trades], ["Joined", `${fmtAge(r.joinedAt)} ago`]]} />
                  ))}
                </Stacked>
                <TableScroll className="hidden sm:block" label="Referred wallets">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border text-xs text-ink-3"><th className={`${TH} text-left`}>Wallet</th><th className={`${TH} text-right`}>Trades</th><th className={`${TH} text-right`}>Volume</th><th className={`${TH} text-right`}>Joined</th></tr></thead>
                    <tbody>{d.items.map((r) => (
                      <tr key={r.wallet} className="border-b border-border last:border-0 hover:bg-muted">
                        <td className={`${TD} num`}>{shortAddr(r.wallet, 6)}</td>
                        <td className={`${TD} num text-right`}>{r.trades}</td>
                        <td className={`${TD} num text-right`}><SolAmt>{tiny(r.volumeSol)}</SolAmt></td>
                        <td className={`${TD} num whitespace-nowrap text-right text-ink-3`}>{fmtAge(r.joinedAt)} ago</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </TableScroll>
              </>
            )}
          </TableCard>
        </>
      )}
    </div>
  );
}

function Payout({ l, href }: { l: Ledger; href: string }) {
  return l.paidSig ? (
    <a href={href} target="_blank" rel="noreferrer" className="num inline-flex items-center gap-1 hover:underline">{shortAddr(l.paidSig, 6)}<ExternalLink size={14} className="text-ink-3" /></a>
  ) : l.pending ? <span className="text-xs text-ink-3">sending</span> : <SoonChip />;
}
