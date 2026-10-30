import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { TopBar } from "@/components/TopBar";
import { HairlineDivider } from "@/components/arena";
import { CookieSettingsLink } from "@/components/consent";
import { PROJECT_LINKS } from "@/lib/links";

export const metadata: Metadata = {
  title: "Privacy Policy | highbar",
  description: "How highbar handles your data: public wallet addresses, what stays in your browser, cookies and the services it relies on.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "Oct 31, 2026";

const link = "font-medium text-gold-text underline-offset-4 hover:underline";
const code = "num rounded-sm bg-control px-1.5 py-0.5 text-[12px] text-ink";

/** Plain-language privacy policy, same layout as /terms. Cinzel on headings only, body copy in Inter. */
const SECTIONS: { id: string; title: string; body: ReactNode }[] = [
  { id: "collect", title: "What we collect", body: <>
    <p>highbar has no accounts, no sign up form and no profiles. When you connect a wallet, the app sees your public wallet address. Everything you do on chain, like launches, trades, locks and claims, is public on Solana by nature and anyone can read it. highbar reads that public data to show balances, activity, rankings and rewards.</p>
    <p>When you sign in with your wallet, you sign a message that proves you own the address. Our API then issues a short lived session for that address. If you arrived through a referral link, our API also records which wallet referred yours.</p>
  </> },
  { id: "local", title: "What is stored in your browser", body: <>
    <p>highbar keeps a few small items in your browser&apos;s local storage so the app remembers you between visits. They stay on your device:</p>
    <ul className="list-disc space-y-1 pl-5">
      <li>Your preferences, like theme and display settings.</li>
      <li>Tokens you recently viewed and searched for.</li>
      <li>Your wallet sign-in session, so you do not have to sign again on every visit.</li>
      <li>Whether you saw the welcome message and your cookie choice, kept as <code className={code}>hb_welcome_v1</code> and <code className={code}>hb_consent_v1</code>.</li>
      <li>The referrer wallet from a <code className={code}>?ref=</code> link, if you opened one. It is sent to our API once, after you sign in, to link your wallet to the person who invited you.</li>
    </ul>
  </> },
  { id: "cookies", title: "Cookies", body: <>
    <p>highbar sets one essential first-party cookie, <code className={code}>hb_consent</code>, which remembers your cookie choice so our server can respect it too.</p>
    <p>Analytics cookies and scripts only load if you allow them in Cookie settings. You can say no and everything still works. Today highbar runs no analytics at all.</p>
  </> },
  { id: "custody", title: "Your funds and keys", body: <>
    <p>highbar never holds your funds, tokens or private keys and never sees your recovery phrase. Every action is a transaction that you review and sign in your own wallet.</p>
  </> },
  { id: "third-parties", title: "Third parties", body: <>
    <p>highbar relies on a few outside services. They see what they need to do their part:</p>
    <ul className="list-disc space-y-1 pl-5">
      <li>Solana RPC providers, which read the chain and send your signed transactions. Like any web request, they can see your IP address and the addresses you ask about.</li>
      <li>Meteora and Jupiter on-chain programs, which run launches, pools, swaps and token locks. Anything they record is public on Solana.</li>
      <li>Wallet providers like Reown and your wallet app, which handle the wallet connection under their own privacy policies.</li>
    </ul>
    <p>Like most websites, the servers that host highbar may keep standard request logs, such as IP address and browser type, for security and reliability. We do not sell your data.</p>
  </> },
  { id: "choices", title: "Your choices", body: <>
    <p>You can change your cookie choice at any time in <CookieSettingsLink className={link}>Cookie settings</CookieSettingsLink>. Clearing this site&apos;s data in your browser removes everything highbar stored locally. Disconnecting your wallet ends the session in the app. On-chain activity cannot be deleted by anyone, because it is part of the public blockchain.</p>
  </> },
  { id: "age", title: "Age", body: <>
    <p>highbar is only for people who are over 18 years old.</p>
  </> },
  { id: "changes", title: "Changes to this policy", body: <>
    <p>We may update this policy. The date at the top shows the latest version.</p>
  </> },
  { id: "contact", title: "Contact", body: <>
    <p>Questions about privacy? Reach us on X at <a href={PROJECT_LINKS.x} target="_blank" rel="noopener noreferrer" className={link}>@highbar_capital</a>.</p>
  </> },
];

export default function PrivacyPage() {
  return (
    <div className="flex flex-col gap-5" data-testid="privacy-page">
      <TopBar />
      <article className="hb-hero mx-auto w-full max-w-3xl rounded-lg border border-border bg-surface px-5 py-7 md:px-10 md:py-10">
        <div className="hb-eyebrow">Legal</div>
        <h1 className="mt-2.5 text-2xl font-semibold leading-tight md:text-[34px]">Privacy Policy</h1>
        <p className="mt-2 font-serif text-[15px] leading-snug text-ink-2 md:text-[17px]">What highbar knows about you, and what it does not, in plain language.</p>
        <p className="num mt-3 text-xs text-ink-3" data-testid="privacy-updated">Last updated {UPDATED}</p>
        <HairlineDivider className="my-6" />
        <div className="space-y-7">
          {SECTIONS.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`}>
              <h2 id={`${s.id}-title`} className="flex items-baseline gap-3 text-base font-semibold md:text-lg">
                <span className="num text-xs font-medium text-gold-text">{String(i + 1).padStart(2, "0")}</span>{s.title}
              </h2>
              <div className="mt-2 space-y-2 text-sm leading-relaxed text-ink-2">{s.body}</div>
            </section>
          ))}
        </div>
        <HairlineDivider className="my-6" />
        <p className="text-sm text-ink-3">See also the <Link href="/terms" className={link}>Terms and Conditions</Link>. <Link href="/" className={link}>Back to the dashboard</Link></p>
      </article>
    </div>
  );
}
