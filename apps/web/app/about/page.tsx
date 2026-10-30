import Link from "next/link";
import { TIERS } from "@hb/shared";
import { TopBlock } from "@/components/TopBar";
import { Card } from "@/components/ui";

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-4">
      <TopBlock title="About">
        <p className="mt-2 max-w-xl text-sm text-ink-2">Higher Bar is a Solana launchpad where the creator picks the bonding target. A higher target means deeper liquidity when the pool migrates.</p>
      </TopBlock>
      <Card>
        <h2 className="font-semibold">How it works</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-2">
          <li>Launch on a Meteora Dynamic Bonding Curve. There is no custom token contract.</li>
          <li>Pick Standard, Higher, or Max. Anti-sniper can be turned on for that config.</li>
          <li>The curve fee is 1%. A larger share goes to the creator on the higher tiers.</li>
          <li>Trades made here accrue 0.05% cashback. After that, platform fees split 40% buyback and burn, 50% operations, 10% treasury.</li>
        </ul>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {Object.values(TIERS).map((t) => (
            <div key={t.id} className="rounded border border-border px-3 py-2">
              <div className="text-sm font-medium">{t.label}</div>
              <div className="num text-xs text-ink-3">{t.migrationQuoteThresholdSol} SOL</div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="font-semibold">Credit</h2>
        <p className="mt-2 text-sm text-ink-2">The original idea is from ContextChain. Higher Bar is the build: tiered migration targets, creator fees, and a public buyback record.</p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link href="/launch" className="rounded border border-border px-3 py-1.5 hover:bg-muted">Launch a token</Link>
          <Link href="/cashback" className="rounded border border-border px-3 py-1.5 hover:bg-muted">Cashback</Link>
          <Link href="/burn" className="rounded border border-border px-3 py-1.5 hover:bg-muted">Burn tracker</Link>
        </div>
      </Card>
    </div>
  );
}
