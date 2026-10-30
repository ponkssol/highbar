import type { ApiToken } from "@/lib/api";
import { fmtUsd } from "@/lib/format";
import { bondingPct, devLockStatus, fmtDateUtc, migrationStatus, pct1, targetSolOf, tierLabel, tokenName } from "@/lib/tokenSeo";

/** Server-rendered token facts (in the initial HTML for search engines and AI crawlers), kept quiet in the UI: a short summary and a fact list. */
export function TokenAbout({ t, holders, summary }: { t: ApiToken; holders: number | null; summary: string }) {
  const facts: [string, string][] = [
    ["Mint", t.mint], ["Creator", t.creator || "–"], ["Tier", `${tierLabel(t.tier)} (graduates at ${targetSolOf(t)} SOL)`],
    ["Market cap", t.mcapUsd > 0 ? fmtUsd(t.mcapUsd) : "–"], ["Holders", holders != null ? holders.toLocaleString("en-US") : "–"],
    ["Bonding", t.isMigrated ? "100%, graduated" : `${pct1(bondingPct(t))}%`], ["Status", migrationStatus(t)], ["Dev Lock", devLockStatus(t)],
    ["Created", t.createdAt > 0 ? `${fmtDateUtc(t.createdAt)} (UTC)` : "–"],
  ];
  return (
    <section data-testid="token-about" aria-labelledby="token-about-title" className="rounded-lg border border-border bg-surface px-4 py-3 text-[13px] leading-relaxed text-ink-3">
      <h2 id="token-about-title" className="text-[13px] font-medium text-ink-2">About {tokenName(t)}</h2>
      <p className="mt-1 max-w-3xl">{summary}</p>
      <details className="group mt-2">
        <summary className="cursor-pointer list-none text-xs font-medium text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">Token facts</summary>
        <dl className="mt-2 grid gap-x-6 sm:grid-cols-2">
          {facts.map(([k, v]) => (
            <div key={k} className="flex min-w-0 justify-between gap-3 border-b border-border py-1.5"><dt>{k}</dt><dd className="num min-w-0 break-all text-right text-ink-2">{v}</dd></div>
          ))}
        </dl>
      </details>
    </section>
  );
}
