import type { Metadata } from "next";
import { Bullets, DocLink, DocSection, Steps } from "@/components/docs/Docs";
import { CurveFeeTable, MigrationTable } from "@/components/seo/FeeTables";
import { Guide, type GuideFaq } from "@/components/seo/Guide";
import { guidePageMeta } from "@/lib/guideCatalog";
import { FACT, tierFact } from "@/lib/guideFacts";

export const metadata: Metadata = guidePageMeta("/solana-launchpad");

const FAQ: GuideFaq[] = [
  { q: "Does highbar run its own launchpad program?", a: "No. A launch creates a Meteora Dynamic Bonding Curve pool from one of six fixed configs. There is no separate highbar token program. When the curve fills, the pool migrates to Meteora DAMM v2." },
  { q: "What are the three tiers?", a: `Standard graduates at ${tierFact("standard").target}, Higher at ${tierFact("higher").target} and Max at ${tierFact("max").target}. A higher target leaves a deeper pool at migration and gives the creator a larger share of trading fees.` },
  { q: "Is every mint address ending in high?", a: "The usual launch uses a vanity mint that ends in high. If that pool is empty, the default server mode falls back to a normal mint and the launch response says so. A fallback mint does not end in high." },
  { q: "Is this a safe or rug-proof way to launch?", a: "No. Migrated liquidity is permanently locked, so it cannot be withdrawn, and mint authority is off. Creators and other holders can still sell tokens they hold. Nothing here removes market risk." },
];

export default function Page() {
  return (
    <Guide path="/solana-launchpad" eyebrow="Launchpad" toc={[
      { id: "what", label: "What it is" },
      { id: "tiers", label: "Tiers" },
      { id: "curve", label: "Curve and graduation" },
      { id: "start", label: "Where to start" },
    ]} faqs={FAQ} lede={<>
      highbar is a Solana token launchpad for memecoins. You create a token, it trades on a bonding curve priced in SOL, and if the curve reaches its target the liquidity moves to a Meteora DAMM v2 pool that stays locked.
    </>}>
      <DocSection id="what" eyebrow="Product" title="What this Solana token launchpad does">
        <p>People searching for a Solana token launchpad usually want the pump.fun shape of product: a form, a curve, and a page where anyone can buy. highbar is that kind of product, built on Meteora&apos;s Dynamic Bonding Curve instead of a private curve program. The six configs are public. They are listed under <DocLink href="/docs#public-addresses">public addresses</DocLink>.</p>
        <Bullets items={[
          <>Fixed supply of {FACT.supply} tokens, {FACT.decimals} decimals, mint authority off, metadata immutable.</>,
          <>No team allocation and no presale in the curve config. Creators receive tokens by buying them, including an optional dev buy.</>,
          <>The pool creation fee in the config is 0. You still pay Solana network fees to create the accounts.</>,
          <>Website trades pay the pool fee. highbar does not add a second app fee on top of the {FACT.curveFee} curve fee. The <DocLink href="/trade-solana-from-x">Chrome extension</DocLink> is different: it adds {FACT.extFee}.</>,
        ]} />
      </DocSection>
      <DocSection id="tiers" eyebrow="Choice" title="Three ways to set the bar">
        <p>The tier is the decision that changes the launch. It sets the SOL target, the creator&apos;s share of the curve fee, the migration fee and how the locked LP is split. Standard is the closest to the graduation size people associate with pump.fun. Higher and Max ask the curve to raise more SOL before a DAMM v2 pool exists.</p>
        <CurveFeeTable />
        <p>Shares in that table are of each trade, not of the fee. On Higher the creator percentage is stored as a whole number because the Meteora program only accepts whole numbers, so the creator receives {tierFact("higher").curveCreator} of each trade. The same figures are written out in the <DocLink href="/docs#launch">docs</DocLink> and the <DocLink href="/articles/memecoin-creator-fees-solana-launchpad">fee guide</DocLink>.</p>
      </DocSection>
      <DocSection id="curve" eyebrow="After the curve" title="Graduation is a Meteora DAMM v2 pool">
        <p>Buys move the price up the curve and sells move it down. The progress on a token page is SOL in the curve against the tier target. At the target, the migration sends the raised SOL, minus the migration fee, into a DAMM v2 pool together with {FACT.supplyOnMigration} of the supply. Meteora also keeps a fixed {FACT.meteoraLiquidityCut} of the migrated liquidity. The market-cap figures below are approximate and ignore that cut.</p>
        <MigrationTable />
        <p>Both LP positions are permanently locked. The config sets the unlocked LP shares to zero. Nobody can withdraw that liquidity. The creator and the platform can claim the fees their positions earn. That is not a promise about price, and it does not freeze tokens sitting in wallets. Read <DocLink href="/articles/dev-lock-token-lock-solana-explained">locked liquidity and Dev Lock</DocLink> before treating a lock badge as a guarantee.</p>
      </DocSection>
      <DocSection id="start" eyebrow="Next step" title="Where to start">
        <Steps items={[
          <>Read the <DocLink href="/launch-a-memecoin">launch walkthrough</DocLink> if you want the field limits and the dev buy.</>,
          <>Use <DocLink href="/launch">Launch</DocLink> when you are ready to sign. Anti-sniper is off unless you turn it on.</>,
          <>Trade from the token page in this app, or from X with the extension. Both are optional.</>,
          <>If you are comparing products, the <DocLink href="/pump-fun-alternative">pump.fun alternative</DocLink> page stays on mechanics and does not rank anyone.</>,
        ]} />
      </DocSection>
    </Guide>
  );
}
