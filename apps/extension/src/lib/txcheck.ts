/** Checks run in the background worker right before it signs anything the API built. A failed check means nothing is signed. */
import { PublicKey, Transaction } from "@solana/web3.js";

export class TxCheckFailed extends Error { constructor(message: string) { super(message); this.name = "TxCheckFailed"; } }

export const VANITY_SUFFIX = "high";

function requireFeePayer(tx: Transaction, wallet: PublicKey) {
  if (!tx.feePayer || !tx.feePayer.equals(wallet)) throw new TxCheckFailed("The fee payer is not this wallet. Nothing was signed.");
  const signer = tx.compileMessage().accountKeys.findIndex((k) => k.equals(wallet));
  if (signer < 0 || signer >= tx.compileMessage().header.numRequiredSignatures) throw new TxCheckFailed("This wallet is not a signer of the transaction. Nothing was signed.");
}

/** Launch tx: fee payer is the wallet, the mint ends in "high" and is a signer of the same transaction. */
export function checkLaunchTx(tx: Transaction, wallet: PublicKey, mint: string) {
  requireFeePayer(tx, wallet);
  if (!mint.endsWith(VANITY_SUFFIX)) throw new TxCheckFailed(`The mint address does not end in "${VANITY_SUFFIX}". Nothing was signed.`);
  let m: PublicKey;
  try { m = new PublicKey(mint); } catch { throw new TxCheckFailed("The mint address is not valid. Nothing was signed."); }
  const msg = tx.compileMessage();
  const i = msg.accountKeys.findIndex((k) => k.equals(m));
  if (i < 0 || i >= msg.header.numRequiredSignatures) throw new TxCheckFailed("The mint is not part of this launch transaction. Nothing was signed.");
}

/** Claim tx: fee payer is the wallet. */
export function checkClaimTx(tx: Transaction, wallet: PublicKey) { requireFeePayer(tx, wallet); }

/** The API returns the tx with the mint signature added: the message must be exactly what the wallet signed. */
export function checkCosigned(signed: Transaction, full: Transaction, wallet: PublicKey) {
  const a = signed.serializeMessage(), b = full.serializeMessage();
  if (a.length !== b.length || !a.every((x, i) => x === b[i])) throw new TxCheckFailed("The co-signed transaction was changed by the server. Nothing was sent.");
  const mine = full.signatures.find((s) => s.publicKey.equals(wallet))?.signature;
  const orig = signed.signatures.find((s) => s.publicKey.equals(wallet))?.signature;
  if (!mine || !orig || !mine.equals(orig)) throw new TxCheckFailed("The wallet signature is missing from the co-signed transaction. Nothing was sent.");
}
