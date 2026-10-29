"use client";
import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false, loading: () => <span className="inline-flex h-10 items-center rounded border border-border px-4 text-sm">Connect</span> },
);

export function WalletButton() {
  return <WalletMultiButton className="hb-wallet" />;
}