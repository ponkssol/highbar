/** Token audit from chain data (free, no third-party API): mint and freeze authority from the mint account, top 10 holder
 *  share from getTokenLargestAccounts, and the liquidity state where it is known (a coin still on its bonding curve has no
 *  LP to burn). Pure helpers, tested. */
/** burnt: 99 %+ of the pool's LP tokens are burnt; partial: less; curve: still on its bonding curve (no LP yet); null: unknown. */
export type LpState = "burnt" | "curve" | "partial" | null;
export interface TokenAudit {
  mint: string;
  /** "onchain": the extension read the mint through the highbar /rpc (or the user's own RPC). */
  source: "onchain";
  /** Mint authority revoked (null): nobody can print more. null = unknown. */
  noMint: boolean | null;
  /** Freeze authority revoked: no account can be frozen (Solana's "blacklist"). */
  noFreeze: boolean | null;
  lp: LpState;
  lpBurntPct: number | null;
  /** Share of supply in the 10 largest token accounts (pools and the bonding curve included), 0..100. */
  top10Pct: number | null;
  /** Token-2022 mint. */
  t22: boolean;
  at: number;
}
export const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
export const TOKEN_SPL = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

export interface MintFacts { mintAuthority: string | null; freezeAuthority: string | null; supply: bigint | null; decimals: number | null; t22: boolean }
/** getAccountInfo(mint, jsonParsed).value → the facts, or null when it is not a mint account. */
export function parseMint(value: unknown): MintFacts | null {
  const v = value as { owner?: string; data?: { parsed?: { type?: string; info?: Record<string, unknown> } } } | null;
  if (!v || (v.owner !== TOKEN_SPL && v.owner !== TOKEN_2022)) return null;
  const p = v.data?.parsed;
  if (!p || p.type !== "mint" || !p.info) return null;
  const i = p.info;
  const s = typeof i.supply === "string" && /^\d+$/.test(i.supply) ? BigInt(i.supply) : null;
  const auth = (x: unknown) => (typeof x === "string" && x ? x : null);
  return { mintAuthority: auth(i.mintAuthority), freezeAuthority: auth(i.freezeAuthority), supply: s, decimals: typeof i.decimals === "number" ? i.decimals : null, t22: v.owner === TOKEN_2022 };
}
/** getTokenLargestAccounts(mint).value → the top 10 share of supply in percent. */
export function top10(largest: unknown, supply: bigint | null): number | null {
  if (!Array.isArray(largest) || supply === null || supply <= 0n) return null;
  let sum = 0n;
  for (const a of largest.slice(0, 10)) {
    const amt = (a as { amount?: unknown })?.amount;
    if (typeof amt !== "string" || !/^\d+$/.test(amt)) return null;
    sum += BigInt(amt);
  }
  return Number((sum * 10000n) / supply) / 100;
}
/** A risk level for the top 10 share: under 30 % fine, up to 50 % caution, above that a warning. */
export const top10Level = (p: number | null): "ok" | "warn" | "bad" | null => (p === null ? null : p < 30 ? "ok" : p <= 50 ? "warn" : "bad");
/** The RPC refused the method (the /rpc allowlist): shown as "—", not as an error. */
export const notAllowed = (e: unknown) => /not allowed|method not found|-32601|forbidden|403/i.test(String((e as Error)?.message ?? e));

/** PumpSwap (pump.fun's AMM, where its coins migrate). */
export const PUMPSWAP = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA";
/** PumpSwap pool account: discriminator 8, bump 1, index 2, creator, base mint, quote mint, lp mint (32 each), the two pool
 *  token accounts (32 each), then lp_supply (u64, every LP token ever minted). */
export function parsePumpSwapPool(b64: string): { baseMint: Uint8Array; lpMint: Uint8Array; lpSupply: bigint } | null {
  let b: Uint8Array;
  try { b = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); } catch { return null; }
  const o = 8 + 1 + 2;
  if (b.length < o + 32 * 6 + 8) return null;
  const lpSupply = new DataView(b.buffer, b.byteOffset, b.byteLength).getBigUint64(o + 32 * 6, true);
  return { baseMint: b.slice(o + 32, o + 64), lpMint: b.slice(o + 96, o + 128), lpSupply };
}
/** LP burnt share: the LP mint's current supply against every LP token the pool minted. */
export function lpBurntPct(current: bigint | null, minted: bigint): number | null {
  if (current === null || minted <= 0n || current > minted) return null;
  return Number(((minted - current) * 10000n) / minted) / 100;
}
