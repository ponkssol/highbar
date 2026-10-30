import bs58 from "bs58";
import type { Connection } from "@solana/web3.js";
import type { RawTx } from "./decode.js";

type Fetched = NonNullable<Awaited<ReturnType<Connection["getTransaction"]>>>;
/** getTransaction (v0) -> the RawTx the decoder / cost breakdown read (keeps meta.fee, balances, CU and the block position). */
export function toRaw(tx: Fetched): RawTx {
  return {
    slot: tx.slot, blockTime: tx.blockTime ?? null, transactionIndex: (tx as { transactionIndex?: number }).transactionIndex ?? null,
    transaction: { signatures: tx.transaction.signatures, message: {
      accountKeys: tx.transaction.message.staticAccountKeys.map((k) => k.toBase58()),
      instructions: tx.transaction.message.compiledInstructions.map((ix) => ({ programIdIndex: ix.programIdIndex, accounts: ix.accountKeyIndexes, data: bs58.encode(ix.data) })) } },
    meta: tx.meta ? { err: tx.meta.err, innerInstructions: tx.meta.innerInstructions as any,
      loadedAddresses: tx.meta.loadedAddresses ? { writable: tx.meta.loadedAddresses.writable.map(String), readonly: tx.meta.loadedAddresses.readonly.map(String) } : null,
      fee: tx.meta.fee, preBalances: tx.meta.preBalances, postBalances: tx.meta.postBalances, computeUnitsConsumed: tx.meta.computeUnitsConsumed ?? null } : null,
  };
}

