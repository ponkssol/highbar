import type { Metadata } from "next";
import { Bullets, DocLink, DocSection, Steps } from "@/components/docs/Docs";
import { ExtensionCtas, Guide, type GuideFaq } from "@/components/seo/Guide";
import { EXTENSION_NAME, EXTENSION_STORE_URL, EXTENSION_VERSION_CHECKED, guidePageMeta } from "@/lib/guideCatalog";
import { FACT } from "@/lib/guideFacts";

export const metadata: Metadata = guidePageMeta("/trade-solana-from-x");

const FAQ: GuideFaq[] = [
  { q: "Do I need the extension to use highbar?", a: "No. The website launches tokens and trades them with the wallet you connect. The extension is a separate Chrome tool for doing some of that from X." },
  { q: "What does an extension trade cost?", a: `The pool still charges its own fee. On a highbar curve that is ${FACT.curveFee} unless an anti-sniper schedule is still running. The extension adds ${FACT.extFee} of the SOL amount, rounded down to the nearest lamport, and shows fees before you confirm. Trades under 5,000 lamports round the extension fee to zero. Solana network fees are extra.` },
  { q: "Where are the keys?", a: "The Chrome Web Store listing says wallet keys are created and stored only on your device, and that you can create or import several wallets. That is not the same as the website, which asks your existing wallet to sign and never sees a seed phrase." },
  { q: "Can I launch a coin from a post?", a: "The listing says you can turn a post and its image into a coin launch on highbar. The launch still uses highbar's tiers and Meteora DBC configs. Confirm the tier and the anti-sniper setting before you sign. A post is not a prospectus." },
];

export default function Page() {
  return (
    <Guide path="/trade-solana-from-x" eyebrow="Chrome extension" toc={[
      { id: "what", label: "What it does" },
      { id: "fee", label: "The extension fee" },
      { id: "risks", label: "Trading from a post" },
      { id: "install", label: "Install" },
    ]} faqs={FAQ} cta={<ExtensionCtas />} lede={<>
      {EXTENSION_NAME} is a Chrome extension for buying, selling and launching Solana tokens from posts on X. The website works without it. This page describes the extension that was on the Chrome Web Store as version {EXTENSION_VERSION_CHECKED} on 10 November 2026, plus the fee in highbar&apos;s code.
    </>}>
      <DocSection id="what" eyebrow="Listing" title="What the extension is for">
        <p>Trading Solana from X means you never leave the timeline to paste a mint into a swap box. Several extensions already do a version of that. highbar&apos;s is one of them. The store overview says token chips appear on posts that mention a Solana address or a cashtag, and a popup buys or sells without leaving the timeline. It also says you can launch from a post, using that post and its image.</p>
        <Bullets items={[
          <>The default chart is highbar&apos;s, with your own buy and sell markers and an average entry line. The listing says you can switch to the GMGN chart. That is a chart toggle, not a partnership.</>,
          <>Market cap, volume, liquidity, ATH and ATL are shown in the popup.</>,
          <>You can create or import more than one wallet. Wallet and slippage controls sit in the popup header. Keys stay on the device, according to the listing.</>,
          <>Holdings, history and realized profit are in the extension. You can export a PnL card. The listing says its screenshots use sample data, so a screenshot is not a result.</>,
          <>Priority fee and an optional custom RPC are settings you control. The extension does not publish an RPC URL in the page you are reading.</>,
          <>Wallets, settings and diagnostics also live in the Chrome side panel. The store&apos;s support line says it can auto-detect tokens on DEX sites and show holdings there. It does not name a closed list of sites on the overview.</>,
        ]} />
      </DocSection>
      <DocSection id="fee" eyebrow="Cost" title="The 0.02% extension fee">
        <p>Website trades on a highbar curve pay the pool fee and nothing extra from highbar. Extension transactions are different. The shared fee constant is {FACT.extFee} of the trade&apos;s SOL amount, sent to the extension fee receiver the API is configured with. It applies to extension trades, including a dev buy made from the extension. Under 5,000 lamports the integer math rounds it to zero.</p>
        <p>That {FACT.extFee} is not cashback, and it is not the {FACT.curveFee} pool fee. Cashback on highbar is a separate {FACT.cashback} of volume, paid from the platform&apos;s own share, for trades the app counts. Do not add the two percentages together and call the sum the price of a website trade. The listing says fees are shown before every extension trade. Read that line in the popup, not a memory of this page.</p>
        <p>The receiver just accumulates the fee. The code does not automatically buy or burn a token with extension fees. $HIGHER buyback, described in the docs, is a different bucket and does not run until $HIGHER launches.</p>
      </DocSection>
      <DocSection id="risks" eyebrow="Care" title="A post is a bad place to skip the mint">
        <p>Cashtags are not unique, and a reply can paste a different address under a famous ticker. A chip on a post is only as good as the address it detected. Before you buy, open the mint, compare it with the token you think you are buying, and look at the pool. On highbar the token page shows the curve, the tier and whether liquidity has migrated. <DocLink href="/articles/how-to-check-a-solana-token-before-buying">How to trade a token you saw on X</DocLink> walks through that check.</p>
        <p>Local keys mean a seed phrase in the extension is a seed phrase. The store listing says it never leaves the device. Anyone with the device and the phrase still has the wallet. highbar cannot restore it. The website never asks you to type a seed into highbar.capital. If a page does, it is not this app.</p>
      </DocSection>
      <DocSection id="install" eyebrow="Store" title="Where to install it">
        <Steps items={[
          <>Install only from the Chrome Web Store listing for {EXTENSION_NAME}. The id is in the URL: <DocLink href={EXTENSION_STORE_URL}>{EXTENSION_STORE_URL.replace("https://", "")}</DocLink>.</>,
          <>The copy checked for this page was version {EXTENSION_VERSION_CHECKED}, updated 5 November 2026. If the store shows a newer version, trust the store for features and this site for the on-chain fee constants.</>,
          <>You can ignore the extension and use <DocLink href="/launch">Launch</DocLink> plus the token pages in the browser. That path uses your own wallet extension, such as the one you already connect to the site.</>,
        ]} />
        <p>Trading crypto is risky. The extension is a tool for signing trades. It is not financial advice, and a button on a timeline is not a recommendation from highbar.</p>
      </DocSection>
    </Guide>
  );
}
