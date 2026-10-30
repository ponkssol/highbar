"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAppKitProvider, useAppKitState } from "@reown/appkit/react";
import { Check, Loader2, X } from "lucide-react";
import { useHbWallet } from "./wallet";
import { NETWORK } from "./settings";

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
interface SignerProvider { signMessage?: (msg: Uint8Array) => Promise<Uint8Array | { signature: Uint8Array }> }

type AuthFailKind = "rejected" | "nonce" | "unsupported" | "verify" | "network" | "other";
class AuthError extends Error { constructor(public kind: AuthFailKind, message: string) { super(message); } }

/** True when the wallet reports that the user declined (EIP-1193 style code 4001 or a "rejected" message). */
export function isUserRejection(e: unknown): boolean {
  const err = e as { code?: unknown; message?: unknown; error?: { code?: unknown; message?: unknown } } | null;
  const code = err?.code ?? err?.error?.code;
  if (code === 4001 || code === "4001" || code === "ACTION_REJECTED") return true;
  const msg = String(err?.message ?? err?.error?.message ?? (typeof e === "string" ? e : ""));
  return /user rejected|rejected|denied by the user|user denied/i.test(msg);
}

const short = (s: string) => (s.length > 160 ? `${s.slice(0, 157)}...` : s);
async function errorText(r: Response): Promise<string> {
  try {
    const t = await r.text();
    try { const j = JSON.parse(t); const m = j?.error ?? j?.message; if (typeof m === "string" && m) return short(m); } catch {}
    return short(t.trim() || r.statusText || "no details");
  } catch { return r.statusText || "no details"; }
}

/** Map any sign-in failure to a user-facing title/detail. Never includes the signature, nonce or token. */
export function describeAuthFailure(e: unknown): { rejected: boolean; title: string; detail: string } {
  if (e instanceof AuthError) {
    switch (e.kind) {
      case "rejected": return { rejected: true, title: "Sign-in cancelled", detail: "You declined the signature request. Your wallet is connected but not signed in. Sign in again here or from the wallet button." };
      case "nonce": return { rejected: false, title: "Couldn't start sign-in", detail: `Nonce request failed: ${e.message}` };
      case "unsupported": return { rejected: false, title: "Wallet can't sign messages", detail: "This wallet doesn't support message signing. Try Phantom, Solflare or Backpack." };
      case "verify": return { rejected: false, title: "Verification failed", detail: e.message };
      case "network": return { rejected: false, title: "Network error", detail: e.message };
      default: return { rejected: false, title: "Sign-in failed", detail: e.message };
    }
  }
  if (isUserRejection(e)) return describeAuthFailure(new AuthError("rejected", "rejected"));
  const msg = e instanceof Error ? e.message : String(e ?? "");
  return { rejected: false, title: "Sign-in failed", detail: short(msg || "Unknown wallet error.") };
}

type Toast = null | { kind: "signing" } | { kind: "done" } | { kind: "error"; rejected: boolean; title: string; detail: string };

