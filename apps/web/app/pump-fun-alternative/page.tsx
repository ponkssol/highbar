import type { Metadata } from "next";
import { Bullets, DocLink, DocSection } from "@/components/docs/Docs";
import { CurveFeeTable } from "@/components/seo/FeeTables";
import { Guide, type GuideFaq } from "@/components/seo/Guide";
import { guidePageMeta } from "@/lib/guideCatalog";
import { FACT, tierFact } from "@/lib/guideFacts";

export const metadata: Metadata = guidePageMeta("/pump-fun-alternative");

const FAQ: GuideFaq[] = [
  { q: "Is highbar a pump.fun fork?", a: "No. pump.fun runs its own curve and graduates to PumpSwap. highbar launches on Meteora DBC and graduates to Meteora DAMM v2. The products feel similar because both are instant token launches on a bonding curve." },
  { q: "Does Standard match pump.fun's graduation size?", a: `Standard graduates at ${tierFact("standard").target}. Public comparisons usually describe pump.fun's curve as filling around 85 SOL. highbar uses that figure as the Standard target. It is not a measurement highbar publishes of pump.fun's live program.` },
  { q: "Will a token get more buyers because it launched here?", a: "No. This site does not claim a share of Solana launch volume, and moving a launch off pump.fun does not create an audience. Pick a venue for its mechanics, then judge the token on its own." },
  { q: "Which fees can I verify?", a: `highbar's curve fee is ${FACT.curveFee}, set in the shared config this website is built from. Competitor fees change and differ between writeups, so this page does not repeat them. Use each project's own docs.` },
];

export default function Page() {
  return (
    <Guide path="/pump-fun-alternative" eyebrow="Comparison" toc={[
      { id: "phrase", label: "The phrase" },
      { id: "difference", label: "What actually differs" },
      { id: "same", label: "What stays familiar" },
      { id: "choose", label: "How to choose" },
    ]} faqs={FAQ} lede={<>
      A pump.fun alternative is a launchpad that still lets someone create a tradable Solana token in one sitting. highbar is one of those, on Meteora rather than on pump.fun&apos;s own curve. This page is about that difference. It is not a ranking and it does not guess other people&apos;s fees.
    </>}>
      <DocSection id="phrase" eyebrow="Search" title="What people mean by a pump.fun alternative">
        <p>In 2026 the comparison pages group Solana launchpads by the program under them. pump.fun is the one most of those pages treat as the default. bonk.fun, the launchpad that used to be called LetsBonk, sits on Raydium LaunchLab. Bags, Jupiter Studio, Moonshot and Believe are described as Meteora DBC launchpads, which is the same curve family highbar uses. A longer sourced writeup is in <DocLink href="/articles/pump-fun-alternatives-compare-solana-launchpads">how Solana launchpads differ</DocLink>.</p>
        <p>Those pages also publish launch counts and fee tables. The counts are theirs, often for a dated window, and the fee tables do not always agree. highbar does not republish them as its own research. If you need a number about another product, open the source and check the date.</p>
      </DocSection>
      <DocSection id="difference" eyebrow="Mechanics" title="Where highbar is actually different">
        <Bullets items={[
          <>Curve program: Meteora DBC, one of six configs (three tiers, anti-sniper on or off). Graduation targets are {tierFact("standard").target}, {tierFact("higher").target} and {tierFact("max").target}.</>,
          <>After graduation: a Meteora DAMM v2 pool. The config locks 100% of the LP, split {tierFact("standard").lpCreator} / {tierFact("higher").lpCreator} / {tierFact("max").lpCreator} to the creator by tier, and the rest to the platform.</>,
          <>Curve fee: {FACT.curveFee} on the website, with no extra highbar app fee on top. Meteora keeps {FACT.meteoraShareOfFee} of that fee.</>,
          <>Optional anti-sniper fee, off by default. It starts at {FACT.antiStart} and falls to about {FACT.curveFee} over {FACT.antiSeconds} seconds. It does not block bundles.</>,
          <>Optional Dev Lock through Jupiter Lock, separate from the LP lock. See <DocLink href="/articles/dev-lock-token-lock-solana-explained">the lock explainer</DocLink>.</>,
        ]} />
        <CurveFeeTable />
        <p>pump.fun&apos;s own product, as described by its users and by the roundups linked from the comparison article, graduates into PumpSwap rather than a Meteora pool, and it is a single curve shape rather than three targets. That is the useful distinction. It is not a claim that one design gets you a better price.</p>
      </DocSection>
      <DocSection id="same" eyebrow="Familiar parts" title="What still feels like a memecoin launch">
        <p>You still pick a name, a ticker and an image, sign once, and get a token page with a chart and a trade box. Supply is fixed at {FACT.supply}. There is no custom token contract to deploy and no allowlist. Anyone can buy on the curve, and anyone can sell. A creator who wants tokens at the start uses a dev buy of up to {FACT.devBuyMax}, in the same transaction as creation, and that buy is public.</p>
        <p>Vanity mints end in &ldquo;high&rdquo; when the mint pool has one. The default server mode falls back to an ordinary mint if the pool is empty, and the launch response says which one you got.</p>
      </DocSection>
      <DocSection id="choose" eyebrow="Decision" title="Questions worth asking before you switch">
        <p>A different launchpad does not fix a token. The questions that match the mechanics are narrower. Do you want the curve to graduate at 85 SOL or only after 150 or 250? Do you want the first minute of trading to pay a decaying fee? Do you want the graduated LP locked inside DAMM v2, with fees claimed rather than liquidity removed? Do you want to trade from the website, or from a post on X?</p>
        <p>If the answer is the form itself, open <DocLink href="/launch">Launch</DocLink>. If the answer is the fee schedule, read <DocLink href="/anti-sniper-launch">anti-sniper launches</DocLink> before you toggle it on. $HIGHER, the platform token mentioned in the rewards docs, is not live. Cashback is paid in SOL until it launches. That is not a yield product.</p>
      </DocSection>
    </Guide>
  );
}
