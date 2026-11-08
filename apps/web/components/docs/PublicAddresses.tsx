"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { buttonClass } from "@/components/ui";
import {
  ADDRESS_INTRO, antiSniperLabel, DBC_CONFIGS, PUBLIC_ROLES, solscanAccountUrl, tierLabel, type PublicRole,
} from "@/lib/publicAddresses";

async function writeText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = value;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      el.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function CopyAddressButton({ address, label }: { address: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!(await writeText(address))) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button type="button" onClick={copy} data-testid="copy-address" data-address={address} className={buttonClass("secondary", "md")}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}>
      {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function SolscanAccountLink({ address, label }: { address: string; label: string }) {
  return (
    <a href={solscanAccountUrl(address)} target="_blank" rel="noopener noreferrer" data-testid="solscan-account" data-address={address}
      className={buttonClass("secondary", "md")} aria-label={`View ${label} on Solscan`}>
      Solscan <ExternalLink size={15} aria-hidden />
    </a>
  );
}

function FullAddress({ address }: { address: string }) {
  return <code translate="no" spellCheck={false} className="num block break-all text-[13px] leading-relaxed text-ink">{address}</code>;
}

function Actions({ address, label }: { address: string; label: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <CopyAddressButton address={address} label={label} />
      <SolscanAccountLink address={address} label={label} />
    </div>
  );
}

/** Intro paragraphs shared with /llms-full.txt. Rendered here so the docs page and the markdown stay on one copy. */
export function PublicAddressIntro() {
  return (
    <>
      {ADDRESS_INTRO.map((p) => <p key={p}>{p}</p>)}
    </>
  );
}

export function RoleAddresses() {
  return (
    <div data-testid="role-addresses" className="flex flex-col gap-3">
      {PUBLIC_ROLES.map((role) => <RoleCard key={role.id} role={role} />)}
    </div>
  );
}

function RoleCard({ role }: { role: PublicRole }) {
  return (
    <div className="rounded-md border border-border px-3 py-3 md:px-4">
      <div className="font-medium text-ink">{role.label}</div>
      <p className="mt-1 text-[13px] leading-relaxed">{role.detail}</p>
      <div className="mt-3"><FullAddress address={role.address} /></div>
      <div className="mt-3"><Actions address={role.address} label={role.label} /></div>
    </div>
  );
}

export function DbcConfigTable() {
  return (
    <div data-testid="dbc-config-table" className="overflow-hidden rounded-md border border-border">
      <table className="block w-full text-left text-[13px] md:table">
        <caption className="sr-only">Meteora DBC configuration accounts by tier and anti-sniper status</caption>
        <thead className="hidden md:table-header-group">
          <tr className="border-b border-border bg-muted text-xs text-ink-3">
            <th scope="col" className="px-3 py-2.5 font-medium">Tier</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Anti-sniper</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Address</th>
          </tr>
        </thead>
        <tbody className="block md:table-row-group">
          {DBC_CONFIGS.map((c) => {
            const tier = tierLabel(c.tier);
            const sniper = antiSniperLabel(c.antiSniper);
            const label = `${tier} anti-sniper ${sniper} config`;
            return (
              <tr key={c.address} aria-label={`${tier}, anti-sniper ${sniper}`} className="block border-b border-border px-3 py-3 last:border-0 md:table-row md:px-0 md:py-0">
                <td className="block font-medium text-ink md:table-cell md:px-3 md:py-3 md:align-top">{tier}</td>
                <td className="mt-0.5 block text-ink-3 md:table-cell md:px-3 md:py-3 md:align-top md:text-ink-2">
                  <span className="md:hidden">Anti-sniper </span>{sniper}
                </td>
                <td className="mt-2 block md:table-cell md:px-3 md:py-3">
                  <FullAddress address={c.address} />
                  <div className="mt-2"><Actions address={c.address} label={label} /></div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
