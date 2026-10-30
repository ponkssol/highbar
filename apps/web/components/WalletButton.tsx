"use client";
import { Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useHbWallet, useSolBalance, useWalletModal } from "@/lib/wallet";
import { shortAddr } from "@/lib/format";

export function AddrDot({ address, size = 16 }: { address: string; size?: number }) {
  const h = [...address].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
  return <span className="inline-block shrink-0 rounded-full ring-1 ring-border" style={{ width: size, height: size, background: `hsl(${h} 35% 55%)` }} />;
}

/** Compact single-line wallet pill. Custom button that opens the AppKit modal; never stacks or wraps.
 *  compact: mobile header variant (30px tall, address only). The hit area is padded to 40px via ::after. */
/** size="lg": same height/radius/padding as the header "Launch token" button. */
export function WalletButton({ full = false, compact = false, size: sz = "sm" }: { full?: boolean; compact?: boolean; size?: "sm" | "lg" }) {
  const { ready, address, publicKey, isConnected, connection } = useHbWallet();
  const bal = useSolBalance(publicKey, connection);
  const open = useWalletModal();
  const { status, signIn } = useAuth();
  const size = compact ? "h-[30px] rounded-full px-2.5 text-[12px] gap-1.5" : sz === "lg" ? "h-10 rounded px-4 text-sm gap-2" : "h-8 rounded-full px-3 text-[13px] gap-2";
  const base = `relative inline-flex shrink-0 items-center whitespace-nowrap font-medium leading-none transition-opacity after:absolute after:inset-x-0 after:-inset-y-[6px] after:content-[''] ${size} ${full ? "w-full justify-center" : ""}`;
  if (isConnected && address) {
    const unverified = status !== "verified";
    return (
      <button type="button" data-testid="wallet-pill" onClick={() => open("Account")} aria-label={`Wallet ${shortAddr(address)}`}
        className={`${base} hb-ctrl text-ink`}>
        <AddrDot address={address} size={compact ? 12 : 14} />
        <span className="num">{shortAddr(address)}</span>
        {unverified && <span role="button" aria-label="Sign in" title={status === "signing" ? "Signing in…" : "Not signed in, click to sign in"} onClick={(e) => { e.stopPropagation(); if (status !== "signing") void signIn(); }} className={`h-1.5 w-1.5 shrink-0 rounded-full ${status === "signing" ? "animate-pulse bg-ink-3" : "bg-burn"}`} />}
        {!compact && bal != null && <span className="num text-ink-3">{bal.toFixed(2)} SOL</span>}
      </button>
    );
  }
  return (
    <button type="button" data-testid="wallet-pill" onClick={() => open("Connect")} disabled={!ready} title={ready ? undefined : "Set Reown project ID"}
      className={`${base} hb-ctrl text-ink disabled:cursor-not-allowed disabled:opacity-50`}>
      <Wallet size={compact ? 13 : sz === "lg" ? 16 : 14} strokeWidth={1.75} />{compact ? "Connect" : "Connect wallet"}
    </button>
  );
}