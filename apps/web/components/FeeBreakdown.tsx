import type { TierId } from "@hb/shared";
import { PLATFORM_SPLIT, feeSplitPct } from "@/lib/fees";
import { StackedBar } from "./charts";
import { Card } from "./ui";

export function FeeBreakdown({ tier }: { tier: TierId }) {
  const f = feeSplitPct(tier);
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
      <div className="mt-4 text-xs font-medium text-ink-3">Platform fee split</div>
      <table className="mt-1 w-full text-sm">
        <tbody>
          {[["Buyback + burn $HIGHER", PLATFORM_SPLIT.buyback], ["Operations", PLATFORM_SPLIT.ops], ["Treasury", PLATFORM_SPLIT.treasury]].map(([l, v]) => (
            <tr key={l as string} className="border-b border-border last:border-0">
              <td className="py-2 text-ink-2">{l}</td>
              <td className="num py-2 text-right">{Math.round((v as number) * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}