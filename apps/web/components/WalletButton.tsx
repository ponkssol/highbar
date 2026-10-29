"use client";
import { ChevronDown, Wallet } from "lucide-react";
import { useHbWallet, useSolBalance, useWalletModal } from "@/lib/wallet";
import { shortAddr } from "@/lib/format";

export function AddrDot({ address, size = 16 }: { address: string; size?: number }) {
  const h = [...address].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
  return <span className="inline-block shrink-0 rounded-full ring-1 ring-border" style={{ width: size, height: size, background: `hsl(${h} 35% 55%)` }} />;
}

export function WalletButton({ full = false }: { full?: boolean }) {
  const { ready, address, publicKey, isConnected, connection } = useHbWallet();
  const bal = useSolBalance(publicKey, connection);
  const open = useWalletModal();
  const base = `inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-opacity ${full ? "w-full justify-center" : ""}`;
  if (isConnected && address) {
    return (
      <button onClick={() => open("Account")} className={`${base} border border-border bg-surface text-ink hover:bg-muted`}>
        <AddrDot address={address} />
        <span className="num">{shortAddr(address)}</span>
        {bal != null && <span className="num text-ink-3">{bal.toFixed(2)} SOL</span>}
        <ChevronDown size={14} strokeWidth={1.5} className="text-ink-3" />
      </button>
    );
  }
  return (
    <button onClick={() => open("Connect")} disabled={!ready} title={ready ? undefined : "Set Reown project ID"}
      className={`${base} bg-ink text-on-ink hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50`}>
      <Wallet size={16} strokeWidth={1.5} />Connect wallet
    </button>
  );
}