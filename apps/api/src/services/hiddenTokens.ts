import { hiddenMintSet } from "@hb/shared";

/** Hidden test tokens (packages/shared hiddenTokens.ts) plus the optional server-side HIDDEN_TOKEN_MINTS env var (comma-separated mints).
 *  Public listings filter these out; detail endpoints (/tokens/:mint, Open Book per-token) and platform totals keep them. */
let memo: { env: string; set: Set<string>; list: string[] } | null = null;
function current() {
  const env = process.env.HIDDEN_TOKEN_MINTS ?? "";
  if (!memo || memo.env !== env) { const set = hiddenMintSet(env); memo = { env, set, list: [...set] }; }
  return memo;
}
export const hiddenMints = (): string[] => current().list;
export const hiddenSet = (): ReadonlySet<string> => current().set;
export const isHiddenMint = (mint: string): boolean => current().set.has(mint);
