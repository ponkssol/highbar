"use client";
import { Transaction } from "@solana/web3.js";
import { api, post } from "./api";

export interface SwapParams { mint: string; side: "buy" | "sell"; amount: number; slippageBps: number; owner?: string; referral?: string }

/** Builds a Meteora DBC swap2 tx via the API (quote + minOut + referral server-side). Returns the unsigned tx bytes. */
export async function buildSwapTx(params: SwapParams): Promise<{ ok: false; reason: string } | { ok: true; tx: Uint8Array; transaction: Transaction }> {
  if (!params.owner) return { ok: false, reason: "Connect wallet dulu." };
  try {
    const t = await api.token(params.mint);
    const r = await post<{ tx: string }>("/tx/swap", { owner: params.owner, pool: t.pool, side: params.side, amount: params.amount, slippageBps: params.slippageBps });
    const bytes = Uint8Array.from(atob(r.tx), (c) => c.charCodeAt(0));
    return { ok: true, tx: bytes, transaction: Transaction.from(bytes) };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}