export function AuthProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useHbWallet();
  const { walletProvider } = useAppKitProvider<SignerProvider>("solana");
  const [status, setStatus] = useState<AuthStatus>("disconnected");
  const [token, setToken] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const { open: modalOpen } = useAppKitState();
  const prev = useRef<string | null>(null);
  /** Address we already auto-prompted (or found a valid session for); prevents re-prompt loops after a rejection. */
  const autoDone = useRef<string | null>(null);
  const inflight = useRef<{ addr: string; p: Promise<boolean> } | null>(null);

  const signIn = useCallback(async () => {
    if (!address) return false;
    if (inflight.current?.addr === address) return inflight.current.p;
    const current = () => prev.current === address; // ignore results for an account the user already switched away from
    const run = (async () => {
      setStatus("signing"); setToast({ kind: "signing" });
      try {
        if (!walletProvider || typeof walletProvider.signMessage !== "function") throw new AuthError("unsupported", "signMessage unavailable");
        let n: Response;
        try { n = await fetch(`/hb-api/auth/nonce?address=${address}`, { cache: "no-store" }); }
        catch { throw new AuthError("nonce", "API unreachable"); }
        if (!n.ok) throw new AuthError("nonce", `HTTP ${n.status}: ${await errorText(n)}`);
        const nj = (await n.json().catch(() => null)) as { nonce?: unknown } | null;
        if (!nj || typeof nj.nonce !== "string" || !nj.nonce) throw new AuthError("nonce", "malformed nonce response");
        const message = `highbar wants you to sign in with your Solana account:\n${address}\n\nSign in to highbar. This does not cost any SOL.\n\nURI: ${window.location.origin}\nNetwork: ${NETWORK}\nNonce: ${nj.nonce}\nIssued At: ${new Date().toISOString()}`;
        let res: Uint8Array | { signature: Uint8Array };
        try { res = await walletProvider.signMessage(new TextEncoder().encode(message)); }
        catch (e) { if (isUserRejection(e)) throw new AuthError("rejected", "rejected"); throw e; }
        const sig = res instanceof Uint8Array ? res : res?.signature;
        if (!(sig instanceof Uint8Array) || sig.length === 0) throw new AuthError("other", "Wallet returned no signature.");
        let v: Response;
        try { v = await fetch("/hb-api/auth/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address, message, signature: b58(sig) }) }); }
        catch { throw new AuthError("network", "Couldn't reach the API to verify the signature."); }
        if (!v.ok) throw new AuthError("verify", `Server returned ${v.status}: ${await errorText(v)}`);
        const j = (await v.json().catch(() => null)) as { token?: unknown; exp?: unknown } | null;
        if (!j || typeof j.token !== "string") throw new AuthError("verify", "Server returned no session token.");
        localStorage.setItem(KEY(address), JSON.stringify({ token: j.token, exp: j.exp }));
        if (!current()) return false;
        setToken(j.token); setStatus("verified"); setToast({ kind: "done" });
        setTimeout(() => setToast((t) => (t?.kind === "done" ? null : t)), 1800);
        return true;
      } catch (e) {
        const d = describeAuthFailure(e);
        console.warn(`[auth] sign-in failed: ${d.title} - ${d.detail}`);
        if (!current()) return false;
        setStatus("unverified"); setToast({ kind: "error", ...d });
        return false;
      } finally { if (inflight.current?.addr === address) inflight.current = null; }
    })();
    inflight.current = { addr: address, p: run };
    return run;
  }, [address, walletProvider]);

  // One-step connect: as soon as a wallet connects (or the user switches account) and the AppKit modal has
  // finished closing, ask for the sign-in signature once. Waiting for the modal to close avoids the popup race
  // that made wallets auto-reject. A rejection is not re-prompted automatically (toast Retry, the wallet pill
  // dot, or any trade/launch/claim via ensureVerified() can retry). A still-valid stored session skips the prompt.
  useEffect(() => {
    if (!isConnected || !address) {
      if (prev.current) { try { localStorage.removeItem(KEY(prev.current)); } catch {} }
      prev.current = null; autoDone.current = null; setToken(null); setStatus("disconnected"); setToast(null);
      return;
    }
    if (prev.current !== address) {
      prev.current = address;
      const t = readToken(address);
      if (t) { autoDone.current = address; setToken(t); setStatus("verified"); setToast(null); return; }
      setToken(null); setStatus("unverified"); setToast(null);
    }
    if (autoDone.current === address || modalOpen || !walletProvider) return;
    const a = address;
    const id = setTimeout(() => {
      if (prev.current !== a || autoDone.current === a) return;
      autoDone.current = a;
      void signIn();
    }, 500);
    return () => clearTimeout(id);
  }, [isConnected, address, modalOpen, walletProvider, signIn]);

  const ensureVerified = useCallback(async () => (status === "verified" ? true : signIn()), [status, signIn]);

  const icon = !toast ? null
    : toast.kind === "signing" ? <Loader2 size={15} className="animate-spin" />
    : toast.kind === "done" ? <Check size={15} />
    : <X size={15} />;
  const title = !toast ? "" : toast.kind === "signing" ? "Approve sign-in in your wallet" : toast.kind === "done" ? "Signed in" : toast.title;
  const detail = !toast ? "" : toast.kind === "signing" ? "Sign the message to verify you own this wallet. No SOL is spent."
    : toast.kind === "done" ? "Wallet verified for 24 hours."
    : toast.detail;

  return (
    <Ctx.Provider value={{ status, token, signIn, ensureVerified }}>
      {children}
      {toast && (
        <div role="status" aria-live="polite" data-testid="auth-toast" className="fixed inset-x-3 top-[calc(56px+env(safe-area-inset-top))] z-[60] mx-auto flex max-w-[360px] items-start md:inset-x-auto md:top-auto md:bottom-5 md:right-5 md:mx-0 md:w-[320px] gap-3 rounded-lg border border-border bg-surface p-4 shadow-card">
          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${toast.kind === "error" ? "bg-muted text-sell" : toast.kind === "done" ? "bg-muted text-buy" : "bg-muted text-ink"}`}>
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{title}</div>
            <div className="mt-0.5 break-words text-xs text-ink-3">{detail}</div>
            {toast.kind === "error" && (
              <div className="mt-3 flex gap-2">
                <button onClick={() => void signIn()} className="h-8 rounded-full bg-ink px-3 text-xs font-medium text-on-ink hover:opacity-90">Sign in again</button>
                <button onClick={() => setToast(null)} className="h-8 rounded-full border border-border px-3 text-xs text-ink-2 hover:bg-muted">Dismiss</button>
              </div>
            )}
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}