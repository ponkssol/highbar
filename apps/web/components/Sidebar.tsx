"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHbWallet, useSolBalance } from "@/lib/wallet";
import { AddrDot } from "./WalletButton";
import { SocialLinks } from "./SocialLinks";
import { useTokens } from "@/lib/useApi";
import { TIERS } from "@hb/shared";
import { TierDot } from "./ui";
import { shortAddr } from "@/lib/format";
import { ThemeToggle } from "./ThemeToggle";
import { NETWORK } from "@/lib/settings";
import { NAV, isNavActive } from "./nav";
import { Logo } from "./Logo";

export function Sidebar() {
  const path = usePathname();
  const { publicKey, address, isConnected, connection } = useHbWallet();
  const bal = useSolBalance(publicKey, connection);
  const { tokens } = useTokens();
  const tierCounts = () => (["standard", "higher", "max"] as const).map((tier) => ({ tier, count: tokens.filter((t) => t.tier === tier).length }));
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-sidebar md:flex flex-col border-r border-border bg-surface px-3 py-5">
      <Link href="/" className="mb-7 flex items-center px-3" aria-label="highbar home">
        <Logo height={28} />
      </Link>
      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const { href, label, icon: Icon } = item;
          const on = isNavActive(path, item);
          return (
            <Link key={href} href={href} aria-current={on ? "page" : undefined}
              className={`flex h-10 items-center gap-3 rounded-sm px-3 text-sm transition-colors ${on ? "bg-muted font-medium text-ink" : "text-ink-2 hover:bg-muted hover:text-ink"}`}>
              <Icon size={18} strokeWidth={on ? 2 : 1.5} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8 px-3 text-[11px] font-medium uppercase tracking-wider text-ink-3">Tiers</div>
      <div className="mt-1.5 flex flex-col">
        {tierCounts().map(({ tier, count }) => (
          <div key={tier} className="flex h-8 items-center justify-between px-3 text-sm text-ink-2">
            <span className="flex items-center gap-2.5"><TierDot tier={tier} />{TIERS[tier].label}</span>
            <span className="num text-xs text-ink-3">{count}</span>
          </div>
        ))}
      </div>
      <div className="mt-auto" />
      <ThemeToggle />
      {isConnected && address && (
        <div className="flex items-center gap-3 rounded bg-muted p-3">
          <AddrDot address={address} size={28} />
          <div className="min-w-0">
            <div className="num truncate text-sm font-medium">{shortAddr(address)}</div>
            <div className="num text-xs text-ink-3">{bal != null ? `${bal.toFixed(3)} SOL` : "…"} · {NETWORK}</div>
          </div>
        </div>
      )}
      <SocialLinks className="mt-2 px-1" />
    </aside>
  );
}
