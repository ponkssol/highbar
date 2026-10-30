import Link from "next/link";

/** Short server-rendered intro under the token table: what highbar is, in plain words, with the facts that are true today. */
const POINTS: { title: string; body: React.ReactNode }[] = [
  { title: "Meteora DBC to DAMM v2", body: <>Every token trades on a Meteora DBC bonding curve, then migrates to a Meteora DAMM v2 pool with locked liquidity when the curve fills.</> },
  { title: "Three tiers", body: <>Standard, Higher and Max tokens graduate at 85, 150 and 250 SOL. Every mint address ends in &ldquo;high&rdquo;.</> },
  { title: "Anti-sniper fee", body: <>When it is on, the trading fee starts at 25% and falls to about 1% within 60 seconds, so sniping the first block is expensive.</> },
  { title: "Dev Lock", body: <>Creators can lock their own tokens with Jupiter Lock. Every lock and its unlock date are public.</> },
  { title: "$HIGHER buyback and burn", body: <>Soon: part of the platform fees buys $HIGHER and burns it on-chain. It is not an investment and no returns are promised.</> },
];

export function HomeIntro() {
  return (
    <section aria-labelledby="home-intro-title" data-testid="home-intro" className="mt-2 border-t border-border pt-6 text-sm text-ink-3">
      <h2 id="home-intro-title" className="text-base font-semibold tracking-tight text-ink">A Solana token launchpad built on Meteora</h2>
      <p className="mt-1.5 max-w-3xl leading-relaxed">
        highbar is a memecoin launchpad on Solana. Launch a Solana memecoin on a Meteora bonding curve, or trade new tokens as they launch.{" "}
        <Link href="/docs" className="text-ink-2 underline decoration-border underline-offset-2 hover:text-ink">Read how it works</Link>.
      </p>
      <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {POINTS.map((p) => (
          <li key={p.title} className="min-w-0">
            <h3 className="text-[13px] font-medium text-ink-2">{p.title}</h3>
            <p className="mt-0.5 leading-relaxed">{p.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
