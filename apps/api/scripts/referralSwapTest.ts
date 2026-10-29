/** Devnet: create the platform referral WSOL ATA (idempotent, 87xbp pays), then one buy + one sell through POST /tx/swap. */
import fs from "node:fs";
import { Keypair, SystemProgram, Transaction, PublicKey } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync, NATIVE_MINT } from "@solana/spl-token";
import { getConnection, loadPlatformKeypair, referralAta, referralWallet, sendTx } from "@hb/onchain";
const API = process.env.API_URL ?? "http://localhost:4000";
const conn = getConnection(), payer = loadPlatformKeypair();
const pool = process.argv[2]; const mint = new PublicKey(process.argv[3]);
const wallet = referralWallet()!, ata = referralAta();
console.log("referral wallet", wallet.toBase58(), "ata", ata.toBase58(), "derived", getAssociatedTokenAddressSync(NATIVE_MINT, wallet, true).toBase58());
if (!(await conn.getAccountInfo(ata))) {
  const sig = await sendTx(new Transaction().add(createAssociatedTokenAccountIdempotentInstruction(payer.publicKey, ata, wallet, NATIVE_MINT)), [payer]);
  console.log("createAta", sig);
} else console.log("ata exists");
// Trade from a separate funded test wallet: if the referral wallet itself trades, the SDK unwraps (closes) its own WSOL ATA = the referral account.
const KP = "data/referral-test-trader.json";
const trader = fs.existsSync(KP) ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(KP, "utf8")))) : Keypair.generate();
if (!fs.existsSync(KP)) fs.writeFileSync(KP, JSON.stringify([...trader.secretKey]));
if ((await conn.getBalance(trader.publicKey)) < 30_000_000) console.log("fund trader", trader.publicKey.toBase58(), await sendTx(new Transaction().add(SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: trader.publicKey, lamports: 50_000_000 })), [payer]));
const refBefore = await conn.getBalance(ata);
async function swap(side: "buy" | "sell", amount: number) {
  const r = await fetch(`${API}/tx/swap`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ owner: trader.publicKey.toBase58(), pool, side, amount, slippageBps: 300 }) });
  const j = await r.json(); if (!r.ok) throw new Error(`${side}: ${j.error}`);
  const tx = Transaction.from(Buffer.from(j.tx, "base64"));
  const hasRef = tx.instructions.some((ix) => ix.keys.some((k) => k.pubkey.equals(ata)));
  tx.partialSign(trader);
  const sig = await conn.sendRawTransaction(tx.serialize()); await conn.confirmTransaction(sig, "confirmed");
  console.log(side, amount, "referralIncluded", hasRef, sig);
}
await new Promise((r) => setTimeout(r, 1500));
await swap("buy", 0.01);
const bal = await conn.getTokenAccountBalance(getAssociatedTokenAddressSync(mint, trader.publicKey));
await swap("sell", Math.floor(Number(bal.value.uiAmount) / 10));
const after = await conn.getAccountInfo(ata);
console.log("referral ATA still exists", !!after, "lamports delta (referral fees)", (after?.lamports ?? 0) - refBefore);