/** Devnet experiment: deposit -> private transfer -> withdraw with Helius Privacy Rings (Zolana SDK).
 *  Goal: see in a devnet explorer exactly what is visible. Test funds only. Run: pnpm/npm run demo */
import { SOL_MINT, ShieldedKeypair, createZolanaClient } from "@heliuslabs/zolana";
import { LocalKeys, atSlot } from "@heliuslabs/zolana/client";
import { depositInstruction, transactInstruction, DepositAsset, TransactWithdrawal } from "@heliuslabs/zolana/interface";
import { AssetRegistry, ConfidentialTransfer, ProofInputUtxo, decryptToBalances, WithdrawalTarget } from "@heliuslabs/zolana/transaction";
import { devnetConfig, loadPayerBytes, sendAndConfirmFactory } from "./lib.js";

const DEPOSIT = 10_000_000n, TRANSFER = 3_000_000n, WITHDRAW = 3_000_000n;
const explorer = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

const client = await createZolanaClient(devnetConfig());
const kp = ShieldedKeypair.fromKeypair({ secretKey: loadPayerBytes() } as never);
const signer = kp.toSolanaSigner();
const addr = kp.shieldedAddress();
const keys = LocalKeys.fromKeypair(kp, client.proofService);
const sendAndConfirm = sendAndConfirmFactory(client, signer);
const assets = new AssetRegistry();
const recipient = ShieldedKeypair.generate();

// 1. Deposit (public -> private). Expect sender, asset and amount to be visible.
const dep = await sendAndConfirm([await depositInstruction({ tree: client.tree, depositor: signer, deposits: [{ asset: DepositAsset.sol(), viewTag: addr.confidentialViewTag(), recipientOwnerHash: addr.ownerHash(), amount: DEPOSIT }] })]);
console.log("deposit ", explorer(dep.signature));
const afterDep = await decryptToBalances({ keypair: kp, registry: assets, transactions: (await client.getShieldedTransactionsBySignature(dep.signature, atSlot(dep.slot))).transactions.map((t) => t.transaction) });

// 2. Private transfer to a fresh shielded recipient. Docs: asset and amount encrypted, sender/recipient public.
const tIn = ProofInputUtxo.fromKeypair(afterDep.balance(SOL_MINT).utxos[0]!, kp);
const transfer = new ConfidentialTransfer(addr, [tIn], signer.address);
transfer.send(recipient.shieldedAddress(), SOL_MINT, TRANSFER);
const tData = await client.proveTransact(transfer.sign(kp, assets), keys);
const tx = await sendAndConfirm([await transactInstruction({ payer: signer, ownerSigners: [signer], inputTree: client.tree, outputTree: client.tree, data: tData })]);
console.log("transfer", explorer(tx.signature));
const afterT = await decryptToBalances({ keypair: kp, registry: assets, transactions: (await client.getShieldedTransactionsBySignature(tx.signature, atSlot(tx.slot))).transactions.map((t) => t.transaction) });

// 3. Withdraw change back to the public wallet.
const wIn = ProofInputUtxo.fromKeypair(afterT.balance(SOL_MINT).utxos[0]!, kp);
const w = new ConfidentialTransfer(addr, [wIn], signer.address);
w.withdraw(SOL_MINT, WITHDRAW, WithdrawalTarget.sol({ recipient: signer.address }));
const wData = await client.proveTransact(w.sign(kp, assets), keys);
const wtx = await sendAndConfirm([await transactInstruction({ payer: signer, ownerSigners: [signer], inputTree: client.tree, outputTree: client.tree, withdrawal: TransactWithdrawal.sol({ recipient: signer.address }), data: wData })]);
console.log("withdraw", explorer(wtx.signature));
console.log("Open the three links and note which addresses, assets and amounts are visible.");
