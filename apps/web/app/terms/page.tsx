import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { TopBar } from "@/components/TopBar";
import { HairlineDivider } from "@/components/arena";

export const metadata: Metadata = { title: "Terms and Conditions" };

const UPDATED = "Oct 30, 2026";

/** Plain-language terms. Cinzel on headings only (h1 and h2 pick it up from globals.css), body copy in Inter. */
const SECTIONS: { id: string; title: string; body: ReactNode }[] = [
  { id: "service", title: "What highbar is", body: <>
    <p>highbar is software for launching and trading tokens on Solana. It shows on-chain data and builds transactions for you to review and sign in your own wallet. By using highbar you agree to these terms. If you do not agree, do not use it.</p>
  </> },
  { id: "non-custodial", title: "Non-custodial use", body: <>
    <p>highbar never holds your funds, tokens or private keys. Every action is a transaction that you sign in your own wallet. Nobody at highbar can move your assets, reverse a transaction or recover a lost wallet for you. Keep your wallet and recovery phrase safe.</p>
  </> },
  { id: "locks", title: "Dev token locks", body: <>
    <p>A dev token lock is a time-based lock on chain, run by Jupiter Lock. When you lock tokens they stay locked until the unlock time you picked. They cannot be withdrawn early, and the lock cannot be cancelled, shortened or moved to another recipient, not by you and not by highbar.</p>
    <p>After the unlock time the tokens can be claimed by the recipient wallet. Check the amount and the unlock date before you sign.</p>
  </> },
  { id: "creators", title: "Your responsibility as a creator", body: <>
    <p>If you launch a token you are responsible for it, including any lock you create, what you promise to your community and the laws that apply to you. A lock shown on highbar only reflects what is on chain. It is not a promise or a guarantee from highbar about the token or its creator.</p>
  </> },
  { id: "advice", title: "No financial advice", body: <>
    <p>Nothing on highbar is financial, investment, legal or tax advice. Prices, scores, rankings and badges are information only. Tokens can lose all of their value. Only use money you can afford to lose and do your own research.</p>
  </> },
  { id: "risk", title: "On-chain risk is yours", body: <>
    <p>Blockchains, wallets, smart contracts and the programs highbar uses can fail, be attacked or behave in ways nobody expected. Transactions can fail or land at a different price than shown. Network congestion, outages and bugs can happen. You accept these risks when you sign a transaction.</p>
  </> },
  { id: "fees", title: "Fees", body: <>
    <p>highbar charges fees on some actions, for example on trades and as a small protocol tip when you create a lock. Fee rates depend on the token tier and can change. The fee for an action is shown in the app before you confirm it, for example in the trade panel, in the Fees tab on each token page and in the lock form. Solana network fees go to the network, not to highbar.</p>
  </> },
  { id: "warranty", title: "No warranty", body: <>
    <p>highbar is provided as is and as available, without any warranty. We do not promise that it will always work, be error free or be available. To the extent the law allows, highbar is not liable for any loss that comes from using it, including lost tokens, failed transactions or price changes.</p>
  </> },
  { id: "changes", title: "Changes to these terms", body: <>
    <p>We may update these terms. The date at the top shows the latest version. If you keep using highbar after a change, you accept the updated terms.</p>
  </> },
];

export default function TermsPage() {
  return (
    <div className="flex flex-col gap-5" data-testid="terms-page">
      <TopBar />
      <article className="hb-hero mx-auto w-full max-w-3xl rounded-lg border border-border bg-surface px-5 py-7 md:px-10 md:py-10">
        <div className="hb-eyebrow">Legal</div>
        <h1 className="mt-2.5 text-2xl font-semibold leading-tight md:text-[34px]">Terms and Conditions</h1>
        <p className="mt-2 font-serif text-[15px] leading-snug text-ink-2 md:text-[17px]">The rules for using highbar, in plain language.</p>
        <p className="num mt-3 text-xs text-ink-3" data-testid="terms-updated">Last updated {UPDATED}</p>
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
        <p className="text-sm text-ink-3">Questions about these terms? Reach us through the social links in the app. <Link href="/" className="font-medium text-gold-text underline-offset-4 hover:underline">Back to the dashboard</Link></p>
      </article>
    </div>
  );
}
