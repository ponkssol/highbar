import { PublicKey } from "@solana/web3.js";
import { loadConfigs, lockTip, referralAta, referralWallet } from "@hb/onchain";
import { jobs } from "../jobs/config.js";

/** Platform wallets shown on Open Book, resolved from env + configs.<network>.json only (no RPC). Roles merge when two roles share an address. */
export interface PlatformWallets {
  feeReceiver: string | null; feeClaimer: string | null; leftoverReceiver: string | null; treasury: string | null; platform: string | null;
  referral: string | null; referralWsolAta: string | null; lockTip: string | null; lockTipSol: number | null;
}
const pk = (v: string | null | undefined) => { if (!v) return null; try { return new PublicKey(v.trim()).toBase58(); } catch { return null; } };

export function resolveWallets(env: NodeJS.ProcessEnv = process.env): PlatformWallets {
  let cfg: Record<string, string> = {};
  try { cfg = loadConfigs() as Record<string, string>; } catch { /* no configs file */ }
  const feeClaimer = pk(cfg.feeClaimer), leftoverReceiver = pk(cfg.leftoverReceiver), treasury = pk(jobs.treasury ?? env.TREASURY_PUBKEY);
  const platform = pk(env.PLATFORM_PUBKEY) ?? (jobs.network === "devnet" ? feeClaimer : null);
  let referral: string | null = null, referralWsolAta: string | null = null;
  try { referral = referralWallet()?.toBase58() ?? null; referralWsolAta = referral ? referralAta().toBase58() : null; } catch { /* unset */ }
  let lt: string | null = null, lockTipSol: number | null = null;
  try { const t = lockTip(env); lt = t.tipWallet.toBase58(); lockTipSol = t.tipSol; } catch { /* mainnet without LOCK_TIP_WALLET */ }
  // feeClaimer.ts: claims go to TREASURY_PUBKEY when it is set and differs from the claim key, else stay with the platform key
  const feeReceiver = treasury ?? platform ?? feeClaimer;
  return { feeReceiver, feeClaimer, leftoverReceiver, treasury, platform, referral, referralWsolAta, lockTip: lt, lockTipSol };
}

/** address -> roles (sorted), for the snapshot job and the wallet cards. */
export function walletRoles(w: PlatformWallets): Map<string, string[]> {
  const m = new Map<string, string[]>();
  const add = (a: string | null, r: string) => { if (!a) return; const l = m.get(a) ?? []; if (!l.includes(r)) l.push(r); m.set(a, l); };
  add(w.treasury, "treasury"); add(w.platform, "platform"); add(w.feeClaimer, "feeClaimer"); add(w.leftoverReceiver, "leftoverReceiver");
  add(w.referral, "referral"); add(w.lockTip, "lockTip");
  if (!w.treasury) add(w.feeReceiver, "feeReceiver");
  for (const l of m.values()) l.sort();
  return m;
}
