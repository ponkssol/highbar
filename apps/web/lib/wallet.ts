"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { useAppKitConnection } from "@reown/appkit-adapter-solana/react";
import { Connection, PublicKey, Transaction, VersionedTransaction, clusterApiUrl, type Signer } from "@solana/web3.js";
import { getAppKitModal, useRpcUrl, useWalletReady } from "@/app/providers";
import { NETWORK } from "./settings";

type AnyTx = Transaction | VersionedTransaction;
interface SolanaProvider {
  signTransaction<T>(tx: T): Promise<T>;
  signAndSendTransaction<T>(tx: T, opts?: unknown): Promise<string>;
}

const conns = new Map<string, Connection>();
const connFor = (url: string) => { let c = conns.get(url); if (!c) { c = new Connection(url, "confirmed"); conns.set(url, c); } return c; };

/** Wallet hook used across the app (Reown AppKit under the hood). */
export function useHbWallet() {
  const ready = useWalletReady();
  const { address, isConnected } = useAppKitAccount({ namespace: "solana" });
  const { walletProvider } = useAppKitProvider<SolanaProvider>("solana");
  const { connection: akConn } = useAppKitConnection();
  const rpcUrl = useRpcUrl();
  const fallbackConn = useMemo(() => connFor(rpcUrl || clusterApiUrl(NETWORK === "mainnet" ? "mainnet-beta" : "devnet")), [rpcUrl]);
  const connection = (akConn as unknown as Connection | undefined) ?? fallbackConn;
  const publicKey = useMemo(() => { try { return address ? new PublicKey(address) : null; } catch { return null; } }, [address]);

  /** Signs (with extra signers via partialSign) and sends. Returns signature. */
  const sendTransaction = useCallback(async (tx: AnyTx, signers: Signer[] = []): Promise<string> => {
    if (!walletProvider || !publicKey) throw new Error("Wallet not connected");
    if (tx instanceof Transaction) {
      tx.feePayer ??= publicKey;
      if (!tx.recentBlockhash) tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      if (signers.length) {
        tx.partialSign(...signers);
        const signed = await walletProvider.signTransaction(tx);
        return connection.sendRawTransaction(signed.serialize());
      }
    } else if (signers.length) {
      tx.sign(signers);
      const signed = await walletProvider.signTransaction(tx);
      return connection.sendRawTransaction(signed.serialize());
    }
    return walletProvider.signAndSendTransaction(tx);
  }, [walletProvider, publicKey, connection]);

  /** Wallet signature only (no send, no extra signers): for txs a server co-signs afterwards (vanity mint launch). */
  const signTransaction = useCallback(async (tx: Transaction): Promise<Transaction> => {
    if (!walletProvider || !publicKey) throw new Error("Wallet not connected");
    return walletProvider.signTransaction(tx);
  }, [walletProvider, publicKey]);
  /** Broadcast an already fully signed tx. */
  const sendRaw = useCallback((bytes: Uint8Array) => connection.sendRawTransaction(bytes), [connection]);

  return { ready, address: address ?? null, publicKey, isConnected: !!isConnected && !!publicKey, connection, sendTransaction, signTransaction, sendRaw };
}

export function useSolBalance(publicKey: PublicKey | null, connection: Connection) {
  const [bal, setBal] = useState<number | null>(null);
  useEffect(() => {
    if (!publicKey) { setBal(null); return; }
    let alive = true;
    const load = () => connection.getBalance(publicKey).then((l) => alive && setBal(l / 1e9)).catch(() => {});
    load();
    const id = setInterval(load, 20_000);
    return () => { alive = false; clearInterval(id); };
  }, [publicKey, connection]);
  return bal;
}

/** Open connect / account modal (no-op when project ID missing). */
export function useWalletModal() {
  const ready = useWalletReady();
  return useCallback((view?: "Connect" | "Account") => { if (ready) void getAppKitModal()?.open(view ? { view } : undefined); }, [ready]);
}

/** Whether the AppKit modal is open. SSR-safe replacement for useAppKitState().open, which throws
 *  'Please call "createAppKit" before using "useAppKitState" hook' on the server (createAppKit only runs in the browser)
 *  and when REOWN_PROJECT_ID is unset. false until mounted / when there is no modal. */
export function useWalletModalOpen() {
  const ready = useWalletReady();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const m = ready ? getAppKitModal() : undefined;
    if (!m) { setOpen(false); return; }
    setOpen(!!m.getState().open);
    return m.subscribeState((s) => setOpen(!!s.open));
  }, [ready]);
  return open;
}
