"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAppKitProvider } from "@reown/appkit/react";
import { Check, Loader2, X } from "lucide-react";
import { useHbWallet } from "./wallet";

export type AuthStatus = "disconnected" | "signing" | "verified" | "unverified";
interface AuthCtx { status: AuthStatus; token: string | null; signIn: () => Promise<boolean>; ensureVerified: () => Promise<boolean> }
const Ctx = createContext<AuthCtx>({ status: "disconnected", token: null, signIn: async () => false, ensureVerified: async () => false });
export const useAuth = () => useContext(Ctx);

const KEY = (a: string) => `hb-auth:${a}`;
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function b58(bytes: Uint8Array) {
  const digits = [0];
  for (const b of bytes) {
    let carry = b;
    for (let i = 0; i < digits.length; i++) { carry += digits[i] << 8; digits[i] = carry % 58; carry = (carry / 58) | 0; }
    while (carry) { digits.push(carry % 58); carry = (carry / 58) | 0; }
  }
  let out = "";
  for (const b of bytes) { if (b) break; out += "1"; }
  for (let i = digits.length - 1; i >= 0; i--) out += B58[digits[i]];
  return out;
}
function readToken(addr: string): string | null {
  try { const v = JSON.parse(localStorage.getItem(KEY(addr)) ?? "null"); return v && v.exp > Date.now() + 60_000 ? v.token : null; } catch { return null; }
}
interface SignerProvider { signMessage(msg: Uint8Array): Promise<Uint8Array | { signature: Uint8Array }> }

export function AuthProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useHbWallet();
  const { walletProvider } = useAppKitProvider<SignerProvider>("solana");
  const [status, setStatus] = useState<AuthStatus>("disconnected");
  const [token, setToken] = useState<string | null>(null);
  const [toast, setToast] = useState<null | "signing" | "cancelled" | "done">(null);
  const prev = useRef<string | null>(null);
  const inflight = useRef<Promise<boolean> | null>(null);

  const signIn = useCallback(async () => {
    if (!address || !walletProvider) return false;
    if (inflight.current) return inflight.current;
    const run = (async () => {
      setStatus("signing"); setToast("signing");
      try {
        const n = await fetch(`/hb-api/auth/nonce?address=${address}`, { cache: "no-store" });
        if (!n.ok) throw new Error("nonce");
        const { nonce } = await n.json();
        const message = `Higher Bar wants you to sign in with your Solana account:\n${address}\n\nSign in to Higher Bar. This does not cost any SOL.\n\nURI: ${window.location.origin}\nNetwork: devnet\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}`;
        const res = await walletProvider.signMessage(new TextEncoder().encode(message));
        const sig = res instanceof Uint8Array ? res : res.signature;
        const v = await fetch("/hb-api/auth/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address, message, signature: b58(sig) }) });
        if (!v.ok) throw new Error("verify");
        const j = await v.json();
        localStorage.setItem(KEY(address), JSON.stringify({ token: j.token, exp: j.exp }));
        setToken(j.token); setStatus("verified"); setToast("done");
        setTimeout(() => setToast((t) => (t === "done" ? null : t)), 1800);
        return true;
      } catch (e) {
        console.warn("[auth] sign-in failed", e);
        setStatus("unverified"); setToast("cancelled");
        return false;
      } finally { inflight.current = null; }
    })();
    inflight.current = run;
    return run;
  }, [address, walletProvider]);

  useEffect(() => {
    if (!isConnected || !address) {
      if (prev.current) { try { localStorage.removeItem(KEY(prev.current)); } catch {} }
      prev.current = null; setToken(null); setStatus("disconnected"); setToast(null);
      return;
    }
    if (prev.current === address) return;
    prev.current = address;
    const t = readToken(address);
    if (t) { setToken(t); setStatus("verified"); return; }
    setToken(null); setStatus("unverified");
    if (walletProvider) void signIn();
  }, [isConnected, address, walletProvider, signIn]);

  const ensureVerified = useCallback(async () => (status === "verified" ? true : signIn()), [status, signIn]);

  return (
    <Ctx.Provider value={{ status, token, signIn, ensureVerified }}>
      {children}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex w-[320px] items-start gap-3 rounded-lg border border-border bg-surface p-4 shadow-card">
          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${toast === "cancelled" ? "bg-muted text-sell" : toast === "done" ? "bg-muted text-buy" : "bg-muted text-ink"}`}>
            {toast === "signing" ? <Loader2 size={15} className="animate-spin" /> : toast === "done" ? <Check size={15} /> : <X size={15} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{toast === "signing" ? "Approve sign-in in your wallet" : toast === "done" ? "Signed in" : "Sign-in cancelled"}</div>
            <div className="mt-0.5 text-xs text-ink-3">{toast === "signing" ? "Sign the message to verify you own this wallet. No SOL is spent." : toast === "done" ? "Wallet verified for 24 hours." : "Your wallet is connected but not verified."}</div>
            {toast === "cancelled" && (
              <div className="mt-3 flex gap-2">
                <button onClick={() => void signIn()} className="h-8 rounded-full bg-ink px-3 text-xs font-medium text-on-ink hover:opacity-90">Retry</button>
                <button onClick={() => setToast(null)} className="h-8 rounded-full border border-border px-3 text-xs text-ink-2 hover:bg-muted">Dismiss</button>
              </div>
            )}
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}