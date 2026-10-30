import type { TierId } from "@hb/shared";
import { CASHBACK_PCT, PLATFORM_SPLIT, REFERRAL_OF_PROTOCOL_PCT, feeSplitPct, lpFeeSplitPct, migrationFeePct, postMigrationPct } from "@/lib/fees";
import { StackedBar } from "./charts";
import { Card } from "./ui";

export function FeeBreakdown({ tier }: { tier: TierId }) {
  const f = feeSplitPct(tier);
  const lp = lpFeeSplitPct(tier);
  const pm = postMigrationPct(tier);
  const mig = migrationFeePct(tier);
  const rows: [string, string, string][] = [
    ["Meteora protocol", `${f.meteora}%`, "border"],
    ["Creator", `${f.creator}%`, "ink"],
    ["Platform", `${f.platform}%`, "hatch"],
  ];
  const sw = { ink: "bg-ink", hatch: "bg-hatch border border-ink", border: "bg-border" } as Record<string, string>;
  return (
    <Card>
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="font-semibold">Fee breakdown</h3>
        <span className="num text-sm text-ink-3">curve fee {f.total}%</span>
      </div>
      <div className="my-3">
        <StackedBar parts={[{ value: f.creator, style: "ink" }, { value: f.platform, style: "hatch" }, { value: f.meteora, style: "border" }]} />
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([l, v, s]) => (
            <tr key={l} className="border-b border-border last:border-0">
              <td className="flex items-center gap-2 py-2"><span className={`h-2.5 w-2.5 rounded-[3px] ${sw[s]}`} />{l}</td>
              <td className="num py-2 text-right">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 text-xs font-medium text-ink-3">After migration (DAMM v2)</div>
      <table className="mt-1 w-full text-sm">
        <tbody>
          {[["Pool fee", lp.total], ["Meteora DAMM v2 protocol (20%)", lp.protocol], [`Creator LP (${lp.lpCreatorPct}% of LP)`, lp.creator], [`Platform LP (${100 - lp.lpCreatorPct}% of LP)`, lp.platform],
            [`Creator LP rebate (${pm.rebatePct}% of platform LP fees)`, pm.rebate]].map(([l, v]) => (
            <tr key={l as string} className="border-b border-border last:border-0">
              <td className="py-2 text-ink-2">{l}</td>
              <td className="num py-2 text-right">{v}%</td>
            </tr>
          ))}
          {[["Creator net", pm.creator], ["Platform net", pm.platform]].map(([l, v]) => (
            <tr key={l as string} className="border-b border-border last:border-0">
              <td className="py-2 font-medium">{l}</td>
              <td className="num py-2 text-right font-medium">{v}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 text-xs font-medium text-ink-3">Migration fee</div>
      <p className="mt-1 text-sm text-ink-2">{mig.fee}% of the migrated SOL.{mig.fee ? ` The creator gets ${mig.creatorShare}% of it.` : ""}</p>
      <div className="mt-4 text-xs font-medium text-ink-3">Platform fee split (after the creator LP rebate and trader cashback)</div>
      <table className="mt-1 w-full text-sm">
        <tbody>
          {[["Buyback and burn of $HIGHER", PLATFORM_SPLIT.buyback], ["Operations", PLATFORM_SPLIT.ops], ["Treasury", PLATFORM_SPLIT.treasury]].map(([l, v]) => (
            <tr key={l as string} className="border-b border-border last:border-0">
              <td className="py-2 text-ink-2">{l}</td>
              <td className="num py-2 text-right">{Math.round((v as number) * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="mt-3 flex flex-col gap-1 text-xs text-ink-3">
        <li>Traders pay no extra app fee. Trades made on highbar earn {CASHBACK_PCT}% cashback, to be paid in $HIGHER (in SOL until it launches).</li>
        <li>The swap referral reward is {REFERRAL_OF_PROTOCOL_PCT}% of Meteora&apos;s protocol fee, paid from Meteora&apos;s share.</li>
        <li>$HIGHER has not launched yet. The buyback share accrues until it does.</li>
      </ul>
    </Card>
  );
}