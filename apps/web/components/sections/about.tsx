import Link from "next/link";
import { TopBlock } from "@/components/TopBar";
import { Card } from "@/components/ui";
import { CASHBACK_PCT, PLATFORM_SPLIT, REFERRAL_OF_PROTOCOL_PCT, TIERS, feeSplitPct, migrationFeePct, postMigrationPct } from "@/lib/fees";
import { TierTargets } from "./TierTargets";

const ids = Object.keys(TIERS) as (keyof typeof TIERS)[];
const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const per = (f: (id: keyof typeof TIERS) => string) => list(ids.map((id) => `${f(id)} on ${TIERS[id].label}`));
const pct = (v: number) => `${Math.round(v * 100)}%`;

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-4">
      <TopBlock title="About">
        <p className="mt-2 max-w-xl text-sm text-ink-2">Higher Bar is a Solana launchpad where the creator picks the bonding target. A higher target means deeper liquidity when the pool migrates, and higher creator earnings through graduation than on pump.fun.</p>
      </TopBlock>
      <Card>
        <h2 className="font-semibold">How it works</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-2">
          <li>Launch on a Meteora Dynamic Bonding Curve. There is no custom token contract.</li>
          <li>Pick Standard, Higher, or Max. Anti-sniper can be turned on for that config.</li>
          <li>Before migration the curve fee is 1% per trade. The creator gets {per((id) => `${feeSplitPct(id).creator}%`)}. The platform gets {per((id) => `${feeSplitPct(id).platform}%`)}. Meteora gets {per((id) => `${feeSplitPct(id).meteora}%`)}. Higher is stored on-chain as 62% of the non-Meteora fee, which is about 0.496% for the creator and 0.304% for the platform.</li>
          <li>After migration the Meteora DAMM v2 pool fee is 1%. With the creator&apos;s locked LP share plus the fixed platform LP rebate, the creator gets {per((id) => `${postMigrationPct(id).creator}%`)}, the platform gets {per((id) => `${postMigrationPct(id).platform}%`)} and Meteora gets {per((id) => `${postMigrationPct(id).protocol}%`)}.</li>
          <li>Migration fee: {per((id) => `${migrationFeePct(id).fee}%`)} of the migrated SOL. The creator gets {per((id) => `${migrationFeePct(id).creatorShare}%`)} of it.</li>
          <li>Traders pay no extra app fee. Trades made here earn {CASHBACK_PCT}% cashback, to be paid in $HIGHER (in SOL until $HIGHER launches).</li>
          <li>The referral reward on swaps comes out of Meteora&apos;s protocol fee ({REFERRAL_OF_PROTOCOL_PCT}% of it), not from creators or traders. The user referral program is funded only from that income, never from the platform&apos;s share.</li>
          <li>The platform&apos;s net share splits {pct(PLATFORM_SPLIT.buyback)} buyback and burn of $HIGHER, {pct(PLATFORM_SPLIT.ops)} operations and {pct(PLATFORM_SPLIT.treasury)} treasury. $HIGHER has not launched yet.</li>
        </ul>
        <TierTargets />
      </Card>
      <Card>
        <h2 className="font-semibold">Credit</h2>
        <p className="mt-2 text-sm text-ink-2">The original idea is from ContextChain. Higher Bar is the build: tiered migration targets, creator fees, and a public buyback record.</p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link href="/launch" className="rounded border border-border px-3 py-1.5 hover:bg-muted">Launch a token</Link>
          <Link href="/rewards?tab=cashback" className="rounded border border-border px-3 py-1.5 hover:bg-muted">Cashback</Link>
          <Link href="/rewards?tab=burn" className="rounded border border-border px-3 py-1.5 hover:bg-muted">Burn tracker</Link>
        </div>
      </Card>
    </div>
  );
}
