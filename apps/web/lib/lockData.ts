/** Lock data helpers usable from server and client components. */
import { apiBase } from "./api";
import type { LockInfo } from "./lock";

export interface LockView extends LockInfo {
  id: string; totalTokens: number; lockedTokens: number; claimableTokens: number; supplyPct: number; unlockedPct: number;
  status: "locked" | "vesting" | "unlocked" | "cancelled"; lockedAt: number | null;
  token: { name: string; symbol: string; tier: string; creator: string } | null;
}
export async function fetchLockList(page: number, limit = 15) {
  const r = await fetch(`${apiBase()}/locks?page=${page}&limit=${limit}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`locks: ${r.status}`);
  return (await r.json()) as { total: number; page: number; limit: number; tipSol: number; items: LockView[] };
}
export async function fetchLock(id: string): Promise<LockView | null> {
  const r = await fetch(`${apiBase()}/locks/${id}`, { cache: "no-store", signal: AbortSignal.timeout(6000) }).catch(() => null);
  return r && r.ok ? r.json() : null;
}
export const fmtLockDate = (s: number) => new Date(s * 1000).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
