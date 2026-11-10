import type { Metadata } from "next";
import { Bullets, DocLink, DocSection, Steps, SubHead } from "@/components/docs/Docs";
import { Guide, type GuideFaq } from "@/components/seo/Guide";
import { guidePageMeta } from "@/lib/guideCatalog";
import { FACT, tierFact } from "@/lib/guideFacts";

export const metadata: Metadata = guidePageMeta("/launch-a-memecoin");

const FAQ: GuideFaq[] = [
  { q: "How much does it cost to create the token?", a: "The DBC config sets the pool creation fee to 0. You still pay Solana network fees, and any dev buy you add is a real purchase on the curve. highbar does not charge a separate creation invoice in the app." },
  { q: "Can I mint more supply later?", a: `No. Supply is ${FACT.supply}, mint authority is off, and metadata is immutable. ${FACT.supplyOnMigration} of supply is reserved for the DAMM v2 pool at migration. There is no leftover allocation in the config.` },
  { q: "What is the dev buy?", a: `An optional buy of up to ${FACT.devBuyMax}, and never more than the tier target, inside the same transaction that creates the pool. You are the first buyer. The tokens go to your wallet. With anti-sniper on, that bundled buy pays the minimum fee, not the opening anti-sniper fee.` },
  { q: "Does launching here mean the token is endorsed?", a: "No. highbar will list the token page and the public curve. It does not review the idea, the name or the creator. You are responsible for what you launch." },
];

export default function Page() {
  return (
    <Guide path="/launch-a-memecoin" eyebrow="Walkthrough" toc={[
      { id: "before", label: "Before you start" },
      { id: "steps", label: "The launch steps" },
      { id: "choices", label: "Tier and anti-sniper" },
      { id: "after", label: "After it confirms" },
    ]} faqs={FAQ} lede={<>
      Launching a memecoin on Solana, on highbar, is one signed transaction. It creates an SPL token and a Meteora bonding curve. The form is short on purpose. The choices that matter are the tier, whether the anti-sniper fee is on, and whether you buy in the same transaction.
    </>}>
      <DocSection id="before" eyebrow="Prepare" title="What you need before the form">
        <Bullets items={[
          <>A Solana wallet you control. highbar does not hold the keys. You sign the launch yourself.</>,
          <>A little SOL for network fees, plus SOL if you want a dev buy. The buy is capped at {FACT.devBuyMax} and at the tier&apos;s migration target, whichever is lower. On mainnet every tier target is above 20 SOL, so the cap you will see is {FACT.devBuyMax}.</>,
          <>A name of at most {FACT.nameBytes} bytes and a ticker of at most {FACT.tickerBytes} bytes, after the app strips control characters. Bytes are not the same as characters if you use emoji or non-Latin text.</>,
          <>An optional image: PNG, JPG, WEBP or GIF, at most {FACT.imageMb} MB, checked by the file&apos;s real header rather than the file name.</>,
          <>Optional website, X and Telegram links. Only http and https URLs are kept.</>,
        ]} />
        <p>The ticker HIGHER is reserved for the official token, which is not launched. Do not pick it for a memecoin.</p>
      </DocSection>
      <DocSection id="steps" eyebrow="Form" title="What the launch form does">
        <Steps items={[
          <>Open <DocLink href="/launch">Launch</DocLink> and connect the creator wallet.</>,
          <>Enter the name, ticker, description and image. The counters are byte counts, and the API rejects anything over the limit.</>,
          <>Pick Standard, Higher or Max. Max can later require a $HIGHER balance once that token exists. Until $HIGHER launches, the gate described in the app stays open.</>,
          <>Leave anti-sniper off, or turn it on. The default is off. Read <DocLink href="/anti-sniper-launch">what the fee does</DocLink> before you enable it.</>,
          <>Optionally set a dev buy. The quote shows estimated tokens, the minimum you accept, and the fee on that buy.</>,
          <>Sign. With a vanity mint the API co-signs the mint key after you sign, then the transaction is sent. If the mint pool is empty, the server can fall back to a random mint that does not end in &ldquo;high&rdquo;, and the response flags that path.</>,
        ]} />
        <p>The token page can open as soon as the transaction confirms. Indexing the name and image can lag a moment behind the chain. That delay is not a second launch.</p>
      </DocSection>
      <DocSection id="choices" eyebrow="Decisions" title="Tier and anti-sniper, in one place">
        <SubHead>Tier</SubHead>
        <p>Standard migrates at {tierFact("standard").target}, Higher at {tierFact("higher").target}, Max at {tierFact("max").target}. Creator fees on the curve are {tierFact("standard").curveCreator}, {tierFact("higher").curveCreator} and {tierFact("max").curveCreator} of each trade. The rest of the {FACT.curveFee} fee is Meteora&apos;s {FACT.meteoraShareOfFee} cut plus the platform. A higher tier is not &ldquo;safer&rdquo;. It means the curve has to raise more SOL before a pool exists, and the creator&apos;s fee share is larger.</p>
        <SubHead>Anti-sniper</SubHead>
        <p>Off means every trade, including the first, pays {FACT.curveFee}. On means other buyers pay {FACT.antiStart} at the first second, falling each second for {FACT.antiSeconds} seconds. Your own dev buy, because it is inside the create transaction, pays the minimum fee instead of that opening rate. Other wallets do not get that exception.</p>
      </DocSection>
      <DocSection id="after" eyebrow="Live token" title="After the transaction confirms">
        <p>The curve is live. Buys and sells on the token page pay the pool fee and earn the trader cashback described in the docs, {FACT.cashback} of volume, paid from the platform&apos;s share in SOL until $HIGHER exists. You claim creator fees yourself from Portfolio. They sit in the pool until you do.</p>
        <p>If you want to lock tokens you bought, Dev Lock is a separate Jupiter Lock transaction. It is optional, permanent, and limited to the creator wallet. The graduated DAMM v2 liquidity is locked by the config even if you never touch Dev Lock. Neither lock stops you selling unlocked tokens, and neither one is a reason for someone else to buy.</p>
        <p>The fee tables, including migration and the post-migration rebate, are in <DocLink href="/articles/memecoin-creator-fees-solana-launchpad">what you pay</DocLink>. The curve itself is explained in <DocLink href="/articles/meteora-dynamic-bonding-curve-explained">Meteora DBC to DAMM v2</DocLink>.</p>
      </DocSection>
    </Guide>
  );
}
