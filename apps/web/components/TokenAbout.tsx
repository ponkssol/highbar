import Link from "next/link";
import type { ApiToken } from "@/lib/api";
import { fmtUsd } from "@/lib/format";
import { bondingPct, devLockStatus, fmtDateUtc, migrationStatus, pct1, targetSolOf, tierLabel, tokenName } from "@/lib/tokenSeo";

export interface TokenTextLink { href: string; label: string }

/** Server-rendered token facts. The paragraph and the links are in the initial HTML. Missing fields are left out. */
export function TokenAbout({ t, holders, summary, related, guides }: {
  t: ApiToken; holders: number | null; summary: string; related: TokenTextLink[]; guides: TokenTextLink[];
}) {
  const facts: [string, string][] = [
    ["Mint", t.mint],
    ...(t.creator?.trim() ? [["Creator", t.creator.trim()] as [string, string]] : []),
    ...(t.tier ? [["Tier", `${tierLabel(t.tier)} (graduates at ${targetSolOf(t)} SOL)`] as [string, string]] : []),
    ...(t.mcapUsd > 0 ? [["Market cap", fmtUsd(t.mcapUsd)] as [string, string]] : []),
    ...(holders != null ? [["Holders", holders.toLocaleString("en-US")] as [string, string]] : []),
    ["Bonding", t.isMigrated ? "100%, graduated" : `${pct1(bondingPct(t))}%`],
    ["Status", migrationStatus(t)],
    ["Dev Lock", devLockStatus(t)],
    ...(t.createdAt > 0 ? [["Created", `${fmtDateUtc(t.createdAt)} (UTC)`] as [string, string]] : []),
  ];
  const links = (items: TokenTextLink[]) => items.map((item, i) => (
    <span key={item.href}>
      {i > 0 ? ", " : null}
      <Link href={item.href} className="text-ink-2 underline decoration-border underline-offset-2 hover:text-ink">{item.label}</Link>
    </span>
  ));
  return (
    <section data-testid="token-about" aria-labelledby="token-about-title" className="rounded-lg border border-border bg-surface px-4 py-3 text-[13px] leading-relaxed text-ink-3">
      <h2 id="token-about-title" className="text-[13px] font-medium text-ink-2">About {tokenName(t)}</h2>
      <p className="mt-1 max-w-3xl">{summary}</p>
      {related.length > 0 && <p className="mt-2 max-w-3xl">Related tokens: {links(related)}.</p>}
      {guides.length > 0 && <p className="mt-2 max-w-3xl">Guides: {links(guides)}.</p>}
      <dl className="mt-2 grid gap-x-6 sm:grid-cols-2">
        {facts.map(([k, v]) => (
          <div key={k} className="flex min-w-0 justify-between gap-3 border-b border-border py-1.5"><dt>{k}</dt><dd className="num min-w-0 break-all text-right text-ink-2">{v}</dd></div>
        ))}
      </dl>
    </section>
  );
}
