"use client";
import { useCallback, useEffect, useState } from "react";
import { Transaction } from "@solana/web3.js";
import { apiBase, post } from "./api";

export interface LockInfo {
  escrow: string; mint: string; recipient: string; creator: string; cancelMode: number; updateRecipientMode: number;
  cliffTime: number; frequency: number; numberOfPeriod: number; vestingStartTime: number; endTime: number;
  total: string; claimed: string; unlocked: string; claimable: string; locked: string; cancelled: boolean;
}
export interface LocksResp { programId: string; locks: LockInfo[]; totalTokens: number; lockedTokens: number; claimableTokens: number }
export const TOKEN_DECIMALS = 1e6;
export const toUi = (raw: string) => Number(raw) / TOKEN_DECIMALS;

/** Jupiter Lock escrows for a mint (creator's locks), refreshed every 30s. */
export function useLocks(mint: string) {
  const [data, setData] = useState<LocksResp | null>(null);
  const load = useCallback(async (fresh = false) => {
    try {
      const r = await fetch(`${apiBase()}/tokens/${mint}/locks${fresh ? "?fresh=1" : ""}`, { cache: "no-store" });
      if (r.ok) setData(await r.json());
    } catch { /* keep last */ }
  }, [mint]);
  useEffect(() => { load(); const id = setInterval(() => load(), 30_000); return () => clearInterval(id); }, [load]);
  return { data, reload: () => load(true) };
}

const txFrom = (b64: string) => Transaction.from(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));

export async function buildLockTx(p: { creator: string; mint: string; amount: number; unlockAt: number; vestingDays: number }) {
  const r = await post<{ tx: string; escrow: string }>("/tx/lock", p);
  return { transaction: txFrom(r.tx), escrow: r.escrow };
}
export async function buildClaimLockTx(p: { recipient: string; escrow: string }) {
  const r = await post<{ tx: string }>("/tx/lock/claim", p);
  return txFrom(r.tx);
}