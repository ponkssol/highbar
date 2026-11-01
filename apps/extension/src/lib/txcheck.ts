/** Checks run in the background worker right before it signs anything the API built. A failed check means nothing is signed. */
import { PRIORITY_MAX_LAMPORTS, readBudget } from "./priority";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { addLegacyFee, asTransfer, type FeeLeg } from "./fee";
import { ATA_PROGRAM, DBC_PROGRAM, WSOL_MINT } from "./sell";
import { TOKEN_PROGRAM } from "./rpc";

export class TxCheckFailed extends Error { constructor(message: string) { super(message); this.name = "TxCheckFailed"; } }

export const VANITY_SUFFIX = "high";

function requireFeePayer(tx: Transaction, wallet: PublicKey) {
  if (!tx.feePayer || !tx.feePayer.equals(wallet)) throw new TxCheckFailed("The fee payer is not this wallet. Nothing was signed.");
  const signer = tx.compileMessage().accountKeys.findIndex((k) => k.equals(wallet));
  if (signer < 0 || signer >= tx.compileMessage().header.numRequiredSignatures) throw new TxCheckFailed("This wallet is not a signer of the transaction. Nothing was signed.");
}

const SYSTEM = SystemProgram.programId.toBase58();
const wsolAtaOf = (owner: PublicKey) => PublicKey.findProgramAddressSync([owner.toBuffer(), new PublicKey(TOKEN_PROGRAM).toBuffer(), new PublicKey(WSOL_MINT).toBuffer()], new PublicKey(ATA_PROGRAM))[0];

/** The dev buy's amount_in (lamports) in an API launch tx: the DBC swap right after the WSOL sync_native, or null (no dev buy). */
export function launchDevBuyLamports(tx: Transaction): bigint | null {
  const ixs = tx.instructions;
  for (let i = 1; i < ixs.length; i++) {
    const prev = ixs[i - 1], ix = ixs[i];
    if (prev.programId.toBase58() === TOKEN_PROGRAM && prev.data.length === 1 && prev.data[0] === 17 && ix.programId.toBase58() === DBC_PROGRAM && ix.data.length === 24) {
      let v = 0n; for (let k = 15; k >= 8; k--) v = (v << 8n) | BigInt(ix.data[k]);
      return v;
    }
  }
  return null;
}

/** Appends the highbar fee to a launch tx (last instruction) when it still fits in 1232 bytes (the transfer adds ~49 bytes). */
export const addLaunchFee = (tx: Transaction, wallet: PublicKey, leg: FeeLeg | null): boolean => addLegacyFee(tx, wallet, leg);

/** Launch tx: fee payer is the wallet, the mint ends in "high" and is a signer of the same transaction. SOL may move only
 *  into the wallet's own WSOL account (the dev buy wrap) and, when `fee` is given, through the ONE highbar fee transfer:
 *  the last instruction, wallet -> the API's receiver, exactly the fee lamports. */
export function checkLaunchTx(tx: Transaction, wallet: PublicKey, mint: string, fee: FeeLeg | null = null, maxPriority: bigint = PRIORITY_MAX_LAMPORTS) {
  requireFeePayer(tx, wallet);
  if (!mint.endsWith(VANITY_SUFFIX)) throw new TxCheckFailed(`The mint address does not end in "${VANITY_SUFFIX}". Nothing was signed.`);
  let m: PublicKey;
  try { m = new PublicKey(mint); } catch { throw new TxCheckFailed("The mint address is not valid. Nothing was signed."); }
  const msg = tx.compileMessage();
  const i = msg.accountKeys.findIndex((k) => k.equals(m));
  if (i < 0 || i >= msg.header.numRequiredSignatures) throw new TxCheckFailed("The mint is not part of this launch transaction. Nothing was signed.");
  const no = (m: string): never => { throw new TxCheckFailed(`${m} Nothing was signed.`); };
  const me = wallet.toBase58(), wsol = wsolAtaOf(wallet).toBase58();
  try { readBudget(tx.instructions.map((ix) => ({ program: ix.programId.toBase58(), data: ix.data, keys: ix.keys.length })), maxPriority); }
  catch (e) { no(`The launch has a bad priority fee (${(e as Error).message}).`); }
  let fees = 0;
  tx.instructions.forEach((ix, n) => {
    if (ix.programId.toBase58() !== SYSTEM) return;
    const kind = ix.data.length >= 4 ? ix.data.readUInt32LE(0) : -1;
    if (kind === 11) no("The launch moves SOL out of the wallet.");
    if (kind !== 2) return;
    const t = asTransfer(SYSTEM, ix.data, ix.keys.map((k) => k.pubkey.toBase58()));
    if (!t) no("The launch has a malformed SOL transfer.");
    if (t!.from === me && t!.to === wsol) return; // dev buy wrap
    if (!fee || t!.to !== fee.receiver.toBase58()) no("The launch moves SOL to another account.");
    if (++fees > 1) no("The launch has more than one highbar fee transfer.");
    if (n !== tx.instructions.length - 1) no("The highbar fee transfer is not the last instruction.");
    if (t!.from !== me) no("The highbar fee is not paid by this wallet.");
    if (t!.lamports !== fee!.lamports) no("The highbar fee amount is wrong.");
  });
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
