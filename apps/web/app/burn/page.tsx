import { ExternalLink } from "lucide-react";
import { TopBlock } from "@/components/TopBar";
import { BurnBadge, Card } from "@/components/ui";
import { BURNS, NOW_TS, STATS } from "@/lib/mock";
import { fmtAge, shortAddr } from "@/lib/format";
import { PLATFORM_SPLIT } from "@/lib/fees";

export default function BurnPage() {
  return (
    <div className="flex flex-col gap-4">
      <TopBlock>
        <div className="mt-2 flex flex-wrap items-end gap-10">
          <div>
            <div className="flex items-center gap-2 text-[13px] text-ink-3">BAR burned <BurnBadge /></div>
            <div className="num mt-1 text-kpi">{STATS.barBurned.toLocaleString("en-US")}</div>
          </div>
          <p className="max-w-md text-sm text-ink-2">{Math.round(PLATFORM_SPLIT.buyback * 100)}% of platform fees buy back $BAR on the market and burn it. Every burn is on-chain.</p>
        </div>
      </TopBlock>
      <Card className="p-0">
        <h3 className="border-b border-border px-4 py-3 font-semibold">Recent burns</h3>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-xs text-ink-3">
            <th className="px-4 py-2 text-left font-medium">Transaction</th><th className="px-4 py-2 text-right font-medium">$BAR</th>
            <th className="px-4 py-2 text-right font-medium">Time</th></tr></thead>
          <tbody>
            {BURNS.map((b) => (
              <tr key={b.sig} className="border-b border-border last:border-0 hover:bg-muted">
                <td className="px-4 py-3"><a href={`https://explorer.solana.com/tx/${b.sig}?cluster=devnet`} target="_blank" rel="noreferrer" className="num inline-flex items-center gap-2 hover:underline"><span className="h-1.5 w-1.5 rounded-full bg-burn" />{shortAddr(b.sig, 6)}<ExternalLink size={14} className="text-ink-3" /></a></td>
                <td className="num px-4 py-3 text-right">{b.bar.toLocaleString("en-US")}</td>
                <td className="num px-4 py-3 text-right text-ink-3">{fmtAge(b.ts, NOW_TS)} ago</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}