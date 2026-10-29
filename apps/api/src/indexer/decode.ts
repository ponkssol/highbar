import { BorshCoder, type Idl } from "@coral-xyz/anchor";
import { DynamicBondingCurveIdl, DYNAMIC_BONDING_CURVE_PROGRAM_ID } from "@meteora-ag/dynamic-bonding-curve-sdk";
import bs58 from "bs58";

/** Anchor `emit_cpi!` self-CPI prefix: sha256("anchor:event")[0..8]. */
const EVENT_IX_TAG = Buffer.from([0xe4, 0x45, 0xa5, 0x2e, 0x51, 0xcb, 0x9a, 0x1d]);
const DBC = DYNAMIC_BONDING_CURVE_PROGRAM_ID.toBase58();
const coder = new BorshCoder(DynamicBondingCurveIdl as unknown as Idl);

const acctNames = (ix: string) => (DynamicBondingCurveIdl as any).instructions.find((x: any) => x.name === ix)?.accounts.map((a: any) => a.name) as string[];
const SWAP_ACCTS = acctNames("swap");
const INIT_ACCTS = acctNames("initialize_virtual_pool_with_spl_token");
const MIG_ACCTS = acctNames("migration_damm_v2");

export type DbcEvent =
  | { kind: "swap"; pool: string; config: string; trader: string; side: "buy" | "sell"; solLamports: bigint; tokenAmount: bigint;
      feeLamports: bigint; feeBaseAmount: bigint; quoteReserve: bigint; referralTokenAccount?: string; hasReferral: boolean }
  | { kind: "init"; pool: string; mint: string; config: string; creator: string; name: string; symbol: string; uri: string }
  | { kind: "complete"; pool: string }
  | { kind: "migrated"; pool: string; dammPool: string }
  | { kind: "migration_fee"; pool: string; fee: bigint; flag: number };

/** Raw `getTransaction(sig, { encoding: "json", maxSupportedTransactionVersion: 0 })` shape (also Helius raw webhooks). */
export type RawTx = {
  slot: number; blockTime: number | null;
  transaction: { signatures: string[]; message: { accountKeys: string[]; instructions: RawIx[] } };
  meta: { err: unknown; innerInstructions?: { index: number; instructions: RawIx[] }[] | null;
          loadedAddresses?: { writable: string[]; readonly: string[] } | null } | null;
};
type RawIx = { programIdIndex: number; accounts: number[]; data: string };

const big = (v: any): bigint => BigInt(v?.toString?.() ?? v ?? 0);
const field = (o: any, snake: string) => o[snake] ?? o[snake.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())];

