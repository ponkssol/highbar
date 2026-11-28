import fs from "node:fs";
import os from "node:os";
import {
  appendTransactionMessageInstructions,
  assertIsTransactionWithBlockhashLifetime,
  createKeyPairSignerFromBytes,
  createTransactionMessage,
  getSignatureFromTransaction,
  pipe,
  sendTransactionWithoutConfirmingFactory,
  setTransactionMessageConfig,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Instruction,
  type Signature,
  type TransactionSigner,
} from "@solana/kit";
import { createZolanaClient } from "@heliuslabs/zolana";

export type Client = Awaited<ReturnType<typeof createZolanaClient>>;
export interface Confirmed { readonly signature: Signature; readonly slot: bigint }

/** DEVNET ONLY. Reads API_KEY (Helius) and ZOLANA_PAYER_KEYPAIR (a devnet test keypair JSON file) from the environment. */
export function devnetConfig() {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Set API_KEY (Helius devnet key) in .env");
  const rpc = `https://devnet.helius-rpc.com/?api-key=${apiKey}`;
  if (/mainnet/i.test(rpc)) throw new Error("This experiment is devnet only");
  return { solanaRpcUrl: rpc };
}

export function loadPayerBytes(): Uint8Array {
  const p = (process.env.ZOLANA_PAYER_KEYPAIR ?? "~/.config/solana/id.json").replace(/^~/, os.homedir());
  return Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf8")));
}
export const payerSigner = () => createKeyPairSignerFromBytes(loadPayerBytes());

/** Same helper as the Helius examples: build, sign, send, confirm; returns signature and landed slot. */
export function sendAndConfirmFactory(client: Client, feePayer: TransactionSigner) {
  const send = sendTransactionWithoutConfirmingFactory({ rpc: client.solanaRpc });
  return async (instructions: readonly Instruction[]): Promise<Confirmed> => {
    const { value: lifetime } = await client.solanaRpc.getLatestBlockhash().send();
    const signed = await signTransactionMessageWithSigners(
      pipe(
        createTransactionMessage({ version: 1 }),
        (m) => setTransactionMessageFeePayerSigner(feePayer, m),
        (m) => setTransactionMessageLifetimeUsingBlockhash(lifetime, m),
        (m) => setTransactionMessageConfig({ computeUnitLimit: 450_000, loadedAccountsDataSizeLimit: 64 * 1024 * 1024 }, m),
        (m) => appendTransactionMessageInstructions(instructions, m),
      ),
    );
    assertIsTransactionWithBlockhashLifetime(signed);
    await send(signed, { commitment: "confirmed" });
    const signature = getSignatureFromTransaction(signed);
    const slot = await client.confirmTransaction(signature);
    return { signature, slot };
  };
}
