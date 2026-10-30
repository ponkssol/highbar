import { test } from "node:test";
import assert from "node:assert/strict";
import { Connection, Keypair, PublicKey, type TransactionInstruction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, NATIVE_MINT, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { CpAmm, CP_AMM_PROGRAM_ID } from "@meteora-ag/cp-amm-sdk";
import { claimPositionFeeTx } from "./creatorLp.js";

// DAMM v2 LP fee claim (feeClaimer.ts damm_lp) with TREASURY_PUBKEY != platform key. Builds only: the connection points at a
// closed local port and is never called (building the claim tx needs no RPC); nothing is simulated or sent.
const amm = new CpAmm(new Connection("http://127.0.0.1:9"));
const pk = () => Keypair.generate().publicKey;
const platform = pk(), treasury = pk(), mint = pk();
const poolState = { tokenAMint: mint, tokenBMint: NATIVE_MINT, tokenAVault: pk(), tokenBVault: pk(), tokenAFlag: 1, tokenBFlag: 0 } as const; // base Token-2022, quote WSOL
const ids = { position: pk(), pool: pk(), positionNftAccount: pk() };
const closeIxs = (ixs: TransactionInstruction[]) => ixs.filter((i) => i.programId.equals(TOKEN_PROGRAM_ID) && i.data[0] === 9); // spl-token CloseAccount
const has = (ix: TransactionInstruction, k: PublicKey) => ix.keys.some((m) => m.pubkey.equals(k));

test("cp-amm-sdk 1.5.1: claimPositionFee with a receiver but no tempWSolAccount throws while building (the bug)", async () => {
  await assert.rejects(amm.claimPositionFee({
    owner: platform, feePayer: platform, receiver: treasury, ...ids,
    tokenAMint: poolState.tokenAMint, tokenBMint: poolState.tokenBMint, tokenAVault: poolState.tokenAVault, tokenBVault: poolState.tokenBVault,
    tokenAProgram: TOKEN_2022_PROGRAM_ID, tokenBProgram: TOKEN_PROGRAM_ID,
  }));
});

test("claimPositionFeeTx: treasury != platform builds; SOL is unwrapped to the treasury, token side goes to the treasury ATA", async () => {
  const tx = await claimPositionFeeTx(amm, { owner: platform, feePayer: platform, receiver: treasury, ...ids, poolState: poolState as any });
  const claim = tx.instructions.find((i) => i.programId.equals(CP_AMM_PROGRAM_ID));
  assert.ok(claim, "claim_position_fee instruction present");
  const platformWsol = getAssociatedTokenAddressSync(NATIVE_MINT, platform, true, TOKEN_PROGRAM_ID);
  const treasuryToken = getAssociatedTokenAddressSync(mint, treasury, true, TOKEN_2022_PROGRAM_ID);
  assert.ok(has(claim, platformWsol), "SOL side is claimed into the platform's WSOL ATA");
  assert.ok(has(claim, treasuryToken), "token side is claimed into the treasury's ATA");
  const signers = claim.keys.filter((k) => k.isSigner).map((k) => k.pubkey.toBase58());
  assert.deepEqual(signers, [platform.toBase58()], "only the platform key (position NFT owner) signs");
  const close = closeIxs(tx.instructions);
  assert.equal(close.length, 1, "one WSOL unwrap");
  assert.ok(close[0].keys[0].pubkey.equals(platformWsol) && close[0].keys[1].pubkey.equals(treasury) && close[0].keys[2].pubkey.equals(platform),
    "platform WSOL ATA is closed to the treasury by the platform key");
  // the whole tx compiles with the platform key as the only signer
  tx.feePayer = platform; tx.recentBlockhash = PublicKey.default.toBase58();
  assert.equal(tx.compileMessage().header.numRequiredSignatures, 1);
});

test("claimPositionFeeTx: no receiver (or receiver = owner) keeps everything on the owner", async () => {
  for (const receiver of [undefined, platform]) {
    const tx = await claimPositionFeeTx(amm, { owner: platform, receiver, ...ids, poolState: poolState as any });
    const claim = tx.instructions.find((i) => i.programId.equals(CP_AMM_PROGRAM_ID))!;
    assert.ok(has(claim, getAssociatedTokenAddressSync(mint, platform, true, TOKEN_2022_PROGRAM_ID)));
    const close = closeIxs(tx.instructions);
    assert.equal(close.length, 1);
    assert.ok(close[0].keys[1].pubkey.equals(platform), "WSOL unwrapped back to the owner");
  }
});
