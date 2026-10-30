"use client";
import { useEffect } from "react";
import { REFERRAL_PARAM } from "@hb/shared";
import { useAuth } from "@/lib/auth";
import { useHbWallet } from "@/lib/wallet";

/** Step 8 referral capture: remembers `?ref=<wallet>` from any landing URL (first link wins) and, once the visitor's wallet is
 *  signed in, binds it on the API (POST /referrals, Bearer token). The API keeps the first binding per wallet forever. */
const ADDR = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const REF_KEY = "hb-ref";
const doneKey = (a: string) => `hb-ref-bound:${a}`;

export function ReferralCapture() {
  const { address } = useHbWallet();
  const { status, token } = useAuth();

  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get(REFERRAL_PARAM)?.trim();
      if (ref && ADDR.test(ref) && !localStorage.getItem(REF_KEY)) localStorage.setItem(REF_KEY, JSON.stringify({ referrer: ref, at: Date.now() }));
    } catch { /* storage blocked */ }
  }, []);

  useEffect(() => {
    if (status !== "verified" || !token || !address) return;
    let ref: string | null = null;
    try {
      if (localStorage.getItem(doneKey(address))) return;
      ref = (JSON.parse(localStorage.getItem(REF_KEY) ?? "null") as { referrer?: string } | null)?.referrer ?? null;
    } catch { return; }
    if (!ref || ref === address) return;
    let cancelled = false;
    fetch("/hb-api/referrals", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ referrer: ref }) })
      .then(async (r) => {
        if (cancelled) return;
        // 200 = bound, 400/409 = rejected for good (self, loop, already referred); keep retrying only on 401/5xx.
        if (r.ok || r.status === 400 || r.status === 409) localStorage.setItem(doneKey(address), String(r.status));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [status, token, address]);

  return null;
}
