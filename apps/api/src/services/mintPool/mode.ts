/**
 * VANITY_MINTS=on|fallback|off (default fallback): where POST /tx/launch gets the new token's mint.
 *   on       -> the vanity pool only; an empty pool is a clear 503 MINT_POOL_EMPTY.
 *   fallback -> the pool; when it is empty or unavailable (no / bad MINT_POOL_ENC_KEY, table missing, DB error) the launch
 *               uses a random mint (the pre-vanity path: the API generates it and pre-signs) - flagged in the log line
 *               "[mint-pool] pool empty -> fallback random mint for creator <wallet>" and in the response
 *               (vanity:false, mintSource:"random-fallback").
 *   off      -> always the random path (mintSource:"random"); the pool, its table and MINT_POOL_ENC_KEY are never touched.
 * Per-wallet errors (too many pending launches, an invalid / foreign reservation) are never turned into a fallback.
 */
import { encKeyFromEnv } from "./secretBox.js";
import { MintPoolError, requireReservation, reserveMint } from "./index.js";
import type { Sql } from "./store.js";

export const VANITY_MODES = ["on", "fallback", "off"] as const;
export type VanityMode = (typeof VANITY_MODES)[number];

/** null when valid (unset = "fallback"), else a short problem (never echoes more than the mode list). */
export function vanityModeProblem(v: string | undefined): string | null {
  const s = (v ?? "").trim().toLowerCase();
  return s === "" || (VANITY_MODES as readonly string[]).includes(s) ? null : "VANITY_MINTS must be on, fallback or off";
}
export function vanityMode(env: Record<string, string | undefined> = process.env): VanityMode {
  const p = vanityModeProblem(env.VANITY_MINTS);
  if (p) throw new Error(p);
  return ((env.VANITY_MINTS ?? "").trim().toLowerCase() || "fallback") as VanityMode;
}

/** true when MINT_POOL_ENC_KEY is a valid 32-byte key (never throws, never returns the key). */
export function encKeyUsable(env: Record<string, string | undefined> = process.env): boolean {
  try { return encKeyFromEnv(env).length === 32; } catch { return false; }
}

export type LaunchMint = { source: "pool"; mint: string } | { source: "random" | "random-fallback"; reason: string };
export interface ResolveOpts { mode?: VanityMode; keyOk?: boolean; log?: (m: string) => void }

export async function resolveLaunchMint(q: Sql, creator: string, requested: string | undefined, o: ResolveOpts = {}): Promise<LaunchMint> {
  const mode = o.mode ?? vanityMode();
  if (mode === "off") return { source: "random", reason: "VANITY_MINTS=off" };
  const fallback = (reason: string): LaunchMint => {
    (o.log ?? ((m) => console.warn(m)))(`[mint-pool] pool empty -> fallback random mint for creator ${creator} (${reason})`);
    return { source: "random-fallback", reason };
  };
  const keyOk = o.keyOk ?? encKeyUsable();
  if (mode === "fallback" && !keyOk && !requested) return fallback("MINT_POOL_ENC_KEY unavailable");
  try {
    if (requested) { await requireReservation(q, requested, creator); return { source: "pool", mint: requested }; }
    return { source: "pool", mint: (await reserveMint(q, creator)).mint };
  } catch (e) {
    if (mode !== "fallback" || requested) throw e;
    if (e instanceof MintPoolError) { if (e.code === "MINT_POOL_EMPTY") return fallback("pool empty"); throw e; }
    return fallback("pool unavailable"); // table missing / DB error: no message (could carry DB details)
  }
}
