/** Wallet list helpers shared by the worker and the UI (no keys here). */
export const WALLET_LABEL_MAX = 24;

/** A label as stored: trimmed, inner whitespace collapsed, no control characters, 1 to 24 characters. Null when unusable. */
export function cleanWalletLabel(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  if (!t || [...t].length > WALLET_LABEL_MAX) return null;
  return t;
}

/** "Wallet N" with the lowest N from the list size up that is not taken yet. */
export function nextWalletLabel(taken: string[]): string {
  const used = new Set(taken.map((x) => x.toLowerCase()));
  let n = taken.length + 1;
  while (used.has(`wallet ${n}`)) n++;
  return `Wallet ${n}`;
}

/** Referral bindings per wallet address. Accepts the older single-wallet record ({ address, referrer }). */
export type ReferralMap = Record<string, { referrer: string; at: number }>;
export function readReferrals(v: unknown): ReferralMap {
  if (!v || typeof v !== "object") return {};
  const o = v as Record<string, unknown>;
  if (typeof o.address === "string" && typeof o.referrer === "string") return { [o.address]: { referrer: o.referrer, at: Number(o.at) || 0 } };
  const out: ReferralMap = {};
  for (const [k, x] of Object.entries(o)) if (x && typeof x === "object" && typeof (x as { referrer?: unknown }).referrer === "string") out[k] = { referrer: (x as { referrer: string }).referrer, at: Number((x as { at?: unknown }).at) || 0 };
  return out;
}
