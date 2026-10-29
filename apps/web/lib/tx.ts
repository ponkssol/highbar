export interface SwapParams { mint: string; side: "buy" | "sell"; amount: number; slippageBps: number; owner?: string; referral?: string }

/** TODO(HB Onchain): replace with real Meteora DBC swap tx builder (returns a serialized/unsigned Transaction). */
export async function buildSwapTx(params: SwapParams): Promise<{ ok: false; reason: string } | { ok: true; tx: Uint8Array }> {
  console.info("[buildSwapTx stub]", params);
  return { ok: false, reason: "Swap belum aktif (stub). HB Onchain akan menyediakan buildSwapTx." };
}