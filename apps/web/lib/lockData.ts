/** Lock data helpers usable from server and client components. */
import { apiBase, apiHeaders } from "./api";
import type { LockInfo } from "./lock";
import { fmtDateUS } from "./date";

export interface LockView extends LockInfo {
  id: string; totalTokens: number; lockedTokens: number; claimableTokens: number; supplyPct: number; unlockedPct: number;
  status: "locked" | "vesting" | "unlocked" | "cancelled"; lockedAt: number | null;
  token: { name: string; symbol: string; tier: string; creator: string; image?: string | null } | null;
}
export async function fetchLockList(page: number, limit = 15) {
  const r = await fetch(`${apiBase()}/locks?page=${page}&limit=${limit}`, { cache: "no-store", headers: apiHeaders() });
  if (!r.ok) throw new Error(`locks: ${r.status}`);
  return (await r.json()) as { total: number; page: number; limit: number; tipSol: number; items: LockView[] };
}
export async function fetchLock(id: string): Promise<LockView | null> {
  const r = await fetch(`${apiBase()}/locks/${id}`, { cache: "no-store", headers: apiHeaders(), signal: AbortSignal.timeout(6000) }).catch(() => null);
  return r && r.ok ? r.json() : null;
}
export const fmtLockDate = (s: number) => fmtDateUS(s * 1000, { timeZone: "UTC" });