/** Walks outer + inner DBC instructions in execution order; pairs ix accounts with the emitted event. */
export function decodeDbcEvents(tx: RawTx): DbcEvent[] {
  if (!tx.meta || tx.meta.err) return [];
  const keys = [...tx.transaction.message.accountKeys, ...(tx.meta.loadedAddresses?.writable ?? []), ...(tx.meta.loadedAddresses?.readonly ?? [])];
  const inner = new Map((tx.meta.innerInstructions ?? []).map((g) => [g.index, g.instructions]));
  const flat: RawIx[] = [];
  tx.transaction.message.instructions.forEach((ix, i) => { flat.push(ix); flat.push(...(inner.get(i) ?? [])); });

  const out: DbcEvent[] = [];
  let lastSwapAccts: string[] | undefined;
  let pendingSwap: { rank: number; ev: DbcEvent } | undefined;
  const flush = () => { if (pendingSwap) out.push(pendingSwap.ev); pendingSwap = undefined; };
  let lastInit: { accts: string[]; name: string; symbol: string; uri: string } | undefined;
  for (const ix of flat) {
    if (keys[ix.programIdIndex] !== DBC) continue;
    const data = Buffer.from(bs58.decode(ix.data));
    const accts = ix.accounts.map((a) => keys[a]!);
    if (data.subarray(0, 8).equals(EVENT_IX_TAG)) {
      const ev = coder.events.decode(data.subarray(8).toString("base64"));
      if (!ev) continue;
      const d: any = ev.data;
      switch (ev.name) {
        case "EvtSwap": case "EvtSwap2": case "EvtSwap3": case "EvtSwap2WithTransferHook": case "EvtSwap3WithTransferHook": {
          // One swap ix emits several versions (EvtSwap, EvtSwap2, EvtSwap3); keep the richest one.
          const rank = ev.name.startsWith("EvtSwap3") ? 3 : ev.name.startsWith("EvtSwap2") ? 2 : 1;
          if (pendingSwap && pendingSwap.rank >= rank) break;
          const s = normalizeSwap(ev.name, d);
          const a = lastSwapAccts ?? [];
          const referral = a[SWAP_ACCTS.indexOf("referral_token_account")];
          pendingSwap = { rank, ev: { kind: "swap", pool: d.pool.toBase58(), config: d.config.toBase58(), trader: a[SWAP_ACCTS.indexOf("payer")] ?? "",
            ...s, hasReferral: !!field(d, "has_referral"), referralTokenAccount: referral && referral !== DBC ? referral : undefined } };
          break;
        }
        case "EvtInitializePool": case "EvtInitializePoolWithTransferHook":
          out.push({ kind: "init", pool: d.pool.toBase58(), mint: field(d, "base_mint").toBase58(), config: d.config.toBase58(),
            creator: d.creator.toBase58(), name: lastInit?.name ?? "", symbol: lastInit?.symbol ?? "", uri: lastInit?.uri ?? "" });
          break;
        case "EvtCurveComplete": case "EvtCurveCompleteWithTransferHook":
          out.push({ kind: "complete", pool: d.pool.toBase58() }); break;
        case "EvtWithdrawMigrationFee":
          out.push({ kind: "migration_fee", pool: d.pool.toBase58(), fee: big(d.fee), flag: Number(d.flag) }); break;
      }
      continue;
    }
    flush();
    const dec = coder.instruction.decode(data);
    if (!dec) continue;
    if (dec.name.startsWith("swap")) lastSwapAccts = accts;
    else if (dec.name.startsWith("initialize_virtual_pool")) {
      const p: any = (dec.data as any).params; lastInit = { accts, name: p.name, symbol: p.symbol, uri: p.uri };
    } else if (dec.name === "migration_damm_v2") {
      out.push({ kind: "migrated", pool: accts[MIG_ACCTS.indexOf("virtual_pool")]!, dammPool: accts[MIG_ACCTS.indexOf("pool")]! });
    }
  }
  flush();
  void INIT_ACCTS;
  return out;
}

/** trade_direction: 0 = BaseToQuote (sell), 1 = QuoteToBase (buy). Assumes quote = SOL and fees collected in quote. */
function normalizeSwap(name: string, d: any) {
  const side: "buy" | "sell" = Number(field(d, "trade_direction")) === 1 ? "buy" : "sell";
  let inAmt: bigint, outAmt: bigint, fee: bigint, quoteReserve: bigint, feeOnBase: boolean;
  if (name.startsWith("EvtSwap3")) {
    inAmt = big(field(d, "included_transfer_fee_amount_in")); outAmt = big(field(d, "excluded_transfer_fee_amount_out"));
    fee = big(field(d, "trading_fee")) + big(field(d, "protocol_fee")) + big(field(d, "referral_fee"));
    quoteReserve = big(field(d, "quote_reserve"));
    feeOnBase = !!field(d, "fee_on_base_token");
  } else {
    feeOnBase = false; // unknown for v1/v2 events; EvtSwap3 is emitted on current program and wins
    const r = field(d, "swap_result");
    inAmt = name.startsWith("EvtSwap2") ? big(field(r, "included_fee_input_amount")) : big(field(d, "amount_in"));
    outAmt = big(field(r, "output_amount"));
    fee = big(field(r, "trading_fee")) + big(field(r, "protocol_fee")) + big(field(r, "referral_fee"));
    quoteReserve = name.startsWith("EvtSwap2") ? big(field(d, "quote_reserve_amount")) : 0n;
  }
  const fees = feeOnBase ? { feeLamports: 0n, feeBaseAmount: fee } : { feeLamports: fee, feeBaseAmount: 0n };
  return side === "buy"
    ? { side, solLamports: inAmt, tokenAmount: outAmt, quoteReserve, ...fees }
    : { side, solLamports: outAmt, tokenAmount: inAmt, quoteReserve, ...fees };
}
