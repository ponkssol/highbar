import type { Metadata } from "next";
import { Bullets, DocLink, DocSection } from "@/components/docs/Docs";
import { AntiSniperTable } from "@/components/seo/FeeTables";
import { Guide, type GuideFaq } from "@/components/seo/Guide";
import { guidePageMeta } from "@/lib/guideCatalog";
import { FACT } from "@/lib/guideFacts";

export const metadata: Metadata = guidePageMeta("/anti-sniper-launch");

const FAQ: GuideFaq[] = [
  { q: "Is anti-sniper on by default?", a: "No. The launch form leaves it off. A token launched with it off pays the flat 1% curve fee from the first trade. You opt in per token, and the choice is one of the six fixed configs, so it cannot be edited later." },
  { q: "Does the creator pay 25% on the dev buy?", a: "No. The anti-sniper configs turn on Meteora's first-swap-with-minimum-fee flag. The dev buy inside the launch transaction pays the minimum fee, not the opening anti-sniper rate. Every later buy pays the schedule." },
  { q: "Does this stop snipers or bundles?", a: "It makes buying in the first minute expensive, which reduces the advantage of being first. It does not reject transactions, it does not detect bundles, and it does not stop a bot from buying. Calling it anti-bundle or bundle-proof would be false." },
  { q: "What is the fee after one minute?", a: `The schedule runs for ${FACT.antiSeconds} seconds and ends within about one basis point of the normal ${FACT.curveFee} curve fee. The trade panel shows the live fee while it is still falling.` },
];

export default function Page() {
  return (
    <Guide path="/anti-sniper-launch" eyebrow="Launch setting" toc={[
      { id: "why", label: "Why it exists" },
      { id: "schedule", label: "The 60 seconds" },
      { id: "limits", label: "What it does not do" },
      { id: "choose", label: "Turning it on" },
    ]} faqs={FAQ} lede={<>
      An anti-sniper token launch on highbar is a normal Meteora curve with a fee that starts high and decays. Early buyers pay more. After a minute, the fee is the ordinary curve fee. The setting is optional, and it is a fee, not a shield.
    </>}>
      <DocSection id="why" eyebrow="The first seconds" title="Why a launch fee decays">
        <p>On a bonding curve the earliest buy gets the lowest price. Whoever lands a transaction first, person or bot, buys cheaper than everyone a few seconds later. A decaying fee does not change that ordering. It adds a cost that is largest at the start, so the cheap price is partly given back as a fee.</p>
        <p>Meteora DBC can store that cost as a fee scheduler. highbar&apos;s three &ldquo;on&rdquo; configs use the exponential scheduler. The three &ldquo;off&rdquo; configs are a flat {FACT.curveFee}. There is no third mode. Other Meteora launchpads can pick different start fees and different lengths. Believe&apos;s own FAQ, for example, describes a dynamic fee that falls to 2%. That is their schedule, not this one.</p>
      </DocSection>
      <DocSection id="schedule" eyebrow="Numbers" title="From 25% to about 1% in 60 seconds">
        <p>The deployed schedule starts at {FACT.antiStart}. It has {FACT.antiPeriods} steps of {FACT.antiStep} second. Each step multiplies the fee by one minus {FACT.antiCut}, which is the reduction factor stored on the config. The fee only changes on whole seconds. At 0.99 seconds it is still the opening fee.</p>
        <AntiSniperTable />
        <p>The last row is the settled fee, {FACT.antiEnd}, which the shared tests require to sit within one basis point of {FACT.curveFee}. After that, trades pay the normal curve fee and the same tier split as an anti-sniper-off pool. The scheduler does not keep charging extra forever.</p>
        <p>The creator&apos;s dev buy is the exception, and only that buy. It is the first swap in the create transaction, and the config tells Meteora to charge the minimum fee for it. A second wallet in the next slot pays the cliff. If you are launching, do not describe your own dev buy as if it paid 25%.</p>
      </DocSection>
      <DocSection id="limits" eyebrow="Limits" title="What an anti-sniper launch does not do">
        <Bullets items={[
          <>It does not stop bundles. Several buys can still land close together. They just pay the fee that applies at that second.</>,
          <>It does not identify snipers, and it does not refund anyone.</>,
          <>It does not lock liquidity, freeze sells, or review the creator. Those are separate facts about the curve config and Dev Lock, and they have their own limits.</>,
          <>It does not apply on the website as an extra fee after the minute, and it does not apply at all if you left the toggle off.</>,
          <>It is not a reason to expect a higher price later. A fee changes what the buyer pays the pool. It is not demand.</>,
        ]} />
        <p>The longer version, including why this is not a straight line from 25% to 1%, is <DocLink href="/articles/anti-sniper-fee-solana-token-launch">what the fee does and does not do</DocLink>.</p>
      </DocSection>
      <DocSection id="choose" eyebrow="Using it" title="When the toggle is worth thinking about">
        <p>Turn it on if you want the first minute of other people&apos;s buys to be expensive, and you are willing to explain that in your own posts without calling the launch protected. Leave it off if you want every trade, from the first block, at {FACT.curveFee}. You cannot switch after the pool exists, because the config account is chosen at launch.</p>
        <p>The control sits on <DocLink href="/launch">Launch</DocLink>, next to the tier. The live fee, while a token is still inside the minute, is on that token&apos;s trade panel. Public config addresses for the on and off variants are in the <DocLink href="/docs#public-addresses">docs</DocLink>.</p>
      </DocSection>
    </Guide>
  );
}
