"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHbWallet, useSolBalance } from "@/lib/wallet";
import { AddrDot, WalletButton } from "./WalletButton";
import { Coins, Flame, LayoutGrid, Lock, Rocket, Settings, Trophy, Wallet } from "lucide-react";
import { useTokens } from "@/lib/useApi";
import { TIERS } from "@hb/shared";
import { TierDot } from "./ui";
import { shortAddr } from "@/lib/format";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/launch", label: "Launch", icon: Rocket },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/claim", label: "Claim fees", icon: Coins },
  { href: "/locks", label: "Locks", icon: Lock },
  { href: "/burn", label: "Burn", icon: Flame },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const path = usePathname();
  const { publicKey, address, isConnected, connection } = useHbWallet();
  const bal = useSolBalance(publicKey, connection);
  const { tokens } = useTokens();
  const tierCounts = () => (["standard", "higher", "max"] as const).map((tier) => ({ tier, count: tokens.filter((t) => t.tier === tier).length }));
  const isActive = (h: string) => (h === "/" ? path === "/" || path.startsWith("/token") : path.startsWith(h));
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-sidebar md:flex flex-col border-r border-border bg-surface px-4 py-5">
      <Link href="/" className="mb-8 flex items-center gap-2 px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-ink text-sm font-semibold text-on-ink">HB</span>
        <span className="text-lg font-semibold tracking-tight">Higher Bar</span>
      </Link>
      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={`flex h-10 items-center gap-3 rounded px-3 text-sm transition-colors ${isActive(href) ? "bg-muted font-medium text-ink ring-1 ring-border" : "text-ink-2 hover:bg-muted hover:text-ink"}`}>
            <Icon size={20} strokeWidth={1.5} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-8 px-3 text-xs font-medium uppercase tracking-wide text-ink-3">Tiers</div>
      <div className="mt-2 flex flex-col gap-1">
        {tierCounts().map(({ tier, count }) => (
          <div key={tier} className="flex h-9 items-center justify-between rounded px-3 text-sm text-ink-2 hover:bg-muted">
            <span className="flex items-center gap-2.5"><TierDot tier={tier} />{TIERS[tier].label}</span>
            <span className="num rounded-full bg-muted px-2 text-xs text-ink-3 ring-1 ring-border">{count}</span>
          </div>
        ))}
      </div>
      <div className="mt-auto" />
      <ThemeToggle />
      {isConnected && address ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
          <AddrDot address={address} size={28} />
          <div className="min-w-0">
            <div className="num truncate text-sm font-medium">{shortAddr(address)}</div>
            <div className="num text-xs text-ink-3">{bal != null ? `${bal.toFixed(3)} SOL` : "…"} · devnet</div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-3">
          <div className="mb-2 text-xs text-ink-3">Connect a wallet to trade &amp; launch</div>
          <WalletButton full />
        </div>
      )}
    </aside>
  );
}