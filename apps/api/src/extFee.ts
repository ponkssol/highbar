/**
 * Extension platform fee (@hb/shared EXT_FEE_BPS = 2, 0.02% of the trade's SOL amount, on launches and on regular DBC / DAMM v2 /
 * Jupiter buys and sells) -> the extension fee receiver (EXT_FEE_RECEIVER; mainnet: the platform key). Fees just accumulate there:
 * no automatic buyback, no buyback-budget accounting. The extension reads the receiver from GET /config extFee (any trade) and
 * from the launch responses below (never hardcoded) and adds the transfer itself; on a launch the API accepts
 * it at /tx/launch/sign (services/mintPool/validateLaunchTx.ts) only as ONE System transfer creator -> receiver of exactly
 * extFeeLamports(dev buy), placed right after the dev buy's WSOL unwrap. This module only describes the fee (no RPC, no secrets).
 */
import { PublicKey } from "@solana/web3.js";
import { EXT_FEE_BPS, extFeeLamports } from "@hb/shared";

/** Extension platform fee receiver: EXT_FEE_RECEIVER, a public key only (mainnet: the platform key,
 *  deploy/mainnet/api.env.template; fees just accumulate there). Its own env on purpose: TREASURY_PUBKEY never enables the fee.
 *  Unset or invalid = null: the fee is off (GET /config extFee.enabled and extFee.allowed false, security/prodCheck.ts warns) and
 *  launch txs carrying a fee transfer are refused (validateLaunchTx); txs without one are unaffected. */
export function extFeeReceiver(env: Record<string, string | undefined> = process.env): string | null {
  const v = env.EXT_FEE_RECEIVER?.trim();
  if (!v) return null;
  try { return new PublicKey(v).toBase58(); } catch { return null; }
}

/** GET /config extFee: what the extension needs to charge the fee on any trade (launch, DBC, DAMM v2, Jupiter buys and sells). */
export interface ExtFeeConfig {
  bps: number;
  /** fee receiver (public key, EXT_FEE_RECEIVER), null when unset */
  receiver: string | null;
  /** false = charge no fee (no receiver configured) */
  enabled: boolean;
}
export const extFeeConfig = (receiver: string | null): ExtFeeConfig => ({ bps: EXT_FEE_BPS, receiver, enabled: !!receiver });

export interface ExtFeeInfo {
  bps: number;
  /** fee in lamports (decimal string: bigint-exact), "0" when none is due */
  lamports: string;
  sol: number;
  /** fee receiver (public key, EXT_FEE_RECEIVER), null when the fee is disabled (unset) */
  receiver: string | null;
  /** true when a launch tx may carry the fee transfer: a dev buy whose fee is > 0, a receiver, and a tx the wallet may still edit */
  allowed: boolean;
}

/** `editable` = false for txs the API already signed (random-mint path): any added instruction would void those signatures. */
export function extFeeInfo(amountLamports: bigint, receiver: string | null, editable = true): ExtFeeInfo {
  const fee = amountLamports > 0n ? extFeeLamports(amountLamports) : 0n;
  return { bps: EXT_FEE_BPS, lamports: fee.toString(), sol: Number(fee) / 1e9, receiver, allowed: editable && !!receiver && fee > 0n };
}
